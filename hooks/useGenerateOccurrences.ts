import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { generateOccurrencesForSchedule } from '@/lib/recurringService';

export function useGenerateOccurrences() {
  const [generating, setGenerating] = useState<boolean>(false);
  const [results, setResults] = useState<{
    succeeded: boolean;
    totalGenerated: number;
    conflicts: string[];
  } | null>(null);

  const generateSingle = useCallback(async (scheduleId: string, horizonDays = 90, ignoreConflicts = false) => {
    setGenerating(true);
    setResults(null);
    try {
      const res = await generateOccurrencesForSchedule(scheduleId, horizonDays, ignoreConflicts);
      const output = {
        succeeded: res.success,
        totalGenerated: res.generatedCount,
        conflicts: res.conflicts
      };
      setResults(output);
      return output;
    } catch (e: any) {
      console.error('[useGenerateOccurrences] Error generating single:', e);
      const errOutput = { succeeded: false, totalGenerated: 0, conflicts: [e.message] };
      setResults(errOutput);
      return errOutput;
    } finally {
      setGenerating(false);
    }
  }, []);

  const generateAllActive = useCallback(async (horizonDays = 90) => {
    setGenerating(true);
    setResults(null);
    try {
      // 1. Fetch all active schedules
      const { data: activeSchedules, error: fetchErr } = await supabase
        .from('recurring_schedules')
        .select('id, patient_id')
        .eq('status', 'ACTIVE');

      if (fetchErr) throw fetchErr;

      let totalGenerated = 0;
      const allConflicts: string[] = [];

      if (activeSchedules) {
        for (const sched of activeSchedules) {
          const res = await generateOccurrencesForSchedule(sched.id, horizonDays, false);
          totalGenerated += res.generatedCount;
          allConflicts.push(...res.conflicts);
        }
      }

      const output = {
        succeeded: true,
        totalGenerated,
        conflicts: allConflicts
      };
      setResults(output);
      return output;
    } catch (e: any) {
      console.error('[useGenerateOccurrences] Error generating all active:', e);
      const errOutput = { succeeded: false, totalGenerated: 0, conflicts: [e.message] };
      setResults(errOutput);
      return errOutput;
    } finally {
      setGenerating(false);
    }
  }, []);

  return {
    generating,
    results,
    generateSingle,
    generateAllActive
  };
}
