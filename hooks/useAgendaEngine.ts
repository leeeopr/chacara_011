'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { agendaEngine, AgendaEngineOverride } from '@/services/agendaEngine';
import { AgendaBlock, AgendaBlockTask } from '@/lib/types';

export function useAgendaEngine(customProfileId?: string, override?: AgendaEngineOverride) {
  const { profile } = useAuth();
  const [todayBlocks, setTodayBlocks] = useState<AgendaBlock[]>([]);
  const [currentBlock, setCurrentBlock] = useState<AgendaBlock | null>(null);
  const [nextBlock, setNextBlock] = useState<AgendaBlock | null>(null);
  const [nextTask, setNextTask] = useState<AgendaBlockTask | null>(null);
  const [pendingTasksCount, setPendingTasksCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Use profile id from custom parameter, then fallback to current user's profile id
  const targetProfileId = customProfileId || profile?.id;

  // Extract primitive dependency values to avoid infinite loops from non-memoized objects
  const overrideDay = override?.weekday;
  const overrideTime = override?.time;
  const overrideDateVal = override?.date?.getTime();

  // Create stabilizer ref for the override object
  const overrideRef = useRef(override);
  useEffect(() => {
    overrideRef.current = override;
  }, [override]);

  const fetchEngineData = useCallback(async () => {
    if (!targetProfileId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const activeOverride = overrideRef.current;
      const [blocks, current, next, task, count] = await Promise.all([
        agendaEngine.getTodayBlocks(targetProfileId, activeOverride),
        agendaEngine.getCurrentBlock(targetProfileId, activeOverride),
        agendaEngine.getNextBlock(targetProfileId, activeOverride),
        agendaEngine.getNextPendingTask(targetProfileId, activeOverride),
        agendaEngine.getPendingTasksCount(targetProfileId, activeOverride),
      ]);

      setTodayBlocks(blocks);
      setCurrentBlock(current);
      setNextBlock(next);
      setNextTask(task);
      setPendingTasksCount(count);
    } catch (err: any) {
      console.warn('Busca de dados da agenda finalizada:', err?.message || err);
    } finally {
      setLoading(false);
    }
  }, [targetProfileId]);

  useEffect(() => {
    fetchEngineData();
    
    // Setup a tick interval every 60 seconds to automatically update the custom current/next block
    // based on real-time clock if no manual override is provided.
    if (!overrideDay && !overrideTime && !overrideDateVal) {
      const interval = setInterval(() => {
        fetchEngineData();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [fetchEngineData, overrideDay, overrideTime, overrideDateVal]);

  return {
    todayBlocks,
    currentBlock,
    nextBlock,
    nextTask,
    pendingTasksCount,
    loading,
    refresh: fetchEngineData
  };
}
