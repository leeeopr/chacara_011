import { HousePurchase } from '@/lib/purchasesTypes';
import { 
  PurchaseViabilityVerdict, 
  PurchaseViabilityAnalysis, 
  PurchaseViabilityGlobalSummary 
} from '@/lib/purchaseViabilityTypes';
import { getGlobalFinancialData } from './financialService';
import { getChacaras } from './chacarasService';
import { 
  getFinancialSettings, 
  saveFinancialSettings, 
  broadcastFinancialSettingsUpdated 
} from './financialSettingsService';
import { validateFinancialPercent } from '@/lib/financialSettingsTypes';

/**
 * Retorna o percentual configurado para Mínimo Circulável de Manutenção (fallback/síncrono).
 */
export function getMaintenancePercentConfig(): number {
  if (typeof window === 'undefined') return 15;
  try {
    const raw = localStorage.getItem('chacaras_financial_settings_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const global = parsed.find((s: any) => s.chacara_id === null) || parsed[0];
        if (global?.maintenance_percent !== undefined) {
          return validateFinancialPercent(global.maintenance_percent);
        }
      }
    }
    const legacy = localStorage.getItem('chacaras_viability_maintenance_percent');
    if (legacy !== null) {
      const parsed = parseFloat(legacy);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao ler percentual de manutenção:', e);
  }
  return 15;
}

/**
 * Salva o percentual configurado para Mínimo Circulável de Manutenção.
 */
export function setMaintenancePercentConfig(percent: number): void {
  const clamped = validateFinancialPercent(percent);
  saveFinancialSettings({
    chacara_id: null,
    emergency_reserve_percent: getEmergencyReservePercentConfig(),
    maintenance_percent: clamped
  }).catch(e => console.warn('Erro ao salvar settings:', e));
}

/**
 * Retorna o percentual configurado para Reserva de Emergência (fallback/síncrono).
 */
export function getEmergencyReservePercentConfig(): number {
  if (typeof window === 'undefined') return 20;
  try {
    const raw = localStorage.getItem('chacaras_financial_settings_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const global = parsed.find((s: any) => s.chacara_id === null) || parsed[0];
        if (global?.emergency_reserve_percent !== undefined) {
          return validateFinancialPercent(global.emergency_reserve_percent);
        }
      }
    }
    const legacy = localStorage.getItem('chacaras_viability_emergency_reserve_percent');
    if (legacy !== null) {
      const parsed = parseFloat(legacy);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao ler percentual de reserva de emergência:', e);
  }
  return 20;
}

/**
 * Salva o percentual configurado para Reserva de Emergência.
 */
export function setEmergencyReservePercentConfig(percent: number): void {
  const clamped = validateFinancialPercent(percent);
  saveFinancialSettings({
    chacara_id: null,
    emergency_reserve_percent: clamped,
    maintenance_percent: getMaintenancePercentConfig()
  }).catch(e => console.warn('Erro ao salvar settings:', e));
}

/**
 * Motor Oficial de Viabilização Financeira para Compras
 * 
 * FÓRMULA OFICIAL DEFINITIVA:
 * 1. Total Comprovado = Dinheiro efetivamente recebido/comprovado no sistema
 * 2. Reserva de Emergência = Quantia calculada/destinada para Reserva de Emergência (% configurável)
 * 3. Mínimo Circulável = Total Comprovado * (Percentual de Manutenção / 100)
 * 4. Saldo Real Atual = Total Comprovado - Reserva de Emergência - Mínimo Circulável de Manutenção
 * 5. Saldo após compra = Saldo Real Atual - Custo da Compra
 * 
 * REGRA CENTRAL DE VIABILIDADE:
 * “Você consegue comprar este produto utilizando o seu Saldo Real Atual?”
 * - Se Saldo após compra >= 0 -> 🟢 VIÁVEL (“Esta compra pode ser realizada utilizando o saldo atualmente disponível.”)
 * - Se Saldo após compra < 0 -> 🔴 NÃO VIÁVEL (“O valor da compra é superior ao saldo real atualmente disponível.”)
 */
export async function calculatePurchasesViability(
  purchases: HousePurchase[],
  options?: {
    chacaraId?: string;
    percentualManutencao?: number;
    percentualReserva?: number;
  }
): Promise<PurchaseViabilityGlobalSummary> {
  const selectedChacaraId = options?.chacaraId && options.chacaraId !== 'ALL' ? options.chacaraId : undefined;

  // 1. Carregar dados reais comprovados e configurações financeiras em paralelo
  const [globalFinData, chacarasList, finSettings] = await Promise.all([
    getGlobalFinancialData({ chacaraId: selectedChacaraId }),
    getChacaras(),
    getFinancialSettings(selectedChacaraId)
  ]);

  const percentualManutencao = options?.percentualManutencao !== undefined 
    ? validateFinancialPercent(options.percentualManutencao) 
    : finSettings.maintenance_percent;
  const percentualReserva = options?.percentualReserva !== undefined
    ? validateFinancialPercent(options.percentualReserva)
    : finSettings.emergency_reserve_percent;

  const chacaraMap = new Map<string, string>(chacarasList.map(c => [c.id, c.name]));
  const chacaraFilterName = selectedChacaraId ? (chacaraMap.get(selectedChacaraId) || 'Chácara Selecionada') : 'Todas as Chácaras';

  // 2. TOTAL COMPROVADO (dinheiro efetivamente recebido no banco, sem receitas futuras)
  const totalComprovado = Number(globalFinData.receitaRecebida || 0);

  // 3. RESERVA DE EMERGÊNCIA (dinheiro protegido não disponível para compras)
  const reservaEmergencia = Math.max(0, totalComprovado * (percentualReserva / 100));

  // 4. MÍNIMO CIRCULÁVEL DE MANUTENÇÃO (segundo valor protegido para necessidades operacionais)
  const minimoCirculavelManutencao = Math.max(0, totalComprovado * (percentualManutencao / 100));

  // 5. SALDO REAL ATUAL DISPONÍVEL
  // Saldo Real Atual = Total Comprovado - Reserva de Emergência - Mínimo Circulável de Manutenção
  const saldoRealAtual = Math.max(0, totalComprovado - reservaEmergencia - minimoCirculavelManutencao);

  // 6. Avaliação individual de cada compra
  const analysesByPurchaseId: Record<string, PurchaseViabilityAnalysis> = {};

  let viaveisCount = 0;
  let viaveisTotalCost = 0;
  let naoViaveisCount = 0;
  let naoViaveisTotalCost = 0;
  let aguardandoDependenciaCount = 0;
  let dadosInsuficientesCount = 0;
  let totalComprasPendentes = 0;
  let totalCustoPendente = 0;

  for (const purchase of purchases) {
    const isCompleted = purchase.status === 'COMPRADO';
    const isCancelled = purchase.status === 'CANCELADO';
    
    // Regra de Preço: Preço Real quando preenchido (> 0), senão Preço Previsto * Quantidade
    const rawCost = purchase.paid_price && Number(purchase.paid_price) > 0 
      ? Number(purchase.paid_price) 
      : (Number(purchase.estimated_price || 0) * (purchase.quantity || 1));
    
    const cost = Math.max(0, Number(rawCost || 0));

    // Se já estiver comprado ou cancelado
    if (isCompleted || isCancelled) {
      analysesByPurchaseId[purchase.id] = {
        purchaseId: purchase.id,
        verdict: isCompleted ? 'VIAVEL' : 'NAO_VIAVEL',
        verdictLabel: isCompleted ? 'Já Realizado' : 'Cancelado',
        verdictDescription: isCompleted ? 'Item já adquirido e liquidado.' : 'Compra cancelada.',
        cost,
        hasUndefinedPrice: cost <= 0,
        isBlockedByDependency: false,
        totalComprovado,
        reservaEmergencia,
        percentualManutencao,
        minimoCirculavelManutencao,
        saldoRealAtual,
        saldoAposCompra: saldoRealAtual,
        isViable: true,
        fraseExplicativa: isCompleted 
          ? 'Compra finalizada e liquidada no fluxo de caixa.' 
          : 'Compra arquivada/cancelada.',
        justification: isCompleted ? 'Item já adquirido.' : 'Item cancelado.',
        recommendation: isCompleted ? 'Manter registro em arquivo.' : 'Sem ação necessária.'
      };
      continue;
    }

    // Compra ativa / pendente
    totalComprasPendentes++;
    totalCustoPendente += cost;

    const hasUndefinedPrice = cost <= 0;
    const isBlockedByDependency = purchase.status === 'AGUARDANDO_DEPENDENCIA' || 
      (!!purchase.depends_on_purchase_id && purchase.depends_on_purchase_name !== undefined);

    // Saldo após compra = Saldo Real Atual - Custo da Compra
    const saldoAposCompra = saldoRealAtual - cost;
    const isViable = saldoAposCompra >= 0;

    let verdict: PurchaseViabilityVerdict = 'VIAVEL';
    let verdictLabel = 'Viável';
    let verdictDescription = '';
    let fraseExplicativa = '';
    let justification = '';
    let recommendation = '';

    if (isBlockedByDependency) {
      verdict = 'AGUARDANDO_DEPENDENCIA';
      verdictLabel = 'Aguardando Dependência';
      verdictDescription = `Bloqueado até a conclusão de: "${purchase.depends_on_purchase_name || 'etapa anterior'}".`;
      fraseExplicativa = `Esta compra aguarda a liberação da dependência anterior ("${purchase.depends_on_purchase_name || 'etapa prévia'}").`;
      justification = `Mesmo com saldo disponível, esta compra possui um pré-requisito que deve ser concluído primeiro.`;
      recommendation = 'Concluir ou dar baixa na compra anterior para liberar este item.';
      aguardandoDependenciaCount++;
    } else if (hasUndefinedPrice) {
      verdict = 'DADOS_INSUFICIENTES';
      verdictLabel = 'Preço Não Informado';
      verdictDescription = 'Preço estimado ou real não foi preenchido.';
      fraseExplicativa = 'Informe o valor estimado ou preço real para calcular a viabilidade.';
      justification = 'Não é possível avaliar a viabilidade sem o valor da compra.';
      recommendation = 'Edite a compra e informe o valor unitário estimado.';
      dadosInsuficientesCount++;
    } else if (isViable) {
      // 🟢 VIÁVEL: Saldo Real Atual >= Custo da Compra (saldoAposCompra >= 0)
      verdict = 'VIAVEL';
      verdictLabel = 'Viável';
      verdictDescription = `Saldo após compra (R$ ${saldoAposCompra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) cabe dentro do Saldo Real Atual disponível.`;
      fraseExplicativa = 'Esta compra pode ser realizada utilizando o saldo atualmente disponível.';
      justification = `O Saldo Real Atual de R$ ${saldoRealAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (obtido após reservar R$ ${reservaEmergencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para emergências e R$ ${minimoCirculavelManutencao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para manutenções) cobre o custo de R$ ${cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, restando R$ ${saldoAposCompra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
      recommendation = 'Compra autorizada: cabe integralmente no saldo real disponível.';
      viaveisCount++;
      viaveisTotalCost += cost;
    } else {
      // 🔴 NÃO VIÁVEL: Saldo Real Atual < Custo da Compra (saldoAposCompra < 0)
      verdict = 'NAO_VIAVEL';
      verdictLabel = 'Não Viável';
      const deficit = Math.abs(saldoAposCompra);
      verdictDescription = `O custo de R$ ${cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} excede o Saldo Real Atual (R$ ${saldoRealAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`;
      fraseExplicativa = 'O valor da compra é superior ao saldo real atualmente disponível.';
      justification = `Ao realizar esta compra de R$ ${cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, faltariam R$ ${deficit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em relação ao Saldo Real Atual disponível de R$ ${saldoRealAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (preservando Reserva de Emergência e Mínimo Circulável).`;
      recommendation = 'Aguardar entrada de novas receitas comprovadas antes de realizar esta compra.';
      naoViaveisCount++;
      naoViaveisTotalCost += cost;
    }

    analysesByPurchaseId[purchase.id] = {
      purchaseId: purchase.id,
      verdict,
      verdictLabel,
      verdictDescription,
      cost,
      hasUndefinedPrice,
      isBlockedByDependency,
      dependencyName: purchase.depends_on_purchase_name || undefined,
      totalComprovado,
      reservaEmergencia,
      percentualManutencao,
      minimoCirculavelManutencao,
      saldoRealAtual,
      saldoAposCompra,
      isViable,
      fraseExplicativa,
      justification,
      recommendation
    };
  }

  return {
    updatedAt: new Date().toISOString(),
    chacaraFilterId: selectedChacaraId,
    chacaraFilterName,
    totalComprovado,
    reservaEmergencia,
    percentualManutencao,
    minimoCirculavelManutencao,
    saldoRealAtual,
    totalComprasPendentes,
    totalCustoPendente,
    viaveisCount,
    viaveisTotalCost,
    naoViaveisCount,
    naoViaveisTotalCost,
    aguardandoDependenciaCount,
    dadosInsuficientesCount,
    analysesByPurchaseId
  };
}

