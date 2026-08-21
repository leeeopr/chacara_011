'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Appointment, ScheduleBlock, AppointmentStatus } from '@/lib/types';
import { formatReminderMessage } from '@/lib/utils';
import { 
  Calendar, Clock, Phone, UserRound, 
  CalendarCheck, Database, XCircle, ChevronLeft, ChevronRight, Search,
  Lock, ShieldAlert, Repeat, CheckCircle2, UserX, DollarSign
} from 'lucide-react';
import { 
  format, addDays, subDays, isToday, parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import CancelModal from './CancelModal';
import AppointmentModal from './AppointmentModal';
import ScheduleBlockModal from './ScheduleBlockModal';
import FinancialDetailModal from './FinancialDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import DateNavigator from './DateNavigator';

export default function AppointmentList({ 
  refreshKey, 
  scrollRef: externalScrollRef, 
  onScroll,
  selectedDate: externalSelectedDate,
  onDateChange: externalOnDateChange,
  homeMode = 'PATIENTS'
}: { 
  refreshKey: number, 
  scrollRef?: React.RefObject<HTMLDivElement | null>, 
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void,
  selectedDate?: Date,
  onDateChange?: (date: Date) => void,
  homeMode?: 'PATIENTS' | 'FINANCIAL'
}) {
  const { profile } = useAuth();
  const internalRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = externalScrollRef || internalRef;
  const [localSelectedDate, setLocalSelectedDate] = useState(new Date());
  const selectedDate = externalSelectedDate || localSelectedDate;
  const setSelectedDate = externalOnDateChange || setLocalSelectedDate;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [financialReminders, setFinancialReminders] = useState<any[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dbError, setDbError] = useState<any | null>(null);
  const [tomorrowReqTemplate, setTomorrowReqTemplate] = useState<string | null>(null);
  const [tomorrowSuccessTemplate, setTomorrowSuccessTemplate] = useState<string | null>(null);
  const [todayReminderTemplate, setTodayReminderTemplate] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Financial reminder state and dialog
  const [selectedFinancialRem, setSelectedFinancialRem] = useState<any>(null);
  const [isFinModalOpen, setIsFinModalOpen] = useState(false);

  // Safety timeout for loading state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (loading) {
      timeoutId = setTimeout(() => {
        console.warn('AppointmentList: Loading safety timeout reached. Forcing loading to false.');
        setLoading(false);
      }, 15000); // 15 seconds safety net
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);

  const fetchAppointments = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);

    try {
      if (homeMode === 'FINANCIAL') {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        // Fetch billings from DB to build financial reminders list
        const { data: billingsData, error: billingsError } = await supabase
          .from('billings')
          .select(`
            *,
            companies ( id, name, limit_value, limit_type ),
            appointments!inner (
              id,
              patient_name,
              appointment_date,
              start_time,
              status,
              price_source,
              fono_id,
              whatsapp,
              agreed_price,
              discount_value,
              net_value,
              invoice_needed,
              billing_company_id,
              patients ( id, full_name, whatsapp ),
              profiles ( id, full_name ),
              appointment_types ( id, name, color ),
              companies ( id, name )
            )
          `)
          .eq('appointments.appointment_date', dateStr);

        if (billingsError) throw billingsError;

        const remindersList: any[] = [];
        (billingsData || []).forEach((billing: any) => {
          if (!billing.appointments) return;

          const appt = billing.appointments;
          const patientName = appt.patients?.full_name || appt.patient_name || billing.patient_name || 'Paciente Geral';
          const companyName = appt.companies?.name || billing.companies?.name || '';
          const amount = appt.net_value ?? billing.net_total ?? appt.agreed_price ?? billing.gross_total ?? 0;
          const billingDueDate = billing.due_date;
          
          const isPaid = billing.status === 'PAID';
          const isCancelled = billing.status === 'CANCELLED' || billing.status === 'WAIVED' || appt.status === 'CANCELADO';
          const isOverdue = billing.status === 'OVERDUE';
          const isPartiallyPaid = billing.status === 'PARTIALLY_PAID';

          let type = 'cobrar_hoje';
          let title = 'Faturamento Pendente';
          
          if (isPaid) {
            type = 'recebimento_confirmado';
            title = 'Recebido';
          } else if (isCancelled) {
            type = 'cobranca_cancelada';
            title = 'Cancelado';
          } else if (isPartiallyPaid) {
            type = 'confirmar_pagamento';
            title = 'Parcial';
          } else if (isOverdue) {
            type = 'recebimento_pendente';
            title = 'Atrasado';
          } else {
            type = 'cobrar_hoje';
            title = 'Pendente';
          }

          remindersList.push({
            id: `rem-${billing.id}`,
            type: type,
            title: title,
            patientName: patientName,
            companyName: companyName,
            amount: amount,
            date: appt.appointment_date,
            whatsapp: appt.patients?.whatsapp || appt.whatsapp || '',
            label: `R$ ${amount.toFixed(2)} - Status: ${isPaid ? 'Pago' : isCancelled ? 'Cancelado' : isOverdue ? 'Atrasado' : isPartiallyPaid ? 'Parcial' : 'Pendente'}`,
            billingData: billing
          });
        });

        // Set compiled reminders list
        setFinancialReminders(remindersList);
        setAppointments([]);
        setScheduleBlocks([]);
      } else {
        // --- PATIENTS MODE ---
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        const fetchAppointmentsData = async () => {
          let appointmentsRes: any = await supabase
            .from('appointments')
            .select(`
              id,
              patient_name,
              appointment_date,
              start_time,
              whatsapp,
              status,
              fono_id,
              recurring_schedule_id,
              patients (
                full_name,
                whatsapp
              ),
              appointment_types (
                name
              )
            `)
            .in('status', ['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'ATENDIDO', 'FALTOU'])
            .eq('appointment_date', dateStr)
            .order('start_time', { ascending: true });

          // If recurring_schedule_id doesn't exist (DB not migrated), retry without it
          if (appointmentsRes.error && (appointmentsRes.error.code === '42703' || String(appointmentsRes.error.message || '').includes('recurring_schedule_id'))) {
            console.warn('Column recurring_schedule_id is missing from appointments. Retrying query without it.');
            appointmentsRes = await supabase
              .from('appointments')
              .select(`
                id,
                patient_name,
                appointment_date,
                start_time,
                whatsapp,
                status,
                fono_id,
                patients (
                  full_name,
                  whatsapp
                ),
                appointment_types (
                  name
                )
              `)
              .in('status', ['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'ATENDIDO', 'FALTOU'])
              .eq('appointment_date', dateStr)
              .order('start_time', { ascending: true });
          }
          return appointmentsRes;
        };

        let blocksQuery = supabase
          .from('schedule_blocks')
          .select(`
            *,
            profiles:fono_id(full_name)
          `);

        if (profile?.role === 'FONO') {
          blocksQuery = blocksQuery.eq('fono_id', profile.id);
        }

        const fetchBlocks = async () => {
          try {
            const res = await blocksQuery;
            return res;
          } catch (err) {
            console.error('Erro ao buscar bloqueios no Reminder:', err);
            return { data: [], error: err };
          }
        };

        const [appointmentsRes, profilesRes, blocksQueryRes] = await Promise.all([
          fetchAppointmentsData(),
          supabase.from('profiles').select('id, full_name').in('role', ['FONO', 'DONA']),
          fetchBlocks()
        ]);

        if (appointmentsRes.error) throw appointmentsRes.error;

        if (appointmentsRes.data) {
          const profilesMap = new Map(profilesRes.data?.map(u => [u.id, u]) || []);
          const formattedData = appointmentsRes.data.map((item: any) => ({
            ...item,
            patients: Array.isArray(item.patients) ? item.patients[0] : item.patients,
            appointment_types: Array.isArray(item.appointment_types) ? item.appointment_types[0] : item.appointment_types,
            profiles: profilesMap.get(item.fono_id) || { full_name: 'Desconhecido' }
          }));
          
          setAppointments(formattedData as Appointment[]);
        }

        if (blocksQueryRes.data) {
          setScheduleBlocks(blocksQueryRes.data as any[]);
        } else {
          setScheduleBlocks([]);
        }
        setFinancialReminders([]);
      }
    } catch (error: any) {
      console.warn('Busca de consultas/faturamento finalizada:', error?.message || error);
      if (error?.code === '42703' || error?.code === 'PGRST204' || error?.code === 'PGRST205' || error?.code === '42P01' || String(error?.message || '').includes('Could not find the table')) {
        setDbError(error);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedDate, profile?.id, profile?.role, homeMode]);

  // Recurrence & period checks for active blocks
  const activeBlocks = useMemo(() => {
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const appDayOfWeek = selectedDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

    return scheduleBlocks.filter(block => {
      const mode = block.block_mode || 'single_day';

      switch (mode) {
        case 'single_day': {
          const targetDate = block.start_date || block.block_date;
          return targetDate === formattedDate;
        }
        case 'continuous_period': {
          if (!block.start_date || !block.end_date) return false;
          return formattedDate >= block.start_date && formattedDate <= block.end_date;
        }
        case 'weekly_recurring': {
          if (!block.weekdays || !Array.isArray(block.weekdays)) return false;
          return block.weekdays.includes(appDayOfWeek);
        }
        case 'weekly_within_period': {
          if (!block.start_date || !block.end_date || !block.weekdays || !Array.isArray(block.weekdays)) return false;
          const dateInRange = formattedDate >= block.start_date && formattedDate <= block.end_date;
          return dateInRange && block.weekdays.includes(appDayOfWeek);
        }
        default:
          return false;
      }
    });
  }, [scheduleBlocks, selectedDate]);

  // Unified Chronological Schedule List
  const combinedItems = useMemo(() => {
    const list: Array<
      | { type: 'appointment'; data: Appointment; time: string }
      | { type: 'block'; data: ScheduleBlock; time: string }
    > = [];

    // Filter appointments
    const filteredApps = appointments.filter(app => {
      if (!searchTerm) return true;
      const pName = app.patients?.full_name || app.patient_name || '';
      const typeName = app.appointment_types?.name || '';
      const search = searchTerm.toLowerCase();
      return pName.toLowerCase().includes(search) || 
             typeName.toLowerCase().includes(search) ||
             app.whatsapp?.includes(searchTerm);
    });

    // Filter active blocks
    const filteredBlks = activeBlocks.filter(block => {
      if (!searchTerm) return true;
      const reason = block.reason || '';
      const profName = block.profiles?.full_name || '';
      const search = searchTerm.toLowerCase();
      return reason.toLowerCase().includes(search) || profName.toLowerCase().includes(search);
    });

    filteredApps.forEach(app => {
      list.push({ type: 'appointment', data: app, time: app.start_time || '00:00' });
    });

    filteredBlks.forEach(block => {
      list.push({ type: 'block', data: block, time: block.start_time || '00:00' });
    });

    // Chronological order sorting
    return list.sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, activeBlocks, searchTerm]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (data) {
        setTomorrowReqTemplate(data.tomorrow_confirmation_request_template || data.tomorrow_message_template);
        setTomorrowSuccessTemplate(data.tomorrow_confirmation_success_template);
        setTodayReminderTemplate(data.today_reminder_template || data.today_message_template);
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    // Preserve scroll position if we have a scrollRef
    const currentScroll = scrollRef?.current?.scrollTop;
    
    fetchAppointments(appointments.length > 0);
    
    // Restore scroll after a tick
    if (currentScroll !== undefined && scrollRef?.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = currentScroll;
        }
      }, 50);
    }
  }, [refreshKey, fetchAppointments]);

  // Handle auto-refetch on window focus with session validation
  useRefetchOnFocus(useCallback(async () => {
    console.log('[AppointmentList] Focus detected, starting session validation and refresh...');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[AppointmentList] Session validation failed on focus:', error);
        return;
      }
      if (session) {
        console.log('[AppointmentList] Session valid, auto-refetching appointments in background.');
        await fetchAppointments(true);
      } else {
        console.warn('[AppointmentList] No active session found on focus.');
      }
    } catch (err) {
      console.error('[AppointmentList] Error validating session on focus:', err);
    }
  }, [fetchAppointments]));

  const handleStatusUpdate = async (id: number | string, newStatus: AppointmentStatus) => {
    // Update locally first
    setAppointments(prev => prev.map(app => 
      app.id === id ? { ...app, status: newStatus } : app
    ));

    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error(`Erro ao alterar status para ${newStatus}:`, error);
      alert(`Erro ao alterar status: ` + error.message);
      // Revert if error
      fetchAppointments(true);
    } else {
      window.dispatchEvent(new CustomEvent('appointment-updated'));
    }
  };

  const handleConfirm = async (id: number | string) => {
    await handleStatusUpdate(id, 'CONFIRMADO');
  };

  const DEFAULT_TOMORROW_REQ = `Olá {name}, você tem uma consulta amanhã às {time}. Confirma presença?`;
  const DEFAULT_TOMORROW_SUCCESS = `Perfeito, {name}! Sua consulta de amanhã às {time} está confirmada.`;
  const DEFAULT_TODAY_REMINDER = `Olá {name}, lembrando da sua consulta hoje às {time} com {professional_name}.`;

  if (dbError) {
    const errorMsg = dbError?.message || 'Erro de esquema no banco de dados';
    const errorCode = dbError?.code || 'Desconhecido';
    return (
      <div className="text-center py-12 px-6 glass rounded-3xl border border-rose-500/20 max-w-lg mx-auto">
        <Database className="mx-auto text-rose-400 mb-4 animate-pulse" size={48} />
        <h3 className="text-white font-black text-lg mb-2 uppercase tracking-wider">Erro no Banco de Dados</h3>
        <p className="text-white/80 text-sm mb-4">
          Ocorreu um erro ao consultar as tabelas. Verifique sua estrutura no Supabase.
        </p>
        <div className="bg-black/40 text-left p-4 rounded-xl font-mono text-[11px] text-rose-300 border border-white/5 space-y-1 mb-6 max-h-[150px] overflow-auto">
          <div><strong className="text-white/60">Erro:</strong> {errorMsg}</div>
          <div><strong className="text-white/60">Código:</strong> {errorCode}</div>
          {dbError?.hint && <div><strong className="text-white/60">Dica:</strong> {dbError.hint}</div>}
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-sql-modal'))}
          className="bg-rose-600 hover:bg-rose-700 text-white font-black py-3 px-8 rounded-2xl shadow-lg shadow-rose-900/20 transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
        >
          Abrir Setup do Banco de Dados
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string, typeColor?: string) => {
    if (status === 'CANCELADO') return 'bg-rose-500/20 border-rose-500/30 text-rose-400 hover:bg-rose-500/30';
    if (typeColor) return ''; // We will use inline style for background
    
    switch (status) {
      case 'CONFIRMADO': return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30';
      case 'ATENDIDO': return 'bg-sky-500/20 border-sky-500/30 text-sky-400 hover:bg-sky-500/30';
      case 'FALTOU': return 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30';
      default: return 'bg-slate-500/20 border-slate-500/30 text-slate-300 hover:bg-slate-500/30';
    }
  };

  const getInlineStyle = (status: string, typeColor?: string) => {
    if (status === 'CANCELADO' || !typeColor) return {};
    return {
      backgroundColor: `${typeColor}33`, 
      borderColor: `${typeColor}4D`, 
      color: '#ffffff', 
    };
  };

  const renderBlockCard = (block: ScheduleBlock, index: number) => {
    const formattedDate = format(selectedDate, 'dd/MM');
    const formattedStartTime = (block.start_time || '').substring(0, 5).replace(':', 'h') || '--h--';
    const formattedEndTime = (block.end_time || '').substring(0, 5).replace(':', 'h') || '--h--';
    const professionalName = block.profiles?.full_name || 'Profissional';
    const reason = block.reason || 'Bloqueio de Agenda';
    const mode = block.block_mode || 'single_day';

    const modeLabels: Record<string, string> = {
      single_day: 'Bloqueio Pontual',
      continuous_period: 'Período Contínuo (Modo 1)',
      weekly_recurring: 'Semanal Recorrente (Modo 2)',
      weekly_within_period: 'Semanal por Período (Modo 3)',
    };

    const modeLabel = modeLabels[mode] || 'Bloqueio de Agenda';

    const isAdmin = profile?.role === 'DONA' || profile?.role === 'admin' || profile?.role === 'SECRETARIA';
    const isOwner = block.fono_id === profile?.id;
    const canEdit = isAdmin || isOwner;

    return (
      <motion.div
        key={`block-${block.id}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.4 }}
        onClick={() => {
          if (canEdit) {
            setSelectedBlock(block);
            setIsBlockModalOpen(true);
          } else {
            alert(`Você não tem permissão para editar os bloqueios deste profissional (${professionalName}).`);
          }
        }}
        className="glass glass-reflection p-8 rounded-[32px] flex flex-col group relative shrink-0 overflow-hidden border border-rose-500/15 bg-rose-500/[0.03] hover:border-rose-500/30 transition-all cursor-pointer select-none"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-rose-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500" />

        <div className="flex-grow relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col gap-2">
              <h3 className="font-black text-rose-200 text-2xl tracking-tight group-hover:text-rose-300 transition-colors flex items-center gap-2">
                <Lock size={20} className="text-rose-400 shrink-0 animate-pulse" />
                <span>{reason}</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full w-fit shadow-sm bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  🔒 {modeLabel}
                </div>
              </div>
            </div>
            
            <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 px-4 py-2 rounded-2xl text-sm font-black flex items-center gap-2 shadow-inner">
              <Clock size={16} className="text-rose-400" /> {formattedStartTime} - {formattedEndTime}
            </div>
          </div>

          <div className="space-y-4 text-sm text-white/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                <Calendar size={16} className="text-rose-400" />
              </div>
              <span className="font-bold uppercase tracking-widest text-[11px]">
                {mode === 'single_day' ? `Apenas em ${formattedDate}` : 'Bloqueio Programado'}
              </span>
            </div>

            {block.profiles && (
              <div className="flex items-center gap-3 pt-4 mt-4 border-t border-white/5 text-white/80">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <UserRound size={16} className="text-rose-400" />
                </div>
                <span className="font-black text-xs uppercase tracking-widest">{professionalName}</span>
              </div>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400/40 group-hover:text-rose-400 transition-colors">
              Clique para alterar ou remover ✎
            </span>
          </div>
        )}
      </motion.div>
    );
  };

  const renderAppointmentCard = (appointment: Appointment, index: number) => {
    const patientName = appointment.patients?.full_name || appointment.patient_name || 'Paciente';
    const patientPhone = appointment.patients?.whatsapp || appointment.whatsapp || '';
    const formattedDate = format(selectedDate, 'dd/MM');
    const formattedTime = (appointment.start_time || '').substring(0, 5).replace(':', 'h') || '--h--';

    return (
      <motion.div
        key={appointment.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.4 }}
        className="glass glass-reflection p-8 rounded-[32px] flex flex-col group relative shrink-0 overflow-hidden"
      >
        {appointment.appointment_types?.color && appointment.status !== 'CANCELADO' && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-1.5"
            style={{ backgroundColor: appointment.appointment_types.color }}
          />
        )}
        
        <div className="flex-grow relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col gap-2">
              <h3 className="font-black text-white text-2xl tracking-tight group-hover:text-[#FFD600] transition-colors">
                {patientName}
              </h3>
              <div className="flex flex-wrap gap-2">
                <div className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full w-fit shadow-sm ${
                  appointment.status === 'CONFIRMADO' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/20' 
                    : appointment.status === 'CANCELADO'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-rose-500/20'
                    : 'bg-white/10 text-white/60 border border-white/10'
                }`}>
                  {appointment.status}
                </div>
                {appointment.recurring_schedule_id && (
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full w-fit shadow-sm bg-[#FFD600]/10 text-[#FFD600] border border-[#FFD600]/20 flex items-center gap-1">
                    <Repeat size={10} className="shrink-0" />
                    <span>Recorrente</span>
                  </div>
                )}
                {appointment.treatment_enabled && appointment.treatment_session_number && appointment.treatment_total_sessions && (
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full w-fit shadow-sm bg-[#FFD600]/20 text-[#FFD600] border border-[#FFD600]/30 shadow-[#FFD600]/10 flex items-center gap-1">
                    <span>Sessão {appointment.treatment_session_number}/{appointment.treatment_total_sessions}</span>
                  </div>
                )}
                {appointment.appointment_types?.name && (
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full w-fit shadow-sm bg-white/5 text-white/40 border border-white/10">
                    {appointment.appointment_types.name}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-2xl text-sm font-black flex items-center gap-2 shadow-inner border-shadow">
              <Clock size={16} className="text-[#FFD600]" /> {formattedTime}
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 text-white/60">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                <CalendarCheck size={16} className="text-[#FFD600]" />
              </div>
              <span className="font-bold uppercase tracking-widest text-[11px]">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-3 text-white/60">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                <Phone size={16} className="text-[#FFD600]" />
              </div>
              <span className="font-bold tracking-wider">{patientPhone || 'Sem número'}</span>
            </div>
            {appointment.profiles && (
              <div className="flex items-center gap-3 pt-4 mt-4 border-t border-white/5 text-white/80">
                <div className="w-8 h-8 rounded-xl bg-[#FFD600]/10 flex items-center justify-center border border-[#FFD600]/20">
                  <UserRound size={16} className="text-[#FFD600]" />
                </div>
                <span className="font-black text-xs uppercase tracking-widest">{appointment.profiles.full_name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 space-y-3 relative z-10">
          {appointment.status !== 'CANCELADO' && (
            <div className="grid grid-cols-2 gap-3 mb-1">
              <button
                onClick={() => handleStatusUpdate(appointment.id, 'ATENDIDO')}
                className={`font-black py-3 px-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest border ${
                  appointment.status === 'ATENDIDO'
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/30 font-black shadow-inner'
                    : 'bg-white/5 hover:bg-sky-500/10 text-white/60 hover:text-sky-400 border-white/10 hover:border-sky-500/20'
                }`}
                title="Marcar consulta como Atendida"
              >
                <CheckCircle2 size={16} className={appointment.status === 'ATENDIDO' ? 'text-sky-400' : 'text-sky-500/60'} />
                <span>Atendido</span>
              </button>

              <button
                onClick={() => handleStatusUpdate(appointment.id, 'FALTOU')}
                className={`font-black py-3 px-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest border ${
                  appointment.status === 'FALTOU'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-white/5 hover:bg-amber-500/10 text-white/60 hover:text-amber-400 border-white/10 hover:border-amber-500/20'
                }`}
                title="Marcar falta para o paciente"
              >
                <UserX size={16} className={appointment.status === 'FALTOU' ? 'text-amber-400' : 'text-amber-500/60'} />
                <span>Faltou</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {appointment.status === 'PENDENTE' ? (
              <>
                <button
                  onClick={() => handleConfirm(appointment.id)}
                  className="bg-white/5 hover:bg-emerald-500/20 text-white border border-white/10 hover:border-emerald-500/30 font-black py-3 px-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                >
                  <CalendarCheck size={16} className="text-emerald-400" />
                  <span>Confirmar</span>
                </button>
                
                <button
                  onClick={() => {
                    setSelectedAppointment(appointment);
                    setIsCancelModalOpen(true);
                  }}
                  className="bg-white/5 hover:bg-rose-500/20 text-white border border-white/10 hover:border-rose-500/30 font-black py-3 px-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                >
                  <XCircle size={16} className="text-rose-400" />
                  <span>Cancelar</span>
                </button>
              </>
            ) : appointment.status === 'CONFIRMADO' ? (
              <div className="col-span-2 text-center py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                Consulta Confirmada
              </div>
            ) : appointment.status === 'CANCELADO' ? (
              <div className="col-span-2 text-center py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[10px] font-black uppercase tracking-widest">
                Consulta Cancelada
              </div>
            ) : appointment.status === 'ATENDIDO' ? (
              <div className="col-span-2 text-center py-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 text-[10px] font-black uppercase tracking-widest">
                Paciente Atendido
              </div>
            ) : appointment.status === 'FALTOU' ? (
              <div className="col-span-2 text-center py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-[10px] font-black uppercase tracking-widest">
                Falta Registrada
              </div>
            ) : null}
          </div>
          
          {patientPhone ? (
            <button
              onClick={() => {
                const cleaned = patientPhone.replace(/\D/g, '');
                const finalPhone = (cleaned.length === 10 || cleaned.length === 11) ? `55${cleaned}` : cleaned;
                
                let template = '';
                if (isToday(selectedDate)) {
                  template = todayReminderTemplate || DEFAULT_TODAY_REMINDER;
                } else if (appointment.status === 'CONFIRMADO') {
                  template = tomorrowSuccessTemplate || DEFAULT_TOMORROW_SUCCESS;
                } else {
                  template = tomorrowReqTemplate || DEFAULT_TOMORROW_REQ;
                }
                
                const message = formatReminderMessage(template, {
                  patientName,
                  professionalName: appointment.profiles?.full_name || 'Profissional',
                  date: formattedDate,
                  time: formattedTime,
                  rawDate: selectedDate
                });

                const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
              }}
              className={`w-full font-black py-4 px-6 rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-xs uppercase tracking-[0.15em] ${
                appointment.status === 'CANCELADO'
                  ? 'bg-white/5 text-white/20 shadow-none cursor-not-allowed border border-white/5'
                  : 'bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] shadow-[#FFD600]/10'
              }`}
              disabled={appointment.status === 'CANCELADO'}
            >
              {appointment.status === 'CONFIRMADO' ? <CheckCircle2 size={18} /> : <Phone size={18} />}
              <span>{appointment.status === 'CONFIRMADO' ? 'Informar Confirmação' : (isToday(selectedDate) ? 'Confirmar Hoje' : 'Enviar Lembrete')}</span>
            </button>
          ) : (
            <div className="w-full bg-white/5 text-white/20 font-black py-4 px-6 rounded-2xl text-center text-[10px] uppercase tracking-widest border border-white/5">
              Sem WhatsApp
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const renderFinancialReminderCard = (rem: any, index: number) => {
    if (!rem || typeof rem.amount === 'undefined') return null;

    const billing = rem.billingData || {};
    const appointment = billing.appointments || {};
    const patientName = rem.patientName;
    const formattedDate = appointment.appointment_date 
      ? format(new Date(appointment.appointment_date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR }) 
      : '--/--/----';
    const formattedTime = (appointment.start_time || '').substring(0, 5).replace(':', 'h') || '--h--';
    const profName = appointment.profiles?.full_name || 'Profissional não definido';
    const typeName = appointment.appointment_types?.name || 'Consulta Geral';
    const typeColor = appointment.appointment_types?.color || '#FFD600';
    const amount = rem.amount;

    const statusLabels: Record<string, string> = {
      PENDING: 'Pendente',
      PAID: 'Pago',
      OVERDUE: 'Em Atraso',
      CANCELLED: 'Cancelado',
      PARTIALLY_PAID: 'Pago Parcial',
      WAIVED: 'Isento'
    };
    const statusText = statusLabels[billing.status] || billing.status;

    let statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/25';
    let cardBorder = 'border-amber-500/15 bg-amber-500/[0.01] hover:border-amber-500/30';
    
    if (billing.status === 'OVERDUE' || rem.type === 'recebimento_pendente') {
      statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/25';
      cardBorder = 'border-rose-500/15 bg-rose-500/[0.01] hover:border-rose-500/30';
    } else if (billing.status === 'PARTIALLY_PAID' || rem.type === 'confirmar_pagamento') {
      statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
      cardBorder = 'border-emerald-500/15 bg-emerald-500/[0.01] hover:border-emerald-500/30';
    }

    return (
      <motion.div
        key={rem.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.4 }}
        onClick={() => {
          setSelectedFinancialRem(rem);
          setIsFinModalOpen(true);
        }}
        className={`glass glass-reflection p-8 rounded-[32px] flex flex-col group relative shrink-0 overflow-hidden border transition-all cursor-pointer ${cardBorder}`}
      >
        {typeColor && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-1.5"
            style={{ backgroundColor: typeColor }}
          />
        )}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/[0.02] to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="flex-grow relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col gap-2">
              <h3 className="font-black text-white text-2xl tracking-tight group-hover:text-emerald-400 transition-colors">
                {patientName}
              </h3>
              <div className="flex flex-wrap gap-2">
                <div className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full w-fit shadow-sm bg-black/40 border border-white/5`}>
                  {rem.title}
                </div>
                {typeName && (
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full w-fit shadow-sm bg-white/5 text-white/40 border border-white/10">
                    {typeName}
                  </div>
                )}
                <div className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full w-fit shadow-sm bg-emerald-500/20 text-emerald-300 border border-emerald-500/20`}>
                  R$ {amount.toFixed(2)}
                </div>
              </div>
            </div>

            <div className={`bg-white/5 border border-white/10 text-white px-4 py-2 rounded-2xl text-sm font-black flex items-center gap-2 shadow-inner border-shadow`}>
              <Clock size={16} className="text-[#FFD600]" /> {formattedTime}
            </div>
          </div>

          <div className="space-y-4 text-sm text-white/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                <Calendar size={14} className="text-[#FFD600]" />
              </div>
              <span className="font-bold uppercase tracking-widest text-[11px] text-white/70">
                {formattedDate}
              </span>
            </div>

            {profName && (
              <div className="flex items-center gap-3 pt-4 mt-4 border-t border-white/5 text-white/80">
                <div className="w-8 h-8 rounded-xl bg-[#FFD600]/10 flex items-center justify-center border border-[#FFD600]/20">
                  <UserRound size={16} className="text-[#FFD600]" />
                </div>
                <span className="font-black text-xs uppercase tracking-widest">{profName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex gap-3 relative z-10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setSelectedFinancialRem(rem);
              setIsFinModalOpen(true);
            }}
            className="flex-grow bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 px-6 rounded-2xl shadow-xl shadow-emerald-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 uppercase tracking-[0.15em] text-xs"
          >
            <DollarSign size={16} />
            <span>Receber Pagamento</span>
          </button>

          {rem.whatsapp && (
            <button
              onClick={() => {
                const cleanPhone = rem.whatsapp.replace(/\D/g, '');
                const finalPhone = (cleanPhone.length === 10 || cleanPhone.length === 11) ? `55${cleanPhone}` : cleanPhone;
                const template = todayReminderTemplate || DEFAULT_TODAY_REMINDER;
                const message = formatReminderMessage(template, {
                  name: patientName,
                  time: formattedTime,
                  date: formattedDate,
                  professional_name: profName,
                  value: `R$ ${amount.toFixed(2)}`,
                  data_vencimento: format(new Date(billing.due_date + 'T00:00:00'), 'dd/MM/yyyy')
                });
                const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
              }}
              className="p-4 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center shrink-0"
              title="Enviar Lembrete WhatsApp"
            >
              <Phone size={16} />
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  // Mobile View (Simple Chronological List for both)
  const renderMobileView = () => {
    if (combinedItems.length === 0) {
      return (
        <div className="text-center py-12 text-white/40 text-sm font-bold uppercase tracking-widest">
          {searchTerm ? 'Nenhum resultado para sua busca' : 'Nenhuma atividade ou bloqueio hoje'}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {combinedItems.map(({ type, data, time }) => {
          if (type === 'appointment') {
            const app = data as Appointment;
            const patientName = app.patients?.full_name || app.patient_name || 'Paciente';
            const profName = app.profiles?.full_name || 'Não definida';
            const formattedTime = (app.start_time || '').substring(0, 5).replace(':', 'h') || '--h--';
            return (
              <div 
                key={`mob-${app.id}`}
                onClick={() => {
                  setSelectedAppointment(app);
                  setIsRescheduleModalOpen(true);
                }}
                className={`
                  rounded-2xl border cursor-pointer flex justify-between items-center transition-all p-4
                  ${app.status === 'CANCELADO' 
                    ? 'opacity-60 bg-rose-500/10 border-rose-500/20 text-rose-400' 
                    : getStatusColor(app.status, app.appointment_types?.color)} 
                `}
                style={getInlineStyle(app.status, app.appointment_types?.color)}
              >
                <div>
                  <div className={`font-bold text-sm ${app.status === 'CANCELADO' ? 'text-xs line-through text-rose-300' : ''} flex flex-wrap items-center gap-1.5`}>
                    <span>{patientName}</span>
                    {app.treatment_enabled && app.treatment_session_number && app.treatment_total_sessions && (
                      <span className="text-[9px] text-[#FFD600] font-black bg-[#FFD600]/10 px-1.5 py-0.5 rounded border border-[#FFD600]/25 whitespace-nowrap">
                        {app.treatment_session_number}/{app.treatment_total_sessions}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] opacity-80 mt-1 flex items-center gap-1">
                    <UserRound size={10} /> {profName}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {app.status !== 'CANCELADO' && (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleStatusUpdate(app.id, 'ATENDIDO')}
                        className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                          app.status === 'ATENDIDO'
                            ? 'bg-sky-500/20 border-sky-500/40 text-sky-400'
                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-sky-500/10 hover:border-sky-500/20 hover:text-sky-300'
                        }`}
                        title="Atendido"
                      >
                        <CheckCircle2 size={13} />
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(app.id, 'FALTOU')}
                        className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                          app.status === 'FALTOU'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-amber-500/10 hover:border-amber-500/20 hover:text-amber-400'
                        }`}
                        title="Faltou"
                      >
                        <UserX size={13} />
                      </button>
                    </div>
                  )}
                  <div className="text-right">
                    <div className="font-black text-sm">{formattedTime}</div>
                    <div className="text-[9px] uppercase tracking-widest opacity-85 mt-1">{app.status}</div>
                  </div>
                </div>
              </div>
            );
          } else {
            const block = data as ScheduleBlock;
            const formattedStartTime = (block.start_time || '').substring(0, 5).replace(':', 'h') || '--h--';
            const formattedEndTime = (block.end_time || '').substring(0, 5).replace(':', 'h') || '--h--';
            const profName = block.profiles?.full_name || 'Profissional';
            const reason = block.reason || 'Bloqueio de Agenda';
            const isAdmin = profile?.role === 'DONA' || profile?.role === 'admin' || profile?.role === 'SECRETARIA';
            const isOwner = block.fono_id === profile?.id;
            const canEdit = isAdmin || isOwner;

            return (
              <div
                key={`mob-block-${block.id}`}
                onClick={() => {
                  if (canEdit) {
                    setSelectedBlock(block);
                    setIsBlockModalOpen(true);
                  } else {
                    alert(`Sem permissão para alterar bloqueio de ${profName}`);
                  }
                }}
                className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] text-rose-300 p-4 flex justify-between items-center transition-all cursor-pointer relative overflow-hidden"
              >
                <div>
                  <div className="font-bold text-sm flex items-center gap-1.5 text-rose-300">
                    <Lock size={12} className="text-rose-400" />
                    <span>{reason}</span>
                  </div>
                  <div className="text-[10px] opacity-80 mt-1 flex items-center gap-1">
                    <UserRound size={10} className="text-rose-400" /> {profName}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-sm">{formattedStartTime} - {formattedEndTime}</div>
                  <div className="text-[9px] uppercase tracking-widest text-rose-400 font-bold mt-1">🔒 Bloqueado</div>
                </div>
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      <div className="appointment-list-header flex-shrink-0">
        <div className="flex flex-col gap-4 bg-[#0A0F2C]/80 backdrop-blur-md pb-4 border-b border-white/5">
          {/* Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <DateNavigator 
              selectedDate={selectedDate} 
              onChange={setSelectedDate} 
              viewMode="day"
            />
          </div>

          {/* Search */}
          <div className="relative w-full shadow-lg">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              type="text"
              placeholder="Buscar paciente, tipo ou observação..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm font-bold outline-none focus:ring-2 focus:ring-[#FFD600]/50 transition-all font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div 
        className="appointment-list-scroll flex-1 flex flex-col gap-8 overflow-y-auto pr-2 custom-scrollbar min-h-0 relative"
        ref={scrollRef}
        onScroll={onScroll}
      >
        {isRefreshing && (
          <div className="absolute top-0 right-0 z-20 p-2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        )}

        {(loading && (homeMode === 'FINANCIAL' ? financialReminders.length === 0 : combinedItems.length === 0)) ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"></div>
          </div>
        ) : (homeMode === 'FINANCIAL' ? financialReminders.length > 0 : combinedItems.length > 0) ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 px-4 text-center select-none">
              <div className="h-px flex-grow bg-white/5" />
              <h2 className={`text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 ${
                homeMode === 'FINANCIAL' ? 'text-emerald-400' : isToday(selectedDate) ? 'text-emerald-400' : 'text-[#FFD600]'
              }`}>
                {homeMode === 'FINANCIAL' ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Lembretes Financeiros ({financialReminders.length})
                  </>
                ) : isToday(selectedDate) ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Agenda de Hoje
                  </>
                ) : (
                  <>
                    <Database size={14} />
                    Agenda para {format(selectedDate, "dd/MM")}
                  </>
                )}
              </h2>
              <div className="h-px flex-grow bg-white/5" />
            </div>
            <div className="grid grid-cols-1 gap-6">
              {homeMode === 'FINANCIAL' ? (
                financialReminders.map((rem: any, index: number) => renderFinancialReminderCard(rem, index))
              ) : (
                combinedItems.map(({ type, data }, index) => {
                  if (type === 'appointment') {
                    return renderAppointmentCard(data as Appointment, index);
                  } else {
                    return renderBlockCard(data as ScheduleBlock, index);
                  }
                })
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white/[0.01] rounded-[32px] border border-dashed border-white/10 flex flex-col items-center justify-center p-6 select-none">
            <ShieldAlert size={36} className="text-white/20 mb-3" />
            <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em] text-center">
              {searchTerm 
                ? 'Nenhum resultado para sua busca'
                : homeMode === 'FINANCIAL'
                ? 'Nenhum lembrete financeiro relevante para hoje! 💸'
                : `Nenhuma consulta ou bloqueio para ${format(selectedDate, 'dd/MM')} 😴`}
            </p>
          </div>
        )}
      </div>

      <CancelModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onSuccess={fetchAppointments}
        appointmentId={selectedAppointment?.id || ''}
      />

      <AppointmentModal
        key={isRescheduleModalOpen ? `reschedule-${selectedAppointment?.id || 'new'}` : 'closed'}
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        onSuccess={fetchAppointments}
        appointment={selectedAppointment || undefined}
      />

      <ScheduleBlockModal
        isOpen={isBlockModalOpen}
        onClose={() => { setIsBlockModalOpen(false); setSelectedBlock(null); }}
        onSuccess={() => fetchAppointments()}
        block={selectedBlock}
      />

      <FinancialDetailModal
        isOpen={isFinModalOpen}
        onClose={() => setIsFinModalOpen(false)}
        event={selectedFinancialRem}
        onSuccess={fetchAppointments}
      />
    </div>
  );
}
