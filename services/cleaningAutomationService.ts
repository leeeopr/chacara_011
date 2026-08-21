import { supabase } from '@/lib/supabase';
import { Reservation, OperationalEvent, CrewMember } from '@/lib/chacaraTypes';
import { isDemoMode } from '@/lib/appMode';
import { demoRepository } from '@/lib/demoRepository';
import { getCrewMembers } from './crewService';
import { getChacaraById } from './chacarasService';
import { getPendenciaGrupos, createPendencia, getPendencias, updatePendenciaStatus } from './pendenciasService';

/**
 * Calculates 1 day before the reservation check-in date.
 * E.g., checkin_date '2026-08-10' -> '2026-08-09'
 */
export function calculateCleaningDate(checkinDateStr: string): string {
  if (!checkinDateStr) return new Date().toISOString().split('T')[0];
  const date = new Date(`${checkinDateStr}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Finds all active crew members linked to the given chacara who possess a Cleaning role.
 * Roles checked: 'Limpeza', 'Faxina', 'Camareira', 'Higienização', etc. (case-insensitive).
 */
export async function getCleaningStaffForChacara(chacaraId: string): Promise<CrewMember[]> {
  if (!chacaraId) return [];
  try {
    const members = await getCrewMembers({ chacaraId, activeOnly: true });

    const isCleaningRole = (roleName: string = '') => {
      const norm = roleName.toLowerCase();
      return (
        norm.includes('limpeza') ||
        norm.includes('faxina') ||
        norm.includes('camareira') ||
        norm.includes('higieniza')
      );
    };

    return members.filter(m => {
      if (!m.roles || m.roles.length === 0) return false;
      return m.roles.some(r => isCleaningRole(r.nome || ''));
    });
  } catch (err) {
    console.error('[cleaningAutomation] Erro ao buscar funcionários de limpeza:', err);
    return [];
  }
}

/**
 * Get event_type_id for 'limpeza' from operational_event_types table.
 */
async function getLimpezaEventTypeId(): Promise<string> {
  if (isDemoMode()) return 'evt-type-6';
  try {
    const { data } = await supabase
      .from('operational_event_types')
      .select('id')
      .eq('code', 'limpeza')
      .maybeSingle();
    return data?.id || 'evt-type-6';
  } catch {
    return 'evt-type-6';
  }
}

/**
 * Find existing cleaning event for this reservation.
 */
async function findExistingCleaningEvent(reservationId: string): Promise<OperationalEvent | null> {
  if (!reservationId) return null;

  if (isDemoMode()) {
    const events = await demoRepository.getOperationalEvents();
    return events.find(e => e.reservation_id === reservationId) || null;
  }

  try {
    const { data, error } = await supabase
      .from('operational_events')
      .select('*')
      .eq('reservation_id', reservationId);

    if (error || !data || data.length === 0) return null;

    // Prefer exact cleaning type or automatic cleaning metadata
    const cleaningEvent = data.find(
      e => e.event_type_code === 'limpeza' || e.metadata?.type === 'LIMPEZA_PRE_CHECKIN'
    );

    return (cleaningEvent as OperationalEvent) || (data[0] as OperationalEvent) || null;
  } catch (e) {
    console.error('[cleaningAutomation] Erro ao consultar evento operacional:', e);
    return null;
  }
}

/**
 * Cancels or cleans up operational cleaning event for cancelled/deleted reservations.
 */
async function handleCancelledReservationCleaning(reservation: Reservation) {
  const existingEvent = await findExistingCleaningEvent(reservation.id);

  if (existingEvent) {
    if (isDemoMode()) {
      await demoRepository.saveOperationalEvent({
        id: existingEvent.id,
        status: 'CANCELADO',
        metadata: {
          ...(existingEvent.metadata || {}),
          cancelled_at: new Date().toISOString(),
          reason: 'Reserva cancelada ou excluída'
        }
      });
    } else {
      await supabase
        .from('operational_events')
        .update({
          status: 'CANCELADO',
          metadata: {
            ...(existingEvent.metadata || {}),
            cancelled_at: new Date().toISOString(),
            reason: 'Reserva cancelada ou excluída'
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEvent.id);
    }
  }

  // Resolve any open pendency for this reservation as 'Cancelada' or 'Concluída'
  await resolveMissingStaffPendencyIfExists(reservation.id, 'Cancelada');

  return {
    success: true,
    action: 'CANCELLED' as const,
    eventId: existingEvent?.id,
    message: 'Agendamento automático e pendências da reserva foram cancelados.'
  };
}

/**
 * Handles unconfirmed reservations (e.g. PRE_RESERVA), removing or cancelling any cleaning event.
 */
async function handleUnconfirmedReservationCleaning(reservation: Reservation) {
  const existingEvent = await findExistingCleaningEvent(reservation.id);

  if (existingEvent && existingEvent.status !== 'CANCELADO') {
    if (isDemoMode()) {
      await demoRepository.saveOperationalEvent({
        id: existingEvent.id,
        status: 'CANCELADO'
      });
    } else {
      await supabase
        .from('operational_events')
        .update({ status: 'CANCELADO', updated_at: new Date().toISOString() })
        .eq('id', existingEvent.id);
    }
  }

  return {
    success: true,
    action: 'SKIPPED' as const,
    message: 'Pré-reserva não gera agendamento de limpeza automático.'
  };
}

/**
 * Resolves or marks pendency as finished if staff is assigned or reservation cancelled.
 */
async function resolveMissingStaffPendencyIfExists(reservationId: string, targetStatus: 'Concluída' | 'Cancelada' = 'Concluída') {
  if (!reservationId) return;

  try {
    const pendencias = await getPendencias({});
    const matchingPendencia = pendencias.find(
      p => p.titulo?.includes(`(Reserva #${reservationId})`) || p.descricao?.includes(reservationId)
    );

    if (matchingPendencia && matchingPendencia.status !== 'Concluída' && matchingPendencia.status !== 'Cancelada') {
      await updatePendenciaStatus(
        matchingPendencia.id,
        targetStatus as any,
        'usr-sistema',
        targetStatus === 'Concluída' ? 'Equipe de limpeza atribuída com sucesso à chácara.' : 'Reserva cancelada.'
      );
    }
  } catch (err) {
    console.warn('[cleaningAutomation] Alerta ao resolver pendência de falta de equipe:', err);
  }
}

/**
 * Handles case where NO cleaning staff is linked to the chacara.
 * Creates an Operational Pendency on Dashboard without generating a bogus cleaning event.
 */
async function handleMissingCleaningStaff(reservation: Reservation, chacaraName: string, cleaningDate: string) {
  // 1. If an active cleaning event existed, cancel/delete it
  const existingEvent = await findExistingCleaningEvent(reservation.id);
  if (existingEvent) {
    if (isDemoMode()) {
      await demoRepository.saveOperationalEvent({ id: existingEvent.id, status: 'CANCELADO' });
    } else {
      await supabase.from('operational_events').update({ status: 'CANCELADO' }).eq('id', existingEvent.id);
    }
  }

  // 2. Check if a pendency for this reservation already exists
  const pendencias = await getPendencias({});
  const resCode = reservation.code || reservation.id.slice(0, 8);
  const existingPendency = pendencias.find(
    p => p.titulo?.includes(`Reserva #${resCode}`) || p.descricao?.includes(reservation.id)
  );

  if (existingPendency && existingPendency.status !== 'Concluída') {
    return {
      success: true,
      action: 'PENDENCY_CREATED' as const,
      pendenciaId: existingPendency.id,
      message: `Pendência já existente: Equipe de limpeza não definida para ${chacaraName}.`
    };
  }

  // 3. Find group for Limpeza
  const groups = await getPendenciaGrupos();
  const grupoLimpeza = groups.find(g => g.nome?.toLowerCase().includes('limpeza')) || groups[0];

  // 4. Create Pendency for Dashboard
  try {
    const createdPendencia = await createPendencia(
      {
        grupo_id: grupoLimpeza?.id || 'grp-1',
        chacara_id: reservation.chacara_id,
        titulo: `Equipe de Limpeza não definida (Reserva #${resCode})`,
        descricao: `A reserva #${resCode} (Check-in: ${reservation.checkin_date}) na ${chacaraName} está confirmada, mas nenhuma funcionária de Limpeza está cadastrada na equipe desta chácara.`,
        prazo: cleaningDate,
        prazo_hora: '08:00',
        prioridade: 'Urgente',
        responsavel_atual_id: 'usr-admin',
        responsavel_atual_nome: 'Gestão Operacional',
        responsavel_atual_email: 'admin@chacaras.com.br',
        subitens: [
          `Vincular funcionário(a) de Limpeza na equipe da ${chacaraName}`,
          `Agendar higienização para o dia ${cleaningDate}`
        ]
      },
      {
        id: 'usr-sistema',
        email: 'sistema@chacaras.com.br',
        full_name: 'Automação de Limpeza'
      }
    );

    return {
      success: true,
      action: 'PENDENCY_CREATED' as const,
      pendenciaId: createdPendencia.id,
      message: `Sem equipe de limpeza para ${chacaraName}. Pendência criada no Dashboard.`
    };
  } catch (e: any) {
    console.error('[cleaningAutomation] Erro ao criar pendência:', e);
    return {
      success: false,
      action: 'SKIPPED' as const,
      message: 'Sem funcionários de limpeza para a chácara.'
    };
  }
}

/**
 * Main Public Sync API: Call whenever a reservation is created, updated, confirmed, or cancelled.
 */
export async function syncReservationCleaningAutomation(reservation: Reservation): Promise<{
  success: boolean;
  action: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'PENDENCY_CREATED' | 'SKIPPED';
  eventId?: string;
  pendenciaId?: string;
  message: string;
}> {
  if (!reservation || !reservation.id) {
    return { success: false, action: 'SKIPPED', message: 'Reserva inválida' };
  }

  // If automation has been intentionally disabled for this reservation by the user
  if ((reservation as any).metadata?.is_cleaning_automation_disabled === true) {
    return {
      success: true,
      action: 'SKIPPED',
      message: 'Automação de limpeza desativada intencionalmente pelo usuário para esta reserva.'
    };
  }

  const isConfirmed = [
    'CONFIRMADA',
    'CHECKIN_REALIZADO',
    'HOSPEDADO',
    'CHECKOUT_REALIZADO',
    'FINALIZADA'
  ].includes(reservation.status) && !reservation.is_deleted;

  const isCancelledOrDeleted =
    reservation.status === 'CANCELADA' ||
    reservation.status === 'NO_SHOW' ||
    Boolean(reservation.is_deleted);

  // 1. Handle Cancelled or Deleted Reservations
  if (isCancelledOrDeleted) {
    return await handleCancelledReservationCleaning(reservation);
  }

  // 2. Handle Unconfirmed (e.g. PRE_RESERVA)
  if (!isConfirmed) {
    return await handleUnconfirmedReservationCleaning(reservation);
  }

  // 3. For CONFIRMED Reservations: Calculate cleaning date (1 day before check-in)
  const cleaningDate = calculateCleaningDate(reservation.checkin_date);
  const chacaraId = reservation.chacara_id;

  if (!chacaraId) {
    return { success: false, action: 'SKIPPED', message: 'Reserva sem chácara vinculada' };
  }

  const chacara = reservation.chacara || (await getChacaraById(chacaraId));
  const chacaraName = chacara?.name || 'Chácara';

  // 4. Find Cleaning Staff for this Chacara
  const cleaningStaff = await getCleaningStaffForChacara(chacaraId);

  // 5. Handle Case: NO Cleaning Staff found
  if (cleaningStaff.length === 0) {
    return await handleMissingCleaningStaff(reservation, chacaraName, cleaningDate);
  }

  // 6. Cleaning Staff EXISTS: Resolve open pendency if present
  await resolveMissingStaffPendencyIfExists(reservation.id);

  const staffIds = cleaningStaff.map(s => s.id);
  const staffNames = cleaningStaff.map(s => s.nome);

  // 7. Check for Existing Operational Event for this Reservation
  const existingEvent = await findExistingCleaningEvent(reservation.id);

  if (existingEvent) {
    // Check if event was manually edited by the user
    const isManualOverride = Boolean(existingEvent.metadata?.is_manual_override);

    if (isManualOverride) {
      return {
        success: true,
        action: 'SKIPPED',
        eventId: existingEvent.id,
        message: 'Agendamento possui alteração manual do usuário e foi preservado.'
      };
    }

    // Update existing automatic event with updated date, chacara, staff
    const updatedPayload: Partial<OperationalEvent> = {
      id: existingEvent.id,
      chacara_id: chacaraId,
      chacara_name: chacaraName,
      title: `Limpeza Pré Check-in - ${chacaraName} (Reserva #${reservation.code})`,
      description: `Agendamento automático de limpeza 1 dia antes do check-in da reserva #${reservation.code}.`,
      start_date: cleaningDate,
      end_date: cleaningDate,
      start_time: existingEvent.start_time || '08:00',
      end_time: existingEvent.end_time || '12:00',
      status: existingEvent.status === 'CANCELADO' ? 'AGENDADO' : existingEvent.status,
      staff_ids: staffIds,
      staff_names: staffNames,
      reservation_id: reservation.id,
      metadata: {
        ...(existingEvent.metadata || {}),
        origin: 'AUTOMATICA',
        type: 'LIMPEZA_PRE_CHECKIN',
        is_manual_override: false,
        reservation_code: reservation.code,
        checkin_date: reservation.checkin_date,
        updated_at: new Date().toISOString()
      }
    };

    if (isDemoMode()) {
      await demoRepository.saveOperationalEvent(updatedPayload);
    } else {
      await supabase
        .from('operational_events')
        .update(updatedPayload)
        .eq('id', existingEvent.id);
    }

    return {
      success: true,
      action: 'UPDATED',
      eventId: existingEvent.id,
      message: `Agendamento de limpeza atualizado com sucesso para ${cleaningDate}.`
    };
  }

  // 8. Create NEW Operational Cleaning Event
  const newEventPayload: Partial<OperationalEvent> = {
    chacara_id: chacaraId,
    chacara_name: chacaraName,
    event_type_code: 'limpeza',
    event_type_id: await getLimpezaEventTypeId(),
    title: `Limpeza Pré Check-in - ${chacaraName} (Reserva #${reservation.code})`,
    description: `Agendamento automático de limpeza 1 dia antes do check-in da reserva #${reservation.code}.`,
    start_date: cleaningDate,
    start_time: '08:00',
    end_date: cleaningDate,
    end_time: '12:00',
    status: 'AGENDADO',
    staff_ids: staffIds,
    staff_names: staffNames,
    reservation_id: reservation.id,
    metadata: {
      origin: 'AUTOMATICA',
      type: 'LIMPEZA_PRE_CHECKIN',
      is_manual_override: false,
      reservation_code: reservation.code,
      checkin_date: reservation.checkin_date,
      created_at: new Date().toISOString()
    }
  };

  let createdId = '';
  if (isDemoMode()) {
    const created = await demoRepository.saveOperationalEvent(newEventPayload);
    createdId = created.id;
  } else {
    const { data, error } = await supabase
      .from('operational_events')
      .insert([newEventPayload])
      .select()
      .single();

    if (error) {
      console.error('[cleaningAutomation] Erro ao criar evento de limpeza no Supabase:', error.message);
      return { success: false, action: 'SKIPPED', message: 'Falha ao salvar evento de limpeza: ' + error.message };
    }
    createdId = data.id;
  }

  return {
    success: true,
    action: 'CREATED',
    eventId: createdId,
    message: `Agendamento automático de limpeza criado para ${cleaningDate}.`
  };
}

/**
 * Reconciles ALL confirmed reservations in the database, ensuring every confirmed reservation
 * has its automatic cleaning service or operational pendency set up.
 */
export async function reconcileAllReservationsCleaningAutomation(): Promise<{
  totalProcessed: number;
  created: number;
  updated: number;
  cancelled: number;
  pendenciesCreated: number;
}> {
  let stats = {
    totalProcessed: 0,
    created: 0,
    updated: 0,
    cancelled: 0,
    pendenciesCreated: 0
  };

  try {
    let allReservations: Reservation[] = [];

    if (isDemoMode()) {
      allReservations = await demoRepository.getReservations();
    } else {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, chacara:chacaras(*)')
        .eq('is_deleted', false);

      if (error || !data) {
        console.error('[cleaningAutomation] Erro na reconciliação:', error?.message);
        return stats;
      }
      allReservations = data as Reservation[];
    }

    const results = await Promise.all(
      allReservations.map(async (res) => {
        try {
          const resResult = await syncReservationCleaningAutomation(res);
          return { resResult, success: true };
        } catch {
          return { resResult: null, success: false };
        }
      })
    );

    for (const item of results) {
      stats.totalProcessed++;
      if (item.resResult) {
        if (item.resResult.action === 'CREATED') stats.created++;
        else if (item.resResult.action === 'UPDATED') stats.updated++;
        else if (item.resResult.action === 'CANCELLED') stats.cancelled++;
        else if (item.resResult.action === 'PENDENCY_CREATED') stats.pendenciesCreated++;
      }
    }
  } catch (err) {
    console.error('[cleaningAutomation] Exceção em reconcileAllReservationsCleaningAutomation:', err);
  }

  return stats;
}
