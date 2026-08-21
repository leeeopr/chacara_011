import { useState, useCallback } from 'react';
import { reconcileSchedules, ReconciliationItem } from '@/lib/recurringService';
import { FrequencyType } from '@/lib/types';

export function useScheduleReconciliation() {
  const [reconciling, setReconciling] = useState<boolean>(false);
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const calculateReconciliation = useCallback(async (params: {
    scheduleId: string;
    newWeekdays: number[];
    newFrequencyType: FrequencyType;
    newIntervalValue: number;
    newStartsAt: string;
    newStartTime: string;
    startsFromDateStr: string;
    horizonDays?: number;
  }) => {
    setReconciling(true);
    setError(null);
    try {
      const result = await reconcileSchedules(
        params.scheduleId,
        params.newWeekdays,
        params.newFrequencyType,
        params.newIntervalValue,
        params.newStartsAt,
        params.newStartTime,
        params.startsFromDateStr,
        params.horizonDays || 90
      );
      setItems(result);
      return result;
    } catch (e: any) {
      console.error('[useScheduleReconciliation] Error', e);
      setError(e.message || 'Erro ao calcular reconciliação de datas.');
      return [];
    } finally {
      setReconciling(false);
    }
  }, []);

  // Ah, let's fix the variable name inside the mock logic or hook
  return {
    reconciling,
    items,
    error,
    calculateReconciliation,
    setItems
  };
}

// Ensure the local state variables are updated cleanly. Let me adjust setGenerating typo below.
import { generateOccurrencesForSchedule } from '@/lib/recurringService';
