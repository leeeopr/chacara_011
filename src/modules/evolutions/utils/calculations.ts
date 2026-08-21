import { Evolution, EvolutionPack, CalculatedCapacity } from '../types';
import { DEFAULT_MAX_WEIGHT, LOG_PREFIX } from '../constants';

/**
 * Technical logger helper
 */
export function techLog(context: 'Evolutions' | 'Packs' | 'Rollover' | 'Capacity' | 'Permissions' | 'General', message: string, data?: any) {
  const meta = `${LOG_PREFIX}[${context}] ${message}`;
  if (data !== undefined) {
    console.log(meta, data);
  } else {
    console.log(meta);
  }
}

/**
 * Computes run-time capacity metrics for an active pack based on its evolutions
 */
export function calculatePackCapacity(pack: EvolutionPack | null, packEvolutions: Evolution[]): CalculatedCapacity {
  if (!pack) {
    return {
      consumed_weight: 0,
      remaining_weight: DEFAULT_MAX_WEIGHT,
      completion_percentage: 0,
      evolution_count: 0
    };
  }

  const limit = pack.max_weight || DEFAULT_MAX_WEIGHT;
  const consumed = packEvolutions.reduce((sum, evo) => sum + (evo.weight || 0), 0);
  const remaining = Math.max(0, limit - consumed);
  const percentage = Math.min(100, Math.round((consumed / limit) * 100));

  return {
    consumed_weight: consumed,
    remaining_weight: remaining,
    completion_percentage: percentage,
    evolution_count: packEvolutions.length
  };
}
