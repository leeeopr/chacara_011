import { supabase } from '@/lib/supabase';
import { Reservation, ReservationGuest, ChacaraBlock } from '@/lib/chacaraTypes';
import { getChacaraById } from './chacarasService';
import { getClientById } from './clientsService';
import { isDemoMode } from '@/lib/appMode';
import { demoRepository } from '@/lib/demoRepository';
import { syncReservationCleaningAutomation } from './cleaningAutomationService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

export async function getReservations(filters?: {
  search?: string;
  status?: string;
  chacara_id?: string;
  client_id?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Reservation[]> {
  if (isDemoMode()) {
    return demoRepository.getReservations(filters);
  }
  try {
    let query = supabase
      .from('reservations')
      .select('*, chacara:chacaras(*), client:clients(*), guests_list:reservation_guests(*)')
      .eq('is_deleted', false)
      .order('checkin_date', { ascending: true });

    if (filters?.status && filters.status !== 'TODOS') {
      query = query.eq('status', filters.status);
    }

    if (filters?.chacara_id && filters.chacara_id !== 'TODAS' && isValidUUID(filters.chacara_id)) {
      query = query.eq('chacara_id', filters.chacara_id);
    }

    if (filters?.client_id && isValidUUID(filters.client_id)) {
      query = query.eq('client_id', filters.client_id);
    }

    if (filters?.startDate) {
      query = query.gte('checkin_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('checkout_date', filters.endDate);
    }

    if (filters?.search && filters.search.trim() !== '') {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`code.ilike.${term},special_requests.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[reservationsService] Erro ao buscar reservas no Supabase:', error.message);
      return [];
    }

    let result = (data as Reservation[]) || [];

    // Populamento de segurança se chacara/client não forem retornados via join
    for (let i = 0; i < result.length; i++) {
      const res = result[i];
      if (!res.chacara && res.chacara_id) {
        res.chacara = (await getChacaraById(res.chacara_id)) || undefined;
      }
      if (!res.client && res.client_id) {
        res.client = (await getClientById(res.client_id)) || undefined;
      }
      if (res.financial_summary) {
        if (res.financial_summary.custom_price != null && res.custom_price === undefined) {
          res.custom_price = res.financial_summary.custom_price;
        }
        if (res.financial_summary.is_custom_price !== undefined && res.is_custom_price === undefined) {
          res.is_custom_price = res.financial_summary.is_custom_price;
        }
      }
    }

    return result.sort((a, b) => (a.checkin_date || '').localeCompare(b.checkin_date || ''));
  } catch (err) {
    console.error('[reservationsService] Exceção ao buscar reservas:', err);
    return [];
  }
}

export async function getReservationById(id: string): Promise<Reservation | null> {
  if (!id) return null;
  if (isDemoMode()) {
    return demoRepository.getReservationById(id);
  }
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*, chacara:chacaras(*), client:clients(*), guests_list:reservation_guests(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[reservationsService] Erro ao buscar reserva por ID:', error.message);
      return null;
    }

    let res = data as Reservation | null;
    if (res) {
      if (!res.chacara && res.chacara_id) {
        res.chacara = (await getChacaraById(res.chacara_id)) || undefined;
      }
      if (!res.client && res.client_id) {
        res.client = (await getClientById(res.client_id)) || undefined;
      }
      if (res.financial_summary) {
        if (res.financial_summary.custom_price != null && res.custom_price === undefined) {
          res.custom_price = res.financial_summary.custom_price;
        }
        if (res.financial_summary.is_custom_price !== undefined && res.is_custom_price === undefined) {
          res.is_custom_price = res.financial_summary.is_custom_price;
        }
      }
    }

    return res;
  } catch (e) {
    console.error('[reservationsService] Exceção em getReservationById:', e);
    return null;
  }
}

export async function checkAvailability(
  chacara_id: string,
  checkin_date: string,
  checkin_time: string,
  checkout_date: string,
  checkout_time: string,
  exclude_reservation_id?: string
) {
  if (isDemoMode()) {
    return demoRepository.checkAvailability(chacara_id, checkin_date, checkin_time, checkout_date, checkout_time, exclude_reservation_id);
  }
  if (isValidUUID(chacara_id)) {
    try {
      const { data, error } = await supabase.rpc('check_chacara_availability', {
        p_chacara_id: chacara_id,
        p_checkin_date: checkin_date,
        p_checkin_time: checkin_time,
        p_checkout_date: checkout_date,
        p_checkout_time: checkout_time,
        p_exclude_reservation_id: exclude_reservation_id || null
      });

      if (!error && data && data.length > 0) {
        const res = data[0] as { is_available: boolean; conflict_type: string; conflict_code: string };
        if (!res.is_available) return res;
      }
    } catch (e) {
      // fallback to JS check if RPC not present
    }
  }

  return await fallbackCheckAvailability(chacara_id, checkin_date, checkin_time, checkout_date, checkout_time, exclude_reservation_id);
}

async function fallbackCheckAvailability(
  chacara_id: string,
  checkin_date: string,
  checkin_time: string,
  checkout_date: string,
  checkout_time: string,
  exclude_id?: string
) {
  const reqStart = new Date(`${checkin_date}T${checkin_time || '14:00'}:00`).getTime();
  const reqEnd = new Date(`${checkout_date}T${checkout_time || '12:00'}:00`).getTime();

  // 1. Check reservations
  const allReservations = await getReservations({ chacara_id });
  const activeReservations = allReservations.filter(
    r => !r.is_deleted && r.status !== 'CANCELADA' && r.status !== 'NO_SHOW'
  );

  for (const res of activeReservations) {
    if (exclude_id && res.id === exclude_id) continue;
    const resStart = new Date(`${res.checkin_date}T${res.checkin_time || '14:00'}:00`).getTime();
    const resEnd = new Date(`${res.checkout_date}T${res.checkout_time || '12:00'}:00`).getTime();

    if (reqStart < resEnd && reqEnd > resStart) {
      if (res.status === 'PRE_RESERVA') {
        return { 
          is_available: false, 
          conflict_type: 'PRE_RESERVA_EXISTENTE', 
          conflict_code: 'CONFLICT_PRE_RESERVA',
          conflict_reservation: res
        };
      }
      return { 
        is_available: false, 
        conflict_type: 'RESERVA_EXISTENTE', 
        conflict_code: 'CONFLICT_RESERVATION',
        conflict_reservation: res
      };
    }
  }

  // 2. Check blocks
  const blocks = await getChacaraBlocks(chacara_id);
  for (const b of blocks) {
    const bStart = new Date(`${b.start_date}T00:00:00`).getTime();
    const bEnd = new Date(`${b.end_date}T23:59:59`).getTime();

    if (reqStart <= bEnd && reqEnd >= bStart) {
      return { is_available: false, conflict_type: 'BLOQUEIO_ADMINISTRATIVO', conflict_code: 'CONFLICT_BLOCK' };
    }
  }

  return { is_available: true, conflict_type: 'DISPONIVEL', conflict_code: 'OK' };
}

export async function createReservation(
  reservationData: Partial<Reservation>,
  guests: Partial<ReservationGuest>[] = []
): Promise<Reservation> {
  if (isDemoMode()) {
    return demoRepository.createReservation(reservationData, guests);
  }
  // Validar disponibilidade obrigatoriamente
  if (reservationData.chacara_id && reservationData.checkin_date && reservationData.checkout_date) {
    const avail = await checkAvailability(
      reservationData.chacara_id,
      reservationData.checkin_date,
      reservationData.checkin_time || '14:00',
      reservationData.checkout_date,
      reservationData.checkout_time || '12:00'
    );

    if (!avail.is_available) {
      if (avail.conflict_type === 'PRE_RESERVA_EXISTENTE') {
        throw new Error('Existe uma pré-reserva aguardando confirmação para este período.');
      } else if (avail.conflict_type === 'BLOQUEIO_ADMINISTRATIVO') {
        throw new Error('Esta chácara possui um bloqueio no período selecionado.');
      } else {
        throw new Error('Esta chácara possui uma reserva confirmada para este período.');
      }
    }
  }

  // Congelar snapshot da chácara se não existir
  if (!reservationData.chacara_snapshot && reservationData.chacara_id) {
    const chacara = await getChacaraById(reservationData.chacara_id);
    if (chacara) {
      reservationData.chacara_snapshot = {
        name: chacara.name,
        capacity_people: chacara.capacity_people,
        bedrooms_count: chacara.bedrooms_count,
        bathrooms_count: chacara.bathrooms_count,
        daily_rate_standard: chacara.daily_rate_standard,
        daily_rate_weekend: chacara.daily_rate_weekend,
        cleaning_fee: chacara.cleaning_fee,
        deposit_amount: chacara.deposit_amount,
        rules: chacara.rules,
        checkin_time: chacara.checkin_time,
        checkout_time: chacara.checkout_time
      };
    }
  }

  const { 
    guests_list: _gl, 
    chacara: _ch, 
    client: _cl, 
    id: _id, 
    created_at: _ca, 
    updated_at: _ua, 
    custom_price: customPriceVal, 
    is_custom_price: isCustomPriceVal, 
    ...insertData 
  } = reservationData as any;

  const code = insertData.code || `REC-${Math.floor(1000 + Math.random() * 9000)}`;
  const rawCreatedBy = insertData.created_by || 'Sistema';

  const existingFin = insertData.financial_summary || {};
  const finSummary = {
    ...existingFin,
    ...(customPriceVal != null ? { custom_price: Number(customPriceVal) } : {}),
    ...(isCustomPriceVal != null ? { is_custom_price: Boolean(isCustomPriceVal) } : {})
  };

  const payloadToInsert: Record<string, any> = {
    ...insertData,
    financial_summary: finSummary,
    code,
    chacara_id: isValidUUID(insertData.chacara_id) ? insertData.chacara_id : null,
    client_id: isValidUUID(insertData.client_id) ? insertData.client_id : null,
    status: insertData.status || 'PRE_RESERVA',
    created_by: isValidUUID(rawCreatedBy) ? rawCreatedBy : null,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Safe insert with retry if column is not yet present in Supabase table
  let created: any = null;
  let lastInsertError: any = null;
  const currentPayload = { ...payloadToInsert };

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await supabase
      .from('reservations')
      .insert([currentPayload])
      .select()
      .single();

    if (!error && data) {
      created = data;
      break;
    }

    lastInsertError = error;
    const msg = error?.message || '';

    // Check for missing column error in schema
    const matchCol = msg.match(/Could not find the '([^']+)' column/i) || msg.match(/column "([^"]+)" of relation "reservations" does not exist/i);
    if (matchCol && matchCol[1]) {
      const col = matchCol[1];
      if (currentPayload.hasOwnProperty(col)) {
        console.warn(`[reservationsService] Removendo coluna inexistente '${col}' e tentando novamente.`);
        delete currentPayload[col];
        continue;
      }
    }

    // Check for invalid UUID / foreign key format on optional columns
    if (msg.includes('invalid input syntax for type uuid') || msg.includes('foreign key constraint')) {
      for (const key of ['primary_staff_id', 'staff_id', 'company_id', 'created_by']) {
        if (currentPayload[key] && !isValidUUID(currentPayload[key])) {
          delete currentPayload[key];
        }
      }
      continue;
    }

    break;
  }

  if (!created) {
    console.error('[reservationsService] Erro ao criar reserva no Supabase:', lastInsertError?.message);
    throw new Error('Falha ao criar reserva no banco: ' + (lastInsertError?.message || ''));
  }

  const reservation = created as Reservation;

  if (guests && guests.length > 0) {
    const guestRecords = guests.map(g => ({
      reservation_id: reservation.id,
      full_name: g.full_name || 'Hóspede',
      document_number: g.document_number,
      is_responsible: !!g.is_responsible,
      is_child: !!g.is_child,
      vehicle_plate: g.vehicle_plate,
      notes: g.notes
    }));
    await supabase.from('reservation_guests').insert(guestRecords);
  }

  try {
    await supabase.from('reservation_history').insert([{
      reservation_id: reservation.id,
      action_type: 'CRIACAO',
      previous_status: null,
      new_status: reservation.status,
      performed_by: rawCreatedBy,
      notes: 'Pré-reserva criada no sistema'
    }]);
  } catch (err) {
    console.warn('[reservationsService] Não foi possível gravar no reservation_history:', err);
  }

  const finalReservation = (await getReservationById(reservation.id)) || reservation;
  try {
    await syncReservationCleaningAutomation(finalReservation);
  } catch (err) {
    console.warn('[reservationsService] Erro ao sincronizar automação de limpeza:', err);
  }
  return finalReservation;
}

export async function updateReservation(
  id: string,
  reservationData: Partial<Reservation>,
  guests?: Partial<ReservationGuest>[]
): Promise<Reservation> {
  if (isDemoMode()) {
    return demoRepository.updateReservation(id, reservationData, guests);
  }
  const previous = await getReservationById(id);
  const { 
    guests_list: _gl, 
    chacara: _ch, 
    client: _cl, 
    id: _id, 
    created_at: _ca, 
    updated_at: _ua, 
    custom_price: customPriceVal, 
    is_custom_price: isCustomPriceVal, 
    ...updateData 
  } = reservationData as any;

  if (customPriceVal !== undefined || isCustomPriceVal !== undefined) {
    const existingFin = updateData.financial_summary || previous?.financial_summary || {};
    updateData.financial_summary = {
      ...existingFin,
      ...(customPriceVal !== undefined ? { custom_price: customPriceVal != null ? Number(customPriceVal) : null } : {}),
      ...(isCustomPriceVal !== undefined ? { is_custom_price: Boolean(isCustomPriceVal) } : {})
    };
  }

  if (updateData.created_by !== undefined && !isValidUUID(updateData.created_by)) {
    delete updateData.created_by;
  }
  if (updateData.chacara_id !== undefined && !isValidUUID(updateData.chacara_id)) {
    updateData.chacara_id = null;
  }
  if (updateData.client_id !== undefined && !isValidUUID(updateData.client_id)) {
    updateData.client_id = null;
  }

  const payload: Record<string, any> = {
    ...updateData,
    updated_at: new Date().toISOString()
  };

  let updated: any = null;
  let lastUpdateError: any = null;
  const currentUpdatePayload = { ...payload };

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await supabase
      .from('reservations')
      .update(currentUpdatePayload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      updated = data;
      break;
    }

    lastUpdateError = error;
    const msg = error?.message || '';

    const matchCol = msg.match(/Could not find the '([^']+)' column/i) || msg.match(/column "([^"]+)" of relation "reservations" does not exist/i);
    if (matchCol && matchCol[1]) {
      const col = matchCol[1];
      if (currentUpdatePayload.hasOwnProperty(col)) {
        console.warn(`[reservationsService] Removendo coluna inexistente '${col}' no update e tentando novamente.`);
        delete currentUpdatePayload[col];
        continue;
      }
    }

    if (msg.includes('invalid input syntax for type uuid') || msg.includes('foreign key constraint')) {
      for (const key of ['primary_staff_id', 'staff_id', 'company_id', 'created_by']) {
        if (currentUpdatePayload[key] && !isValidUUID(currentUpdatePayload[key])) {
          delete currentUpdatePayload[key];
        }
      }
      continue;
    }

    break;
  }

  if (!updated) {
    console.error('[reservationsService] Erro ao atualizar reserva:', lastUpdateError?.message);
    throw new Error('Falha ao atualizar reserva: ' + (lastUpdateError?.message || ''));
  }

  const reservation = updated as Reservation;

  if (guests !== undefined) {
    await supabase.from('reservation_guests').delete().eq('reservation_id', id);
    if (guests.length > 0) {
      const guestRecords = guests.map(g => ({
        reservation_id: id,
        full_name: g.full_name || 'Hóspede',
        document_number: g.document_number,
        is_responsible: !!g.is_responsible,
        is_child: !!g.is_child,
        vehicle_plate: g.vehicle_plate,
        notes: g.notes
      }));
      await supabase.from('reservation_guests').insert(guestRecords);
    }
  }

  if (previous && previous.status !== reservation.status) {
    await supabase.from('reservation_history').insert([{
      reservation_id: id,
      action_type: 'MUDANCA_STATUS',
      previous_status: previous.status,
      new_status: reservation.status,
      notes: `Status alterado de ${previous.status} para ${reservation.status}`
    }]);
  }

  const finalReservation = (await getReservationById(id)) || reservation;
  try {
    await syncReservationCleaningAutomation(finalReservation);
  } catch (err) {
    console.warn('[reservationsService] Erro ao sincronizar automação de limpeza:', err);
  }
  return finalReservation;
}

export async function updateReservationCustomPrice(
  reservationId: string,
  customPrice: number | null,
  performedBy?: string,
  reason?: string
): Promise<Reservation> {
  if (isDemoMode()) {
    return demoRepository.updateReservationCustomPrice(reservationId, customPrice, performedBy, reason);
  }

  const reservation = await getReservationById(reservationId);
  if (!reservation) {
    throw new Error('Reserva não encontrada');
  }

  const isCustom = customPrice !== null && !isNaN(Number(customPrice));
  const numericVal = isCustom ? Math.max(0, Number(customPrice)) : null;

  const currentFin = reservation.financial_summary || {};
  const calculatedTotal = Number(currentFin.calculated_total || currentFin.subtotal_before_adjustment || currentFin.total_amount || 0);
  const newTotalAmount = isCustom && numericVal !== null ? numericVal : calculatedTotal;

  const updatedFin = {
    ...currentFin,
    calculated_total: calculatedTotal,
    custom_price: numericVal,
    is_custom_price: isCustom,
    total_amount: newTotalAmount
  };

  const { data: updated, error } = await supabase
    .from('reservations')
    .update({
      financial_summary: updatedFin,
      updated_at: new Date().toISOString()
    })
    .eq('id', reservationId)
    .select()
    .single();

  if (error || !updated) {
    console.error('[reservationsService] Erro ao atualizar preço personalizado:', error?.message);
    throw new Error('Falha ao atualizar preço da reserva: ' + (error?.message || ''));
  }

  // Also update reservation_charges total_amount if present
  try {
    await supabase
      .from('reservation_charges')
      .update({ total_amount: newTotalAmount, updated_at: new Date().toISOString() })
      .eq('reservation_id', reservationId);
  } catch (e) {
    console.warn('[reservationsService] Não foi possível sincronizar cobrança:', e);
  }

  // Audit history
  try {
    await supabase.from('reservation_history').insert([{
      reservation_id: reservationId,
      action_type: 'EDICAO',
      previous_status: reservation.status,
      new_status: reservation.status,
      performed_by: performedBy || 'Administrador',
      notes: isCustom 
        ? `Preço personalizado alterado para R$ ${numericVal?.toFixed(2)}${reason ? ` (${reason})` : ''}`
        : 'Preço personalizado removido — retornado ao valor padrão calculado por diárias'
    }]);
  } catch (err) {
    console.warn('[reservationsService] Erro ao gravar histórico de edição de preço:', err);
  }

  return (await getReservationById(reservationId)) || (updated as Reservation);
}

export async function confirmReservation(id: string, confirmedBy: string = 'Administrador'): Promise<Reservation> {
  if (isDemoMode()) {
    return demoRepository.confirmReservation(id, confirmedBy);
  }
  const previous = await getReservationById(id);

  const now = new Date().toISOString();

  // Primary update payload
  const updatePayload: Record<string, any> = {
    status: 'CONFIRMADA',
    confirmed_by: confirmedBy,
    confirmed_at: now,
    updated_at: now
  };

  const { data: updated, error } = await supabase
    .from('reservations')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    // If column missing error, fallback without confirmed_by/confirmed_at
    const { data: fallbackUpdated, error: fallbackError } = await supabase
      .from('reservations')
      .update({ status: 'CONFIRMADA', updated_at: now })
      .eq('id', id)
      .select()
      .single();

    if (fallbackError || !fallbackUpdated) {
      console.error('[reservationsService] Erro ao confirmar reserva:', fallbackError?.message);
      throw new Error('Falha ao confirmar reserva: ' + (fallbackError?.message || ''));
    }

    try {
      await supabase.from('reservation_history').insert([{
        reservation_id: id,
        action_type: 'CONFIRMACAO',
        previous_status: previous?.status || 'PRE_RESERVA',
        new_status: 'CONFIRMADA',
        performed_by: confirmedBy,
        notes: 'Pré-reserva confirmada pelo usuário'
      }]);
    } catch (e) {
      console.warn('[reservationsService] History insert failed:', e);
    }

    return fallbackUpdated as Reservation;
  }

  try {
    await supabase.from('reservation_history').insert([{
      reservation_id: id,
      action_type: 'CONFIRMACAO',
      previous_status: previous?.status || 'PRE_RESERVA',
      new_status: 'CONFIRMADA',
      performed_by: confirmedBy,
      notes: 'Pré-reserva confirmada pelo usuário'
    }]);
  } catch (e) {
    console.warn('[reservationsService] History insert failed:', e);
  }

  const confirmedRes = (await getReservationById(id)) || (updated as Reservation);
  try {
    await syncReservationCleaningAutomation(confirmedRes);
  } catch (err) {
    console.warn('[reservationsService] Erro na automação de limpeza:', err);
  }
  return confirmedRes;
}

export async function cancelReservation(
  id: string, 
  reason: string, 
  cancelledBy: string = 'Administrador', 
  fee: number = 0
): Promise<Reservation> {
  if (isDemoMode()) {
    return demoRepository.cancelReservation(id, reason, cancelledBy, fee);
  }
  const previous = await getReservationById(id);
  const now = new Date().toISOString();

  const updatePayload: Record<string, any> = {
    status: 'CANCELADA',
    cancelled_by: cancelledBy,
    cancelled_at: now,
    canceled_by: cancelledBy,
    canceled_at: now,
    cancel_reason: reason,
    cancellation_fee: fee,
    updated_at: now
  };

  const { data: updated, error } = await supabase
    .from('reservations')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    // Fallback without extra tracking columns if DB schema hasn't run yet
    const { data: fallbackUpdated, error: fallbackError } = await supabase
      .from('reservations')
      .update({
        status: 'CANCELADA',
        cancel_reason: reason,
        cancellation_fee: fee,
        updated_at: now
      })
      .eq('id', id)
      .select()
      .single();

    if (fallbackError || !fallbackUpdated) {
      console.error('[reservationsService] Erro ao cancelar reserva:', fallbackError?.message);
      throw new Error('Falha ao cancelar reserva: ' + (fallbackError?.message || ''));
    }

    return fallbackUpdated as Reservation;
  }

  try {
    await supabase.from('reservation_history').insert([{
      reservation_id: id,
      action_type: 'CANCELAMENTO',
      previous_status: previous?.status,
      new_status: 'CANCELADA',
      performed_by: cancelledBy,
      notes: `Reserva cancelada: ${reason}`
    }]);
  } catch (e) {
    console.warn('[reservationsService] History insert failed:', e);
  }

  const cancelledRes = (await getReservationById(id)) || (updated as Reservation);
  try {
    await syncReservationCleaningAutomation(cancelledRes);
  } catch (err) {
    console.warn('[reservationsService] Erro na automação de limpeza:', err);
  }
  return cancelledRes;
}

export async function getReservationHistory(reservationId: string) {
  try {
    const { data, error } = await supabase
      .from('reservation_history')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('performed_at', { ascending: false });

    if (error) {
      console.warn('[reservationsService] Erro ao buscar histórico da reserva:', error.message);
      return [];
    }

    return data || [];
  } catch (e) {
    console.warn('[reservationsService] Exceção em getReservationHistory:', e);
    return [];
  }
}

export async function executeCheckin(id: string, notes?: string): Promise<Reservation> {
  if (isDemoMode()) {
    return demoRepository.executeCheckin(id, notes);
  }
  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('reservations')
    .update({
      status: 'CHECKIN_REALIZADO',
      actual_checkin_at: now,
      checkin_notes: notes || 'Check-in realizado com sucesso',
      updated_at: now
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    console.error('[reservationsService] Erro ao executar checkin:', error?.message);
    throw new Error('Falha ao executar check-in: ' + (error?.message || ''));
  }

  return updated as Reservation;
}

export async function executeCheckout(id: string, notes?: string): Promise<Reservation> {
  if (isDemoMode()) {
    return demoRepository.executeCheckout(id, notes);
  }
  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('reservations')
    .update({
      status: 'CHECKOUT_REALIZADO',
      actual_checkout_at: now,
      checkout_notes: notes || 'Check-out realizado com sucesso',
      updated_at: now
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    console.error('[reservationsService] Erro ao executar checkout:', error?.message);
    throw new Error('Falha ao executar check-out: ' + (error?.message || ''));
  }

  return updated as Reservation;
}

export async function duplicateReservation(id: string): Promise<Reservation> {
  if (isDemoMode()) {
    return demoRepository.duplicateReservation(id);
  }
  const original = await getReservationById(id);
  if (!original) throw new Error('Reserva original não encontrada.');

  const { id: _id, code: _code, created_at: _ca, updated_at: _ua, ...rest } = original;

  return await createReservation({
    ...rest,
    status: 'PRE_RESERVA',
    special_requests: `Cópia da reserva ${original.code}. ${original.special_requests || ''}`
  }, original.guests_list || []);
}

export async function deleteReservation(id: string): Promise<boolean> {
  const previous = await getReservationById(id);
  if (isDemoMode()) {
    const ok = await demoRepository.deleteReservation(id);
    if (previous) {
      try {
        await syncReservationCleaningAutomation({ ...previous, is_deleted: true });
      } catch (err) {
        console.warn('[reservationsService] Erro na automação de limpeza na exclusão:', err);
      }
    }
    return ok;
  }
  const { error } = await supabase
    .from('reservations')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[reservationsService] Erro ao excluir reserva:', error.message);
    throw new Error('Falha ao excluir reserva: ' + error.message);
  }

  if (previous) {
    try {
      await syncReservationCleaningAutomation({ ...previous, is_deleted: true });
    } catch (err) {
      console.warn('[reservationsService] Erro na automação de limpeza na exclusão:', err);
    }
  }

  return true;
}

export async function getChacaraBlocks(chacara_id?: string): Promise<ChacaraBlock[]> {
  if (isDemoMode()) {
    return demoRepository.getChacaraBlocks(chacara_id);
  }
  try {
    let query = supabase.from('chacara_blocks').select('*, chacara:chacaras(*)').order('start_date', { ascending: true });
    if (chacara_id && chacara_id !== 'TODAS' && isValidUUID(chacara_id)) {
      query = query.eq('chacara_id', chacara_id);
    }
    const { data, error } = await query;
    if (error) {
      console.error('[reservationsService] Erro ao buscar bloqueios:', error.message);
      return [];
    }
    return (data as ChacaraBlock[]) || [];
  } catch (e) {
    console.error('[reservationsService] Exceção ao buscar bloqueios:', e);
    return [];
  }
}

export async function createChacaraBlock(block: Partial<ChacaraBlock>): Promise<ChacaraBlock> {
  if (isDemoMode()) {
    return demoRepository.createChacaraBlock(block);
  }
  if (!block.chacara_id) {
    throw new Error('Selecione uma chácara para criar o bloqueio.');
  }
  if (!block.start_date || !block.end_date) {
    throw new Error('Informe as datas de início e término do bloqueio.');
  }
  if (block.start_date > block.end_date) {
    throw new Error('A data de início não pode ser posterior à data de término.');
  }

  const bStart = new Date(`${block.start_date}T00:00:00`).getTime();
  const bEnd = new Date(`${block.end_date}T23:59:59`).getTime();

  // 1. Verificar se existe alguma reserva ativa que intercepte este período
  const allReservations = await getReservations({ chacara_id: block.chacara_id });
  const activeReservations = allReservations.filter(
    r => !r.is_deleted && r.status !== 'CANCELADA' && r.status !== 'NO_SHOW'
  );

  for (const res of activeReservations) {
    const resStart = new Date(`${res.checkin_date}T${res.checkin_time || '14:00'}:00`).getTime();
    const resEnd = new Date(`${res.checkout_date}T${res.checkout_time || '12:00'}:00`).getTime();

    if (bStart < resEnd && bEnd > resStart) {
      throw new Error('Já existe uma reserva neste período. O bloqueio não pode ser criado.');
    }
  }

  // 2. Verificar se já existe um bloqueio no mesmo período
  const existingBlocks = await getChacaraBlocks(block.chacara_id);
  for (const ex of existingBlocks) {
    const exStart = new Date(`${ex.start_date}T00:00:00`).getTime();
    const exEnd = new Date(`${ex.end_date}T23:59:59`).getTime();

    if (bStart <= exEnd && bEnd >= exStart) {
      throw new Error('Já existe um bloqueio cadastrado para este período.');
    }
  }

  const payloadToInsert = {
    chacara_id: block.chacara_id,
    start_date: block.start_date,
    end_date: block.end_date,
    title: block.title || 'Bloqueio Administrativo',
    reason: block.reason || 'MANUTENCAO',
    description: block.description || null,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('chacara_blocks')
    .insert([payloadToInsert])
    .select()
    .single();

  if (error || !data) {
    console.error('[reservationsService] Erro ao criar bloqueio:', error?.message);
    throw new Error('Falha ao registrar bloqueio no banco: ' + (error?.message || ''));
  }

  return data as ChacaraBlock;
}

export async function updateChacaraBlock(id: string, updates: Partial<ChacaraBlock>): Promise<boolean> {
  if (isDemoMode()) {
    return demoRepository.updateChacaraBlock(id, updates);
  }
  if (updates.start_date && updates.end_date && updates.start_date > updates.end_date) {
    throw new Error('A data de início não pode ser posterior à data de término.');
  }

  if (updates.chacara_id && updates.start_date && updates.end_date) {
    const bStart = new Date(`${updates.start_date}T00:00:00`).getTime();
    const bEnd = new Date(`${updates.end_date}T23:59:59`).getTime();

    const allReservations = await getReservations({ chacara_id: updates.chacara_id });
    const activeReservations = allReservations.filter(
      r => !r.is_deleted && r.status !== 'CANCELADA' && r.status !== 'NO_SHOW'
    );

    for (const res of activeReservations) {
      const resStart = new Date(`${res.checkin_date}T${res.checkin_time || '14:00'}:00`).getTime();
      const resEnd = new Date(`${res.checkout_date}T${res.checkout_time || '12:00'}:00`).getTime();

      if (bStart < resEnd && bEnd > resStart) {
        throw new Error('Já existe uma reserva neste período. O bloqueio não pode ser atualizado para estas datas.');
      }
    }

    const existingBlocks = await getChacaraBlocks(updates.chacara_id);
    for (const ex of existingBlocks) {
      if (ex.id === id) continue;
      const exStart = new Date(`${ex.start_date}T00:00:00`).getTime();
      const exEnd = new Date(`${ex.end_date}T23:59:59`).getTime();

      if (bStart <= exEnd && bEnd >= exStart) {
        throw new Error('Já existe outro bloqueio cadastrado para este período.');
      }
    }
  }

  const { error } = await supabase
    .from('chacara_blocks')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[reservationsService] Erro ao atualizar bloqueio:', error.message);
    throw new Error('Falha ao atualizar bloqueio: ' + error.message);
  }

  return true;
}

export async function deleteChacaraBlock(id: string): Promise<boolean> {
  if (isDemoMode()) {
    return demoRepository.deleteChacaraBlock(id);
  }
  const { error } = await supabase.from('chacara_blocks').delete().eq('id', id);
  if (error) {
    console.error('[reservationsService] Erro ao excluir bloqueio:', error.message);
    throw new Error('Falha ao excluir bloqueio: ' + error.message);
  }

  return true;
}

// ==========================================
// RECONCILIAÇÃO E VINCULAÇÃO FUNCIONÁRIO <-> RESERVA
// ==========================================

export interface StaffReconciliationReport {
  total_reservas: number;
  ja_vinculadas: number;
  vinculadas_automaticamente: number;
  sem_vinculacao_informacao_insuficiente: number;
  conflitos_ambiguidades: number;
  detalhes: Array<{
    reservation_id: string;
    reservation_code: string;
    chacara_name: string;
    checkin_date: string;
    checkout_date: string;
    status_migracao: 'JA_VINCULADO' | 'VINCULADO_AUTO_OPERACIONAL' | 'VINCULADO_AUTO_EQUIPE_CHACARA' | 'SEM_FUNCIONARIO_DEFINIDO';
    staff_ids: string[];
    staff_names: string[];
    motivo: string;
  }>;
}

export async function reconcileExistingReservationStaffAssignments(): Promise<StaffReconciliationReport> {
  if (isDemoMode()) {
    return demoRepository.reconcileExistingReservationStaffAssignments();
  }

  try {
    // 1. Buscar todas as reservas ativas
    const { data: resData, error: resErr } = await supabase
      .from('reservations')
      .select('*, chacara:chacaras(*)')
      .eq('is_deleted', false);

    if (resErr) {
      throw new Error('Erro ao buscar reservas no banco: ' + resErr.message);
    }

    const reservations = (resData || []) as Reservation[];

    // 2. Buscar eventos operacionais vinculados
    const { data: opData } = await supabase
      .from('operational_events')
      .select('*');
    const opEvents = opData || [];

    // 3. Buscar vínculos de chácara/equipe
    const { data: pcData } = await supabase
      .from('property_crew')
      .select('*');
    const propertyCrewList = pcData || [];

    // 4. Buscar cadastro de colaboradores
    const { data: mData } = await supabase
      .from('crew_members')
      .select('*');
    const crewMembers = mData || [];
    const membersMap = new Map(crewMembers.map((m: any) => [m.id, m.nome || m.name || 'Funcionário']));

    let ja_vinculadas = 0;
    let vinculadas_automaticamente = 0;
    let sem_vinculacao_informacao_insuficiente = 0;
    let conflitos_ambiguidades = 0;

    const detalhes: StaffReconciliationReport['detalhes'] = [];

    for (const res of reservations) {
      const resStaffIds: string[] = Array.isArray(res.staff_ids) ? res.staff_ids.filter(Boolean) : [];
      const chacaraName = res.chacara?.name || 'Chácara';

      if (resStaffIds.length > 0) {
        ja_vinculadas++;
        const staffNames = resStaffIds.map(id => membersMap.get(id) || 'Funcionário');
        detalhes.push({
          reservation_id: res.id,
          reservation_code: res.code,
          chacara_name: chacaraName,
          checkin_date: res.checkin_date,
          checkout_date: res.checkout_date,
          status_migracao: 'JA_VINCULADO',
          staff_ids: resStaffIds,
          staff_names: staffNames,
          motivo: 'Já possuía funcionários vinculados no registro da reserva.'
        });
        continue;
      }

      // Verificar eventos operacionais vinculados a esta reserva
      const linkedOp = opEvents.filter((e: any) => e.reservation_id === res.id && Array.isArray(e.staff_ids) && e.staff_ids.length > 0);
      if (linkedOp.length > 0) {
        const foundIds: string[] = [];
        linkedOp.forEach((e: any) => {
          (e.staff_ids as string[]).forEach(s => {
            if (s && !foundIds.includes(s)) foundIds.push(s);
          });
        });

        if (foundIds.length > 0) {
          const foundNames = foundIds.map(id => membersMap.get(id) || 'Funcionário');
          await supabase
            .from('reservations')
            .update({
              staff_ids: foundIds,
              staff_names: foundNames,
              primary_staff_id: foundIds[0] || null
            })
            .eq('id', res.id);

          vinculadas_automaticamente++;
          detalhes.push({
            reservation_id: res.id,
            reservation_code: res.code,
            chacara_name: chacaraName,
            checkin_date: res.checkin_date,
            checkout_date: res.checkout_date,
            status_migracao: 'VINCULADO_AUTO_OPERACIONAL',
            staff_ids: foundIds,
            staff_names: foundNames,
            motivo: 'Vinculado automaticamente a partir dos eventos operacionais agendados para esta reserva.'
          });
          continue;
        }
      }

      // Verificar se a chácara possui apenas 1 funcionário fixo vinculado
      const chacaraCrew = propertyCrewList.filter((pc: any) => pc.chacara_id === res.chacara_id || pc.property_id === res.chacara_id);
      if (chacaraCrew.length === 1) {
        const crewMemberId = chacaraCrew[0].member_id || chacaraCrew[0].crew_member_id;
        if (crewMemberId) {
          const staffName = membersMap.get(crewMemberId) || 'Funcionário da Chácara';
          await supabase
            .from('reservations')
            .update({
              staff_ids: [crewMemberId],
              staff_names: [staffName],
              primary_staff_id: crewMemberId
            })
            .eq('id', res.id);

          vinculadas_automaticamente++;
          detalhes.push({
            reservation_id: res.id,
            reservation_code: res.code,
            chacara_name: chacaraName,
            checkin_date: res.checkin_date,
            checkout_date: res.checkout_date,
            status_migracao: 'VINCULADO_AUTO_EQUIPE_CHACARA',
            staff_ids: [crewMemberId],
            staff_names: [staffName],
            motivo: 'Vinculado ao único funcionário responsável cadastrado para esta chácara.'
          });
          continue;
        }
      } else if (chacaraCrew.length > 1) {
        conflitos_ambiguidades++;
      }

      // Sem dados suficientes -> Marcar como 'sem funcionário definido' sem inventar dados
      sem_vinculacao_informacao_insuficiente++;
      detalhes.push({
        reservation_id: res.id,
        reservation_code: res.code,
        chacara_name: chacaraName,
        checkin_date: res.checkin_date,
        checkout_date: res.checkout_date,
        status_migracao: 'SEM_FUNCIONARIO_DEFINIDO',
        staff_ids: [],
        staff_names: [],
        motivo: 'Sem dados suficientes. Identificado como "sem funcionário definido" para atribuição manual.'
      });
    }

    return {
      total_reservas: reservations.length,
      ja_vinculadas,
      vinculadas_automaticamente,
      sem_vinculacao_informacao_insuficiente,
      conflitos_ambiguidades,
      detalhes
    };
  } catch (err: any) {
    console.error('[reservationsService] Erro na reconciliação de funcionários:', err);
    throw err;
  }
}
