'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  TreePine, 
  Filter, 
  Users, 
  Clock,
  Sparkles,
  Lock,
  Plus,
  Settings2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Wrench,
  ClipboardCheck,
  AlertTriangle,
  List,
  Search,
  Check,
  X,
  LogIn,
  LogOut,
  Waves,
  UserCheck,
  Pencil, 
  Trash2, 
  Eye, 
  CalendarCheck, 
  Layers, 
  RotateCcw,
  CreditCard
} from 'lucide-react';
import { 
  Reservation, 
  Chacara, 
  ChacaraBlock, 
  OperationalEvent, 
  OperationalEventType, 
  CrewMember
} from '@/lib/chacaraTypes';
import { AccountPayable } from '@/lib/accountsPayableTypes';
import { getChacaras } from '@/services/chacarasService';
import { getCrewMembers } from '@/services/crewService';
import { 
  getOperationalEventTypes,
  updateOperationalEventStatus,
  deleteOperationalEvent
} from '@/services/operationalCalendarService';
import { 
  useCalendarEvents, 
  UnifiedCalendarEvent, 
  EventCategory 
} from '@/lib/useCalendarEvents';

import ReservationDetailModal from './ReservationDetailModal';
import BlockDetailModal from './BlockDetailModal';
import NewOperationalEventModal from './NewOperationalEventModal';
import EventTypesManagementModal from './EventTypesManagementModal';
import AbsenceModal from './AbsenceModal';
import ConflictResolutionModal from './ConflictResolutionModal';
import ConfirmActionModal from './ConfirmActionModal';
import DeleteServiceConfirmModal from './DeleteServiceConfirmModal';
import CompactCalendarEvent from './CompactCalendarEvent';
import CentralActionSelectorModal from './CentralActionSelectorModal';
import NewReservationModal from './NewReservationModal';
import NewBlockModal from './NewBlockModal';
import ExceptionalEventModal from './ExceptionalEventModal';
import { ExceptionalEvent } from '@/services/exceptionalEventsService';
import AccountPayableDetailModal from './accounts-payable/AccountPayableDetailModal';
import MarkAsPaidModal from './accounts-payable/MarkAsPaidModal';
import AccountPayableFormModal from './accounts-payable/AccountPayableFormModal';

type CalendarViewMode = 'dia' | 'semana' | 'mes' | 'timeline' | 'agenda' | 'lista';

// Icon Renderer helper
function EventIcon({ iconName, size = 12, className = '' }: { iconName: string; size?: number; className?: string }) {
  switch (iconName) {
    case 'CreditCard': return <CreditCard size={size} className={className} />;
    case 'Home': return <CalendarCheck size={size} className={className} />;
    case 'Lock': return <Lock size={size} className={className} />;
    case 'LogIn': return <LogIn size={size} className={className} />;
    case 'LogOut': return <LogOut size={size} className={className} />;
    case 'Sparkles': return <Sparkles size={size} className={className} />;
    case 'Waves': return <Waves size={size} className={className} />;
    case 'TreePine': return <TreePine size={size} className={className} />;
    case 'Wrench': return <Wrench size={size} className={className} />;
    case 'ClipboardCheck': return <ClipboardCheck size={size} className={className} />;
    case 'UserCheck': return <UserCheck size={size} className={className} />;
    case 'Users': return <Users size={size} className={className} />;
    case 'Clock': return <Clock size={size} className={className} />;
    default: return <CalendarIcon size={size} className={className} />;
  }
}

export default function ReservationsCalendar() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('mes');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Base master lists
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [eventTypes, setEventTypes] = useState<OperationalEventType[]>([]);

  // Independent Domain Toggle Filters
  const [showReservations, setShowReservations] = useState<boolean>(true);
  const [showServices, setShowServices] = useState<boolean>(true);
  const [showAccountsPayable, setShowAccountsPayable] = useState<boolean>(true);
  const [showPaidAccounts, setShowPaidAccounts] = useState<boolean>(false);

  // Category & Entity Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('TODAS');
  const [chacaraFilter, setChacaraFilter] = useState<string>('TODAS');
  const [staffFilter, setStaffFilter] = useState<string>('TODOS');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Deletion state
  const [eventToDelete, setEventToDelete] = useState<OperationalEvent | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Conflicts state
  const [ignoredConflictIds, setIgnoredConflictIds] = useState<string[]>([]);

  // Modals state
  const [isCentralActionModalOpen, setIsCentralActionModalOpen] = useState(false);
  const [isNewReservationModalOpen, setIsNewReservationModalOpen] = useState(false);
  const [isNewBlockModalOpen, setIsNewBlockModalOpen] = useState(false);

  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isReservationDetailOpen, setIsReservationDetailOpen] = useState(false);

  const [selectedBlock, setSelectedBlock] = useState<ChacaraBlock | null>(null);
  const [isBlockDetailOpen, setIsBlockDetailOpen] = useState(false);

  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<OperationalEvent | null>(null);

  const [isExceptionalModalOpen, setIsExceptionalModalOpen] = useState(false);
  const [exceptionalEventToEdit, setExceptionalEventToEdit] = useState<ExceptionalEvent | null>(null);

  const [isTypesModalOpen, setIsTypesModalOpen] = useState(false);

  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [eventForAbsence, setEventForAbsence] = useState<OperationalEvent | null>(null);

  const [isConflictsModalOpen, setIsConflictsModalOpen] = useState(false);

  // Accounts Payable modals state
  const [selectedAccountPayable, setSelectedAccountPayable] = useState<AccountPayable | null>(null);
  const [isAccountDetailOpen, setIsAccountDetailOpen] = useState(false);
  const [accountToPay, setAccountToPay] = useState<AccountPayable | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<AccountPayable | null>(null);
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);

  // Hook feeding unified events
  const { 
    loading, 
    events, 
    rawReservations,
    rawOpEvents,
    rawAccountsPayable,
    indicators, 
    conflicts, 
    refresh, 
    getEventsForDay, 
    getEventsForRange 
  } = useCalendarEvents({
    chacaraFilter,
    staffFilter,
    statusFilter,
    categoryFilter,
    searchTerm,
    currentDate,
    viewMode,
    showReservations,
    showServices,
    showAccountsPayable,
    showPaidAccounts
  });

  useEffect(() => {
    loadBaseData();
  }, []);

  const loadBaseData = async () => {
    const [cList, mList, tList] = await Promise.all([
      getChacaras(),
      getCrewMembers(),
      getOperationalEventTypes()
    ]);
    setChacaras(cList);
    setCrewMembers(mList);
    setEventTypes(tList);
  };

  // Date Navigation without mutations
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'mes') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'semana') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'mes') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'semana') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Event Click Handler
  const handleEventClick = (evt: UnifiedCalendarEvent) => {
    if (evt.rawAccountPayable) {
      setSelectedAccountPayable(evt.rawAccountPayable);
      setIsAccountDetailOpen(true);
    } else if (evt.rawReservation) {
      setSelectedReservation(evt.rawReservation);
      setIsReservationDetailOpen(true);
    } else if (evt.rawBlock) {
      setSelectedBlock(evt.rawBlock);
      setIsBlockDetailOpen(true);
    } else if (evt.rawOperationalEvent) {
      setEventToEdit(evt.rawOperationalEvent);
      setIsNewEventModalOpen(true);
    } else if (evt.rawExceptionalEvent) {
      setExceptionalEventToEdit(evt.rawExceptionalEvent);
      setIsExceptionalModalOpen(true);
    }
  };

  // Account Payable Handlers
  const handlePayAccount = (account: AccountPayable) => {
    setAccountToPay(account);
    setIsPayModalOpen(true);
  };

  const handleEditAccount = (account: AccountPayable) => {
    setAccountToEdit(account);
    setIsAccountFormOpen(true);
  };

  // Quick Action Handlers
  const handleConfirmPresence = async (evt: OperationalEvent) => {
    try {
      await updateOperationalEventStatus(evt.id, 'CONFIRMADO', { confirmed_by: 'Administrador' });
      await refresh();
    } catch (e: any) {
      alert(e.message || 'Erro ao confirmar presença');
    }
  };

  const handleOpenAbsenceModal = (evt: OperationalEvent) => {
    setEventForAbsence(evt);
    setIsAbsenceModalOpen(true);
  };

  const handleDeleteOpEvent = (evt: OperationalEvent) => {
    setEventToDelete(evt);
  };

  const handleIgnoreConflict = (id: string) => {
    setIgnoredConflictIds([...ignoredConflictIds, id]);
  };

  const activeConflicts = conflicts.filter(c => !ignoredConflictIds.includes(c.id));

  // Calendar Days Computation for Month View (No mutation)
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const prevDaysCount = new Date(year, month, 0).getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean; dateStr: string }> = [];

    // Prev month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevDaysCount - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateStr: d.toISOString().split('T')[0]
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        dateStr: d.toISOString().split('T')[0]
      });
    }

    // Next month padding to reach 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateStr: d.toISOString().split('T')[0]
      });
    }

    return days;
  }, [currentDate]);

  // Week Days Computation for Week View (No mutation)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay(); // 0 = Sun
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek);

    const days: Array<{ date: Date; dateStr: string; dayName: string }> = [];
    const names = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(sunday);
      dayDate.setDate(sunday.getDate() + i);
      days.push({
        date: dayDate,
        dateStr: dayDate.toISOString().split('T')[0],
        dayName: names[i]
      });
    }

    return days;
  }, [currentDate]);

  // Hourly slots for Day and Week views
  const hoursList = useMemo(() => {
    const hours = [];
    for (let h = 6; h <= 22; h++) {
      hours.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return hours;
  }, []);

  // Header Title
  const headerTitle = useMemo(() => {
    if (viewMode === 'mes') {
      return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    if (viewMode === 'semana') {
      const startStr = weekDays[0].date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      const endStr = weekDays[6].date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
      return `Semana: ${startStr} - ${endStr}`;
    }
    return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [currentDate, viewMode, weekDays]);

  // KPIs computation
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const reservationKPIs = useMemo(() => {
    const pre = (rawReservations || []).filter(r => r.status === 'PRE_RESERVA').length;
    const confirmadas = (rawReservations || []).filter(r => r.status === 'CONFIRMADA' || r.status === 'CHECKIN_REALIZADO' || r.status === 'HOSPEDADO' || r.status === 'FINALIZADA').length;
    const checkins = (rawReservations || []).filter(r => r.checkin_date === todayStr && r.status !== 'CANCELADA').length;
    const checkouts = (rawReservations || []).filter(r => r.checkout_date === todayStr && r.status !== 'CANCELADA').length;
    return { pre, confirmadas, checkins, checkouts };
  }, [rawReservations, todayStr]);

  const operationKPIs = useMemo(() => {
    const servicosHoje = (rawOpEvents || []).filter(e => e.start_date <= todayStr && (e.end_date || e.start_date) >= todayStr && e.status !== 'CANCELADO').length;
    const pendentes = (rawOpEvents || []).filter(e => e.status === 'AGENDADO' || e.status === 'EM_ANDAMENTO').length;
    const concluidos = (rawOpEvents || []).filter(e => e.status === 'CONCLUIDO' || e.status === 'CONFIRMADO').length;
    const staffSet = new Set((rawOpEvents || []).filter(e => e.start_date <= todayStr && (e.end_date || e.start_date) >= todayStr).flatMap(e => e.staff_ids || []));
    const atrasados = (rawOpEvents || []).filter(e => e.start_date < todayStr && (e.status === 'AGENDADO' || e.status === 'EM_ANDAMENTO')).length;
    return { servicosHoje, pendentes, concluidos, escalados: staffSet.size, atrasados };
  }, [rawOpEvents, todayStr]);

  const payableKPIs = useMemo(() => {
    const list = rawAccountsPayable || [];
    const pendentes = list.filter(a => a.status === 'PENDENTE' || a.status === 'VENCIDA');
    const valorPendente = pendentes.reduce((acc, a) => acc + Number(a.valor_previsto || 0), 0);
    const vencendoHoje = list.filter(a => a.data_vencimento === todayStr && a.status !== 'PAGA' && a.status !== 'CANCELADA').length;
    const vencidas = list.filter(a => a.data_vencimento < todayStr && a.status !== 'PAGA' && a.status !== 'CANCELADA').length;
    const pagas = list.filter(a => a.status === 'PAGA').length;
    return { pendentesCount: pendentes.length, valorPendente, vencendoHoje, vencidas, pagas };
  }, [rawAccountsPayable, todayStr]);

  // Unified Event Card Renderer for Grid Cells
  const renderEventCard = (evt: UnifiedCalendarEvent) => {
    const isConfirmed = evt.status === 'CONFIRMADO' || evt.status === 'CONCLUIDO' || evt.status === 'CONFIRMADA' || evt.status === 'CHECKIN_REALIZADO' || evt.status === 'CHECKOUT_REALIZADO' || evt.status === 'PAGA';
    const isAbsent = evt.status === 'FALTOU' || evt.status === 'VENCIDA';
    const isBlocked = evt.entityType === 'BLOQUEIO';
    const isOperational = evt.entityType === 'OPERACIONAL';
    const isReserva = evt.entityType === 'RESERVA';
    const isContaPagar = evt.entityType === 'CONTA_PAGAR';

    return (
      <div
        key={evt.id}
        onClick={() => handleEventClick(evt)}
        className={`w-full text-left p-2 rounded-xl border transition-all hover:scale-[1.01] flex flex-col gap-1 cursor-pointer group shadow-sm ${
          isContaPagar
            ? 'bg-purple-950/40 border-purple-500/40 hover:border-purple-400'
            : isOperational 
              ? 'bg-sky-950/40 border-sky-500/40 hover:border-sky-400' 
              : isReserva 
                ? 'bg-amber-950/40 border-amber-500/40 hover:border-amber-400'
                : 'bg-rose-950/40 border-rose-500/40 hover:border-rose-400'
        }`}
      >
        {/* Domain Badge */}
        <div className="flex items-center justify-between gap-1">
          {isReserva && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
              🏠 {evt.status === 'PRE_RESERVA' ? 'Pré-Reserva' : 'Reserva'}
            </span>
          )}
          {isOperational && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-200 border border-sky-500/40 flex items-center gap-1">
              🛠️ Serviço
            </span>
          )}
          {isContaPagar && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
              💳 Conta a Pagar
            </span>
          )}
          {isBlocked && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
              🔒 Bloqueio
            </span>
          )}

          <div className="flex items-center gap-1">
            {isConfirmed && <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />}
            {isAbsent && <XCircle size={12} className="text-red-400 shrink-0" />}
            {isBlocked && <Lock size={12} className="text-red-400 shrink-0" />}
          </div>
        </div>

        <div className="flex items-center gap-1.5 truncate pt-0.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: evt.color }}
          />
          <EventIcon iconName={evt.iconName} size={12} className="shrink-0 text-white/90" />
          <span className="text-[11px] font-bold truncate text-white">{evt.title}</span>
        </div>

        <div className="flex items-center justify-between text-[9px] text-white/60 font-mono">
          <span>{evt.startTime} - {evt.endTime}</span>
          <span className="truncate max-w-[90px] font-semibold text-white/80">{evt.chacaraName}</span>
        </div>

        {(evt.clientName || (evt.staffNames && evt.staffNames.length > 0)) && (
          <p className="text-[9px] text-[#FFD600] truncate font-medium">
            {evt.clientName ? `👤 ${evt.clientName}` : `👥 ${evt.staffNames.join(', ')}`}
          </p>
        )}

        {/* Operational Event Quick Actions */}
        {evt.rawOperationalEvent && evt.status === 'AGENDADO' && (
          <div className="flex items-center gap-1 pt-1 border-t border-white/10 mt-0.5" onClick={e => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmPresence(evt.rawOperationalEvent!);
              }}
              className="px-1.5 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-[9px] font-bold rounded flex items-center gap-0.5 transition-all"
              title="Confirmar Presença"
            >
              <Check size={10} />
              <span>Presença</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAbsenceModal(evt.rawOperationalEvent!);
              }}
              className="px-1.5 py-0.5 bg-red-500/20 hover:bg-red-500/40 text-red-300 text-[9px] font-bold rounded flex items-center gap-0.5 transition-all"
              title="Informar Falta"
            >
              <X size={10} />
              <span>Falta</span>
            </button>
          </div>
        )}

        {/* Accounts Payable Quick Actions */}
        {evt.rawAccountPayable && evt.status !== 'PAGA' && evt.status !== 'CANCELADA' && (
          <div className="flex items-center gap-1 pt-1 border-t border-white/10 mt-0.5" onClick={e => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePayAccount(evt.rawAccountPayable!);
              }}
              className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-[9px] font-bold rounded flex items-center gap-1 transition-all"
              title="Marcar Conta como Paga"
            >
              <CheckCircle2 size={10} />
              <span>Pagar</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Operational Indicators Bar */}
      <div className="bg-[#0A0F2C] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <CalendarIcon className="text-[#FFD600]" size={28} />
              <span>Calendário Geral Unificado</span>
            </h2>
            <p className="text-xs text-white/50">
              Fonte única de verdade para Reservas, Bloqueios, Serviços Operacionais e Contas a Pagar
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeConflicts.length > 0 && (
              <button
                onClick={() => setIsConflictsModalOpen(true)}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse transition-all"
              >
                <AlertTriangle size={14} />
                <span>Conflitos ({activeConflicts.length})</span>
              </button>
            )}

            <button
              onClick={() => setIsTypesModalOpen(true)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Settings2 size={14} />
              <span>Tipos de Serviço</span>
            </button>

            <button
              onClick={() => setIsCentralActionModalOpen(true)}
              className="px-4 py-2 bg-[#FFD600] hover:bg-[#ffe033] text-[#0A0F2C] rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg transition-all"
            >
              <Plus size={16} />
              <span>Nova Ação / Evento</span>
            </button>
          </div>
        </div>

        {/* Domain Toggles Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-[#FFD600]" />
            <span className="text-xs font-black text-white uppercase tracking-wider">Exibir no Calendário:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowReservations(!showReservations)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                showReservations
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow'
                  : 'bg-white/5 text-white/30 border-white/10 hover:text-white/60'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${showReservations ? 'bg-amber-400' : 'bg-white/20'}`} />
              <span>🏠 Reservas & Bloqueios</span>
            </button>

            <button
              type="button"
              onClick={() => setShowServices(!showServices)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                showServices
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow'
                  : 'bg-white/5 text-white/30 border-white/10 hover:text-white/60'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${showServices ? 'bg-sky-400' : 'bg-white/20'}`} />
              <span>🛠️ Serviços Operacionais</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowAccountsPayable(!showAccountsPayable)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                  showAccountsPayable
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow'
                    : 'bg-white/5 text-white/30 border-white/10 hover:text-white/60'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${showAccountsPayable ? 'bg-purple-400' : 'bg-white/20'}`} />
                <span>💳 Contas a Pagar</span>
              </button>

              {showAccountsPayable && (
                <button
                  type="button"
                  onClick={() => setShowPaidAccounts(!showPaidAccounts)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    showPaidAccounts
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-white/5 text-white/40 border-white/10 hover:text-white/70'
                  }`}
                  title="Alternar exibição de contas já pagas"
                >
                  {showPaidAccounts ? '✓ Com Pagas' : 'Apenas Pendentes'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3-Panel KPI Dashboard (Reservas, Serviços, Contas a Pagar) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
          {/* Panel 1: Reservas (Negócio) */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
              <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🏠 Reservas (Negócio)</span>
              </h4>
              <span className="text-[10px] text-amber-400/80 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Hóspedes
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-center">
                <span className="text-[9px] text-amber-200/60 font-bold block uppercase">Pré</span>
                <span className="text-lg font-black text-amber-300">{reservationKPIs.pre}</span>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 text-center">
                <span className="text-[9px] text-emerald-200/60 font-bold block uppercase">Conf.</span>
                <span className="text-lg font-black text-emerald-300">{reservationKPIs.confirmadas}</span>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-2 text-center">
                <span className="text-[9px] text-cyan-200/60 font-bold block uppercase">In Hoje</span>
                <span className="text-lg font-black text-cyan-300">{reservationKPIs.checkins}</span>
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2 text-center">
                <span className="text-[9px] text-indigo-200/60 font-bold block uppercase">Out Hoje</span>
                <span className="text-lg font-black text-indigo-300">{reservationKPIs.checkouts}</span>
              </div>
            </div>
          </div>

          {/* Panel 2: Operação (Serviços) */}
          <div className="bg-sky-950/20 border border-sky-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
              <h4 className="text-xs font-black text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🛠️ Operação (Serviços)</span>
              </h4>
              <span className="text-[10px] text-sky-400/80 font-bold bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                Equipe
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-2 text-center">
                <span className="text-[9px] text-sky-200/60 font-bold block uppercase">Hoje</span>
                <span className="text-lg font-black text-sky-300">{operationKPIs.servicosHoje}</span>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-center">
                <span className="text-[9px] text-amber-200/60 font-bold block uppercase">Pendentes</span>
                <span className="text-lg font-black text-amber-300">{operationKPIs.pendentes}</span>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 text-center">
                <span className="text-[9px] text-emerald-200/60 font-bold block uppercase">Concluídos</span>
                <span className="text-lg font-black text-emerald-300">{operationKPIs.concluidos}</span>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2 text-center">
                <span className="text-[9px] text-rose-200/60 font-bold block uppercase">Atrasados</span>
                <span className="text-lg font-black text-rose-300">{operationKPIs.atrasados}</span>
              </div>
            </div>
          </div>

          {/* Panel 3: Contas a Pagar (Financeiro) */}
          <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
              <h4 className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>💳 Contas a Pagar (Financeiro)</span>
              </h4>
              <span className="text-[10px] text-purple-400/80 font-bold bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                {payableKPIs.valorPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-2 text-center">
                <span className="text-[9px] text-purple-200/60 font-bold block uppercase">Pendentes</span>
                <span className="text-lg font-black text-purple-300">{payableKPIs.pendentesCount}</span>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-center">
                <span className="text-[9px] text-amber-200/60 font-bold block uppercase">Venc. Hoje</span>
                <span className="text-lg font-black text-amber-300">{payableKPIs.vencendoHoje}</span>
              </div>
              <div className={`border rounded-xl p-2 text-center ${payableKPIs.vencidas > 0 ? 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse' : 'bg-red-500/10 border-red-500/20'}`}>
                <span className="text-[9px] text-red-200/60 font-bold block uppercase">Vencidas</span>
                <span className="text-lg font-black text-red-300">{payableKPIs.vencidas}</span>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 text-center">
                <span className="text-[9px] text-emerald-200/60 font-bold block uppercase">Pagas</span>
                <span className="text-lg font-black text-emerald-300">{payableKPIs.pagas}</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Controls & Navigation Header */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1">
              <button
                onClick={handlePrev}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1 text-xs font-bold text-white hover:bg-white/10 rounded-xl transition-all"
              >
                Hoje
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <h3 className="text-lg font-black text-white capitalize">{headerTitle}</h3>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-2xl overflow-x-auto max-w-full">
            {[
              { id: 'mes', label: 'Mensal', icon: CalendarIcon },
              { id: 'semana', label: 'Semanal', icon: Layers },
              { id: 'dia', label: 'Diário', icon: Clock },
              { id: 'timeline', label: 'Linha do Tempo', icon: Clock },
              { id: 'agenda', label: 'Agenda', icon: List },
              { id: 'lista', label: 'Lista Completa', icon: Filter }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id as CalendarViewMode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#FFD600] text-[#0A0F2C] shadow-lg'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="pt-2 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, título..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#FFD600]"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'TODAS', label: 'Todos' },
              { id: 'RESERVA', label: 'Reservas' },
              { id: 'BLOQUEIO', label: 'Bloqueios' },
              { id: 'CONTA_PAGAR', label: '💳 Contas a Pagar' },
              { id: 'MANUTENCAO', label: 'Manutenções' },
              { id: 'LIMPEZA', label: 'Limpeza & Piscina' },
              { id: 'EQUIPE', label: 'Serviços de Equipe' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  categoryFilter === cat.id
                    ? 'bg-white/20 text-white border-white/30 shadow'
                    : 'bg-white/5 text-white/50 border-transparent hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Secondary Dropdowns */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
              <TreePine size={14} className="text-[#FFD600]" />
              <select
                value={chacaraFilter}
                onChange={e => setChacaraFilter(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="TODAS" className="bg-[#0A0F2C] text-white">Todas Chácaras</option>
                {chacaras.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#0A0F2C] text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
              <Users size={14} className="text-[#FFD600]" />
              <select
                value={staffFilter}
                onChange={e => setStaffFilter(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="TODOS" className="bg-[#0A0F2C] text-white">Todos Funcionários</option>
                {crewMembers.map(m => (
                  <option key={m.id} value={m.id} className="bg-[#0A0F2C] text-white">
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Calendar View Container */}
      {loading ? (
        <div className="p-12 text-center text-white/50 bg-[#0A0F2C] border border-white/10 rounded-3xl shadow-2xl">
          <Clock className="animate-spin mx-auto mb-2 text-[#FFD600]" size={28} />
          <p className="text-xs font-bold">Sincronizando fonte unificada de eventos...</p>
        </div>
      ) : (
        <>
          {/* ========================================================
              1. MONTH VIEW
             ======================================================== */}
          {viewMode === 'mes' && (
            <div className="bg-[#0A0F2C] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
                {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(d => (
                  <div key={d} className="p-3 text-center text-xs font-bold text-white/50 uppercase tracking-wider">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid cells */}
              <div className="grid grid-cols-7 divide-x divide-y divide-white/5 bg-white/[0.01]">
                {monthDays.map((day, idx) => {
                  const dayEvents = getEventsForDay(day.dateStr);
                  const isToday = day.dateStr === new Date().toISOString().split('T')[0];

                  return (
                    <div
                      key={idx}
                      className={`min-h-[140px] p-2 flex flex-col justify-between transition-all ${
                        !day.isCurrentMonth ? 'opacity-30 bg-black/20' : ''
                      } ${isToday ? 'bg-[#FFD600]/5 border border-[#FFD600]/30' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday ? 'bg-[#FFD600] text-[#0A0F2C]' : 'text-white/70'
                          }`}
                        >
                          {day.date.getDate()}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] text-white/40 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Render Events */}
                      <div className="space-y-1 flex-1 relative">
                        {dayEvents.map(evt => (
                          <CompactCalendarEvent
                            key={evt.id}
                            evt={evt}
                            onEventClick={handleEventClick}
                            onConfirmPresence={handleConfirmPresence}
                            onOpenAbsenceModal={handleOpenAbsenceModal}
                            onDeleteOpEvent={handleDeleteOpEvent}
                            onPayAccount={handlePayAccount}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              2. WEEK VIEW
             ======================================================== */}
          {viewMode === 'semana' && (
            <div className="bg-[#0A0F2C] border border-white/10 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-4">
              <div className="grid grid-cols-7 gap-3">
                {weekDays.map(day => {
                  const dayEvents = getEventsForDay(day.dateStr);
                  const isToday = day.dateStr === new Date().toISOString().split('T')[0];

                  return (
                    <div
                      key={day.dateStr}
                      className={`flex flex-col border border-white/10 rounded-2xl p-3 bg-white/[0.02] min-h-[500px] ${
                        isToday ? 'border-[#FFD600]/50 bg-[#FFD600]/5' : ''
                      }`}
                    >
                      {/* Column Header */}
                      <div className="border-b border-white/10 pb-2 mb-3 text-center">
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                          {day.dayName}
                        </span>
                        <div
                          className={`text-lg font-black inline-flex items-center justify-center w-8 h-8 rounded-full mt-1 ${
                            isToday ? 'bg-[#FFD600] text-[#0A0F2C]' : 'text-white'
                          }`}
                        >
                          {day.date.getDate()}
                        </div>
                      </div>

                      {/* Events List for this Day */}
                      <div className="space-y-1.5 flex-1 relative">
                        {dayEvents.length === 0 ? (
                          <div className="text-[10px] text-white/30 text-center pt-8">
                            Nenhum evento
                          </div>
                        ) : (
                          dayEvents.map(evt => (
                            <CompactCalendarEvent
                              key={evt.id}
                              evt={evt}
                              onEventClick={handleEventClick}
                              onConfirmPresence={handleConfirmPresence}
                              onOpenAbsenceModal={handleOpenAbsenceModal}
                              onDeleteOpEvent={handleDeleteOpEvent}
                              onPayAccount={handlePayAccount}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              3. DAY VIEW
             ======================================================== */}
          {viewMode === 'dia' && (
            <div className="bg-[#0A0F2C] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
              {/* Day Header Summary */}
              {(() => {
                const todayStr = currentDate.toISOString().split('T')[0];
                const dayEvents = getEventsForDay(todayStr);

                return (
                  <>
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div>
                        <h3 className="text-xl font-black text-white">
                          Agenda Detalhada do Dia
                        </h3>
                        <p className="text-xs text-white/50">
                          {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-center">
                          <span className="text-xs text-white/50 block">Total Eventos</span>
                          <span className="text-base font-black text-[#FFD600]">{dayEvents.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Hourly Timeline */}
                    <div className="space-y-3">
                      {dayEvents.length === 0 ? (
                        <div className="p-12 text-center text-white/40 text-xs bg-white/5 rounded-2xl border border-white/10">
                          Nenhum evento registrado para esta data nos filtros selecionados.
                        </div>
                      ) : (
                        dayEvents.map(evt => (
                          <div
                            key={evt.id}
                            onClick={() => handleEventClick(evt)}
                            className="p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.08] transition-all"
                            style={{
                              backgroundColor: `${evt.color}15`,
                              borderColor: `${evt.color}40`
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow"
                                style={{ backgroundColor: `${evt.color}30`, color: evt.color }}
                              >
                                <EventIcon iconName={evt.iconName} size={20} />
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-base font-bold text-white">{evt.title}</span>
                                  <span
                                    className="px-2 py-0.5 rounded text-[10px] font-bold"
                                    style={{ backgroundColor: `${evt.color}30`, color: evt.color }}
                                  >
                                    {evt.category}
                                  </span>
                                  <span className="px-2 py-0.5 bg-white/10 text-white/70 text-[10px] font-mono rounded">
                                    {evt.status}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-white/60 flex-wrap">
                                  <span className="flex items-center gap-1 font-mono">
                                    <Clock size={13} className="text-[#FFD600]" />
                                    {evt.startTime} - {evt.endTime}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <TreePine size={13} className="text-emerald-400" />
                                    {evt.chacaraName}
                                  </span>
                                  {evt.clientName && (
                                    <span className="text-[#FFD600]">👤 Cliente: {evt.clientName}</span>
                                  )}
                                  {evt.staffNames && evt.staffNames.length > 0 && (
                                    <span className="text-blue-300">👥 Equipe: {evt.staffNames.join(', ')}</span>
                                  )}
                                </div>

                                {evt.description && (
                                  <p className="text-xs text-white/50 pt-1">{evt.description}</p>
                                )}
                              </div>
                            </div>

                            {/* Operational Actions */}
                            {evt.rawOperationalEvent && (
                              <div className="flex items-center gap-2 self-end md:self-auto" onClick={e => e.stopPropagation()}>
                                {evt.status === 'AGENDADO' && (
                                  <>
                                    <button
                                      onClick={() => handleConfirmPresence(evt.rawOperationalEvent!)}
                                      className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                                    >
                                      <Check size={14} />
                                      <span>Confirmar</span>
                                    </button>
                                    <button
                                      onClick={() => handleOpenAbsenceModal(evt.rawOperationalEvent!)}
                                      className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                                    >
                                      <X size={14} />
                                      <span>Falta</span>
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleDeleteOpEvent(evt.rawOperationalEvent!)}
                                  className="px-2.5 py-1.5 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-300 rounded-xl text-xs font-bold transition-all"
                                >
                                  Excluir
                                </button>
                              </div>
                            )}

                            {/* Contas a Pagar Actions in Day View */}
                            {evt.rawAccountPayable && evt.status !== 'PAGA' && evt.status !== 'CANCELADA' && (
                              <div className="flex items-center gap-2 self-end md:self-auto" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => handlePayAccount(evt.rawAccountPayable!)}
                                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow"
                                >
                                  <CheckCircle2 size={14} />
                                  <span>Registrar Pagamento</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ========================================================
              4. TIMELINE / AGENDA / LISTA VIEWS
             ======================================================== */}
          {(viewMode === 'timeline' || viewMode === 'agenda' || viewMode === 'lista') && (
            <div className="bg-[#0A0F2C] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-base font-black text-white">
                  {viewMode === 'timeline' ? 'Linha do Tempo Unificada' : viewMode === 'agenda' ? 'Feed de Eventos Integrado' : 'Lista Completa do Calendário'}
                </h3>
                <span className="text-xs text-white/50">{events.length} eventos encontrados</span>
              </div>

              <div className="space-y-3">
                {events.length === 0 ? (
                  <div className="p-8 text-center text-white/40 text-xs">
                    Nenhum evento registrado para os filtros selecionados.
                  </div>
                ) : (
                  events.map(evt => (
                    <div
                      key={evt.id}
                      onClick={() => handleEventClick(evt)}
                      className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/[0.07] transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="w-3 h-3 rounded-full mt-1 shrink-0 shadow-sm"
                          style={{ backgroundColor: evt.color }}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{evt.title}</span>
                            <span className="px-2 py-0.5 bg-white/10 text-white/70 text-[10px] font-mono rounded">
                              {evt.eventTypeCode.toUpperCase()}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{ backgroundColor: `${evt.color}25`, color: evt.color }}
                            >
                              {evt.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-white/50 flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <CalendarIcon size={13} />
                              {evt.startDate} ({evt.startTime} - {evt.endTime})
                            </span>
                            <span className="flex items-center gap-1">
                              <TreePine size={13} />
                              {evt.chacaraName}
                            </span>
                            {evt.clientName && (
                              <span className="text-[#FFD600]">Cliente: {evt.clientName}</span>
                            )}
                            {evt.staffNames && evt.staffNames.length > 0 && (
                              <span className="text-blue-300">Equipe: {evt.staffNames.join(', ')}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto" onClick={e => e.stopPropagation()}>
                        {evt.rawOperationalEvent && evt.status === 'AGENDADO' && (
                          <>
                            <button
                              onClick={() => handleConfirmPresence(evt.rawOperationalEvent!)}
                              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                            >
                              <Check size={14} />
                              <span>Confirmar</span>
                            </button>
                            <button
                              onClick={() => handleOpenAbsenceModal(evt.rawOperationalEvent!)}
                              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                            >
                              <X size={14} />
                              <span>Falta</span>
                            </button>
                          </>
                        )}
                        {evt.rawOperationalEvent && (
                          <button
                            onClick={() => handleDeleteOpEvent(evt.rawOperationalEvent!)}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-300 rounded-xl text-xs font-bold transition-all"
                          >
                            Excluir
                          </button>
                        )}
                        {evt.rawAccountPayable && evt.status !== 'PAGA' && evt.status !== 'CANCELADA' && (
                          <button
                            onClick={() => handlePayAccount(evt.rawAccountPayable!)}
                            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow"
                          >
                            <CheckCircle2 size={14} />
                            <span>Registrar Pagamento</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Reservation Detail Modal */}
      <ReservationDetailModal
        isOpen={isReservationDetailOpen}
        reservation={selectedReservation}
        onClose={() => {
          setIsReservationDetailOpen(false);
          setSelectedReservation(null);
        }}
        onUpdate={refresh}
      />

      {/* Block Detail Modal */}
      <BlockDetailModal
        isOpen={isBlockDetailOpen}
        block={selectedBlock}
        onClose={() => {
          setIsBlockDetailOpen(false);
          setSelectedBlock(null);
        }}
        onUpdate={refresh}
      />

      {/* New / Edit Operational Event Modal */}
      <NewOperationalEventModal
        isOpen={isNewEventModalOpen}
        eventToEdit={eventToEdit}
        onClose={() => {
          setIsNewEventModalOpen(false);
          setEventToEdit(null);
        }}
        onSuccess={refresh}
      />

      {/* Event Types Management Modal */}
      <EventTypesManagementModal
        isOpen={isTypesModalOpen}
        onClose={() => setIsTypesModalOpen(false)}
        onRefresh={refresh}
      />

      {/* Absence Registration Modal */}
      <AbsenceModal
        isOpen={isAbsenceModalOpen}
        event={eventForAbsence}
        onClose={() => {
          setIsAbsenceModalOpen(false);
          setEventForAbsence(null);
        }}
        onSuccess={refresh}
      />

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={isConflictsModalOpen}
        conflicts={activeConflicts}
        onClose={() => setIsConflictsModalOpen(false)}
        onIgnoreConflict={handleIgnoreConflict}
      />

      {/* Central Action Selector Modal */}
      <CentralActionSelectorModal
        isOpen={isCentralActionModalOpen}
        onClose={() => setIsCentralActionModalOpen(false)}
        activeTab="calendario"
        onActionTrigger={(triggerId) => {
          if (triggerId === 'new_reservation') {
            setIsNewReservationModalOpen(true);
          } else if (triggerId === 'new_operational_event') {
            setEventToEdit(null);
            setIsNewEventModalOpen(true);
          } else if (triggerId === 'new_exceptional_event') {
            setExceptionalEventToEdit(null);
            setIsExceptionalModalOpen(true);
          } else if (triggerId === 'new_block') {
            setIsNewBlockModalOpen(true);
          } else if (triggerId === 'new_account_payable') {
            setAccountToEdit(null);
            setIsAccountFormOpen(true);
          }
        }}
      />

      {/* New Reservation Modal */}
      <NewReservationModal
        isOpen={isNewReservationModalOpen}
        onClose={() => setIsNewReservationModalOpen(false)}
        onSuccess={refresh}
      />

      {/* New Block Modal */}
      <NewBlockModal
        isOpen={isNewBlockModalOpen}
        onClose={() => setIsNewBlockModalOpen(false)}
        onSuccess={refresh}
      />

      {/* New Operational Event Modal */}
      <NewOperationalEventModal
        isOpen={isNewEventModalOpen}
        eventToEdit={eventToEdit}
        onClose={() => {
          setIsNewEventModalOpen(false);
          setEventToEdit(null);
        }}
        onSuccess={refresh}
      />

      {/* Exceptional Event Modal */}
      <ExceptionalEventModal
        isOpen={isExceptionalModalOpen}
        eventToEdit={exceptionalEventToEdit}
        onClose={() => {
          setIsExceptionalModalOpen(false);
          setExceptionalEventToEdit(null);
        }}
        onSuccess={refresh}
      />

      {/* Confirmation Modal for Delete */}
      <DeleteServiceConfirmModal
        isOpen={!!eventToDelete}
        event={eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={async ({ scope, disableAutomation, reason }) => {
          if (!eventToDelete) return;
          await deleteOperationalEvent(eventToDelete.id, scope, {
            disableAutomation,
            reason,
            deletedBy: 'Administrador'
          });
          setEventToDelete(null);
          await refresh();
        }}
      />

      {/* Account Payable Detail Modal */}
      <AccountPayableDetailModal
        isOpen={isAccountDetailOpen}
        account={selectedAccountPayable}
        onClose={() => {
          setIsAccountDetailOpen(false);
          setSelectedAccountPayable(null);
        }}
        onEdit={(account) => {
          setIsAccountDetailOpen(false);
          setSelectedAccountPayable(null);
          handleEditAccount(account);
        }}
        onPay={(account) => {
          setIsAccountDetailOpen(false);
          setSelectedAccountPayable(null);
          handlePayAccount(account);
        }}
        onUpdate={refresh}
      />

      {/* Mark As Paid Modal */}
      {accountToPay && (
        <MarkAsPaidModal
          isOpen={isPayModalOpen}
          account={accountToPay}
          onClose={() => {
            setIsPayModalOpen(false);
            setAccountToPay(null);
          }}
          onSuccess={refresh}
        />
      )}

      {/* Edit Account Payable Modal */}
      <AccountPayableFormModal
        isOpen={isAccountFormOpen}
        accountToEdit={accountToEdit}
        onClose={() => {
          setIsAccountFormOpen(false);
          setAccountToEdit(null);
        }}
        onSuccess={refresh}
      />
    </div>
  );
}
