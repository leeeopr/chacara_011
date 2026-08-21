export type AccountPayableStatus = 'PENDENTE' | 'PAGA' | 'VENCIDA' | 'CANCELADA';

export type AccountPayableType = 'AVULSA' | 'RECORRENTE';

export type RecurrenceFrequency = 'MENSAL' | 'QUINZENAL' | 'SEMANAL' | 'ANUAL';

export type DueDateRuleType = 'SAME_DAY' | 'DAYS_AFTER' | 'FIXED_DAY_MONTH';

export type AccountPayableCategory = 
  | 'ENERGIA'
  | 'AGUA'
  | 'INTERNET'
  | 'MANUTENCAO'
  | 'PISCINA'
  | 'JARDINAGEM'
  | 'EQUIPE_LIMPEZA'
  | 'EQUIPE_CASEIRO'
  | 'EQUIPE_DIARIA'
  | 'GAS'
  | 'IMPOSTO'
  | 'SEGURO'
  | 'TAXAS'
  | 'FORNECEDOR'
  | 'PRODUTOS_LIMPEZA'
  | 'OUTROS';

export interface ProviderBillingRule {
  id: string;
  prestador_id: string;
  prestador_nome?: string;
  prestador_pix?: string;
  prestador_role?: string;
  chacara_id?: string | null; // null = Todas / Geral
  chacara_nome?: string | null;
  descricao_padrao: string; // Ex: "Serviço de Limpeza Pós-Check-out", "Diária de Caseiro"
  categoria: AccountPayableCategory | string;
  valor_padrao: number; // Ex: 300.00
  regra_vencimento: DueDateRuleType; // 'SAME_DAY' | 'DAYS_AFTER' | 'FIXED_DAY_MONTH'
  dias_apos_servico?: number; // Ex: 3 (vence 3 dias após o serviço)
  dia_fixo_mes?: number; // Ex: 5 (vence dia 5 do mês seguinte)
  event_type_code?: string | null; // Opcional: vincula a um tipo de serviço específico (ex: 'limpeza', 'piscina', 'jardinagem')
  ativo: boolean;
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AccountPayable {
  id: string;
  chacara_id?: string | null;
  chacara_nome?: string | null;
  descricao: string;
  categoria: AccountPayableCategory | string;
  tipo: AccountPayableType;
  recorrencia_frequencia?: RecurrenceFrequency | string | null;
  recorrencia_dia_vencimento?: number | null;
  recorrencia_pai_id?: string | null;
  data_vencimento: string; // YYYY-MM-DD
  valor_previsto: number;
  valor_real?: number | null; // Valor efetivo pago ou ajustado (tem prioridade sobre valor_previsto)
  valor_pago?: number | null; // Histórico de liquidação
  data_pagamento?: string | null; // YYYY-MM-DD
  status: AccountPayableStatus;
  prestador_id?: string | null;
  prestador_nome?: string | null;
  prestador_pix?: string | null;
  prestador_role?: string | null;

  // Vínculo com a Prestação de Serviço (Origem e Rastreabilidade)
  origem_tipo?: 'PRESTACAO_SERVICO' | 'RESERVA' | 'MANUTENCAO' | 'COMPRA' | 'MANUAL' | string;
  origem_id?: string | null; // ID do OperationalEvent ou Registro de Serviço
  origem_titulo?: string | null; // Título/código do serviço de origem
  origem_data_servico?: string | null; // Data real em que o serviço ocorreu/foi agendado (YYYY-MM-DD)
  servico_prestacao_id?: string | null; // Alias legado
  provider_billing_rule_id?: string | null;

  comprovante_url?: string | null;
  observacao?: string | null;
  responsavel_pagamento?: string | null;
  cancelado_em?: string | null;
  motivo_cancelamento?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAccountPayableInput {
  chacara_id?: string | null;
  chacara_nome?: string | null;
  descricao: string;
  categoria: AccountPayableCategory | string;
  tipo: AccountPayableType;
  recorrencia_frequencia?: RecurrenceFrequency | string | null;
  recorrencia_dia_vencimento?: number | null;
  data_vencimento: string;
  valor_previsto: number;
  valor_real?: number | null;
  prestador_id?: string | null;
  prestador_nome?: string | null;
  prestador_pix?: string | null;
  prestador_role?: string | null;
  origem_tipo?: string;
  origem_id?: string | null;
  origem_titulo?: string | null;
  origem_data_servico?: string | null;
  provider_billing_rule_id?: string | null;
  observacao?: string | null;
  registrado_por?: string;
}

export interface UpdateAccountPayableInput extends Partial<CreateAccountPayableInput> {
  valor_previsto?: number;
  valor_real?: number | null;
  valor_pago?: number | null;
  data_pagamento?: string | null;
  status?: AccountPayableStatus;
  responsavel_pagamento?: string | null;
}

export interface MarkAsPaidInput {
  valor_pago: number;
  data_pagamento: string;
  responsavel_pagamento?: string;
  observacao?: string;
  registrado_por?: string;
}

/**
 * Retorna o valor considerado de uma conta a pagar para TODOS os cálculos do sistema.
 * REGRA CENTRAL (VALOR PREVISTO x VALOR REAL):
 * - Se valor_real estiver preenchido (número não nulo): valor considerado = valor_real
 * - Caso contrário: valor considerado = valor_previsto
 * 
 * O valor real sempre tem prioridade sobre o valor previsto.
 * O valor previsto não é apagado.
 * O sistema NUNCA soma os dois valores.
 */
export function getAccountEffectiveValue(account?: {
  valor_real?: number | null;
  valor_previsto?: number | null;
  valor_pago?: number | null;
} | null): number {
  if (!account) return 0;

  // 1. Prioridade máxima: valor_real explícito
  if (account.valor_real !== null && account.valor_real !== undefined && !isNaN(Number(account.valor_real))) {
    return Number(account.valor_real);
  }

  // 2. Compatibilidade legada com valor_pago registrado anteriormente
  if (account.valor_pago !== null && account.valor_pago !== undefined && !isNaN(Number(account.valor_pago))) {
    return Number(account.valor_pago);
  }

  // 3. Fallback: valor_previsto original
  return Number(account.valor_previsto || 0);
}

/**
 * Verifica se a conta possui valor real explicitamente preenchido.
 */
export function hasAccountRealValue(account?: {
  valor_real?: number | null;
  valor_pago?: number | null;
} | null): boolean {
  if (!account) return false;
  if (account.valor_real !== null && account.valor_real !== undefined && !isNaN(Number(account.valor_real))) {
    return true;
  }
  if (account.valor_pago !== null && account.valor_pago !== undefined && !isNaN(Number(account.valor_pago))) {
    return true;
  }
  return false;
}

/**
 * Retorna o tipo de valor que está sendo considerado ('REAL' | 'PREVISTO').
 */
export function getAccountEffectiveValueType(account?: {
  valor_real?: number | null;
  valor_pago?: number | null;
} | null): 'REAL' | 'PREVISTO' {
  return hasAccountRealValue(account) ? 'REAL' : 'PREVISTO';
}

/**
 * Formata um valor numérico em moeda Real Brasileiro (BRL).
 */
export function formatBRL(value?: number | null): string {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  });
}

export interface AccountsPayableSummary {
  totalPrevisto: number;
  totalPago: number;
  totalVencido: number;
  totalHoje: number;
  totalProximo: number;
  vencidas: AccountPayable[];
  vencemHoje: AccountPayable[];
  proximas: AccountPayable[];
  pagas: AccountPayable[];
  recorrentes: AccountPayable[];
}

export interface AccountsPayableFilters {
  status?: AccountPayableStatus | 'ALL';
  chacara_id?: string | 'ALL' | 'GENERAL';
  categoria?: string | 'ALL';
  prestador_id?: string | 'ALL';
  tipo?: AccountPayableType | 'ALL';
  origem_tipo?: string | 'ALL';
  startDate?: string;
  endDate?: string;
  search?: string;
}

export type PeriodPreset = 'THIS_MONTH' | 'LAST_MONTH' | 'NEXT_MONTH' | 'CUSTOM';

export interface OperationalRevenueItem {
  id: string;
  reservation_id: string;
  guest_name: string;
  descricao: string;
  valor_total: number;
  valor_recebido: number;
  valor_pendente: number;
  data_referencia: string; // checkin_date or payment_date
  data_checkout?: string;
  chacara_id?: string | null;
  chacara_nome?: string | null;
  origem: string;
  status: string;
  payments_count: number;
}

export const ACCOUNT_PAYABLE_CATEGORIES: { value: AccountPayableCategory; label: string }[] = [
  { value: 'ENERGIA', label: '⚡ Energia Elétrica / Concessionária' },
  { value: 'AGUA', label: '💧 Água e Saneamento' },
  { value: 'INTERNET', label: '🌐 Internet / Wi-Fi' },
  { value: 'MANUTENCAO', label: '🔧 Manutenção Geral & Reparos' },
  { value: 'PISCINA', label: '🏊 Tratamento e Produtos de Piscina' },
  { value: 'JARDINAGEM', label: '🌿 Jardinagem e Poda' },
  { value: 'EQUIPE_LIMPEZA', label: '🧹 Limpeza & Faxina (Equipe)' },
  { value: 'EQUIPE_CASEIRO', label: '🏡 Caseiro / Cuidados da Chácara' },
  { value: 'EQUIPE_DIARIA', label: '👷 Diárias e Serviços Avulsos' },
  { value: 'GAS', label: '🔥 Gás de Cozinha' },
  { value: 'PRODUTOS_LIMPEZA', label: '🧼 Produtos de Limpeza e Higiene' },
  { value: 'IMPOSTO', label: '🏛️ IPTU / ITR / Impostos' },
  { value: 'SEGURO', label: '🛡️ Seguro Patrimonial' },
  { value: 'TAXAS', label: '📑 Taxas Bancárias / Tarifas' },
  { value: 'FORNECEDOR', label: '📦 Fornecedores Diversos' },
  { value: 'OUTROS', label: '📌 Outras Despesas' }
];

