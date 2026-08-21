import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { RecurringSchedule, FrequencyType } from '@/lib/types';
import { generateOccurrencesForSchedule, updateRecurringScheduleVersioned, updateRecurringScheduleSimple } from '@/lib/recurringService';

export function useRecurringSchedules() {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch schedules
      const { data, error: fetchError } = await supabase
        .from('recurring_schedules')
        .select(`
          *,
          patients (id, full_name, whatsapp, category),
          appointment_types (id, name, duration_minutes, color)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // 2. Fetch professional profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name');

      const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // 2.5. Fetch attended appointments for treatment enabled rules
      const { data: attendedApps } = await supabase
        .from('appointments')
        .select('recurring_schedule_id, status')
        .eq('status', 'ATENDIDO')
        .not('recurring_schedule_id', 'is', null);

      const attendedCountsMap = new Map<string, number>();
      if (attendedApps) {
        attendedApps.forEach((app: any) => {
          if (app.recurring_schedule_id) {
            const current = attendedCountsMap.get(app.recurring_schedule_id) || 0;
            attendedCountsMap.set(app.recurring_schedule_id, current + 1);
          }
        });
      }

      if (data) {
        const formatted = data.map((sched: any) => {
          // Unify array or single item joins
          const patient = Array.isArray(sched.patients) ? sched.patients[0] : sched.patients;
          const type = Array.isArray(sched.appointment_types) ? sched.appointment_types[0] : sched.appointment_types;
          return {
            ...sched,
            patients: patient,
            appointment_types: type,
            attended_sessions_count: attendedCountsMap.get(sched.id) || 0,
            profiles: {
              id: sched.professional_id,
              full_name: profilesMap.get(sched.professional_id) || 'Desconhecido'
            }
          } as RecurringSchedule;
        });
        setSchedules(formatted);
      }
    } catch (err: any) {
      console.warn('[useRecurringSchedules] Busca de frequências finalizada:', err?.message || err);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSchedule = useCallback(async (
    schedule: Omit<RecurringSchedule, 'id' | 'created_at' | 'updated_at' | 'version' | 'status'>,
    userId: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('recurring_schedules')
        .insert({
          patient_id: schedule.patient_id,
          professional_id: schedule.professional_id,
          clinic_id: schedule.clinic_id || null,
          frequency_type: schedule.frequency_type,
          interval_value: schedule.interval_value || 1,
          weekdays: schedule.weekdays,
          start_time: schedule.start_time,
          duration: schedule.duration,
          starts_at: schedule.starts_at,
          ends_at: schedule.ends_at || null,
          effective_from: schedule.starts_at,
          effective_until: null,
          status: 'ACTIVE',
          version: 1,
          appointment_type_id: schedule.appointment_type_id || null,
          treatment_enabled: schedule.treatment_enabled || false,
          treatment_total_sessions: schedule.treatment_total_sessions || null,
          next_session_number: schedule.next_session_number || null,
          created_by: userId
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      // Generate on-demand occurrences for the next 90 days immediately
      if (data) {
        const genResult = await generateOccurrencesForSchedule(data.id, 90, false);
        await fetchSchedules();
        return { success: true, schedule: data, conflicts: genResult.conflicts };
      }
      
      throw new Error('Não foi possível obter os dados da nova frequência.');
    } catch (err: any) {
      console.error('[useRecurringSchedules] Error creating schedule:', err);
      setError(err.message || 'Erro ao cadastrar frequência.');
      setLoading(false);
      return { success: false, error: err.message, conflicts: [] };
    }
  }, [fetchSchedules]);

  const updateScheduleVersionedAction = useCallback(async (
    scheduleId: string,
    updatedData: {
      weekdays: number[];
      frequency_type: FrequencyType;
      interval_value: number;
      start_time: string;
      duration: number;
      starts_at: string;
      ends_at?: string | null;
      appointment_type_id?: string | null;
      professional_id: string;
      treatment_enabled?: boolean;
      treatment_total_sessions?: number | null;
      next_session_number?: number | null;
    },
    applyFromDate: string,
    userId: string,
    ignoreConflicts = false
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await updateRecurringScheduleSimple(
        scheduleId,
        updatedData
      );
      if (res.success) {
        await fetchSchedules();
        return { success: true, conflicts: res.conflicts };
      } else {
        throw new Error(res.error || 'Erro ao realizar update no agendamento recorrente.');
      }
    } catch (err: any) {
      console.error('[useRecurringSchedules] Error updating schedule:', err);
      setError(err.message || 'Erro ao salvar alteração de frequência.');
      setLoading(false);
      return { success: false, error: err.message, conflicts: [] };
    }
  }, [fetchSchedules]);

  const suspendSchedule = useCallback(async (scheduleId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('recurring_schedules')
        .update({ status: 'SUSPENDED', updated_at: new Date().toISOString() })
        .eq('id', scheduleId);

      if (updateError) throw updateError;
      
      // Cancel all upcoming generated occurrences of this suspended schedule
      const { data: occurrences } = await supabase
        .from('schedule_occurrences')
        .select('id, appointment_id')
        .eq('recurring_schedule_id', scheduleId)
        .gte('occurrence_date', format(new Date(), 'yyyy-MM-dd'))
        .eq('status', 'GENERATED');

      if (occurrences && occurrences.length > 0) {
        const occurIds = occurrences.map(o => o.id);
        const apptIds = occurrences.map(o => o.appointment_id).filter(Boolean) as string[];

        // Cancel occurrences
        await supabase
          .from('schedule_occurrences')
          .update({ status: 'CANCELLED' })
          .in('id', occurIds);

        if (apptIds.length > 0) {
          // Cancel appointments
          await supabase
            .from('appointments')
            .update({ status: 'CANCELADO', cancel_reason: 'Frequência Recorrente Suspensa' })
            .in('id', apptIds);
        }
      }

      await fetchSchedules();
      return { success: true };
    } catch (err: any) {
      console.error('[useRecurringSchedules] Error suspending schedule:', err);
      setError(err.message || 'Erro ao suspender frequência recorrente.');
      setLoading(false);
      return { success: false, error: err.message };
    }
  }, [fetchSchedules]);

  const reactivateSchedule = useCallback(async (scheduleId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('recurring_schedules')
        .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
        .eq('id', scheduleId);

      if (updateError) throw updateError;

      // Re-generate future occurrences
      const genResult = await generateOccurrencesForSchedule(scheduleId, 90, true);
      await fetchSchedules();
      return { success: true, conflicts: genResult.conflicts };
    } catch (err: any) {
      console.error('[useRecurringSchedules] Error reactivating schedule:', err);
      setError(err.message || 'Erro ao reativar frequência recorrente.');
      setLoading(false);
      return { success: false, error: err.message, conflicts: [] };
    }
  }, [fetchSchedules]);

  const endSchedule = useCallback(async (scheduleId: string) => {
    setLoading(true);
    setError(null);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const { error: updateError } = await supabase
        .from('recurring_schedules')
        .update({ 
          status: 'ENDED', 
          effective_until: todayStr, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', scheduleId);

      if (updateError) throw updateError;

      // Cancel future scheduled occurrences which are after today
      const { data: occurrences } = await supabase
        .from('schedule_occurrences')
        .select('id, appointment_id')
        .eq('recurring_schedule_id', scheduleId)
        .gt('occurrence_date', todayStr)
        .eq('status', 'GENERATED');

      if (occurrences && occurrences.length > 0) {
        const occurIds = occurrences.map(o => o.id);
        const apptIds = occurrences.map(o => o.appointment_id).filter(Boolean) as string[];

        await supabase
          .from('schedule_occurrences')
          .update({ status: 'CANCELLED' })
          .in('id', occurIds);

        if (apptIds.length > 0) {
          await supabase
            .from('appointments')
            .update({ status: 'CANCELADO', cancel_reason: 'Frequência Recorrente Encerrada' })
            .in('id', apptIds);
        }
      }

      await fetchSchedules();
      return { success: true };
    } catch (err: any) {
      console.error('[useRecurringSchedules] Error ending schedule:', err);
      setError(err.message || 'Erro ao encerrar frequência recorrente.');
      setLoading(false);
      return { success: false, error: err.message };
    }
  }, [fetchSchedules]);

  const deleteSchedule = useCallback(async (scheduleId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Hard delete schedule will cascade and delete schedule_occurrences,
      // but let's cancel upcoming appointments
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const { data: occurrences } = await supabase
        .from('schedule_occurrences')
        .select('appointment_id')
        .eq('recurring_schedule_id', scheduleId)
        .gte('occurrence_date', todayStr);

      if (occurrences && occurrences.length > 0) {
        const apptIds = occurrences.map(o => o.appointment_id).filter(Boolean) as string[];
        if (apptIds.length > 0) {
          await supabase
            .from('appointments')
            .update({ status: 'CANCELADO', cancel_reason: 'Frequência Recorrente Excluída' })
            .in('id', apptIds);
        }
      }

      const { error: deleteError } = await supabase
        .from('recurring_schedules')
        .delete()
        .eq('id', scheduleId);

      if (deleteError) throw deleteError;

      await fetchSchedules();
      return { success: true };
    } catch (err: any) {
      console.error('[useRecurringSchedules] Error deleting schedule:', err);
      setError(err.message || 'Erro ao excluir frequência.');
      setLoading(false);
      return { success: false, error: err.message };
    }
  }, [fetchSchedules]);

  return {
    schedules,
    loading,
    error,
    fetchSchedules,
    createSchedule,
    updateScheduleVersionedAction,
    suspendSchedule,
    reactivateSchedule,
    endSchedule,
    deleteSchedule
  };
}
