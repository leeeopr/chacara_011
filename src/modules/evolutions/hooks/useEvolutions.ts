'use client';

import { useState, useCallback } from 'react';
import { Evolution, EvolutionStatus } from '../types';
import { EvolutionAPI } from '../services/api';
import { techLog } from '../utils/calculations';
import { useAuth } from '@/contexts/AuthContext';

let cachedEvolutions: Evolution[] = [];

export function useEvolutions() {
  const { user } = useAuth();
  const [evolutions, setEvolutions] = useState<Evolution[]>(cachedEvolutions);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadEvolutions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      techLog('Evolutions', 'Initiating evolution items loading sequence...');
      const fetched = await EvolutionAPI.fetchEvolutions();
      cachedEvolutions = fetched;
      setEvolutions(fetched);
      techLog('Evolutions', 'Evolution items successfully aggregated', fetched);
    } catch (err: any) {
      techLog('Evolutions', 'Failure load sequence', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  const createEvolution = useCallback(async (data: {
    title: string;
    description: string | null;
    weight: number;
    category: string;
    status: EvolutionStatus;
    implementation_notes: string | null;
  }) => {
    setActionLoading(true);
    setError(null);
    try {
      techLog('Evolutions', 'Creating new evolution technical records...');
      const creatorId = user?.id || null;
      await EvolutionAPI.createEvolution({
        ...data,
        created_by: creatorId
      });
      techLog('Evolutions', 'Evolution created successfully');
    } catch (err: any) {
      techLog('Evolutions', 'Failed to create evolution', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [user]);

  const updateEvolution = useCallback(async (id: string, updates: Partial<Evolution>) => {
    setActionLoading(true);
    setError(null);
    try {
      techLog('Evolutions', `Updating evolution card ID: ${id}`);
      await EvolutionAPI.updateEvolution(id, updates);
      techLog('Evolutions', `Evolution card ${id} updated successfully`);
    } catch (err: any) {
      techLog('Evolutions', `Failed to update evolution ${id}`, err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, []);

  const deleteEvolution = useCallback(async (id: string) => {
    setActionLoading(true);
    setError(null);
    try {
      techLog('Evolutions', `Deleting evolution card ID: ${id}`);
      await EvolutionAPI.deleteEvolution(id);
      techLog('Evolutions', `Evolution card ${id} deleted successfully`);
    } catch (err: any) {
      techLog('Evolutions', `Failed to delete evolution ${id}`, err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, []);

  return {
    evolutions,
    loading,
    actionLoading,
    error,
    refreshEvolutions: loadEvolutions,
    createEvolution,
    updateEvolution,
    deleteEvolution
  };
}
