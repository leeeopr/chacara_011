import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/appMode';
import { demoRepository } from '@/lib/demoRepository';
import { 
  OperationalEventType, 
  OperationalRecurrenceRule, 
  OperationalEvent, 
  OperationalEventStatus,
  StaffUnavailability,
  OperationalConflict,
  OperationalCalendarIndicators,
  Reservation,
  ChacaraBlock
} from '@/lib/chacaraTypes';
import { getReservations, getChacaraBlocks } from './reservationsService';

// ==========================================
// RECURRENCE EXPANSION ENGINE
// ==========================================

export function expandRecurrenceRuleForRange(
  rule: OperationalRecurrenceRule,
  rangeStartDate: string,
  rangeEndDate: string,
  existingEvents: OperationalEvent[]
): OperationalEvent[] {
  const generatedEvents: OperationalEvent[] = [];
  const start = new Date(`${rangeStartDate}T00:00:00`);
  const end = new Date(`${rangeEndDate}T23:59:59`);
  
  const ruleStart = new Date(`${rule.start_date}T00:00:00`);
  const ruleEnd = rule.end_date ? new Date(`${rule.end_date}T23:59:59`) : null;

  let occurrencesCount = 0;
  const current = new Date(ruleStart);

  while (current <= end) {
    if (ruleEnd && current > ruleEnd) break;
    if (rule.max_occurrences && occurrencesCount >= rule.max_occurrences) break;

    const currentStr = current.toISOString().split('T')[0];

    if (current >= start && current <= end) {
      let matchesRule = false;

      if (rule.frequency === 'DIARIA') {
        matchesRule = true;
      } else if (rule.frequency === 'SEMANAL') {
        const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon...
        if (rule.days_of_week && rule.days_of_week.includes(dayOfWeek)) {
          matchesRule = true;
        }
      } else if (rule.frequency === 'BISEMANAL') {
        const diffDays = Math.floor((current.getTime() - ruleStart.getTime()) / (1000 * 3600 * 24));
        if (diffDays % 14 === 0) {
          matchesRule = true;
        }
      } else if (rule.frequency === 'MENSAL') {
        if (rule.day_of_month) {
          if (current.getDate() === rule.day_of_month) matchesRule = true;
        } else {
          // Default to same day of month as start date
          if (current.getDate() === ruleStart.getDate()) matchesRule = true;
        }
      } else if (rule.frequency === 'ANUAL') {
        if (current.getMonth() === ruleStart.getMonth() && current.getDate() === ruleStart.getDate()) {
          matchesRule = true;
        }
      } else if (rule.frequency === 'CUSTOMIZADO') {
        const interval = rule.recurrence_interval || 1;
        const diffDays = Math.floor((current.getTime() - ruleStart.getTime()) / (1000 * 3600 * 24));
        if (diffDays % interval === 0) matchesRule = true;
      }

      if (matchesRule) {
        occurrencesCount++;
        // Check if an event already exists for this rule and date
        const alreadyExists = existingEvents.some(
          e => e.recurrence_rule_id === rule.id && e.start_date === currentStr
        );

        if (!alreadyExists) {
          generatedEvents.push({
            id: `gen-${rule.id}-${currentStr}`,
            chacara_id: rule.chacara_id,
            recurrence_rule_id: rule.id,
            event_type_id: rule.event_type_id,
            event_type_code: rule.event_type_code,
            title: rule.title,
            description: rule.description,
            start_date: currentStr,
            start_time: rule.default_time_start || '08:00',
            end_date: currentStr,
            end_time: rule.default_time_end || '10:00',
            status: 'AGENDADO',
            staff_ids: rule.staff_ids || [],
            automations: rule.automations || [],
            created_at: new Date().toISOString()
          });
        }
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return generatedEvents;
}

// ==========================================
// CONFLICT DETECTION ENGINE
// ==========================================

export function detectConflicts(
  events: OperationalEvent[],
  reservations: Reservation[],
  blocks: ChacaraBlock[],
  staffUnavailabilities: StaffUnavailability[]
): OperationalConflict[] {
  const conflicts: OperationalConflict[] = [];

  // 1. Staff Overlap: Same employee in two different chacaras on same date and time
  const staffByDateAndHour: Record<string, OperationalEvent[]> = {};

  events.forEach(evt => {
    if (evt.status === 'CANCELADA' as any || evt.status === 'CANCELADO') return;
    if (!evt.staff_ids || evt.staff_ids.length === 0) return;

    evt.staff_ids.forEach(staffId => {
      const key = `${staffId}_${evt.start_date}`;
      if (!staffByDateAndHour[key]) staffByDateAndHour[key] = [];
      staffByDateAndHour[key].push(evt);
    });
  });

  Object.entries(staffByDateAndHour).forEach(([key, evts]) => {
    if (evts.length > 1) {
      // Check if they are in different chacaras
      const distinctChacaras = new Set(evts.map(e => e.chacara_id || 'Geral'));
      if (distinctChacaras.size > 1) {
        const staffName = evts[0].staff_names?.[0] || 'Funcionário';
        conflicts.push({
          id: `conflict-staff-${key}`,
          type: 'STAFF_OVERLAP',
          severity: 'CRITICO',
          title: `Conflito de Agenda da Equipe: ${staffName}`,
          description: `O funcionário está agendado em ${evts.length} chácaras diferentes no mesmo dia (${evts[0].start_date}): ${Array.from(distinctChacaras).join(', ')}.`,
          event_ids: evts.map(e => e.id),
          staff_id: key.split('_')[0],
          date: evts[0].start_date
        });
      }
    }
  });

  // 2. Staff Leave Conflict: Employee scheduled during registered leave/vacation
  events.forEach(evt => {
    if (evt.status === 'CANCELADO') return;
    if (!evt.staff_ids || evt.staff_ids.length === 0) return;

    evt.staff_ids.forEach(staffId => {
      const leave = staffUnavailabilities.find(
        u => u.member_id === staffId && evt.start_date >= u.start_date && evt.start_date <= u.end_date
      );
      if (leave) {
        conflicts.push({
          id: `conflict-leave-${evt.id}-${staffId}`,
          type: 'STAFF_LEAVE',
          severity: 'CRITICO',
          title: `Funcionário em Ausência/Férias: ${evt.title}`,
          description: `Evento agendado em ${evt.start_date}, mas o funcionário possui registro de ausência ("${leave.reason}") no período de ${leave.start_date} a ${leave.end_date}.`,
          event_ids: [evt.id],
          staff_id: staffId,
          chacara_id: evt.chacara_id,
          date: evt.start_date
        });
      }
    });
  });

  // 3. Maintenance / Cleaning / Pool during Reservation / Guest stay
  events.forEach(evt => {
    if (evt.status === 'CANCELADO') return;
    if (!evt.chacara_id) return;

    if (evt.event_type_code === 'manutencao') {
      const activeRes = reservations.find(
        r => r.chacara_id === evt.chacara_id &&
             r.status !== 'CANCELADA' && r.status !== 'NO_SHOW' &&
             evt.start_date >= r.checkin_date && evt.start_date <= r.checkout_date
      );
      if (activeRes) {
        conflicts.push({
          id: `conflict-maint-${evt.id}`,
          type: 'MAINTENANCE_RESERVATION_OVERLAP',
          severity: 'CRITICO',
          title: `Manutenção durante Reserva de Hóspede`,
          description: `A manutenção "${evt.title}" está agendada para ${evt.start_date}, porém a chácara possui reserva ativa (Código #${activeRes.code}) de ${activeRes.checkin_date} a ${activeRes.checkout_date}.`,
          event_ids: [evt.id],
          chacara_id: evt.chacara_id,
          date: evt.start_date
        });
      }
    }

    if (evt.event_type_code === 'piscina') {
      const activeBlock = blocks.find(
        b => b.chacara_id === evt.chacara_id &&
             evt.start_date >= b.start_date && evt.start_date <= b.end_date
      );
      if (activeBlock) {
        conflicts.push({
          id: `conflict-pool-block-${evt.id}`,
          type: 'POOL_BLOCKED_PROPERTY',
          severity: 'ALERTA',
          title: `Piscina agendada em Chácara Bloqueada`,
          description: `Serviço de piscina em ${evt.start_date} coincide com bloqueio ("${activeBlock.title}").`,
          event_ids: [evt.id],
          chacara_id: evt.chacara_id,
          date: evt.start_date
        });
      }
    }
  });

  return conflicts;
}

// ==========================================
// SERVICE FACADE (SUPABASE + DEMO HYBRID)
// ==========================================

export async function getOperationalEventTypes(): Promise<OperationalEventType[]> {
  if (isDemoMode()) {
    return demoRepository.getOperationalEventTypes();
  }

  try {
    const { data, error } = await supabase
      .from('operational_event_types')
      .select('*')
      .order('priority', { ascending: false });

    if (error || !data) {
      console.error('[operationalCalendarService] Erro ao buscar tipos de eventos:', error?.message);
      return [];
    }
    return data as OperationalEventType[];
  } catch (e) {
    console.error('[operationalCalendarService] Exceção em getOperationalEventTypes:', e);
    return [];
  }
}

export async function saveOperationalEventType(type: Partial<OperationalEventType>): Promise<OperationalEventType> {
  if (isDemoMode()) {
    return demoRepository.saveOperationalEventType(type);
  }

  const { data, error } = await supabase
    .from('operational_event_types')
    .upsert(type)
    .select()
    .single();

  if (error || !data) {
    console.error('[operationalCalendarService] Erro ao salvar tipo de evento:', error?.message);
    throw new Error('Falha ao salvar tipo de evento no Supabase: ' + (error?.message || ''));
  }
  return data as OperationalEventType;
}

export async function deleteOperationalEventType(id: string): Promise<boolean> {
  if (isDemoMode()) {
    return demoRepository.deleteOperationalEventType(id);
  }

  const { error } = await supabase
    .from('operational_event_types')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[operationalCalendarService] Erro ao excluir tipo de evento:', error.message);
    throw new Error('Falha ao excluir tipo de evento: ' + error.message);
  }
  return true;
}

export async function getOperationalRecurrenceRules(): Promise<OperationalRecurrenceRule[]> {
  if (isDemoMode()) {
    return demoRepository.getOperationalRecurrenceRules();
  }

  try {
    const { data, error } = await supabase
      .from('operational_recurrence_rules')
      .select('*')
      .eq('is_active', true);

    if (error || !data) {
      console.error('[operationalCalendarService] Erro ao buscar regras de recorrência:', error?.message);
      return [];
    }
    return data as OperationalRecurrenceRule[];
  } catch (e) {
    console.error('[operationalCalendarService] Exceção em getOperationalRecurrenceRules:', e);
    return [];
  }
}

export async function saveOperationalRecurrenceRule(rule: Partial<OperationalRecurrenceRule>): Promise<OperationalRecurrenceRule> {
  if (isDemoMode()) {
    return demoRepository.saveOperationalRecurrenceRule(rule);
  }

  const { data, error } = await supabase
    .from('operational_recurrence_rules')
    .upsert(rule)
    .select()
    .single();

  if (error || !data) {
    console.error('[operationalCalendarService] Erro ao salvar regra de recorrência:', error?.message);
    throw new Error('Falha ao salvar regra de recorrência no Supabase: ' + (error?.message || ''));
  }
  return data as OperationalRecurrenceRule;
}

export async function deleteOperationalRecurrenceRule(id: string): Promise<boolean> {
  if (isDemoMode()) {
    return demoRepository.deleteOperationalRecurrenceRule(id);
  }

  const { error } = await supabase
    .from('operational_recurrence_rules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[operationalCalendarService] Erro ao excluir regra de recorrência:', error.message);
    throw new Error('Falha ao excluir regra de recorrência: ' + error.message);
  }
  return true;
}

export async function getOperationalEvents(filters?: {
  chacara_id?: string;
  staff_id?: string;
  event_type_code?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}): Promise<OperationalEvent[]> {
  let events: OperationalEvent[] = [];

  if (isDemoMode()) {
    events = await demoRepository.getOperationalEvents(filters);
  } else {
    try {
      let query = supabase.from('operational_events').select('*');

      if (filters?.chacara_id && filters.chacara_id !== 'TODAS') {
        query = query.eq('chacara_id', filters.chacara_id);
      }
      if (filters?.event_type_code && filters.event_type_code !== 'TODOS') {
        query = query.eq('event_type_code', filters.event_type_code);
      }
      if (filters?.status && filters.status !== 'TODOS') {
        query = query.eq('status', filters.status);
      }
      if (filters?.start_date) {
        query = query.gte('end_date', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('start_date', filters.end_date);
      }

      const { data, error } = await query;
      if (error || !data) {
        console.error('[operationalCalendarService] Erro ao buscar eventos operacionais:', error?.message);
        events = [];
      } else {
        events = data as OperationalEvent[];
      }
    } catch (e) {
      console.error('[operationalCalendarService] Exceção em getOperationalEvents:', e);
      events = [];
    }
  }

  // Always generate/expand recurrence rules for requested date range if provided
  if (filters?.start_date && filters?.end_date) {
    const rules = await getOperationalRecurrenceRules();
    let generated: OperationalEvent[] = [];

    rules.forEach(rule => {
      const newlyExpanded = expandRecurrenceRuleForRange(rule, filters.start_date!, filters.end_date!, events);
      generated = [...generated, ...newlyExpanded];
    });

    events = [...events, ...generated];
  }

  return events;
}

const isValidUUID = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

export async function saveOperationalEvent(event: Partial<OperationalEvent>): Promise<OperationalEvent> {
  if (isDemoMode()) {
    return demoRepository.saveOperationalEvent(event);
  }

  try {
    const validChacaraId = isValidUUID(event.chacara_id) ? event.chacara_id : null;
    let chacaraName = event.chacara_name;
    if (validChacaraId && !chacaraName) {
      try {
        const { data: cData } = await supabase.from('chacaras').select('name').eq('id', validChacaraId).maybeSingle();
        if (cData?.name) chacaraName = cData.name;
      } catch {}
    }

    let eventTypeId = isValidUUID(event.event_type_id) ? event.event_type_id : null;
    if (!eventTypeId && event.event_type_code) {
      try {
        const { data: tData } = await supabase
          .from('operational_event_types')
          .select('id')
          .eq('code', event.event_type_code)
          .maybeSingle();
        if (tData?.id) eventTypeId = tData.id;
      } catch {}
    }

    const cleanStaffIds = Array.isArray(event.staff_ids)
      ? event.staff_ids.filter(id => isValidUUID(id))
      : [];

    const hasValidId = isValidUUID(event.id);
    const now = new Date().toISOString();
    const payload: Record<string, any> = {
      chacara_id: validChacaraId,
      chacara_name: chacaraName || null,
      event_type_id: eventTypeId,
      event_type_code: event.event_type_code || 'outro',
      title: event.title ? event.title.trim() : 'Serviço Operacional',
      description: event.description || '',
      start_date: event.start_date,
      start_time: event.start_time || '08:00',
      end_date: event.end_date || event.start_date,
      end_time: event.end_time || '10:00',
      status: event.status || 'AGENDADO',
      staff_ids: cleanStaffIds,
      staff_names: event.staff_names || [],
      metadata: event.metadata || {},
      updated_at: now
    };

    if (isValidUUID(event.recurrence_rule_id)) {
      payload.recurrence_rule_id = event.recurrence_rule_id;
    }
    if (isValidUUID(event.reservation_id)) {
      payload.reservation_id = event.reservation_id;
    }

    let savedResult: OperationalEvent;
    if (hasValidId) {
      const { data, error } = await supabase
        .from('operational_events')
        .update(payload)
        .eq('id', event.id)
        .select()
        .single();

      if (!error && data) {
        savedResult = data as OperationalEvent;
      } else {
        console.warn('[operationalCalendarService] Falha no update por ID, tentando upsert/insert:', error?.message);
        const { data: inserted, error: insertError } = await supabase
          .from('operational_events')
          .insert([payload])
          .select()
          .single();

        if (insertError || !inserted) {
          savedResult = await demoRepository.saveOperationalEvent({ ...payload, id: event.id });
        } else {
          savedResult = inserted as OperationalEvent;
        }
      }
    } else {
      // Insert new event
      const { data: inserted, error: insertError } = await supabase
        .from('operational_events')
        .insert([payload])
        .select()
        .single();

      if (insertError || !inserted) {
        console.error('[operationalCalendarService] Erro ao inserir evento no Supabase:', insertError?.message);
        savedResult = await demoRepository.saveOperationalEvent({ ...payload, id: event.id });
      } else {
        savedResult = inserted as OperationalEvent;
      }
    }

    // Automação: Gerar ou Sincronizar Conta a Pagar correspondente
    try {
      const { generateAccountPayableForService, syncAccountPayableOnServiceUpdate } = await import('@/services/serviceAccountsPayableAutomation');
      if (hasValidId) {
        await syncAccountPayableOnServiceUpdate(savedResult);
      } else {
        await generateAccountPayableForService(savedResult);
      }
    } catch (autoErr) {
      console.warn('[operationalCalendarService] Erro na automação de contas a pagar:', autoErr);
    }

    return savedResult;
  } catch (e: any) {
    console.error('[operationalCalendarService] Exceção em saveOperationalEvent:', e);
    const demoSaved = await demoRepository.saveOperationalEvent(event);
    try {
      const { generateAccountPayableForService } = await import('@/services/serviceAccountsPayableAutomation');
      await generateAccountPayableForService(demoSaved);
    } catch {}
    return demoSaved;
  }
}

export async function updateOperationalEventStatus(
  eventId: string, 
  status: OperationalEventStatus, 
  payload?: {
    absence_reason?: string;
    absence_notes?: string;
    rescheduled_to_date?: string;
    confirmed_by?: string;
  }
): Promise<OperationalEvent> {
  if (isDemoMode()) {
    const res = demoRepository.updateOperationalEventStatus(eventId, status, payload);
    if (status === 'CANCELADO') {
      try {
        const { handleAccountPayableOnServiceCancelOrDelete } = await import('@/services/serviceAccountsPayableAutomation');
        await handleAccountPayableOnServiceCancelOrDelete(eventId, payload?.absence_reason || 'Serviço cancelado');
      } catch {}
    }
    return res;
  }

  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };

  if (status === 'CONFIRMADO' || status === 'CONCLUIDO') {
    updateData.presence_confirmed_at = new Date().toISOString();
    updateData.presence_confirmed_by = payload?.confirmed_by || 'Administrador';
  } else if (status === 'FALTOU') {
    updateData.absence_reason = payload?.absence_reason;
    updateData.absence_notes = payload?.absence_notes;
    updateData.rescheduled_to_date = payload?.rescheduled_to_date;
  }

  const { data, error } = await supabase
    .from('operational_events')
    .update(updateData)
    .eq('id', eventId)
    .select()
    .single();

  if (error || !data) {
    console.error('[operationalCalendarService] Erro ao atualizar status do evento:', error?.message);
    throw new Error('Falha ao atualizar status do evento no Supabase: ' + (error?.message || ''));
  }

  // Se o serviço foi cancelado, aciona a proteção de contas a pagar (cancela pendente, preserva paga)
  if (status === 'CANCELADO') {
    try {
      const { handleAccountPayableOnServiceCancelOrDelete } = await import('@/services/serviceAccountsPayableAutomation');
      await handleAccountPayableOnServiceCancelOrDelete(eventId, payload?.absence_reason || 'Serviço cancelado');
    } catch (e) {
      console.warn('[operationalCalendarService] Erro ao sincronizar cancelamento com contas a pagar:', e);
    }
  }

  return data as OperationalEvent;
}

export async function deleteOperationalEvent(
  id: string, 
  scope: 'THIS_OCCURRENCE' | 'ALL_OCCURRENCES' | 'THIS_AND_FUTURE' = 'THIS_OCCURRENCE',
  options?: {
    disableAutomation?: boolean;
    reason?: string;
    deletedBy?: string;
  }
): Promise<boolean> {
  const cleanId = id.replace(/^op_/, '');

  if (isDemoMode()) {
    return demoRepository.deleteOperationalEvent(cleanId, scope, options);
  }

  // 1. If it's a dynamically generated occurrence from a recurrence rule
  if (cleanId.startsWith('gen-')) {
    const parts = cleanId.split('-');
    const dateStr = cleanId.slice(-10);
    const ruleId = parts.slice(1, -3).join('-');

    if (scope === 'ALL_OCCURRENCES') {
      await supabase.from('operational_recurrence_rules').update({ is_active: false }).eq('id', ruleId);
      await supabase.from('operational_events').delete().eq('recurrence_rule_id', ruleId);
    } else {
      // Create an explicit CANCELADO event to suppress this generated occurrence
      const { data: rule } = await supabase.from('operational_recurrence_rules').select('*').eq('id', ruleId).maybeSingle();
      await supabase.from('operational_events').insert([{
        id: cleanId,
        chacara_id: rule?.chacara_id,
        recurrence_rule_id: ruleId,
        event_type_id: rule?.event_type_id,
        event_type_code: rule?.event_type_code || 'outro',
        title: rule?.title || 'Serviço Recorrente',
        description: rule?.description,
        start_date: dateStr,
        start_time: rule?.default_time_start || '08:00',
        end_date: dateStr,
        end_time: rule?.default_time_end || '10:00',
        status: 'CANCELADO',
        staff_ids: rule?.staff_ids || [],
        metadata: {
          origin: 'RECORRENTE',
          deleted_at: new Date().toISOString(),
          deleted_by: options?.deletedBy || 'Administrador',
          deletion_reason: options?.reason || 'Excluído pelo usuário'
        }
      }]);
    }
    return true;
  }

  // 2. Fetch existing event for audit and automation checks
  const { data: existingEvent } = await supabase
    .from('operational_events')
    .select('*')
    .eq('id', cleanId)
    .maybeSingle();

  const reservationId = existingEvent?.reservation_id || existingEvent?.metadata?.reservation_id;

  // 3. Handle disabling automation on reservation if requested
  if (options?.disableAutomation && reservationId) {
    const { data: resData } = await supabase
      .from('reservations')
      .select('metadata')
      .eq('id', reservationId)
      .maybeSingle();

    if (resData) {
      const updatedMeta = {
        ...(resData.metadata || {}),
        is_cleaning_automation_disabled: true,
        automation_disabled_at: new Date().toISOString(),
        automation_disabled_by: options?.deletedBy || 'Administrador',
        automation_disabled_reason: options?.reason || 'Serviço automático excluído com bloqueio de automação'
      };
      await supabase.from('reservations').update({ metadata: updatedMeta }).eq('id', reservationId);
    }
  }

  // 4. Perform Soft Delete (mark as CANCELADO) with Audit Metadata
  const auditMetadata = {
    ...(existingEvent?.metadata || {}),
    deleted_at: new Date().toISOString(),
    deleted_by: options?.deletedBy || 'Administrador',
    deletion_reason: options?.reason || 'Excluído pelo usuário via calendário',
    origin: existingEvent?.metadata?.origin || (reservationId ? 'AUTOMATICA' : 'MANUAL'),
    is_automation_disabled: options?.disableAutomation || false
  };

  if (scope === 'ALL_OCCURRENCES' && existingEvent?.recurrence_rule_id) {
    await supabase
      .from('operational_events')
      .update({
        status: 'CANCELADO',
        metadata: auditMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('recurrence_rule_id', existingEvent.recurrence_rule_id);

    await supabase
      .from('operational_recurrence_rules')
      .update({ is_active: false })
      .eq('id', existingEvent.recurrence_rule_id);

  } else if (scope === 'THIS_AND_FUTURE' && existingEvent?.recurrence_rule_id) {
    await supabase
      .from('operational_events')
      .update({
        status: 'CANCELADO',
        metadata: auditMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('recurrence_rule_id', existingEvent.recurrence_rule_id)
      .gte('start_date', existingEvent.start_date);

  } else {
    // Single occurrence soft-delete
    const { error } = await supabase
      .from('operational_events')
      .update({
        status: 'CANCELADO',
        metadata: auditMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', cleanId);

    if (error) {
      console.error('[operationalCalendarService] Erro ao excluir evento:', error.message);
      // Fallback: physical delete if column update fails
      await supabase.from('operational_events').delete().eq('id', cleanId);
    }
  }

  // Hook de segurança para Conta a Pagar vinculada: cancela se pendente, preserva se paga!
  try {
    const { handleAccountPayableOnServiceCancelOrDelete } = await import('@/services/serviceAccountsPayableAutomation');
    await handleAccountPayableOnServiceCancelOrDelete(cleanId, options?.reason || 'Serviço operacional excluído');
  } catch (e) {
    console.warn('[operationalCalendarService] Erro ao tratar conta vinculada na exclusão:', e);
  }

  return true;
}

export async function getStaffUnavailability(): Promise<StaffUnavailability[]> {
  if (isDemoMode()) {
    return demoRepository.getStaffUnavailability();
  }

  try {
    const { data, error } = await supabase
      .from('staff_unavailability')
      .select('*');

    if (error || !data) {
      console.error('[operationalCalendarService] Erro ao buscar indisponibilidades:', error?.message);
      return [];
    }
    return data as StaffUnavailability[];
  } catch (e) {
    console.error('[operationalCalendarService] Exceção em getStaffUnavailability:', e);
    return [];
  }
}

// Compute dashboard indicators
export async function getOperationalIndicators(): Promise<{
  indicators: OperationalCalendarIndicators;
  conflicts: OperationalConflict[];
}> {
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [events, reservations, blocks, unavail] = await Promise.all([
    getOperationalEvents({ start_date: todayStr, end_date: todayStr }),
    getReservations(),
    getChacaraBlocks(),
    getStaffUnavailability()
  ]);

  const conflicts = detectConflicts(events, reservations, blocks, unavail);

  const servicos_hoje = events.length;
  const funcionarios_presentes = events.filter(e => e.status === 'CONFIRMADO' || e.status === 'CONCLUIDO' || e.status === 'EM_ANDAMENTO').length;
  const funcionarios_ausentes = events.filter(e => e.status === 'FALTOU').length;
  const proximas_limpezas = events.filter(e => e.event_type_code === 'limpeza').length;
  const proximas_manutencoes = events.filter(e => e.event_type_code === 'manutencao').length;
  const prestadores_recorrentes_semana = events.filter(e => e.event_type_code === 'prestador_recorrente' || e.event_type_code === 'piscina' || e.event_type_code === 'jardinagem').length;
  const servicos_atrasados = events.filter(e => e.status === 'AGENDADO' && e.start_date < todayStr).length;

  return {
    indicators: {
      servicos_hoje,
      funcionarios_presentes,
      funcionarios_ausentes,
      proximas_limpezas,
      proximas_manutencoes,
      prestadores_recorrentes_semana,
      servicos_atrasados,
      conflitos_encontrados: conflicts.length
    },
    conflicts
  };
}
