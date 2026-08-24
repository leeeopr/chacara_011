import { Chacara } from './chacaraTypes';

export type PlanningProcessType = 
  | 'MANUTENCAO' 
  | 'COMPRA' 
  | 'MELHORIA_INVESTIMENTO' 
  | 'OUTRO';

export type PlanningProcessStatus = 
  | 'RASCUNHO' 
  | 'EM_ANALISE' 
  | 'VIAVEL' 
  | 'VIAVEL_COM_ATENCAO' 
  | 'NAO_VIAVEL' 
  | 'ARQUIVADO';

export type PaymentScheduleType = 
  | 'A_VISTA' 
  | 'PARCELADO' 
  | 'PAGAMENTO_FUTURO_UNICO';

export type ProcessPriority = 
  | 'BAIXA' 
  | 'MEDIA' 
  | 'ALTA' 
  | 'URGENTE';

export type ProcessViabilityVerdict = 
  | 'VIAVEL' 
  | 'VIAVEL_COM_ATENCAO' 
  | 'NAO_VIAVEL' 
  | 'DADOS_INSUFICIENTES';

export interface ProcessDisbursement {
  id: string;
  process_id?: string;
  installment_number: number; // 1, 2, 3...
  due_date: string; // YYYY-MM-DD
  amount: number;
  notes?: string;
}

export interface ProcessViabilityTimelinePoint {
  date: string;
  dayOffset: number;
  label: string;
  saldoBase: number;
  saldoSimulado: number;
  desembolsoProcesso: number;
  entradasDoDia: number;
  saidasDoDia: number;
  isLowestPointBase?: boolean;
  isLowestPointSimulated?: boolean;
}

export interface ProcessViabilityResult {
  analyzedAt: string;
  horizonDays: number;
  verdict: ProcessViabilityVerdict;
  verdictTitle: string;
  justificationText: string;
  bulletPoints: string[];
  recommendations: string[];
  warnings: string[];
  
  // Parâmetros e Indicadores Reais
  safetyBuffer: number;
  caixaBrutoHoje: number;
  caixaOperacionalLivreHoje: number;
  reservaEmergenciaAtual: number;
  reservaEmergenciaProjetada: number;
  reservaTotalPotencial: number;
  caucoesAtuais: number;
  
  // Totais do Período Analisado
  totalCustoProcesso: number;
  totalReceitasFuturasNoPeriodo: number;
  totalCompromissosFuturosNoPeriodo: number;
  
  // Comparativo de Ponto Crítico (Lowest Cash Point)
  lowestCashPointBase: {
    amount: number;
    date: string;
    dayOffset: number;
  };
  lowestCashPointSimulated: {
    amount: number;
    date: string;
    dayOffset: number;
  };
  impactOnLowestCashPoint: number;
  
  // Saldo Final ao término do Horizonte
  finalBalanceBase: number;
  finalBalanceSimulated: number;
  
  // Linha do tempo comparativa dia a dia
  timelineComparison: ProcessViabilityTimelinePoint[];
}

export interface PlanningProcess {
  id: string;
  title: string;
  description?: string;
  chacara_id?: string | null;
  process_type: PlanningProcessType;
  estimated_cost: number;
  payment_method: PaymentScheduleType;
  disbursements: ProcessDisbursement[];
  start_date?: string | null; // YYYY-MM-DD
  target_date?: string | null; // YYYY-MM-DD
  priority: ProcessPriority;
  status: PlanningProcessStatus;
  notes?: string | null;
  responsible_name?: string | null;
  safety_buffer_amount?: number; // Colchão de segurança operacional (ex: 5000)
  latest_viability_analysis?: ProcessViabilityResult | null;
  metadata?: Record<string, any>;
  created_by?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  
  // Relacionamento populado
  chacara?: Chacara | null;
}

export interface CreatePlanningProcessInput {
  title: string;
  description?: string;
  chacara_id?: string | null;
  process_type: PlanningProcessType;
  estimated_cost: number;
  payment_method: PaymentScheduleType;
  disbursements: Array<{
    installment_number: number;
    due_date: string;
    amount: number;
    notes?: string;
  }>;
  start_date?: string | null;
  target_date?: string | null;
  priority?: ProcessPriority;
  status?: PlanningProcessStatus;
  notes?: string;
  responsible_name?: string;
  safety_buffer_amount?: number;
  metadata?: Record<string, any>;
}

export interface UpdatePlanningProcessInput {
  title?: string;
  description?: string;
  chacara_id?: string | null;
  process_type?: PlanningProcessType;
  estimated_cost?: number;
  payment_method?: PaymentScheduleType;
  disbursements?: Array<{
    id?: string;
    installment_number: number;
    due_date: string;
    amount: number;
    notes?: string;
  }>;
  start_date?: string | null;
  target_date?: string | null;
  priority?: ProcessPriority;
  status?: PlanningProcessStatus;
  notes?: string;
  responsible_name?: string;
  safety_buffer_amount?: number;
  latest_viability_analysis?: ProcessViabilityResult | null;
  metadata?: Record<string, any>;
}

// Metadados Visuais para Tipos de Processo
export const PROCESS_TYPE_META: Record<PlanningProcessType, {
  label: string;
  color: string;
  badgeBg: string;
  textClass: string;
  borderClass: string;
  description: string;
  reservaGuidance: string;
}> = {
  MANUTENCAO: {
    label: 'Manutenção / Infraestrutura',
    color: '#06B6D4',
    badgeBg: 'bg-cyan-500/10',
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/30',
    description: 'Reparos essenciais, máquinas, bombas, telhado, elétrica ou hidráulica.',
    reservaGuidance: 'Pode ser subsidiado ou coparticipado pela Reserva de Emergência caso atenda a critérios patrimoniais emergenciais.'
  },
  COMPRA: {
    label: 'Compra / Suprimentos',
    color: '#3B82F6',
    badgeBg: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
    description: 'Aquisição de insumos, mobílias, roupas de cama ou reposição de inventário.',
    reservaGuidance: 'Deve sair estritamente do fluxo de caixa operacional corrente.'
  },
  MELHORIA_INVESTIMENTO: {
    label: 'Melhoria / Investimento',
    color: '#10B981',
    badgeBg: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    description: 'Projetos de valorização patrimonial: aquecedor solar, área gourmet, nova suíte.',
    reservaGuidance: 'Investimentos não devem consumir a Reserva de Emergência; devem ser custeados pelo lucro livre ou aportes.'
  },
  OUTRO: {
    label: 'Outro Processo',
    color: '#8B5CF6',
    badgeBg: 'bg-purple-500/10',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30',
    description: 'Processos diversos não classificados nas categorias anteriores.',
    reservaGuidance: 'Avaliado caso a caso conforme o fluxo de caixa operacional.'
  }
};

// Metadados Visuais para Status do Processo
export const PROCESS_STATUS_META: Record<PlanningProcessStatus, {
  label: string;
  color: string;
  badgeBg: string;
  textClass: string;
  borderClass: string;
}> = {
  RASCUNHO: {
    label: 'Rascunho',
    color: '#94A3B8',
    badgeBg: 'bg-slate-500/10',
    textClass: 'text-slate-400',
    borderClass: 'border-slate-500/30'
  },
  EM_ANALISE: {
    label: 'Em Análise',
    color: '#F59E0B',
    badgeBg: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30'
  },
  VIAVEL: {
    label: 'Viável',
    color: '#10B981',
    badgeBg: 'bg-emerald-500/15',
    textClass: 'text-emerald-300',
    borderClass: 'border-emerald-500/40'
  },
  VIAVEL_COM_ATENCAO: {
    label: 'Viável com Atenção',
    color: '#EAB308',
    badgeBg: 'bg-yellow-500/15',
    textClass: 'text-yellow-300',
    borderClass: 'border-yellow-500/40'
  },
  NAO_VIAVEL: {
    label: 'Não Viável',
    color: '#EF4444',
    badgeBg: 'bg-rose-500/15',
    textClass: 'text-rose-300',
    borderClass: 'border-rose-500/40'
  },
  ARQUIVADO: {
    label: 'Arquivado',
    color: '#64748B',
    badgeBg: 'bg-slate-600/10',
    textClass: 'text-slate-500',
    borderClass: 'border-slate-600/30'
  }
};
