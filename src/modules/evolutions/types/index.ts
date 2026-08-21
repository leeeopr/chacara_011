export type EvolutionStatus = 'BACKLOG' | 'EM DESENVOLVIMENTO' | 'CONCLUÍDA' | 'CANCELADA';
export type PackStatus = 'OPEN' | 'CLOSED';

export interface EvolutionPack {
  id: string;
  number: number;
  max_weight: number;
  status: PackStatus;
  created_at: string;
  completed_at?: string | null;
}

export interface Evolution {
  id: string;
  title: string;
  description: string | null;
  status: EvolutionStatus;
  weight: number;
  category: string;
  pack_id: string;
  implementation_notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  created_by?: string | null;
}

export interface CalculatedCapacity {
  consumed_weight: number;
  remaining_weight: number;
  completion_percentage: number;
  evolution_count: number;
}
