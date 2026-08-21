'use client';

import { useState, useCallback } from 'react';
import { EvolutionPack } from '../types';
import { EvolutionAPI } from '../services/api';
import { techLog } from '../utils/calculations';

// Shared runtime cache/state indicator for pack revalidations
let cachedPacks: EvolutionPack[] = [];

export function useEvolutionPacks() {
  const [packs, setPacks] = useState<EvolutionPack[]>(cachedPacks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadPacks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      techLog('Packs', 'Initiating pack loading sequence...');
      const fetched = await EvolutionAPI.fetchPacks();
      cachedPacks = fetched;
      setPacks(fetched);
      techLog('Packs', 'Packs successfully updated', fetched);
    } catch (err: any) {
      techLog('Packs', 'Failure load sequence', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    packs,
    loading,
    error,
    refreshPacks: loadPacks,
    setPacks
  };
}
