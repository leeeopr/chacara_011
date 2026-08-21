import { CrewMember } from './chacaraTypes';
import { HousePurchase } from './purchasesTypes';

export type RoomCategory = 'DORMITORIO' | 'SOCIAL' | 'LAZER' | 'SERVICO' | 'EXTERNO' | 'TECNICO' | 'GERAL';

export type RoomStatus = 'OPERACIONAL' | 'MANUTENCAO_NECESSARIA' | 'INTERDITADO' | 'EM_REFORMA';

export type MaintenancePriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export type MaintenanceStatus = 
  | 'IDENTIFICADA' 
  | 'PLANEJADA' 
  | 'AGUARDANDO' 
  | 'EM_ANDAMENTO' 
  | 'CONCLUIDA' 
  | 'CANCELADA';

export type RecurrencePeriod = 
  | 'SEMANAL' 
  | 'QUINZENAL' 
  | 'MENSAL' 
  | 'BIMESTRAL' 
  | 'TRIMESTRAL' 
  | 'SEMESTRAL' 
  | 'ANUAL' 
  | 'PERSONALIZADA';

export type ImageStage = 'ANTES' | 'DURANTE' | 'DEPOIS';

export interface RoomType {
  id: string;
  name: string;
  default_icon: string;
  category: RoomCategory;
  color: string;
  is_custom: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceImage {
  id: string;
  maintenance_id: string;
  photo_url: string;
  stage: ImageStage;
  caption?: string;
  display_order?: number;
  created_at?: string;
}

export interface MaintenanceRecord {
  id: string;
  chacara_id: string;
  room_id: string;
  title: string;
  description?: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  identified_at: string; // YYYY-MM-DD
  due_date?: string; // YYYY-MM-DD
  completed_at?: string;
  
  // Responsável
  assigned_crew_member_id?: string;
  assigned_crew_name?: string;
  assigned_crew_member?: CrewMember;

  // Financeiro
  estimated_cost: number;
  actual_cost: number;
  financial_transaction_id?: string;

  // Calendário
  operational_event_id?: string;

  // Recorrência
  is_recurring: boolean;
  recurrence_period?: RecurrencePeriod;
  recurrence_interval_days?: number;
  recurrence_parent_id?: string;
  next_occurrence_date?: string;

  notes?: string;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;

  // Relacionamentos populados
  room_name?: string;
  room_icon?: string;
  chacara_name?: string;
  images?: MaintenanceImage[];
  purchases?: HousePurchase[];
  purchase_ids?: string[];
}

export interface PropertyRoom {
  id: string;
  chacara_id: string;
  room_type_id?: string;
  room_type_name: string;
  name: string;
  description?: string;
  icon: string;
  photo_url?: string;
  display_order: number;
  status: RoomStatus;
  notes?: string;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;

  // Estatísticas calculadas dinamicamente
  stats?: {
    total_maintenances: number;
    open_maintenances: number;
    in_progress_maintenances: number;
    urgent_maintenances: number;
    completed_maintenances: number;
    total_spent: number;
    has_urgent: boolean;
  };

  // Lista de manutenções ativas do cômodo para renderização rápida
  recent_maintenances?: MaintenanceRecord[];
}

export interface RoomMaintenanceFilter {
  chacara_id?: string;
  room_id?: string;
  status?: MaintenanceStatus | 'TODOS' | 'ABERTAS';
  priority?: MaintenancePriority | 'TODAS';
  assigned_crew_id?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const INITIAL_ROOM_TYPES: Omit<RoomType, 'id'>[] = [
  { name: 'Quarto', default_icon: 'BedDouble', category: 'DORMITORIO', color: '#3B82F6', is_custom: false, display_order: 1 },
  { name: 'Suíte', default_icon: 'Bed', category: 'DORMITORIO', color: '#8B5CF6', is_custom: false, display_order: 2 },
  { name: 'Banheiro', default_icon: 'Bath', category: 'SERVICO', color: '#06B6D4', is_custom: false, display_order: 3 },
  { name: 'Cozinha', default_icon: 'UtensilsCrossed', category: 'SERVICO', color: '#F59E0B', is_custom: false, display_order: 4 },
  { name: 'Sala', default_icon: 'Sofa', category: 'SOCIAL', color: '#10B981', is_custom: false, display_order: 5 },
  { name: 'Sala de Jantar', default_icon: 'Utensils', category: 'SOCIAL', color: '#6366F1', is_custom: false, display_order: 6 },
  { name: 'Área Gourmet', default_icon: 'Flame', category: 'LAZER', color: '#EF4444', is_custom: false, display_order: 7 },
  { name: 'Churrasqueira', default_icon: 'Flame', category: 'LAZER', color: '#F97316', is_custom: false, display_order: 8 },
  { name: 'Piscina', default_icon: 'Waves', category: 'LAZER', color: '#0EA5E9', is_custom: false, display_order: 9 },
  { name: 'Jardim', default_icon: 'Trees', category: 'EXTERNO', color: '#84CC16', is_custom: false, display_order: 10 },
  { name: 'Área Externa', default_icon: 'Sun', category: 'EXTERNO', color: '#14B8A6', is_custom: false, display_order: 11 },
  { name: 'Varanda', default_icon: 'Maximize2', category: 'SOCIAL', color: '#A855F7', is_custom: false, display_order: 12 },
  { name: 'Garagem', default_icon: 'Car', category: 'SERVICO', color: '#64748B', is_custom: false, display_order: 13 },
  { name: 'Lavanderia', default_icon: 'Shirt', category: 'SERVICO', color: '#0284C7', is_custom: false, display_order: 14 },
  { name: 'Escritório', default_icon: 'Laptop', category: 'SOCIAL', color: '#475569', is_custom: false, display_order: 15 },
  { name: 'Depósito', default_icon: 'Boxes', category: 'SERVICO', color: '#78716C', is_custom: false, display_order: 16 },
  { name: 'Casa de Máquinas', default_icon: 'Cog', category: 'TECNICO', color: '#DC2626', is_custom: false, display_order: 17 },
  { name: 'Salão de Jogos', default_icon: 'Gamepad2', category: 'LAZER', color: '#EC4899', is_custom: false, display_order: 18 },
  { name: 'Canil', default_icon: 'Dog', category: 'EXTERNO', color: '#D97706', is_custom: false, display_order: 19 },
  { name: 'Outro', default_icon: 'MoreHorizontal', category: 'GERAL', color: '#94A3B8', is_custom: false, display_order: 99 }
];

export const MAINTENANCE_PRIORITY_META: Record<MaintenancePriority, { label: string; color: string; badgeBg: string; border: string }> = {
  BAIXA: {
    label: 'Baixa',
    color: 'text-slate-400',
    badgeBg: 'bg-slate-500/10 text-slate-400',
    border: 'border-slate-500/20'
  },
  MEDIA: {
    label: 'Média',
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-400',
    border: 'border-blue-500/20'
  },
  ALTA: {
    label: 'Alta',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-400',
    border: 'border-amber-500/20'
  },
  URGENTE: {
    label: 'Urgente',
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 text-rose-300 animate-pulse',
    border: 'border-rose-500/40'
  }
};

export const MAINTENANCE_STATUS_META: Record<MaintenanceStatus, { label: string; color: string; badgeBg: string }> = {
  IDENTIFICADA: {
    label: 'Identificada',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
  },
  PLANEJADA: {
    label: 'Planejada',
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
  },
  AGUARDANDO: {
    label: 'Aguardando',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
  },
  EM_ANDAMENTO: {
    label: 'Em Andamento',
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
  },
  CONCLUIDA: {
    label: 'Concluída',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  },
  CANCELADA: {
    label: 'Cancelada',
    color: 'text-slate-400',
    badgeBg: 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
  }
};

export const ROOM_STATUS_META: Record<RoomStatus, { label: string; color: string; badgeBg: string }> = {
  OPERACIONAL: {
    label: 'Operacional',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  },
  MANUTENCAO_NECESSARIA: {
    label: 'Manutenção Necessária',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
  },
  INTERDITADO: {
    label: 'Interditado',
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
  },
  EM_REFORMA: {
    label: 'Em Reforma',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
  }
};
