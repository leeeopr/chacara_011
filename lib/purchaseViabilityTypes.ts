import { HousePurchase } from './purchasesTypes';

export type PurchaseViabilityVerdict = 
  | 'VIAVEL' 
  | 'NAO_VIAVEL' 
  | 'AGUARDANDO_DEPENDENCIA' 
  | 'DADOS_INSUFICIENTES';

export interface PurchaseViabilityAnalysis {
  purchaseId: string;
  verdict: PurchaseViabilityVerdict;
  verdictLabel: string;
  verdictDescription: string;
  cost: number;
  hasUndefinedPrice: boolean;
  isBlockedByDependency: boolean;
  dependencyName?: string;
  
  // 1. Total Comprovado (dinheiro efetivamente recebido)
  totalComprovado: number;

  // 2. Reserva de Emergência (dinheiro protegido que não está disponível)
  reservaEmergencia: number;

  // 3. Mínimo Circulável de Manutenção (fatia percentual do Total Comprovado para manutenções)
  percentualManutencao: number; // Ex: 15 para 15%
  minimoCirculavelManutencao: number; // Total Comprovado * (percentual / 100)

  // 4. Saldo Real Atual Disponível
  // Saldo Real Atual = Total Comprovado - Reserva de Emergência - Mínimo Circulável de Manutenção
  saldoRealAtual: number;

  // 5. Simulação da Compra
  // Saldo após compra = Saldo Real Atual - Custo da Compra
  saldoAposCompra: number;
  isViable: boolean; // saldoAposCompra >= 0

  // Frase explicativa oficial
  fraseExplicativa: string;
  
  // Detalhes & Recomendações
  justification: string;
  recommendation: string;
}

export interface PurchaseViabilityGlobalSummary {
  updatedAt: string;
  chacaraFilterId?: string;
  chacaraFilterName?: string;

  // Os 4 Pilares Financeiros Centrais
  totalComprovado: number;
  reservaEmergencia: number;
  percentualManutencao: number;
  minimoCirculavelManutencao: number;
  saldoRealAtual: number; // Total Comprovado - Reserva de Emergência - Mínimo Circulável

  // Estatísticas de Compras sob a Ótica de Viabilidade
  totalComprasPendentes: number;
  totalCustoPendente: number;
  
  viaveisCount: number;
  viaveisTotalCost: number;
  
  naoViaveisCount: number;
  naoViaveisTotalCost: number;
  
  aguardandoDependenciaCount: number;
  dadosInsuficientesCount: number;

  // Mapa de análises por purchaseId
  analysesByPurchaseId: Record<string, PurchaseViabilityAnalysis>;
}

