import { Chacara } from './chacaraTypes';

export type ProjectionHorizon = 'HOJE' | '30_DIAS' | '31_60_DIAS' | '61_90_DIAS';

export type ProjectionItemType = 
  | 'CAIXA_ATUAL'
  | 'RESERVA_EMERGENCIA'
  | 'CAUCAO_CLIENTE'
  | 'RECEITA_RESERVA_PREVISTA'
  | 'DESPESA_CONTA_PAGAR'
  | 'DESPESA_CONTA_RECORRENTE'
  | 'DESPESA_COMPRA_PENDENTE'
  | 'DESPESA_MANUTENCAO_PREVISTA'
  | 'DESPESA_EQUIPE_PREVISTA'
  | 'DESPESA_DECISAO_APROVADA'
  | 'DESPESA_OPERACIONAL_OUTRA';

export interface FinancialProjectionItem {
  id: string;
  type: ProjectionItemType;
  category: 'ENTRADA' | 'SAIDA' | 'RESERVA_PROTEGIDA' | 'PASSIVO_CAUCAO' | 'SALDO_INICIAL';
  title: string;
  description?: string;
  sourceModule: 'FINANCEIRO' | 'RESERVAS' | 'CONTAS_PAGAR' | 'COMPRAS' | 'MANUTENCOES' | 'EQUIPE' | 'PLANEJAMENTO' | 'EMERGENCIA';
  sourceId?: string;
  sourceCode?: string;
  chacaraId?: string | null;
  chacaraName?: string;
  dueDate: string; // YYYY-MM-DD
  amount: number;
  hasUndefinedPrice?: boolean;
  status: 'REALIZADO' | 'PREVISTO' | 'PENDENTE' | 'VENCIDA' | 'APROVADO' | 'PAGA' | 'CANCELADA' | string;
  isDeduplicated?: boolean;
  deduplicationNotes?: string;
}

export interface HorizonBreakdown {
  horizon: ProjectionHorizon;
  horizonLabel: string; // "Hoje (Saldo Atual)", "Próximos 30 dias (1–30d)", "31–60 dias", "61–90 dias"
  startDay: number; // 0, 1, 31, 61
  endDay: number; // 0, 30, 60, 90
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD

  // Saldo Inicial da Fatia
  saldoInicial: number;

  // Movimentações no Período
  entradasPrevistas: number; // Receitas Brutas Previstas
  alocacaoReservaPeriodo: number; // 20% das receitas brutas retidas para Reserva
  entradasOperacionaisLiquidas: number; // 80% das receitas para fluxo operacional

  saidasPrevistas: number; // Total de Despesas Previstas da Fatia
  saidasContasPagar: number;
  saidasCompras: number;
  saidasManutencoes: number;
  saidasEquipe: number;
  saidasDecisoes: number;
  itensSemValorDefinidoCount: number;

  // Resultados
  fluxoLiquidoPeriodo: number; // Entradas Operacionais Líquidas - Saídas Previstas
  saldoFinalProjetado: number; // Saldo Inicial + Fluxo Líquido do Período
  reservaAcumulada: number; // Reserva de Emergência Acumulada até o fim deste período
  saldoTotalComReserva: number; // Saldo Operacional Projetado + Reserva Acumulada

  // Indicadores de Saúde Financeira
  indiceCobertura: number; // (Saldo Inicial + Entradas Operacionais) / Saídas
  statusSaude: 'CONFORTAVEL' | 'ATENCAO' | 'CRITICO';
  alertas: string[];

  // Lançamentos específicos deste período
  items: FinancialProjectionItem[];
}

export interface FinancialProjectionSummary {
  updatedAt: string;
  chacaraFilter?: string;
  chacaraFilterName?: string;

  // Caixa Base & Segregações Hoje
  caixaBrutoEmConta: number;
  reservaEmergenciaAtual: number;
  reservaEmergenciaProjetada?: number;
  reservaTotalPotencial?: number;
  caucoesAtuais: number;
  caixaOperacionalLivreHoje: number;

  // 4 Fatias Progressivas
  hoje: HorizonBreakdown;
  proxima30d: HorizonBreakdown;
  proxima31a60d: HorizonBreakdown;
  proxima61a90d: HorizonBreakdown;
  periodos: HorizonBreakdown[];

  // Totais Acumulados 90 Dias
  totais90d: {
    totalEntradasBrutas: number;
    totalProvisaoReserva: number;
    totalEntradasLiquidas: number;
    totalSaidas: number;
    saldoFinal90d: number;
    reservaFinal90d: number;
    itensSemValorDefinido: number;
  };

  // Itens Totais Auditáveis
  allItems: FinancialProjectionItem[];
}

