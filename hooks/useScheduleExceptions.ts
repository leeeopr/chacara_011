import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateEndTime } from '@/lib/recurringService';

export function useScheduleExceptions() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cancel an individual occurrence of a repeating appointment.
   */
  const cancelOccurrence = useCallback(async (
    occurrenceId: string,
    originalDate: string,
    reason: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch occurrence to get appointment_id and recurring_schedule_id
      const { data: occur, error: fetchErr } = await supabase
        .from('schedule_occurrences')
        .select('*')
        .eq('id', occurrenceId)
        .single();

      if (fetchErr || !occur) throw new Error('Ocorrência não encontrada.');

      // 2. Insert exception record
      const { error: excErr } = await supabase
        .from('schedule_exceptions')
        .insert({
          occurrence_id: occurrenceId,
          original_date: originalDate,
          new_date: null,
          reason,
          status: 'CANCELLED'
        });

      if (excErr) throw excErr;

      // 3. Mark occurrence as cancelled
      await supabase
        .from('schedule_occurrences')
        .update({ status: 'CANCELLED' })
        .eq('id', occurrenceId);

      // 4. Cancel the concrete appointment record
      if (occur.appointment_id) {
        await supabase
          .from('appointments')
          .update({
            status: 'CANCELADO',
            cancel_reason: `Cancelamento de ocorrência individual: ${reason}`
          })
          .eq('id', occur.appointment_id);
      }

      return { success: true };
    } catch (e: any) {
      console.error('[useScheduleExceptions] Error cancelling occurrence:', e);
      setError(e.message || 'Erro ao cancelar ocorrência.');
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reschedule an individual occurrence to a new date/time.
   */
  const rescheduleOccurrence = useCallback(async (
    occurrenceId: string,
    originalDate: string,
    newDate: string,
    newStartTime: string,
    reason: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch occurrence to retrieve metadata
      const { data: occur, error: fetchErr } = await supabase
        .from('schedule_occurrences')
        .select(`
          *,
          recurring_schedules (*)
        `)
        .eq('id', occurrenceId)
        .single();

      if (fetchErr || !occur) throw new Error('Ocorrência não encontrada.');

      const schedule = Array.isArray(occur.recurring_schedules) 
        ? occur.recurring_schedules[0] 
        : occur.recurring_schedules;

      if (!schedule) throw new Error('Regra mestre de recorrência não encontrada.');

      // 2. Fetch original appointment to clone it
      if (occur.appointment_id) {
        // Update the current appointment date, start_time, and end_time
        const newEndTime = calculateEndTime(newStartTime, schedule.duration || 50);
        
        const { error: apptErr } = await supabase
          .from('appointments')
          .update({
            appointment_date: newDate,
            start_time: newStartTime,
            notes: `[Reagendado individualmente de ${originalDate}] ${reason}`
          })
          .eq('id', occur.appointment_id);

        if (apptErr) throw apptErr;

        // Update occurrence date and mark as generated
        await supabase
          .from('schedule_occurrences')
          .update({
            occurrence_date: newDate
          })
          .eq('id', occurrenceId);
      }

      // 3. Log exception
      await supabase
        .from('schedule_exceptions')
        .insert({
          occurrence_id: occurrenceId,
          original_date: originalDate,
          new_date: newDate,
          reason,
          status: 'RESCHEDULED'
        });

      return { success: true };
    } catch (e: any) {
      console.error('[useScheduleExceptions] Error rescheduling:', e);
      setError(e.message || 'Erro ao reagendar ocorrência.');
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    cancelOccurrence,
    rescheduleOccurrence
  };
}
