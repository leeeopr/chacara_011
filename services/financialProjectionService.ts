import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/appMode';
import { demoRepository } from '@/lib/demoRepository';
import { 
  FinancialProjectionSummary, 
  HorizonBreakdown, 
  FinancialProjectionItem, 
  ProjectionHorizon 
} from '@/lib/financialProjectionTypes';
import { getAccountEffectiveValue } from '@/lib/accountsPayableTypes';
import { getGlobalFinancialData } from './financialService';
import { getEmergencyFundSummary } from './emergencyFundService';
import { getReservations } from './reservationsService';
import { getAccountsPayable } from './accountsPayableService';
import { getHousePurchases } from './purchasesService';
import { getMaintenanceRecords } from './roomsMaintenanceService';
import { getCrewReservationPayments, getCrewMembers } from './crewService';
import { getPlanningDecisions } from './planningService';
import { getChacaras } from './chacarasService';
import { Reservation, Chacara } from '@/lib/chacaraTypes';

/**
 * Retorna a diferença em dias inteiros entre uma data alvo e a data base (YYYY-MM-DD)
 */
function getDaysDifference(targetDateStr: string, baseDateStr: string): number {
  if (!targetDateStr) return 0;
  const target = new Date(`${targetDateStr.split('T')[0]}T12:00:00`).getTime();
  const base = new Date(`${baseDateStr.split('T')[0]}T12:00:00`).getTime();
  return Math.round((target - base) / (1000 * 60 * 60 * 24));
}

/**
 * Adiciona dias a uma data e retorna formato YYYY-MM-DD
 */
function addDaysToDate(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

/**
 * Motor Central de Projeção de Fluxo de Caixa Real
 * Conceito: "DINHEIRO EM CONTA ≠ DINHEIRO REALMENTE DISPONÍVEL"
 * Camada estritamente de leitura (sem mutações).
 */
export async function getFinancialProjection(filters?: {
  chacara_id?: string | 'ALL' | 'GENERAL';
}): Promise<FinancialProjectionSummary> {
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];
  const date30d = addDaysToDate(todayDate, 30);
  const date60d = addDaysToDate(todayDate, 60);
  const date90d = addDaysToDate(todayDate, 90);

  const selectedChacaraId = filters?.chacara_id && filters.chacara_id !== 'ALL' ? filters.chacara_id : undefined;

  // 1. CARREGAMENTO CENTRALIZADO EM PARALELO DE TODAS AS FONTES DE DADOS REAIS
  const [
    chacarasList,
    globalFinData,
    emergencySummary,
    allReservations,
    allAccountsPayable,
    allPurchases,
    allMaintenances,
    allCrewPayments,
    allCrewMembers,
    allDecisions
  ] = await Promise.all([
    getChacaras(),
    getGlobalFinancialData({ chacaraId: selectedChacaraId }),
    getEmergencyFundSummary({ chacara_id: selectedChacaraId }),
    getReservations({ chacara_id: selectedChacaraId !== 'GENERAL' ? selectedChacaraId : undefined }),
    getAccountsPayable({ chacara_id: selectedChacaraId }),
    getHousePurchases({ chacara_id: selectedChacaraId !== 'GENERAL' ? selectedChacaraId : undefined }),
    getMaintenanceRecords({ chacara_id: selectedChacaraId !== 'GENERAL' ? selectedChacaraId : undefined }),
    getCrewReservationPayments(),
    getCrewMembers({ activeOnly: true, chacaraId: selectedChacaraId !== 'GENERAL' ? selectedChacaraId : undefined }),
    getPlanningDecisions({ chacara_id: selectedChacaraId })
  ]);

  const chacaraMap = new Map<string, string>(chacarasList.map(c => [c.id, c.name]));
  const chacaraFilterName = selectedChacaraId === 'GENERAL' 
    ? 'Geral (Sem Chácara)' 
    : selectedChacaraId ? (chacaraMap.get(selectedChacaraId) || 'Chácara Selecionada') : 'Todas as Chácaras';

  // 2. AUDITORIA DO CAIXA ATUAL & SALDOS INICIAIS
  const caixaBrutoEmConta = Number(globalFinData.receitaRecebida || 0);
  const reservaEmergenciaAtual = Number(emergencySummary.current_balance || 0);
  const caucoesAtuais = Number(globalFinData.caucoesEmAberto || 0);

  // Caixa Operacional Realmente Disponível Hoje
  // (Descontando a Reserva Blindada e os Cauções de terceiros sob custódia)
  const caixaOperacionalLivreHoje = Math.max(0, caixaBrutoEmConta - reservaEmergenciaAtual - caucoesAtuais);

  const allItems: FinancialProjectionItem[] = [];

  // Item base: Caixa Bruto
  allItems.push({
    id: 'item-base-caixa-bruto',
    type: 'CAIXA_ATUAL',
    category: 'SALDO_INICIAL',
    title: 'Caixa Total Recebido em Conta',
    description: 'Somatório de todas as receitas liquidadas registradas no sistema.',
    sourceModule: 'FINANCEIRO',
    dueDate: todayStr,
    amount: caixaBrutoEmConta,
    status: 'REALIZADO'
  });

  // Item base: Reserva Protegida
  if (reservaEmergenciaAtual > 0) {
    allItems.push({
      id: 'item-base-reserva-emergencia',
      type: 'RESERVA_EMERGENCIA',
      category: 'RESERVA_PROTEGIDA',
      title: 'Fundo de Reserva de Emergência (Protegido)',
      description: 'Saldo blindado para manutenções críticas e imprevistos estruturais (20% alocado).',
      sourceModule: 'EMERGENCIA',
      dueDate: todayStr,
      amount: reservaEmergenciaAtual,
      status: 'REALIZADO'
    });
  }

  // Item base: Cauções de Hóspedes
  if (caucoesAtuais > 0) {
    allItems.push({
      id: 'item-base-caucoes-retidas',
      type: 'CAUCAO_CLIENTE',
      category: 'PASSIVO_CAUCAO',
      title: 'Cauções em Aberto de Hóspedes',
      description: 'Garantias locatícias sob custódia a serem devolvidas aos clientes pós-checkout.',
      sourceModule: 'FINANCEIRO',
      dueDate: todayStr,
      amount: caucoesAtuais,
      status: 'REALIZADO'
    });
  }

  // 3. AUDITORIA DAS RECEITAS FUTURAS (RESERVAS ATIVAS)
  const activeReservations = allReservations.filter(r => !r.is_deleted && r.status !== 'CANCELADA');

  for (const res of activeReservations) {
    const finSummary = res.financial_summary || {};
    const totalAmount = Number(finSummary.total_amount || 0);
    const paidAmount = Number(finSummary.paid_amount || 0);
    const netPending = Math.max(0, totalAmount - paidAmount);

    if (netPending > 0) {
      const dueDate = res.checkin_date || todayStr;
      const cName = chacaraMap.get(res.chacara_id) || res.chacara?.name || 'Chácara';

      allItems.push({
        id: `proj-rec-res-${res.id}`,
        type: 'RECEITA_RESERVA_PREVISTA',
        category: 'ENTRADA',
        title: `Saldo Pendente Reserva #${res.code || res.id.substring(0, 6)} (${cName})`,
        description: `Check-in: ${res.checkin_date || 'N/D'} | Hóspede: ${res.client?.full_name || 'Cliente'} | Contratado: R$ ${totalAmount.toFixed(2)} | Já Pago: R$ ${paidAmount.toFixed(2)}`,
        sourceModule: 'RESERVAS',
        sourceId: res.id,
        sourceCode: res.code || res.id.substring(0, 8),
        chacaraId: res.chacara_id,
        chacaraName: cName,
        dueDate,
        amount: netPending,
        status: 'PREVISTO'
      });
    }
  }

  // 4. AUDITORIA DE CONTAS A PAGAR (CONTAS AVULSAS E RECORRENTES PENDENTES)
  // Contas já pagas (status === 'PAGA') NÃO aparecem como saída futura
  const pendingAccountsPayable = allAccountsPayable.filter(ap => 
    ap.status === 'PENDENTE' || ap.status === 'VENCIDA'
  );

  const registeredPayableKeys = new Set<string>();

  for (const ap of pendingAccountsPayable) {
    const amount = getAccountEffectiveValue(ap);
    const dueDate = ap.data_vencimento || todayStr;
    const cName = ap.chacara_nome || (ap.chacara_id ? chacaraMap.get(ap.chacara_id) : 'Geral / Compartilhada') || 'Geral';
    registeredPayableKeys.add(ap.id);

    allItems.push({
      id: `proj-ap-${ap.id}`,
      type: 'DESPESA_CONTA_PAGAR',
      category: 'SAIDA',
      title: `${ap.categoria}: ${ap.descricao}`,
      description: `Tipo: ${ap.tipo} | Vencimento: ${dueDate} | Prestador: ${ap.prestador_nome || 'N/I'}${ap.observacao ? ` • Obs: ${ap.observacao}` : ''}`,
      sourceModule: 'CONTAS_PAGAR',
      sourceId: ap.id,
      sourceCode: ap.id.substring(0, 8),
      chacaraId: ap.chacara_id,
      chacaraName: cName,
      dueDate,
      amount,
      status: ap.status
    });
  }

  // Projeção de Ciclos Futuros para Contas Recorrentes nos Horizontes 31-60d e 61-90d
  const recurringAccounts = allAccountsPayable.filter(ap => ap.tipo === 'RECORRENTE');
  for (const rec of recurringAccounts) {
    const baseDueDate = rec.data_vencimento ? new Date(`${rec.data_vencimento}T12:00:00`) : todayDate;
    const amount = Number(rec.valor_previsto || 0);
    const cName = rec.chacara_nome || (rec.chacara_id ? chacaraMap.get(rec.chacara_id) : 'Geral / Compartilhada') || 'Geral';

    // Ciclo 2 (mês 2 -> 31-60 dias)
    const cycle2Date = new Date(baseDueDate);
    cycle2Date.setDate(cycle2Date.getDate() + 30);
    const cycle2Str = cycle2Date.toISOString().split('T')[0];
    const daysDiff2 = getDaysDifference(cycle2Str, todayStr);

    if (daysDiff2 >= 31 && daysDiff2 <= 60) {
      allItems.push({
        id: `proj-rec-cycle2-${rec.id}`,
        type: 'DESPESA_CONTA_RECORRENTE',
        category: 'SAIDA',
        title: `[Recorrente 31-60d] ${rec.categoria}: ${rec.descricao}`,
        description: `Projeção de ciclo mensal recorrente | Vencimento estimado: ${cycle2Str}`,
        sourceModule: 'CONTAS_PAGAR',
        sourceId: rec.id,
        sourceCode: rec.id.substring(0, 8),
        chacaraId: rec.chacara_id,
        chacaraName: cName,
        dueDate: cycle2Str,
        amount,
        status: 'PREVISTO'
      });
    }

    // Ciclo 3 (mês 3 -> 61-90 dias)
    const cycle3Date = new Date(baseDueDate);
    cycle3Date.setDate(cycle3Date.getDate() + 60);
    const cycle3Str = cycle3Date.toISOString().split('T')[0];
    const daysDiff3 = getDaysDifference(cycle3Str, todayStr);

    if (daysDiff3 >= 61 && daysDiff3 <= 90) {
      allItems.push({
        id: `proj-rec-cycle3-${rec.id}`,
        type: 'DESPESA_CONTA_RECORRENTE',
        category: 'SAIDA',
        title: `[Recorrente 61-90d] ${rec.categoria}: ${rec.descricao}`,
        description: `Projeção de ciclo mensal recorrente | Vencimento estimado: ${cycle3Str}`,
        sourceModule: 'CONTAS_PAGAR',
        sourceId: rec.id,
        sourceCode: rec.id.substring(0, 8),
        chacaraId: rec.chacara_id,
        chacaraName: cName,
        dueDate: cycle3Str,
        amount,
        status: 'PREVISTO'
      });
    }
  }

  // 5. AUDITORIA DAS COMPRAS PENDENTES (HOUSE PURCHASES)
  const pendingPurchases = allPurchases.filter(p => 
    p.status === 'A_COMPRAR' || 
    p.status === 'AGUARDANDO_DEPENDENCIA' || 
    p.status === 'EM_COTACAO'
  );

  const countedPurchaseIds = new Set<string>();

  for (const pur of pendingPurchases) {
    const rawPrice = Number(pur.estimated_price || 0);
    const qty = Number(pur.quantity || 1);
    const cost = rawPrice * qty;
    const hasUndefinedPrice = rawPrice <= 0;
    const dueDate = pur.due_date || addDaysToDate(todayDate, 7);
    const cName = pur.chacara_nome || chacaraMap.get(pur.chacara_id || '') || 'Chácara';
    countedPurchaseIds.add(pur.id);

    allItems.push({
      id: `proj-desp-pur-${pur.id}`,
      type: 'DESPESA_COMPRA_PENDENTE',
      category: 'SAIDA',
      title: `Compra: ${pur.product_name}`,
      description: `Prioridade: ${pur.priority || 'NORMAL'} | Qtd: ${qty} ${pur.unit || 'un'} | Fornecedor: ${pur.supplier || 'N/I'}${hasUndefinedPrice ? ' • (Valor ainda não definido)' : ''}`,
      sourceModule: 'COMPRAS',
      sourceId: pur.id,
      sourceCode: pur.id.substring(0, 8),
      chacaraId: pur.chacara_id,
      chacaraName: cName,
      dueDate,
      amount: cost,
      hasUndefinedPrice,
      status: 'PENDENTE'
    });
  }

  // 6. AUDITORIA DE MANUTENÇÕES PENDENTES (COM DEDUPLICAÇÃO DE COMPRAS E CONTAS)
  const activeMaintenances = allMaintenances.filter(m => 
    !m.is_deleted && 
    m.status !== 'CONCLUIDA' && 
    m.status !== 'CANCELADA'
  );

  for (const maint of activeMaintenances) {
    const rawCost = Number(maint.estimated_cost || 0);
    const hasUndefinedPrice = rawCost <= 0;

    // Verificar se há compras vinculadas já contabilizadas para NÃO DUPLICAR
    const linkedPurchaseIds = maint.purchase_ids || (maint.purchases || []).map((p: any) => p.id);
    let deduplicatedCost = rawCost;
    let isDeduplicated = false;
    let dedupNote = '';

    if (linkedPurchaseIds && linkedPurchaseIds.length > 0) {
      const linkedPurchasesTotal = (maint.purchases || [])
        .filter((p: any) => countedPurchaseIds.has(p.id))
        .reduce((sum: number, p: any) => sum + (Number(p.estimated_price || 0) * Number(p.quantity || 1)), 0);

      if (linkedPurchasesTotal > 0) {
        isDeduplicated = true;
        deduplicatedCost = Math.max(0, rawCost - linkedPurchasesTotal);
        dedupNote = `Deduplicado: R$ ${linkedPurchasesTotal.toFixed(2)} já alocado nas Compras Pendentes.`;
      }
    }

    const dueDate = maint.due_date || (maint.identified_at ? maint.identified_at.split('T')[0] : addDaysToDate(todayDate, 14));
    const cName = maint.chacara_name || chacaraMap.get(maint.chacara_id) || 'Chácara';

    allItems.push({
      id: `proj-desp-maint-${maint.id}`,
      type: 'DESPESA_MANUTENCAO_PREVISTA',
      category: 'SAIDA',
      title: `Manutenção: ${maint.title} (${maint.room_name || 'Cômodo'})`,
      description: `Prioridade: ${maint.priority || 'MEDIA'} | Ambiente: ${maint.room_name || 'Geral'}${dedupNote ? ` • ${dedupNote}` : ''}${hasUndefinedPrice ? ' • (Custo ainda não definido)' : ''}`,
      sourceModule: 'MANUTENCOES',
      sourceId: maint.id,
      sourceCode: maint.id.substring(0, 8),
      chacaraId: maint.chacara_id,
      chacaraName: cName,
      dueDate,
      amount: deduplicatedCost,
      hasUndefinedPrice,
      status: 'PENDENTE',
      isDeduplicated,
      deduplicationNotes: dedupNote
    });
  }

  // 7. AUDITORIA DE PAGAMENTOS DE EQUIPE E PRESTADORES
  // Diárias e apoios vinculados às reservas ativas (não duplicando se já estiver em Contas a Pagar)
  const validCrewSchedules = allCrewPayments.filter(cp => {
    if (selectedChacaraId && selectedChacaraId !== 'ALL' && selectedChacaraId !== 'GENERAL') {
      return cp.chacara_id === selectedChacaraId;
    }
    return true;
  });

  for (const cp of validCrewSchedules) {
    // Estimativa de diária se não especificada
    const estimatedDailyFee = 180.00;
    const dueDate = cp.payment_due_date || todayStr;

    // Verificar se já existe conta a pagar equivalente registrada
    const alreadyInAP = pendingAccountsPayable.some(ap => 
      ap.prestador_id === cp.member_id && ap.data_vencimento === dueDate
    );

    if (!alreadyInAP) {
      allItems.push({
        id: `proj-desp-crew-${cp.reference_id}`,
        type: 'DESPESA_EQUIPE_PREVISTA',
        category: 'SAIDA',
        title: `Equipe/Diária: ${cp.member_name} (Reserva #${cp.reservation_code})`,
        description: `Chácara: ${cp.chacara_name} | Vencimento: Check-in - 1d (${dueDate}) | Pix: ${cp.pix_key || 'Cadastrado'}`,
        sourceModule: 'EQUIPE',
        sourceId: cp.member_id,
        sourceCode: cp.reservation_code,
        chacaraId: cp.chacara_id,
        chacaraName: cp.chacara_name,
        dueDate,
        amount: estimatedDailyFee,
        status: 'PREVISTO'
      });
    }
  }

  // 8. AUDITORIA DE DECISÕES APROVADAS DE PLANEJAMENTO
  const approvedDecisions = allDecisions.filter(d => 
    !d.is_deleted && 
    d.status === 'APROVADA' && 
    Number(d.estimated_cost || 0) > 0
  );

  for (const dec of approvedDecisions) {
    const dueDate = dec.target_date || addDaysToDate(todayDate, 30);
    const cName = dec.chacara?.name || chacaraMap.get(dec.chacara_id || '') || 'Geral';

    allItems.push({
      id: `proj-desp-dec-${dec.id}`,
      type: 'DESPESA_DECISAO_APROVADA',
      category: 'SAIDA',
      title: `Decisão Aprovada: ${dec.title}`,
      description: `Classificação: ${dec.classification} | Tipo: ${dec.decision_type} | Prioridade: ${dec.priority}`,
      sourceModule: 'PLANEJAMENTO',
      sourceId: dec.id,
      sourceCode: dec.id.substring(0, 8),
      chacaraId: dec.chacara_id,
      chacaraName: cName,
      dueDate,
      amount: Number(dec.estimated_cost),
      status: 'APROVADO'
    });
  }

  // 9. FUNÇÃO CONSTRUTORA DE FATIAS TEMPORAIS PROGRESSIVAS
  // Períodos:
  // - Hoje (Saldo Atual) -> Dia 0
  // - Próximos 30 dias -> Dias 1 a 30 (Inicia com Saldo de Hoje)
  // - 31 a 60 dias -> Dias 31 a 60 (Inicia com Saldo Final dos 30 dias)
  // - 61 a 90 dias -> Dias 61 a 90 (Inicia com Saldo Final dos 60 dias)
  function buildProgressiveSlice(
    horizon: ProjectionHorizon,
    label: string,
    startDay: number,
    endDay: number,
    startDateStr: string,
    endDateStr: string,
    saldoInicialSlice: number,
    reservaInicialSlice: number
  ): HorizonBreakdown {
    // Filtrar lançamentos que caem estritamente dentro desta fatia de dias
    const sliceItems = allItems.filter(item => {
      if (item.category === 'SALDO_INICIAL' || item.category === 'RESERVA_PROTEGIDA' || item.category === 'PASSIVO_CAUCAO') {
        return startDay === 0; // Só inclui saldos iniciais na fatia 'HOJE'
      }
      const daysDiff = getDaysDifference(item.dueDate, todayStr);
      if (startDay === 0 && endDay === 0) {
        return daysDiff <= 0;
      }
      return daysDiff >= startDay && daysDiff <= endDay;
    });

    let entradasPrevistas = 0;
    let saidasContasPagar = 0;
    let saidasCompras = 0;
    let saidasManutencoes = 0;
    let saidasEquipe = 0;
    let saidasDecisoes = 0;
    let itensSemValorDefinidoCount = 0;

    sliceItems.forEach(item => {
      if (item.hasUndefinedPrice) {
        itensSemValorDefinidoCount++;
      }

      if (item.category === 'ENTRADA') {
        entradasPrevistas += item.amount;
      } else if (item.category === 'SAIDA') {
        if (item.type === 'DESPESA_CONTA_PAGAR' || item.type === 'DESPESA_CONTA_RECORRENTE') {
          saidasContasPagar += item.amount;
        } else if (item.type === 'DESPESA_COMPRA_PENDENTE') {
          saidasCompras += item.amount;
        } else if (item.type === 'DESPESA_MANUTENCAO_PREVISTA') {
          saidasManutencoes += item.amount;
        } else if (item.type === 'DESPESA_EQUIPE_PREVISTA') {
          saidasEquipe += item.amount;
        } else if (item.type === 'DESPESA_DECISAO_APROVADA') {
          saidasDecisoes += item.amount;
        }
      }
    });

    const saidasPrevistas = 
      saidasContasPagar + 
      saidasCompras + 
      saidasManutencoes + 
      saidasEquipe + 
      saidasDecisoes;

    // 20% das novas receitas entram no fundo de reserva blindado
    const alocacaoReservaPeriodo = Math.round(entradasPrevistas * 0.20 * 100) / 100;
    const entradasOperacionaisLiquidas = entradasPrevistas - alocacaoReservaPeriodo;

    const fluxoLiquidoPeriodo = Math.round((entradasOperacionaisLiquidas - saidasPrevistas) * 100) / 100;
    const saldoFinalProjetado = Math.round((saldoInicialSlice + fluxoLiquidoPeriodo) * 100) / 100;
    const reservaAcumulada = Math.round((reservaInicialSlice + alocacaoReservaPeriodo) * 100) / 100;
    const saldoTotalComReserva = Math.round((saldoFinalProjetado + reservaAcumulada) * 100) / 100;

    // Índice de Cobertura
    const totalRecursosDisponiveis = saldoInicialSlice + entradasOperacionaisLiquidas;
    const indiceCobertura = saidasPrevistas > 0 
      ? Math.round((totalRecursosDisponiveis / saidasPrevistas) * 100) / 100
      : 99.9;

    // Avaliação de Saúde Financeira
    let statusSaude: 'CONFORTAVEL' | 'ATENCAO' | 'CRITICO' = 'CONFORTAVEL';
    const alertas: string[] = [];

    if (saldoFinalProjetado < 0) {
      statusSaude = 'CRITICO';
      alertas.push(`Déficit operacional de R$ ${Math.abs(saldoFinalProjetado).toFixed(2)} no período. Os compromissos futuros superam os recursos livres.`);
    } else if (indiceCobertura < 1.25 || saldoFinalProjetado < 3000) {
      statusSaude = 'ATENCAO';
      alertas.push(`Margem operacional estreita (${(indiceCobertura * 100).toFixed(0)}% de cobertura). Recomenda-se cautela em novas deliberações de gastos.`);
    }

    if (itensSemValorDefinidoCount > 0) {
      alertas.push(`Existem ${itensSemValorDefinidoCount} compromisso(s) pendente(s) com valor a definir neste período.`);
    }

    return {
      horizon,
      horizonLabel: label,
      startDay,
      endDay,
      startDate: startDateStr,
      endDate: endDateStr,
      saldoInicial: saldoInicialSlice,
      entradasPrevistas,
      alocacaoReservaPeriodo,
      entradasOperacionaisLiquidas,
      saidasPrevistas,
      saidasContasPagar,
      saidasCompras,
      saidasManutencoes,
      saidasEquipe,
      saidasDecisoes,
      itensSemValorDefinidoCount,
      fluxoLiquidoPeriodo,
      saldoFinalProjetado,
      reservaAcumulada,
      saldoTotalComReserva,
      indiceCobertura,
      statusSaude,
      alertas,
      items: sliceItems
    };
  }

  // 10. CÁLCULO PROGRESSIVO DAS 4 FATIAS
  // Fatia 0: HOJE
  const hoje = buildProgressiveSlice(
    'HOJE',
    'Hoje (Saldo Atual)',
    0,
    0,
    todayStr,
    todayStr,
    caixaOperacionalLivreHoje,
    reservaEmergenciaAtual
  );

  // Fatia 1: Próximos 30 dias (Dias 1 a 30) -> Começa com saldo final de Hoje
  const proxima30d = buildProgressiveSlice(
    '30_DIAS',
    'Próximos 30 dias (1–30d)',
    1,
    30,
    addDaysToDate(todayDate, 1),
    date30d,
    hoje.saldoFinalProjetado,
    hoje.reservaAcumulada
  );

  // Fatia 2: 31–60 dias (Dias 31 a 60) -> Começa com saldo final de 30d
  const proxima31a60d = buildProgressiveSlice(
    '31_60_DIAS',
    '31–60 dias',
    31,
    60,
    addDaysToDate(todayDate, 31),
    date60d,
    proxima30d.saldoFinalProjetado,
    proxima30d.reservaAcumulada
  );

  // Fatia 3: 61–90 dias (Dias 61 a 90) -> Começa com saldo final de 60d
  const proxima61a90d = buildProgressiveSlice(
    '61_90_DIAS',
    '61–90 dias',
    61,
    90,
    addDaysToDate(todayDate, 61),
    date90d,
    proxima31a60d.saldoFinalProjetado,
    proxima31a60d.reservaAcumulada
  );

  const periodos = [hoje, proxima30d, proxima31a60d, proxima61a90d];

  const totalEntradasBrutas = proxima30d.entradasPrevistas + proxima31a60d.entradasPrevistas + proxima61a90d.entradasPrevistas;
  const totalProvisaoReserva = proxima30d.alocacaoReservaPeriodo + proxima31a60d.alocacaoReservaPeriodo + proxima61a90d.alocacaoReservaPeriodo;
  const totalEntradasLiquidas = totalEntradasBrutas - totalProvisaoReserva;
  const totalSaidas = proxima30d.saidasPrevistas + proxima31a60d.saidasPrevistas + proxima61a90d.saidasPrevistas;
  const itensSemValorDefinido = periodos.reduce((sum, p) => sum + p.itensSemValorDefinidoCount, 0);

  return {
    updatedAt: new Date().toISOString(),
    chacaraFilter: selectedChacaraId,
    chacaraFilterName,
    caixaBrutoEmConta,
    reservaEmergenciaAtual,
    caucoesAtuais,
    caixaOperacionalLivreHoje,
    hoje,
    proxima30d,
    proxima31a60d,
    proxima61a90d,
    periodos,
    totais90d: {
      totalEntradasBrutas,
      totalProvisaoReserva,
      totalEntradasLiquidas,
      totalSaidas,
      saldoFinal90d: proxima61a90d.saldoFinalProjetado,
      reservaFinal90d: proxima61a90d.reservaAcumulada,
      itensSemValorDefinido
    },
    allItems
  };
}
