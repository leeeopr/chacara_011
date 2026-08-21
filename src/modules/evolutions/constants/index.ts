import { EvolutionStatus, PackStatus } from '../types';

export const LOG_PREFIX = '[Evolutions System]';

export const CATEGORIES = [
  'Core',
  'UI/UX',
  'Performance',
  'Security',
  'Integration',
  'Automation'
] as const;

export const DEFAULT_MAX_WEIGHT = 10;
export const DEFAULT_EVOLUTION_WEIGHT = 1;

export const STATUS_STYLING: Record<EvolutionStatus, { label: string; color: string; border: string; bg: string }> = {
  'BACKLOG': {
    label: 'Backlog',
    color: '#94a3b8',
    border: 'border-slate-500/20',
    bg: 'bg-slate-500/10'
  },
  'EM DESENVOLVIMENTO': {
    label: 'Desenvolvimento',
    color: '#3b82f6',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/10'
  },
  'CONCLUÍDA': {
    label: 'Concluída',
    color: '#10b981',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/10'
  },
  'CANCELADA': {
    label: 'Cancelada',
    color: '#f43f5e',
    border: 'border-rose-500/20',
    bg: 'bg-rose-500/10'
  }
};

export const PACK_STATUS_STYLING: Record<PackStatus, { label: string; color: string; bg: string }> = {
  'OPEN': {
    label: 'Ativo',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/20'
  },
  'CLOSED': {
    label: 'Concluído',
    color: 'text-white/40',
    bg: 'bg-white/5 border-white/10'
  }
};
