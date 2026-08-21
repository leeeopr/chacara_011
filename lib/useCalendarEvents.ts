import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Reservation, 
  ChacaraBlock, 
  OperationalEvent, 
  OperationalConflict,
  OperationalCalendarIndicators,
  OperationalEventTypeCode 
} from '@/lib/chacaraTypes';
import { AccountPayable } from '@/lib/accountsPayableTypes';
import { getReservations, getChacaraBlocks } from '@/services/reservationsService';
import { getOperationalEvents, getOperationalIndicators } from '@/services/operationalCalendarService';
import { getExceptionalEvents, ExceptionalEvent } from '@/services/exceptionalEventsService';
import { getAccountsPayable } from '@/services/accountsPayableService';

export type EventCategory = 'RESERVA' | 'BLOQUEIO' | 'MANUTENCAO' | 'LIMPEZA' | 'EQUIPE' | 'CONTA_PAGAR' | 'OUTROS';

export interface UnifiedCalendarEvent {
  id: string; // Unique string identifier, e.g. "res_123", "block_456", "op_789", "exc_000", "ap_111"
  originalId: string;
  entityType: 'RESERVA' | 'BLOQUEIO' | 'OPERACIONAL' | 'EXCEPCIONAL' | 'CONTA_PAGAR';
  eventTypeCode: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  chacaraId: string;
  chacaraName: string;
  clientName?: string;
  staffIds: string[];
  staffNames: string[];
  status: string;
  color: string;
  category: EventCategory;
  iconName: string;
  rawReservation?: Reservation;
  rawBlock?: ChacaraBlock;
  rawOperationalEvent?: OperationalEvent;
  rawExceptionalEvent?: ExceptionalEvent;
  rawAccountPayable?: AccountPayable;
}

export interface UseCalendarEventsFilters {
  chacaraFilter: string;
  staffFilter: string;
  statusFilter: string;
  categoryFilter: string;
  searchTerm: string;
  currentDate: Date;
  viewMode: string;
  showReservations?: boolean;
  showServices?: boolean;
  showAccountsPayable?: boolean;
  showPaidAccounts?: boolean;
}

// Helper: Get icon name by type code
export function getEventIconName(code: string, entityType: string): string {
  if (entityType === 'CONTA_PAGAR') {
    return 'CreditCard';
  }
  if (entityType === 'EXCEPCIONAL') {
    return 'AlertTriangle';
  }
  if (entityType === 'RESERVA') {
    return code === 'pre_reserva' ? 'Clock' : 'Home';
  }
  if (entityType === 'BLOQUEIO') {
    return 'Lock';
  }
  switch (code) {
    case 'check_in': return 'LogIn';
    case 'check_out': return 'LogOut';
    case 'limpeza': return 'Sparkles';
    case 'piscina': return 'Waves';
    case 'jardinagem': return 'TreePine';
    case 'manutencao': return 'Wrench';
    case 'inspecao':
    case 'vistoria': return 'ClipboardCheck';
    case 'prestador_recorrente':
    case 'prestador_eventual': return 'UserCheck';
    case 'reuniao': return 'Users';
    default: return 'Calendar';
  }
}

// Helper: Get event color
export function getEventColor(evt: Partial<OperationalEvent>, code: string, entityType: string, status: string): string {
  if (entityType === 'CONTA_PAGAR') {
    if (status === 'PAGA') return '#10B981'; // Emerald
    if (status === 'VENCIDA') return '#EF4444'; // Red
    return '#A855F7'; // Purple
  }
  if (entityType === 'EXCEPCIONAL') {
    return '#EF4444'; // Fixed Red for Exceptional Events
  }
  if (entityType === 'RESERVA') {
    if (status === 'PRE_RESERVA') return '#F59E0B'; // Amber
    if (status === 'CANCELADA') return '#EF4444'; // Red
    return '#10B981'; // Emerald
  }
  if (entityType === 'BLOQUEIO') {
    return '#EF4444'; // Red
  }
  if (evt.type_info?.color) {
    return evt.type_info.color;
  }
  switch (code) {
    case 'check_in': return '#06B6D4'; // Cyan
    case 'check_out': return '#6366F1'; // Indigo
    case 'limpeza': return '#3B82F6'; // Blue
    case 'piscina': return '#0EA5E9'; // Sky
    case 'jardinagem': return '#84CC16'; // Lime
    case 'manutencao': return '#F97316'; // Orange
    case 'inspecao':
    case 'vistoria': return '#8B5CF6'; // Purple
    case 'prestador_recorrente':
    case 'prestador_eventual': return '#EC4899'; // Pink
    case 'reuniao': return '#10B981'; // Emerald
    default: return '#64748B'; // Slate
  }
}

// Helper: Get category
export function getEventCategory(code: string, entityType: string): EventCategory {
  if (entityType === 'CONTA_PAGAR') return 'CONTA_PAGAR';
  if (entityType === 'EXCEPCIONAL') return 'OUTROS';
  if (entityType === 'RESERVA') return 'RESERVA';
  if (entityType === 'BLOQUEIO') return 'BLOQUEIO';
  switch (code) {
    case 'limpeza':
    case 'piscina':
      return 'LIMPEZA';
    case 'jardinagem':
    case 'manutencao':
      return 'MANUTENCAO';
    case 'check_in':
    case 'check_out':
    case 'inspecao':
    case 'vistoria':
    case 'prestador_recorrente':
    case 'prestador_eventual':
      return 'EQUIPE';
    default:
      return 'OUTROS';
  }
}

// Standardizer function mapping raw DB entries to UnifiedCalendarEvent
export function standardizeEvents(
  reservations: Reservation[],
  blocks: ChacaraBlock[],
  opEvents: OperationalEvent[],
  exceptionalEvents: ExceptionalEvent[] = [],
  accountsPayable: AccountPayable[] = []
): UnifiedCalendarEvent[] {
  const unifiedList: UnifiedCalendarEvent[] = [];

  // 1. Process Reservations
  for (const res of reservations) {
    const isPre = res.status === 'PRE_RESERVA';
    const code = isPre ? 'pre_reserva' : 'reserva';
    const color = getEventColor({}, code, 'RESERVA', res.status);
    const clientName = res.client?.full_name || 'Cliente Sem Nome';
    
    // Collect staff from res.staff_ids / res.staff_names, or from opEvents linked to this reservation
    let resStaffIds: string[] = Array.isArray(res.staff_ids) ? [...res.staff_ids] : [];
    let resStaffNames: string[] = Array.isArray(res.staff_names) ? [...res.staff_names] : [];

    const linkedOpEvents = opEvents.filter(e => e.reservation_id === res.id);
    for (const opEvt of linkedOpEvents) {
      if (Array.isArray(opEvt.staff_ids)) {
        for (const sid of opEvt.staff_ids) {
          if (sid && !resStaffIds.includes(sid)) {
            resStaffIds.push(sid);
          }
        }
      }
      if (Array.isArray(opEvt.staff_names)) {
        for (const sname of opEvt.staff_names) {
          if (sname && !resStaffNames.includes(sname)) {
            resStaffNames.push(sname);
          }
        }
      }
    }

    unifiedList.push({
      id: `res_${res.id}`,
      originalId: res.id,
      entityType: 'RESERVA',
      eventTypeCode: code,
      title: isPre ? `Pré-reserva: ${clientName}` : `Reserva: ${clientName}`,
      description: `Código: ${res.code} | Hóspedes: ${res.guests_adults || 1} adultos`,
      startDate: res.checkin_date,
      endDate: res.checkout_date,
      startTime: res.checkin_time || '14:00',
      endTime: res.checkout_time || '12:00',
      chacaraId: res.chacara_id,
      chacaraName: res.chacara?.name || 'Chácara',
      clientName: clientName,
      staffIds: resStaffIds,
      staffNames: resStaffNames,
      status: res.status,
      color: color,
      category: 'RESERVA',
      iconName: getEventIconName(code, 'RESERVA'),
      rawReservation: res
    });
  }

  // 2. Process Blocks
  for (const block of blocks) {
    unifiedList.push({
      id: `block_${block.id}`,
      originalId: block.id,
      entityType: 'BLOQUEIO',
      eventTypeCode: 'bloqueio',
      title: `Bloqueio: ${block.title || 'Indisponível'}`,
      description: block.description || `Motivo: ${block.reason || 'Manutenção'}`,
      startDate: block.start_date,
      endDate: block.end_date,
      startTime: '00:00',
      endTime: '23:59',
      chacaraId: block.chacara_id,
      chacaraName: block.chacara?.name || 'Chácara',
      staffIds: [],
      staffNames: [],
      status: 'BLOQUEADO',
      color: '#EF4444',
      category: 'BLOQUEIO',
      iconName: 'Lock',
      rawBlock: block
    });
  }

  // 3. Process Operational Events
  for (const evt of opEvents) {
    const code = evt.event_type_code || 'outro';
    const color = getEventColor(evt, code, 'OPERACIONAL', evt.status);
    const category = getEventCategory(code, 'OPERACIONAL');
    const iconName = getEventIconName(code, 'OPERACIONAL');

    unifiedList.push({
      id: `op_${evt.id}`,
      originalId: evt.id,
      entityType: 'OPERACIONAL',
      eventTypeCode: code,
      title: evt.title || 'Evento Operacional',
      description: evt.description,
      startDate: evt.start_date,
      endDate: evt.end_date || evt.start_date,
      startTime: evt.start_time || '08:00',
      endTime: evt.end_time || '18:00',
      chacaraId: evt.chacara_id || 'geral',
      chacaraName: evt.chacara_name || 'Chácara',
      staffIds: evt.staff_ids || [],
      staffNames: evt.staff_names || [],
      status: evt.status || 'AGENDADO',
      color: color,
      category: category,
      iconName: iconName,
      rawOperationalEvent: evt
    });
  }

  // 4. Process Exceptional Events
  for (const exc of exceptionalEvents) {
    const color = '#EF4444'; // Fixed Red Identity for Exceptional Events
    const staffIds = exc.responsible_id ? [exc.responsible_id] : [];
    const staffNames = exc.responsible_name ? [exc.responsible_name] : [];

    unifiedList.push({
      id: `exc_${exc.id}`,
      originalId: exc.id,
      entityType: 'EXCEPCIONAL',
      eventTypeCode: 'evento_excepcional',
      title: `🚨 ${exc.title}`,
      description: exc.description,
      startDate: exc.event_date,
      endDate: exc.event_date,
      startTime: exc.all_day ? '00:00' : (exc.start_time || '08:00'),
      endTime: exc.all_day ? '23:59' : (exc.end_time || '09:00'),
      chacaraId: exc.chacara_id || 'geral',
      chacaraName: exc.chacara_nome || 'Geral / Todas',
      staffIds: staffIds,
      staffNames: staffNames,
      status: exc.status || 'PENDENTE',
      color: color,
      category: 'OUTROS',
      iconName: 'AlertTriangle',
      rawExceptionalEvent: exc
    });
  }

  // 5. Process Accounts Payable (Contas a Pagar)
  for (const acc of accountsPayable) {
    const color = getEventColor({}, 'conta_pagar', 'CONTA_PAGAR', acc.status);
    const staffIds = acc.prestador_id ? [acc.prestador_id] : [];
    const staffNames = acc.prestador_nome ? [acc.prestador_nome] : [];
    const valorFormatted = Number(acc.valor_previsto || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    unifiedList.push({
      id: `ap_${acc.id}`,
      originalId: acc.id,
      entityType: 'CONTA_PAGAR',
      eventTypeCode: 'conta_pagar',
      title: `💳 ${acc.descricao} (${valorFormatted})`,
      description: `${acc.prestador_nome ? 'Prestador: ' + acc.prestador_nome : ''} ${acc.observacao ? ' | ' + acc.observacao : ''} | Categoria: ${acc.categoria}`,
      startDate: acc.data_vencimento,
      endDate: acc.data_vencimento,
      startTime: '08:00',
      endTime: '18:00',
      chacaraId: acc.chacara_id || 'geral',
      chacaraName: acc.chacara_nome || 'Geral / Todas',
      staffIds: staffIds,
      staffNames: staffNames,
      status: acc.status,
      color: color,
      category: 'CONTA_PAGAR',
      iconName: 'CreditCard',
      rawAccountPayable: acc
    });
  }

  return unifiedList;
}

export function useCalendarEvents(filters: UseCalendarEventsFilters) {
  const [loading, setLoading] = useState(true);
  const [rawReservations, setRawReservations] = useState<Reservation[]>([]);
  const [rawBlocks, setRawBlocks] = useState<ChacaraBlock[]>([]);
  const [rawOpEvents, setRawOpEvents] = useState<OperationalEvent[]>([]);
  const [rawExceptionalEvents, setRawExceptionalEvents] = useState<ExceptionalEvent[]>([]);
  const [rawAccountsPayable, setRawAccountsPayable] = useState<AccountPayable[]>([]);
  const [indicators, setIndicators] = useState<any>(null);
  const [conflicts, setConflicts] = useState<OperationalConflict[]>([]);

  // Compute bounding date range WITHOUT mutating currentDate
  const dateRange = useMemo(() => {
    const year = filters.currentDate.getFullYear();
    const month = filters.currentDate.getMonth();

    // Load extra buffer around the active month/week/day to keep calendar seamless
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month + 2, 0);

    return {
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0]
    };
  }, [filters.currentDate]);

  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial || rawReservations.length === 0) {
      setLoading(true);
    }
    try {
      const [resData, blockData, opData, excData, apData, indData] = await Promise.all([
        getReservations({
          chacara_id: filters.chacaraFilter !== 'TODAS' ? filters.chacaraFilter : undefined,
          status: filters.statusFilter !== 'TODOS' ? filters.statusFilter : undefined
        }),
        getChacaraBlocks(filters.chacaraFilter !== 'TODAS' ? filters.chacaraFilter : undefined),
        getOperationalEvents({
          chacara_id: filters.chacaraFilter !== 'TODAS' ? filters.chacaraFilter : undefined,
          staff_id: filters.staffFilter !== 'TODOS' ? filters.staffFilter : undefined,
          status: filters.statusFilter !== 'TODOS' ? filters.statusFilter : undefined,
          start_date: dateRange.startStr,
          end_date: dateRange.endStr,
          search: filters.searchTerm || undefined
        }),
        getExceptionalEvents({
          chacara_id: filters.chacaraFilter !== 'TODAS' ? filters.chacaraFilter : undefined,
          status: filters.statusFilter !== 'TODOS' ? filters.statusFilter : undefined,
          start_date: dateRange.startStr,
          end_date: dateRange.endStr,
          search: filters.searchTerm || undefined
        }),
        getAccountsPayable({
          startDate: dateRange.startStr,
          endDate: dateRange.endStr,
          search: filters.searchTerm || undefined
        }),
        getOperationalIndicators()
      ]);

      setRawReservations(resData || []);
      setRawBlocks(blockData || []);
      setRawOpEvents(opData || []);
      setRawExceptionalEvents(excData || []);
      setRawAccountsPayable(apData || []);
      setIndicators(indData?.indicators || []);
      setConflicts(indData?.conflicts || []);
    } catch (err) {
      console.warn('Erro ao carregar dados unificados do calendário:', err);
    } finally {
      setLoading(false);
    }
  }, [filters.chacaraFilter, filters.staffFilter, filters.statusFilter, filters.searchTerm, dateRange, rawReservations.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine and standardize all entities into unified calendar events
  const allEvents = useMemo(() => {
    return standardizeEvents(rawReservations, rawBlocks, rawOpEvents, rawExceptionalEvents, rawAccountsPayable);
  }, [rawReservations, rawBlocks, rawOpEvents, rawExceptionalEvents, rawAccountsPayable]);

  // Filter unified events consistently across ALL views
  const filteredEvents = useMemo(() => {
    const showRes = filters.showReservations !== false;
    const showServ = filters.showServices !== false;
    const showAccounts = filters.showAccountsPayable !== false;
    const showPaid = filters.showPaidAccounts !== false;

    return allEvents.filter(evt => {
      // Domain-level toggles
      if (!showRes && (evt.entityType === 'RESERVA' || evt.entityType === 'BLOQUEIO')) {
        return false;
      }
      if (!showServ && evt.entityType === 'OPERACIONAL') {
        return false;
      }
      if (evt.entityType === 'CONTA_PAGAR') {
        if (!showAccounts) {
          return false;
        }
        if (!showPaid && evt.status === 'PAGA') {
          return false;
        }
      }

      // 1. Chacara Filter
      if (filters.chacaraFilter !== 'TODAS' && evt.chacaraId !== filters.chacaraFilter && evt.chacaraId !== 'geral') {
        return false;
      }

      // 2. Staff Filter
      if (filters.staffFilter !== 'TODOS') {
        if (!evt.staffIds.includes(filters.staffFilter)) {
          return false;
        }
      }

      // 3. Status Filter
      if (filters.statusFilter !== 'TODOS') {
        if (evt.status !== filters.statusFilter) {
          return false;
        }
      } else {
        if (evt.status === 'CANCELADO' || evt.status === 'CANCELADA') {
          return false;
        }
      }

      // 4. Category Filter
      if (filters.categoryFilter !== 'TODAS') {
        if (evt.category !== filters.categoryFilter) {
          return false;
        }
      }

      // 5. Search Term
      if (filters.searchTerm) {
        const query = filters.searchTerm.toLowerCase();
        const matchTitle = evt.title.toLowerCase().includes(query);
        const matchDesc = evt.description?.toLowerCase().includes(query);
        const matchChacara = evt.chacaraName.toLowerCase().includes(query);
        const matchClient = evt.clientName?.toLowerCase().includes(query);
        const matchStaff = evt.staffNames.some(s => s.toLowerCase().includes(query));

        if (!matchTitle && !matchDesc && !matchChacara && !matchClient && !matchStaff) {
          return false;
        }
      }

      return true;
    });
  }, [allEvents, filters.chacaraFilter, filters.staffFilter, filters.statusFilter, filters.categoryFilter, filters.searchTerm, filters.showReservations, filters.showServices, filters.showAccountsPayable, filters.showPaidAccounts]);

  // Helper: check if event lands on a given date (YYYY-MM-DD)
  const getEventsForDay = useCallback((dateStr: string): UnifiedCalendarEvent[] => {
    return filteredEvents.filter(evt => {
      return dateStr >= evt.startDate && dateStr <= evt.endDate;
    });
  }, [filteredEvents]);

  // Helper: get events for range
  const getEventsForRange = useCallback((startStr: string, endStr: string): UnifiedCalendarEvent[] => {
    return filteredEvents.filter(evt => {
      // Overlaps if event start <= range end AND event end >= range start
      return evt.startDate <= endStr && evt.endDate >= startStr;
    });
  }, [filteredEvents]);

  return {
    loading,
    events: filteredEvents,
    rawReservations,
    rawBlocks,
    rawOpEvents,
    rawExceptionalEvents,
    rawAccountsPayable,
    indicators,
    conflicts,
    refresh: loadData,
    getEventsForDay,
    getEventsForRange
  };
}
