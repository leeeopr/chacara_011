import { Chacara } from './chacaraTypes';

export type DecisionClassification = 
  | 'OPERACIONAL' 
  | 'PROJETO_INVESTIMENTO';

export type DecisionType = 
  | 'COMPRA' 
  | 'MANUTENCAO' 
  | 'REFORMA' 
  | 'INVESTIMENTO' 
  | 'OPERACIONAL' 
  | 'OUTRO';

export type DecisionStatus = 
  | 'EM_ANALISE' 
  | 'APROVADA' 
  | 'ADIADA' 
  | 'REJEITADA';

export type DecisionPriority = 
  | 'BAIXA' 
  | 'MEDIA' 
  | 'ALTA' 
  | 'ESTRATEGICA';

export interface PlanningDecision {
  id: string;
  title: string;
  classification: DecisionClassification;
  description?: string;
  chacara_id?: string | null;
  decision_type: DecisionType;
  estimated_cost: number;
  target_date?: string | null; // YYYY-MM-DD
  status: DecisionStatus;
  priority: DecisionPriority;
  impact_notes?: string | null;
  postpone_reason?: string | null;
  postponed_until?: string | null; // Data prevista para reavaliação (YYYY-MM-DD)
  rejection_reason?: string | null;
  metadata?: Record<string, any>;
  created_by?: string | null;
  created_by_name?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  
  // Relacionamentos populados
  chacara?: Chacara | null;
}

export interface CreateDecisionInput {
  title: string;
  classification?: DecisionClassification;
  description?: string;
  chacara_id?: string | null;
  decision_type: DecisionType;
  estimated_cost?: number;
  target_date?: string | null;
  status?: DecisionStatus;
  priority?: DecisionPriority;
  impact_notes?: string;
  postpone_reason?: string | null;
  postponed_until?: string | null;
  rejection_reason?: string | null;
  metadata?: Record<string, any>;
  created_by?: string;
  created_by_name?: string;
}

export interface UpdateDecisionInput {
  title?: string;
  classification?: DecisionClassification;
  description?: string;
  chacara_id?: string | null;
  decision_type?: DecisionType;
  estimated_cost?: number;
  target_date?: string | null;
  status?: DecisionStatus;
  priority?: DecisionPriority;
  impact_notes?: string;
  postpone_reason?: string | null;
  postponed_until?: string | null;
  rejection_reason?: string | null;
  metadata?: Record<string, any>;
}

export type HistoryEventType = 
  | 'CRIACAO' 
  | 'MUDANCA_STATUS' 
  | 'ALTERACAO_CUSTO' 
  | 'EDICAO_GERAL' 
  | 'APROVACAO' 
  | 'ADIAMENTO' 
  | 'REJEICAO' 
  | 'RETOMADA_ANALISE';

export interface DecisionStatusHistory {
  id: string;
  decision_id: string;
  event_type?: HistoryEventType;
  previous_status?: DecisionStatus;
  new_status?: DecisionStatus;
  reason?: string;
  details?: string;
  changed_by?: string;
  created_at: string;
}

// Metadados Visuais para Classificação de Decisão
export const DECISION_CLASSIFICATION_META: Record<DecisionClassification, {
  label: string;
  shortLabel: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeBg: string;
  iconName: string;
  description: string;
  example: string;
}> = {
  OPERACIONAL: {
    label: 'Decisão Operacional',
    shortLabel: 'Operacional',
    color: '#06B6D4',
    bgClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/30',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
    iconName: 'Workflow',
    description: 'Decisões diretas e pontuais do funcionamento das chácaras',
    example: 'Troca de colchões, insumos, prestadores, consertos rápidos'
  },
  PROJETO_INVESTIMENTO: {
    label: 'Projeto / Investimento',
    shortLabel: 'Projeto/Investimento',
    color: '#10B981',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    badgeBg: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40',
    iconName: 'TrendingUp',
    description: 'Decisões de alto impacto financeiro, estrutural ou patrimonial',
    example: 'Construir piscina, nova suíte, energia solar, grandes reformas'
  }
};

// Metadados Visuais e Rótulos para Tipos de Decisão
export const DECISION_TYPE_META: Record<DecisionType, {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  iconName: string;
  description: string;
}> = {
  COMPRA: {
    label: 'Compra',
    color: '#06B6D4',
    bgClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/30',
    iconName: 'ShoppingCart',
    description: 'Aquisição de bens, equipamentos ou insumos'
  },
  MANUTENCAO: {
    label: 'Manutenção',
    color: '#F59E0B',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    iconName: 'Wrench',
    description: 'Reparos preventivos ou corretivos em cômodos e infraestrutura'
  },
  REFORMA: {
    label: 'Reforma',
    color: '#8B5CF6',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30',
    iconName: 'Hammer',
    description: 'Obras de melhoria, expansão ou renovação física'
  },
  INVESTIMENTO: {
    label: 'Investimento',
    color: '#10B981',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    iconName: 'TrendingUp',
    description: 'Aporte de alto valor visando valorização patrimonial ou novas receitas'
  },
  OPERACIONAL: {
    label: 'Operacional',
    color: '#3B82F6',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
    iconName: 'Workflow',
    description: 'Mudanças em processos de atendimento, limpeza, check-in ou equipe'
  },
  OUTRO: {
    label: 'Outro',
    color: '#94A3B8',
    bgClass: 'bg-slate-500/10',
    textClass: 'text-slate-400',
    borderClass: 'border-slate-500/30',
    iconName: 'HelpCircle',
    description: 'Outras deliberações estratégicas'
  }
};

// Metadados Visuais e Rótulos para Status da Decisão
export const DECISION_STATUS_META: Record<DecisionStatus, {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeBg: string;
  iconName: string;
  description: string;
}> = {
  EM_ANALISE: {
    label: 'Em Análise',
    color: '#F59E0B',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    iconName: 'Clock',
    description: 'Avaliando viabilidade e impactos financeiros/operacionais'
  },
  APROVADA: {
    label: 'Aprovada',
    color: '#10B981',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    iconName: 'CheckCircle2',
    description: 'Decisão autorizada para execução ou agendamento'
  },
  ADIADA: {
    label: 'Adiada',
    color: '#6366F1',
    bgClass: 'bg-indigo-500/10',
    textClass: 'text-indigo-400',
    borderClass: 'border-indigo-500/30',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    iconName: 'CalendarClock',
    description: 'Postergada para reavaliação em momento financeiro/operacional mais propício'
  },
  REJEITADA: {
    label: 'Rejeitada',
    color: '#EF4444',
    bgClass: 'bg-rose-500/10',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/30',
    badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    iconName: 'XCircle',
    description: 'Decisão desconsiderada ou inviável'
  }
};

// Metadados para Prioridade
export const DECISION_PRIORITY_META: Record<DecisionPriority, {
  label: string;
  color: string;
  badgeClass: string;
}> = {
  BAIXA: {
    label: 'Baixa',
    color: '#64748B',
    badgeClass: 'bg-slate-800 text-slate-300 border border-slate-700'
  },
  MEDIA: {
    label: 'Média',
    color: '#3B82F6',
    badgeClass: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
  },
  ALTA: {
    label: 'Alta',
    color: '#F59E0B',
    badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
  },
  ESTRATEGICA: {
    label: 'Estratégica',
    color: '#EC4899',
    badgeClass: 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
  }
};
