'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Appointment, UserProfile, AppointmentStatus, ScheduleBlock } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, UserRound, Filter, X, Repeat, Check, CheckCircle2, UserX, CornerDownRight
} from 'lucide-react';
import { 
  format, addDays, subDays, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, 
  isSameMonth, parseISO, addWeeks, subWeeks, addMonths, subMonths,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import DayViewGrid from './DayViewGrid';
import ScheduleBlockModal from './ScheduleBlockModal';
import ProlongarModal from './ProlongarModal';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import DateNavigator from './DateNavigator';

type ViewMode = 'day' | 'week' | 'month' | 'available';

interface AgendaProps {
  refreshKey: number;
  onAppointmentClick: (appointment: Appointment) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  homeMode?: 'PATIENTS' | 'FINANCIAL';
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 06:00 to 20:00

export default function Agenda({ 
  refreshKey, 
  onAppointmentClick, 
  scrollRef: externalScrollRef, 
  onScroll,
  currentDate: externalCurrentDate,
  onDateChange: externalOnDateChange,
  homeMode = 'PATIENTS'
}: AgendaProps) {
  const { profile } = useAuth();
  const internalRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = externalScrollRef || internalRef;
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [localCurrentDate, setLocalCurrentDate] = useState(new Date());
  const currentDate = externalCurrentDate || localCurrentDate;
  const setCurrentDate = externalOnDateChange || setLocalCurrentDate;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Selected block for inline editing modal
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | undefined>(undefined);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  
  // Safety timeout for loading state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (loading) {
      timeoutId = setTimeout(() => {
        console.warn('Agenda: Loading safety timeout reached. Forcing loading to false.');
        setLoading(false);
      }, 15000); // 15 seconds safety net
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);
  
  // Filters
  const [selectedFono, setSelectedFono] = useState<string>(profile?.role === 'FONO' ? profile.id : '');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isProlongarOpen, setIsProlongarOpen] = useState(false);
  const [appointmentToProlong, setAppointmentToProlong] = useState<Appointment | null>(null);

  // Custom Toast state
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const handleOpenProlongar = async (app: Appointment) => {
    if (app.is_prolonged) {
      setToast({
        show: true,
        message: 'Esta consulta já está marcada como prolongada.',
        type: 'warning'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ is_prolonged: true })
        .eq('id', app.id);

      if (error) throw error;

      // Update local state optimistically
      setAppointments(prev => prev.map(a => 
        a.id === app.id ? { ...a, is_prolonged: true } : a
      ));

      setToast({
        show: true,
        message: 'Consulta movida para o fluxo de prolongamento!',
        type: 'success'
      });

      window.dispatchEvent(new CustomEvent('appointment-updated'));
    } catch (err: any) {
      console.error('Erro ao prolongar consulta:', err);
      setToast({
        show: true,
        message: 'Erro ao prolongar consulta: ' + err.message,
        type: 'error'
      });
    }
  };

  const handleNavigateToAppointment = async (apptId: string, targetDateStr: string) => {
    if (!apptId || !targetDateStr) return;
    
    const targetDate = new Date(targetDateStr + 'T12:00:00'); // Avoid timezone shifts
    
    // Check if current date is the same
    const formattedCurrent = currentDate.toISOString().split('T')[0];
    if (formattedCurrent === targetDateStr) {
      const el = document.getElementById(`agenda-appt-${apptId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-sky-500', 'ring-offset-2', 'ring-offset-slate-900');
        setTimeout(() => el.classList.remove('ring-2', 'ring-sky-500', 'ring-offset-2', 'ring-offset-slate-900'), 3000);
      }
    } else {
      setCurrentDate(targetDate);
      setTimeout(() => {
        const el = document.getElementById(`agenda-appt-${apptId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-sky-500', 'ring-offset-2', 'ring-offset-slate-900');
          setTimeout(() => el.classList.remove('ring-2', 'ring-sky-500', 'ring-offset-2', 'ring-offset-slate-900'), 3000);
        }
      }, 800);
    }
  };

  const handleNavigateToLinked = async (app: Appointment, mode: 'TO_ORIGINAL' | 'TO_CONTINUATION') => {
    try {
      if (mode === 'TO_ORIGINAL') {
        const parentId = app.parent_appointment_id;
        if (!parentId) return;
        
        const { data, error } = await supabase
          .from('appointments')
          .select('id, appointment_date')
          .eq('id', parentId)
          .single();
          
        if (error) throw error;
        if (data) {
          handleNavigateToAppointment(data.id, data.appointment_date);
        }
      } else {
        const { data, error } = await supabase
          .from('appointments')
          .select('id, appointment_date')
          .eq('parent_appointment_id', app.id)
          .eq('is_continuation', true)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (error) throw error;
        if (data && data.length > 0) {
          handleNavigateToAppointment(data[0].id, data[0].appointment_date);
        } else {
          alert('Nenhuma consulta de continuação foi agendada para este prolongamento ainda.');
        }
      }
    } catch (err: any) {
      console.error('Erro ao navegar para consulta vinculada:', err);
      alert('Não foi possível encontrar a consulta vinculada: ' + err.message);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: AppointmentStatus) => {
    // If financial mode, status update isn't applicable directly, let user know or ignore safely
    if (homeMode === 'FINANCIAL') return;

    // Optimistic UI updates
    setAppointments(prev => prev.map(app => 
      app.id === id ? { ...app, status: newStatus } : app
    ));

    const updatePayload: any = { status: newStatus };
    if (newStatus === 'FALTOU') {
      updatePayload.makeup_status = 'PENDENTE';
    }

    let { error } = await supabase
      .from('appointments')
      .update(updatePayload)
      .eq('id', id);

    if (error && (error.code === '42703' || error.message?.includes('makeup_status'))) {
      console.warn('makeup_status column missing on appointments table. Retrying update without makeup_status...');
      const fallbackPayload = { status: newStatus };
      const { error: retryError } = await supabase
        .from('appointments')
        .update(fallbackPayload)
        .eq('id', id);
      error = retryError;
    }

    if (error) {
      console.error(`Erro ao atualizar status para ${newStatus}:`, error);
      alert('Erro ao atualizar status da consulta: ' + error.message);
      setLocalRefreshKey(prev => prev + 1);
    } else {
      window.dispatchEvent(new CustomEvent('appointment-updated'));
    }
  };

  // Sorting helper
  const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const parts = time.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  // Filtering and sorting based on active search and time
  const filteredAppointments = useMemo(() => {
    let result = appointments;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(app => {
        const pName = app.patients?.full_name || app.patient_name || '';
        const typeName = app.appointment_types?.name || '';
        const profName = app.profiles?.full_name || '';
        
        return pName.toLowerCase().includes(search) || 
               typeName.toLowerCase().includes(search) ||
               profName.toLowerCase().includes(search) ||
               app.whatsapp?.includes(searchTerm);
      });
    }

    return [...result].sort((a, b) => 
      timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );
  }, [appointments, searchTerm]);

  const minutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const availableHours = useMemo(() => {
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    const dayOfWeek = currentDate.getDay(); // 0 = Domingo, 1 = Segunda, etc.

    // Filter active blocks once for the selected date
    const activeBlocks = scheduleBlocks.filter(block => {
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
          return block.weekdays.includes(dayOfWeek);
        }
        case 'weekly_within_period': {
          if (!block.start_date || !block.end_date || !block.weekdays || !Array.isArray(block.weekdays)) return false;
          const dateInRange = formattedDate >= block.start_date && formattedDate <= block.end_date;
          return dateInRange && block.weekdays.includes(dayOfWeek);
        }
        default:
          return false;
      }
    });

    const fonoList = selectedFono 
      ? professionals.filter(p => p.id === selectedFono)
      : professionals;

    return fonoList.map(prof => {
      // Day range limits (06:00 to 22:00)
      const dayStart = 6 * 60; // 06:00
      const dayEnd = 22 * 60;   // 22:00

      // Busy intervals
      const busyIntervals: { start: number; end: number }[] = [];

      // 1. Appointments (excluding CANCELLED)
      const profAppointments = appointments.filter(
        app => app.fono_id === prof.id && app.appointment_date === formattedDate && app.status !== 'CANCELADO'
      );

      profAppointments.forEach(app => {
        const start = timeToMinutes(app.start_time);
        const duration = app.appointment_types?.duration_minutes || 30;
        const end = start + duration;
        busyIntervals.push({ start, end });
      });

      // 2. Schedule Blocks
      const profBlocks = activeBlocks.filter(b => b.fono_id === prof.id);
      profBlocks.forEach(b => {
        const start = timeToMinutes(b.start_time);
        const end = timeToMinutes(b.end_time);
        busyIntervals.push({ start, end });
      });

      // Merge busy intervals
      const sortedBusy = [...busyIntervals].sort((a, b) => a.start - b.start);
      const mergedBusy: { start: number; end: number }[] = [];

      sortedBusy.forEach(interval => {
        if (mergedBusy.length === 0) {
          mergedBusy.push(interval);
        } else {
          const last = mergedBusy[mergedBusy.length - 1];
          if (interval.start <= last.end) {
            last.end = Math.max(last.end, interval.end);
          } else {
            mergedBusy.push(interval);
          }
        }
      });

      // Clamp to dayStart/dayEnd
      const clampedBusy = mergedBusy
        .map(interval => ({
          start: Math.max(dayStart, interval.start),
          end: Math.min(dayEnd, interval.end)
        }))
        .filter(interval => interval.start < interval.end);

      // Gaps
      const gaps: { start: number; end: number; duration: number }[] = [];
      let current = dayStart;

      clampedBusy.forEach(interval => {
        if (interval.start > current) {
          const duration = interval.start - current;
          if (duration >= 15) {
            gaps.push({ start: current, end: interval.start, duration });
          }
        }
        current = Math.max(current, interval.end);
      });

      if (dayEnd > current) {
        const duration = dayEnd - current;
        if (duration >= 15) {
          gaps.push({ start: current, end: dayEnd, duration });
        }
      }

      return {
        professional: prof,
        gaps
      };
    });
  }, [currentDate, appointments, scheduleBlocks, professionals, selectedFono]);

  // Update selectedFono if profile changes (e.g. after login)
  useEffect(() => {
    if (profile?.role === 'FONO' && !selectedFono) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFono(profile.id);
    }
  }, [profile, selectedFono]);

  // Fetch professionals for filter
  useEffect(() => {
    const fetchProfessionals = async () => {
      const { data } = await supabase.from('profiles').select('*').in('role', ['FONO', 'DONA']).order('full_name');
      if (data) setProfessionals(data);
    };
    fetchProfessionals();
  }, []);

  // Listen to prolonged event from other components to show a beautiful toast
  useEffect(() => {
    const handleProlonged = (e: Event) => {
      const customEvent = e as CustomEvent;
      const patientName = customEvent.detail?.name || 'Consulta';
      setToast({
        show: true,
        message: `Consulta de ${patientName} enviada para o fluxo de prolongamento!`,
        type: 'success'
      });
    };

    window.addEventListener('appointment-prolonged', handleProlonged);
    return () => {
      window.removeEventListener('appointment-prolonged', handleProlonged);
    };
  }, []);

  // Fetch appointments based on current view
  const fetchAppointments = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);

    try {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'day' || viewMode === 'available') {
        startDate = currentDate;
        endDate = currentDate;
      } else if (viewMode === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
        endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
      } else {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      }

      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      if (homeMode === 'FINANCIAL') {
        // --- FINANCIAL MODE ---
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
              agreed_price,
              discount_value,
              net_value,
              invoice_needed,
              billing_company_id,
              patients ( id, full_name, whatsapp ),
              profiles ( id, full_name ),
              companies ( id, name ),
              appointment_types ( id, name, color, duration_minutes )
            )
          `)
          .gte('appointments.appointment_date', startStr)
          .lte('appointments.appointment_date', endStr);

        if (billingsError) throw billingsError;

        const events: Appointment[] = [];
        (billingsData || []).forEach((billing: any) => {
          const appt = billing.appointments || {};
          const patientName = appt.patients?.full_name || appt.patient_name || billing.patient_name || 'Paciente Geral';
          const companyName = appt.companies?.name || billing.companies?.name || '';
          
          const isPaid = billing.status === 'PAID';
          const isCancelled = billing.status === 'CANCELLED' || appt.status === 'CANCELADO';
          const isOverdue = billing.status === 'OVERDUE';
          const isPartiallyPaid = billing.status === 'PARTIALLY_PAID';

          const amount = appt.net_value ?? billing.net_total ?? appt.agreed_price ?? billing.gross_total ?? 0;
          const dateStr = appt.appointment_date || billing.due_date;
          const originalTime = appt.start_time || '09:00';

          let billingStatusLabel = 'Pendente';
          let color = '#f59e0b'; // amber
          if (isPaid) {
            billingStatusLabel = 'Pago';
            color = '#10b981'; // emerald
          } else if (isCancelled) {
            billingStatusLabel = 'Cancelado';
            color = '#6b7280'; // gray
          } else if (isOverdue) {
            billingStatusLabel = 'Atrasado';
            color = '#ef4444'; // red
          } else if (isPartiallyPaid) {
            billingStatusLabel = 'Parcial';
            color = '#3b82f6'; // blue
          }

          events.push({
            id: billing.id,
            patient_id: appt.patient_id || '',
            patient_name: patientName,
            appointment_date: dateStr,
            start_time: originalTime,
            status: isPaid ? 'ATENDIDO' : isCancelled ? 'CANCELADO' : 'CONFIRMADO',
            whatsapp: appt.patients?.whatsapp || appt.whatsapp || '',
            patients: {
              full_name: patientName,
              whatsapp: appt.patients?.whatsapp || appt.whatsapp || '',
            },
            appointment_types: {
              id: 'cobranca-type',
              name: `Cobrança [${billingStatusLabel}] - R$ ${amount.toFixed(2)}`,
              color: color,
              duration_minutes: appt.appointment_types?.duration_minutes || 45
            },
            profiles: {
              full_name: appt.profiles?.full_name || 'Profissional'
            },
            isFinancial: true,
            billingData: billing
          } as any);
        });

        setAppointments(events);
        setScheduleBlocks([]); // No blocks on financial schedule view
      } else {
        // --- PATIENT MODE ---
        let query = supabase
          .from('appointments')
          .select(`
            *,
            patients(*),
            appointment_types(*)
          `)
          .gte('appointment_date', startStr)
          .lte('appointment_date', endStr);

        if (selectedFono) {
          query = query.eq('fono_id', selectedFono);
        }
        
        if (selectedStatus) {
          query = query.eq('status', selectedStatus);
        }

        const [{ data, error }, { data: profilesData }] = await Promise.all([
          query,
          supabase.from('profiles').select('id, full_name').in('role', ['FONO', 'DONA'])
        ]);

        if (error) throw error;

        if (data) {
          const profilesMap = new Map(profilesData?.map(u => [u.id, u]) || []);
          const formattedData = data.map((item: any) => ({
            ...item,
            patients: Array.isArray(item.patients) ? item.patients[0] : item.patients,
            profiles: profilesMap.get(item.fono_id) || { full_name: 'Desconhecido' }
          }));
          setAppointments(formattedData as Appointment[]);
        }

        // Fetch Schedule Blocks in parallel
        try {
          let blocksQuery = supabase
            .from('schedule_blocks')
            .select(`
              *,
              profiles:fono_id(full_name)
            `);

          if (selectedFono) {
            blocksQuery = blocksQuery.eq('fono_id', selectedFono);
          }

          const { data: bData, error: bErr } = await blocksQuery;
          if (!bErr && bData) {
            setScheduleBlocks(bData as any);
          } else {
            setScheduleBlocks([]);
          }
        } catch (err) {
          console.warn('Tabela schedule_blocks não encontrada na query da Agenda. Ignorando silenciosamente.', err);
          setScheduleBlocks([]);
        }
      }
    } catch (error) {
      console.warn('Busca de consultas na agenda finalizada:', (error as any)?.message || error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentDate, viewMode, selectedFono, selectedStatus, homeMode]);

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
  }, [fetchAppointments, refreshKey, localRefreshKey, profile?.id, profile?.role, homeMode]);

  // Handle auto-refetch on window focus with session validation
  useRefetchOnFocus(useCallback(async () => {
    console.log('[Agenda] Focus detected, starting session validation and refresh...');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[Agenda] Session validation failed on focus:', error);
        return;
      }
      if (session) {
        console.log('[Agenda] Session valid, auto-refetching appointments and schedule blocks.');
        await fetchAppointments(true);
      } else {
        console.warn('[Agenda] No active session found on focus.');
      }
    } catch (err) {
      console.error('[Agenda] Error validating session on focus:', err);
    }
  }, [fetchAppointments]));

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

  const getStatusIndicator = (status: string, typeColor?: string) => {
    if (status === 'CANCELADO') return 'bg-rose-400';
    if (typeColor) return ''; // We will use inline style
    
    switch (status) {
      case 'CONFIRMADO': return 'bg-emerald-400';
      case 'ATENDIDO': return 'bg-sky-400';
      case 'FALTOU': return 'bg-amber-400';
      default: return 'bg-slate-400';
    }
  };

  const getInlineStyle = (status: string, typeColor?: string) => {
    if (status === 'CANCELADO' || !typeColor) return {};
    
    // For confirmed/pending, use the type color with some transparency for background
    // and full color for borders/text where applicable
    return {
      backgroundColor: `${typeColor}33`, // 20% opacity hex
      borderColor: `${typeColor}4D`, // 30% opacity hex
      color: '#ffffff', // Keep text white for readability on dark theme
    };
  };

  const getIndicatorInlineStyle = (status: string, typeColor?: string) => {
    if (status === 'CANCELADO' || !typeColor) return {};
    return { backgroundColor: typeColor };
  };

  const handleBlockClick = (block: ScheduleBlock) => {
    setSelectedBlock(block);
    setIsBlockModalOpen(true);
  };

  const handleBlockSuccess = () => {
    // Trigger updates via reactive dependency tracking
    setSelectedBlock(undefined);
    setLocalRefreshKey(prev => prev + 1);
  };

  // Render Day View
  const renderDayView = () => {
    return (
      <DayViewGrid 
        appointments={filteredAppointments} 
        currentDate={currentDate} 
        onAppointmentClick={onAppointmentClick}
        scrollRef={scrollRef}
        onScroll={onScroll}
        scheduleBlocks={scheduleBlocks}
        onBlockClick={handleBlockClick}
        onStatusUpdate={handleStatusUpdate}
      />
    );
  };

  // Render Available Hours View
  const renderAvailableHoursView = () => {
    if (loading && appointments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/40 h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFD600]"></div>
          <span className="text-[10px] font-black uppercase tracking-widest">Carregando horários...</span>
        </div>
      );
    }

    const hasGaps = availableHours.some(prof => prof.gaps.length > 0);

    if (!hasGaps) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center h-full">
          <Clock size={40} className="text-white/10 mb-4" />
          <p className="text-white/40 text-sm font-bold leading-normal">Nenhum horário disponível para o dia selecionado.</p>
          <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mt-1">
            {format(currentDate, "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pr-1 pb-6" id="available-hours-container">
        {availableHours.map(({ professional, gaps }) => {
          if (gaps.length === 0) return null;

          return (
            <div key={professional.id} className="space-y-3 bg-white/[0.01] border border-white/5 rounded-2xl p-5" id={`prof-section-${professional.id}`}>
              <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFD600]/10 border border-[#FFD600]/20 text-[#FFD600] flex items-center justify-center font-black text-sm">
                  {professional.full_name?.charAt(0).toUpperCase() || 'P'}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">{professional.full_name}</h4>
                  <p className="text-[9px] text-[#FFD600] font-black uppercase tracking-widest mt-0.5">
                    {gaps.length} {gaps.length === 1 ? 'intervalo livre' : 'intervalos livres'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {gaps.map((gap, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] hover:border-[#FFD600]/20 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute right-3 top-3 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <div>
                      <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-black uppercase tracking-wider mb-1">
                        <Clock size={11} className="text-[#FFD600]" />
                        <span>Espaço Livre</span>
                      </div>
                      <div className="text-base font-black text-white tracking-tight flex items-center gap-1 group-hover:text-[#FFD600] transition-colors">
                        <span>{minutesToTime(gap.start)}</span>
                        <span className="text-white/30 text-xs font-normal font-mono">→</span>
                        <span>{minutesToTime(gap.end)}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                        {gap.duration} min
                      </span>
                      <span className="text-[9px] font-black text-white/30 group-hover:text-white/60 transition-colors uppercase tracking-widest">
                        Livre
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Week View
  const renderWeekView = () => {
    const weekDays = eachDayOfInterval({
      start: startOfWeek(currentDate, { weekStartsOn: 0 }),
      end: endOfWeek(currentDate, { weekStartsOn: 0 })
    });

    return (
      <div 
        className="flex flex-col h-full overflow-y-auto overflow-x-auto custom-scrollbar"
        ref={scrollRef}
        onScroll={onScroll}
      >
        <div className="flex min-w-[800px]">
          <div className="w-12 shrink-0 border-r border-white/5"></div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className={`flex-1 p-3 text-center border-b border-r border-white/5 ${isToday(day) ? 'bg-white/5' : ''}`}>
              <div className="text-[10px] uppercase tracking-widest text-white/40 font-black">{format(day, 'EEE', { locale: ptBR })}</div>
              <div className={`text-lg font-black mt-1 ${isToday(day) ? 'text-[#FFD600]' : 'text-white'}`}>{format(day, 'dd')}</div>
            </div>
          ))}
        </div>
        
        <div className="flex-1 min-w-[800px]">
          {HOURS.map(hour => {
            const timeString = `${hour.toString().padStart(2, '0')}:00`;
            
            return (
              <div key={hour} className="flex min-h-[60px] border-b border-white/5">
                <div className="w-12 py-2 pr-2 text-right text-[10px] font-black text-white/40 uppercase tracking-widest border-r border-white/5 shrink-0">
                  {hour}h
                </div>
                {weekDays.map(day => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const cellAppointments = filteredAppointments.filter(a => 
                    a.appointment_date === dayStr && 
                    a.start_time?.startsWith(timeString.substring(0, 2))
                  );
                  
                  return (
                    <div key={day.toISOString()} className={`flex-1 p-1 border-r border-white/5 relative flex flex-wrap gap-1 content-start ${isToday(day) ? 'bg-white/[0.02]' : ''}`}>
                      {cellAppointments.map(app => (
                        <div
                          key={app.id}
                          onClick={() => onAppointmentClick(app)}
                          className={`
                            rounded-lg border cursor-pointer text-[10px] leading-tight overflow-hidden transition-all
                            ${app.status === 'CANCELADO' 
                              ? 'w-2 h-6 min-w-0 p-0 opacity-40 hover:opacity-100 hover:w-full hover:h-auto hover:p-1' 
                              : 'flex-1 min-w-[60px] p-1.5'} 
                            ${getStatusColor(app.status, app.appointment_types?.color)}
                          `}
                          style={getInlineStyle(app.status, app.appointment_types?.color)}
                          title={`${app.patients?.full_name || app.patient_name} - ${app.profiles?.full_name}`}
                        >
                          {app.status === 'CANCELADO' ? null : (
                            <>
                              <div className="font-bold truncate flex items-center gap-1">
                                {app.recurring_schedule_id && (
                                  <Repeat size={10} className="text-[#FFD600] shrink-0 inline" />
                                )}
                                <span>{app.patients?.full_name || app.patient_name}</span>
                                {app.treatment_enabled && app.treatment_session_number && app.treatment_total_sessions && (
                                  <span className="text-[9px] text-[#FFD600] font-black shrink-0">({app.treatment_session_number})</span>
                                )}
                                {app.is_prolonged && (
                                  <span className="text-[8px] text-[#FFD600] font-black bg-[#FFD600]/10 px-0.5 rounded border border-[#FFD600]/20 leading-none">PR</span>
                                )}
                              </div>
                              <div className="opacity-80 truncate">{app.profiles?.full_name?.split(' ')[0]}</div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Month View
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDaysHeader = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-7 border-b border-white/5">
          {weekDaysHeader.map(day => (
            <div key={day} className="py-3 text-center text-[10px] font-black text-white/40 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>
        
        <div 
          className="flex-1 grid grid-cols-7 grid-rows-5 overflow-y-auto custom-scrollbar"
          ref={scrollRef}
          onScroll={onScroll}
        >
          {calendarDays.map((day, idx) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayAppointments = filteredAppointments.filter(a => a.appointment_date === dayStr);
            const isCurrentMonth = isSameMonth(day, monthStart);
            
            return (
              <div 
                key={day.toISOString()} 
                className={`min-h-[100px] p-2 border-b border-r border-white/5 ${!isCurrentMonth ? 'opacity-30 bg-black/20' : ''} ${isToday(day) ? 'bg-white/5' : ''}`}
              >
                <div className={`text-right text-xs font-black mb-2 ${isToday(day) ? 'text-[#FFD600]' : 'text-white/60'}`}>
                  {format(day, 'd')}
                </div>
                <div className="flex flex-wrap gap-1 overflow-y-auto max-h-[80px] custom-scrollbar pr-1">
                  {dayAppointments.map(app => (
                    <div
                      key={app.id}
                      onClick={() => onAppointmentClick(app)}
                      className={`
                        flex items-center gap-1.5 p-1 rounded-md hover:bg-white/10 cursor-pointer transition-all
                        ${app.status === 'CANCELADO' 
                          ? 'w-2 h-4 p-0 opacity-40 hover:opacity-100 hover:w-auto hover:h-auto hover:p-1' 
                          : 'w-full'}
                      `}
                      title={`${app.start_time?.substring(0, 5)} - ${app.patients?.full_name || app.patient_name}`}
                    >
                      <div 
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusIndicator(app.status, app.appointment_types?.color)}`} 
                        style={getIndicatorInlineStyle(app.status, app.appointment_types?.color)}
                      />
                      {app.status !== 'CANCELADO' && (
                        <span className="text-[10px] font-bold text-white/80 truncate flex items-center gap-0.5">
                          {app.recurring_schedule_id && (
                            <Repeat size={9} className="text-[#FFD600] shrink-0 inline" />
                          )}
                          <span>
                            {app.start_time?.substring(0, 5)} {app.patients?.full_name?.split(' ')[0] || app.patient_name?.split(' ')[0]}
                          </span>
                          {app.is_prolonged && (
                            <span className="text-[7px] text-[#FFD600] font-black bg-[#FFD600]/10 px-0.5 rounded border border-[#FFD600]/20 leading-none">PR</span>
                          )}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Mobile View (Simple List)
  const renderMobileView = () => {
    if (viewMode === 'available') {
      return renderAvailableHoursView();
    }

    if (filteredAppointments.length === 0) {
      return (
        <div className="text-center py-12 text-white/40 text-sm font-bold uppercase tracking-widest">
          {searchTerm ? 'Nenhum resultado para sua busca' : 'Nenhuma consulta encontrada'}
        </div>
      );
    }

    // Group by date
    const grouped = filteredAppointments.reduce((acc, app) => {
      const date = app.appointment_date || 'Indefinida';
      if (!acc[date]) acc[date] = [];
      acc[date].push(app);
      return acc;
    }, {} as Record<string, Appointment[]>);

    return (
      <div className="space-y-6">
        {Object.entries(grouped).sort().map(([date, apps]) => (
          <div key={date} className="space-y-3">
            <h4 className="text-[#FFD600] font-black text-xs uppercase tracking-widest border-b border-white/10 pb-2">
              {format(parseISO(date), 'dd/MM/yyyy - EEEE', { locale: ptBR })}
            </h4>
            <div className="space-y-2">
              {apps.map(app => (
                <div 
                  id={`agenda-appt-${app.id}`}
                  key={app.id}
                  onClick={() => onAppointmentClick(app)}
                  className={`
                    relative rounded-2xl border cursor-pointer flex justify-between items-center transition-all duration-300
                    ${app.status === 'CANCELADO' 
                      ? 'p-2 opacity-60 h-12 overflow-hidden hover:opacity-100 hover:h-auto hover:p-4' 
                      : 'p-4'} 
                    ${app.status === 'ATENDIDO'
                      ? 'border-sky-500/50 bg-sky-500/10 shadow-[inset_0_0_12px_rgba(14,165,233,0.15)] hover:bg-sky-500/15'
                      : app.status === 'FALTOU'
                      ? 'border-amber-500/30 bg-amber-500/5 opacity-75 hover:opacity-100 hover:bg-amber-500/10'
                      : getStatusColor(app.status, app.appointment_types?.color)}
                  `}
                  style={app.status !== 'ATENDIDO' && app.status !== 'FALTOU' ? getInlineStyle(app.status, app.appointment_types?.color) : undefined}
                >
                  {/* Left Accent indicator for styled status */}
                  {app.status === 'ATENDIDO' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-sky-500 rounded-l-2xl" />
                  )}
                  {app.status === 'FALTOU' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500 rounded-l-2xl opacity-75" />
                  )}

                  <div className="pl-1.5 flex-1 min-w-0 mr-4">
                    <div className={`font-bold text-sm ${app.status === 'CANCELADO' ? 'text-xs' : ''} flex flex-wrap items-center gap-1.5`}>
                      <span className="truncate max-w-[200px]">{app.patients?.full_name || app.patient_name}</span>
                      {app.treatment_enabled && app.treatment_session_number && app.treatment_total_sessions && (
                        <span className="text-[9px] text-[#FFD600] font-black bg-[#FFD600]/10 px-1.5 py-0.5 rounded border border-[#FFD600]/25 whitespace-nowrap">
                          {app.treatment_session_number}/{app.treatment_total_sessions}
                        </span>
                      )}
                      
                      {app.is_prolonged && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-sky-400 font-black bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/25 whitespace-nowrap">
                            PROLONGADA
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateToLinked(app, 'TO_CONTINUATION');
                            }}
                            className="text-[9px] text-[#FFD600] font-black bg-white/5 hover:bg-[#FFD600] hover:text-[#0A0F2C] px-1.5 py-0.5 rounded border border-white/10 transition-all whitespace-nowrap flex items-center gap-0.5"
                            title="Ir para o agendamento da consulta de continuação"
                          >
                            <span>Ir p/ Continuação →</span>
                          </button>
                        </div>
                      )}

                      {app.is_continuation && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-indigo-400 font-black bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/25 whitespace-nowrap">
                            CONTINUAÇÃO
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateToLinked(app, 'TO_ORIGINAL');
                            }}
                            className="text-[9px] text-[#FFD600] font-black bg-white/5 hover:bg-[#FFD600] hover:text-[#0A0F2C] px-1.5 py-0.5 rounded border border-white/10 transition-all whitespace-nowrap flex items-center gap-0.5"
                            title="Ir para a consulta original"
                          >
                            <span>← Ir p/ Original</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] opacity-80 mt-1 flex items-center gap-1">
                      <UserRound size={10} /> {app.profiles?.full_name || 'Não definida'}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="font-black text-white text-sm">{app.start_time?.substring(0, 5)}</div>
                      <div className={`text-[9px] uppercase tracking-widest font-black mt-1 ${
                        app.status === 'ATENDIDO' ? 'text-sky-400' :
                        app.status === 'FALTOU' ? 'text-amber-400' :
                        app.status === 'CONFIRMADO' ? 'text-emerald-400' : 'text-white/40'
                      }`}>{app.status}</div>
                    </div>

                    {app.status !== 'CANCELADO' && (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStatusUpdate(app.id, 'ATENDIDO')}
                          className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                            app.status === 'ATENDIDO'
                              ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
                              : 'bg-white/5 border-white/10 text-white/40 hover:bg-sky-500/15 hover:border-sky-500/20 hover:text-sky-300'
                          }`}
                          title="Marcar como Atendido"
                        >
                          <Check size={16} className="stroke-[3]" />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(app.id, 'FALTOU')}
                          className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                            app.status === 'FALTOU'
                              ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/30'
                              : 'bg-white/5 border-white/10 text-white/40 hover:bg-amber-500/15 hover:border-amber-500/20 hover:text-amber-300'
                          }`}
                          title="Marcar Falta"
                        >
                          <UserX size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenProlongar(app)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                            app.is_prolonged
                              ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
                              : 'bg-white/5 border-white/10 text-white/40 hover:bg-sky-500/15 hover:border-sky-500/20 hover:text-sky-300'
                          }`}
                          title={app.is_prolonged ? "Consulta já Prolongada" : "Prolongar Consulta (Continuação)"}
                        >
                          <CornerDownRight size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const getHeaderTitle = () => {
    if (viewMode === 'day') return format(currentDate, "dd 'de' MMMM, yyyy", { locale: ptBR });
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      if (isSameMonth(start, end)) {
        return `${format(start, 'dd')} - ${format(end, "dd 'de' MMMM, yyyy", { locale: ptBR })}`;
      }
      return `${format(start, "dd 'de' MMM", { locale: ptBR })} - ${format(end, "dd 'de' MMM, yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <div className="glass glass-reflection rounded-[32px] border border-black/5 dark:border-white/5 overflow-hidden flex flex-col h-full">
      {/* agenda-header */}
      <div className="agenda-header flex-shrink-0">
        <div className="p-6 border-b border-white/5 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <DateNavigator 
                selectedDate={currentDate} 
                onChange={setCurrentDate} 
                viewMode={viewMode === 'available' ? 'day' : viewMode} 
              />
              {viewMode !== 'day' && viewMode !== 'available' && (
                <span className="text-xs font-bold text-white/40 border-l border-white/10 pl-3">
                  {getHeaderTitle()}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggles */}
              <div className="hidden sm:flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                {(['day', 'week', 'month', 'available'] as ViewMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      viewMode === mode 
                        ? 'bg-white/10 text-white shadow-sm' 
                        : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                    }`}
                  >
                    {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : mode === 'month' ? 'Mês' : 'Horários Disponíveis'}
                  </button>
                ))}
              </div>

              {/* Filter Toggle */}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl border transition-all ${
                  showFilters || selectedFono || selectedStatus 
                    ? 'bg-[#FFD600]/20 border-[#FFD600]/30 text-[#FFD600]' 
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Filter size={18} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full">
            <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              type="text"
              placeholder="Buscar paciente, ficha ou tipo..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm font-bold outline-none focus:ring-2 focus:ring-[#FFD600]/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filters Area */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-white/5 bg-black/20 overflow-hidden"
            >
              <div className="p-4 flex flex-wrap gap-4 items-end">
                {(profile?.role !== 'FONO' || true) && (
                  <div className="space-y-1.5 flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Profissional</label>
                    <select
                      value={selectedFono}
                      onChange={(e) => setSelectedFono(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:ring-2 focus:ring-[#FFD600]/50 outline-none appearance-none"
                    >
                      <option value="" className="bg-[#0A0F2C]">Todos os profissionais</option>
                      {professionals.map(p => (
                        <option key={p.id} value={p.id} className="bg-[#0A0F2C]">{p.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:ring-2 focus:ring-[#FFD600]/50 outline-none appearance-none"
                  >
                    <option value="" className="bg-[#0A0F2C]">Todos os status</option>
                    <option value="PENDENTE" className="bg-[#0A0F2C]">Pendente</option>
                    <option value="CONFIRMADO" className="bg-[#0A0F2C]">Confirmado</option>
                    <option value="CANCELADO" className="bg-[#0A0F2C]">Cancelado</option>
                    <option value="ATENDIDO" className="bg-[#0A0F2C]">Atendido</option>
                    <option value="FALTOU" className="bg-[#0A0F2C]">Faltou</option>
                  </select>
                </div>

                {(selectedFono || selectedStatus) && (
                  <button 
                    onClick={() => { setSelectedFono(''); setSelectedStatus(''); }}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                  >
                    <X size={14} /> Limpar
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* agenda-scroll Content Area */}
      <div className="agenda-scroll flex-1 p-4 relative min-h-0">
        {isRefreshing && (
          <div className="absolute top-4 right-4 z-20">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#FFD600]"></div>
          </div>
        )}
        {(loading && appointments.length === 0) && (
          <div className="absolute inset-0 z-20 bg-[#0A0F2C]/50 backdrop-blur-sm flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFD600]"></div>
          </div>
        )}
        
        <div className="hidden sm:block h-full">
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'available' && renderAvailableHoursView()}
        </div>
        
        <div className="block sm:hidden h-full overflow-y-auto custom-scrollbar">
          {renderMobileView()}
        </div>
      </div>

      <ScheduleBlockModal
        isOpen={isBlockModalOpen}
        onClose={() => { setIsBlockModalOpen(false); setSelectedBlock(undefined); }}
        onSuccess={handleBlockSuccess}
        block={selectedBlock}
      />

      <ProlongarModal
        isOpen={isProlongarOpen}
        onClose={() => { setIsProlongarOpen(false); setAppointmentToProlong(null); }}
        onSuccess={() => {
          setLocalRefreshKey(prev => prev + 1);
          window.dispatchEvent(new CustomEvent('appointment-updated'));
        }}
        appointment={appointmentToProlong}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-[150] flex items-center gap-3 p-4 rounded-2xl border shadow-xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 backdrop-blur-lg border-emerald-500/20 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-red-950/90 backdrop-blur-lg border-red-500/20 text-red-300'
                : toast.type === 'warning'
                ? 'bg-orange-950/90 backdrop-blur-lg border-orange-500/20 text-orange-300'
                : 'bg-white/10 backdrop-blur-lg border-white/10 text-white'
            }`}
          >
            <div className="p-1 rounded-lg bg-black/10 shrink-0">
              {toast.type === 'success' && <CheckCircle2 size={18} />}
              {toast.type === 'error' && <X size={18} />}
              {toast.type === 'warning' && <X size={18} />}
              {toast.type === 'info' && <Clock size={18} />}
            </div>
            <span className="text-xs font-bold leading-tight">{toast.message}</span>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="text-white/40 hover:text-white transition-colors shrink-0 ml-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

  );
}
