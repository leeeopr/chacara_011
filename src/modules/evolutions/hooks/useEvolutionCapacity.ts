'use client';

import { useMemo } from 'react';
import { Evolution, EvolutionPack, CalculatedCapacity } from '../types';
import { calculatePackCapacity, techLog } from '../utils/calculations';

export function useEvolutionCapacity(packs: EvolutionPack[], evolutions: Evolution[]) {
  return useMemo(() => {
    // 1. Find target active/open pack
    const openPack = packs.find(p => p.status === 'OPEN') || null;
    
    // 2. Filter evolutions of the current active pack
    const activePackEvolutions = openPack 
      ? evolutions.filter(evo => evo.pack_id === openPack.id) 
      : [];

    const stats = calculatePackCapacity(openPack, activePackEvolutions);

    techLog('Capacity', 'Recalculating real-time active pack capacity', {
      openPackNumber: openPack?.number,
      ...stats
    });

    return {
      activePack: openPack,
      ...stats
    };
  }, [packs, evolutions]);
}
