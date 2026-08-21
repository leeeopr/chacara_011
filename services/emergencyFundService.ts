import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/appMode';
import { demoRepository } from '@/lib/demoRepository';
import {
  EmergencyFund,
  EmergencyFundTransaction,
  EmergencyFundSummary,
  ChacaraEmergencyContribution,
  RecordExpenseInput,
  RecordManualContributionInput,
  RecordManualWithdrawalInput
} from '@/lib/emergencyFundTypes';
import { Reservation, ReservationPayment, ReservationRefund } from '@/lib/chacaraTypes';

const DEFAULT_FUND_ID = '00000000-0000-0000-0000-000000000001';

export async function getOrCreateEmergencyFund(): Promise<EmergencyFund> {
  if (isDemoMode()) {
    return demoRepository.getOrCreateEmergencyFund();
  }

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('emergency_funds')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (existing && !fetchErr) {
      return existing as EmergencyFund;
    }

    // Create default fund
    const newFund: Partial<EmergencyFund> = {
      id: DEFAULT_FUND_ID,
      name: 'Reserva de Emergência',
      description: 'Fundo destinado exclusivamente a despesas inesperadas, danos estruturais, manutenções emergenciais e reparos na infraestrutura das chácaras.',
      default_percentage: 20.00,
      current_balance: 0.00,
      status: 'ATIVO'
    };

    const { data: created, error: insertErr } = await supabase
      .from('emergency_funds')
      .insert(newFund)
      .select()
      .single();

    if (insertErr) {
      console.warn('[emergencyFundService] Aviso ao criar fundo de emergência no Supabase, fallback:', insertErr.message);
      return demoRepository.getOrCreateEmergencyFund();
    }

    return created as EmergencyFund;
  } catch (e) {
    console.error('[emergencyFundService] Exceção ao obter fundo de emergência:', e);
    return demoRepository.getOrCreateEmergencyFund();
  }
}

export async function getEmergencyFundSummary(filters?: {
  chacara_id?: string;
  startDate?: string;
  endDate?: string;
}): Promise<EmergencyFundSummary> {
  if (isDemoMode()) {
    return demoRepository.getEmergencyFundSummary(filters);
  }

  try {
    const fund = await getOrCreateEmergencyFund();
    const percentage = Number(fund.default_percentage || 20);

    // Fetch transactions
    let query = supabase
      .from('emergency_fund_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.chacara_id && filters.chacara_id !== 'TODAS') {
      query = query.eq('chacara_id', filters.chacara_id);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', `${filters.startDate}T00:00:00.000Z`);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', `${filters.endDate}T23:59:59.999Z`);
    }

    const { data: rawTxs, error: txsErr } = await query;

    if (txsErr) {
      console.warn('[emergencyFundService] Erro ao buscar transações no Supabase, fallback:', txsErr.message);
      return demoRepository.getEmergencyFundSummary(filters);
    }

    // Fetch all active reservations to calculate gross volume and ideal speculation
    let resQuery = supabase
      .from('reservations')
      .select('id, chacara_id, status, financial_summary, custom_price, is_custom_price, is_deleted, checkin_date, chacara:chacaras(id, name)')
      .eq('is_deleted', false)
      .neq('status', 'CANCELADA');

    if (filters?.chacara_id && filters.chacara_id !== 'TODAS') {
      resQuery = resQuery.eq('chacara_id', filters.chacara_id);
    }
    if (filters?.startDate) {
      resQuery = resQuery.gte('checkin_date', filters.startDate);
    }
    if (filters?.endDate) {
      resQuery = resQuery.lte('checkin_date', filters.endDate);
    }

    const { data: rawReservations } = await resQuery;
    const activeReservations: any[] = (rawReservations as any[]) || [];

    // Calculate total reservation volume and by-chacara distribution
    let totalReservationsGrossVolume = 0;
    const chacaraReservationsVolume: Record<string, { name: string; volume: number; count: number }> = {};

    activeReservations.forEach(r => {
      let rPrice = 0;
      if (r.is_custom_price && r.custom_price != null && Number(r.custom_price) > 0) {
        rPrice = Number(r.custom_price);
      } else if (r.financial_summary && Number(r.financial_summary.total_amount) > 0) {
        rPrice = Number(r.financial_summary.total_amount);
      }

      totalReservationsGrossVolume += rPrice;

      const cId = r.chacara_id || 'sem_chacara';
      const cName = r.chacara?.name || (cId === 'sem_chacara' ? 'Geral / Não Especificada' : 'Chácara');

      if (!chacaraReservationsVolume[cId]) {
        chacaraReservationsVolume[cId] = { name: cName, volume: 0, count: 0 };
      }
      chacaraReservationsVolume[cId].volume += rPrice;
      chacaraReservationsVolume[cId].count += 1;
    });

    const txs: EmergencyFundTransaction[] = (rawTxs as any[]) || [];

    let currentBalance = 0;
    let totalAccumulated = 0;
    let totalUsed = 0;
    let totalRefunded = 0;
    const contributingResIds = new Set<string>();
    const chacaraMap: Record<string, ChacaraEmergencyContribution> = {};

    // Initialize map from all active chacaras with reservations
    Object.keys(chacaraReservationsVolume).forEach(cId => {
      const info = chacaraReservationsVolume[cId];
      const idealAmt = Math.round((info.volume * (percentage / 100)) * 100) / 100;
      chacaraMap[cId] = {
        chacara_id: cId,
        chacara_name: info.name,
        reservations_count: info.count,
        reservations_gross_volume: Math.round(info.volume * 100) / 100,
        ideal_speculated_amount: idealAmt,
        total_allocated: 0,
        total_used: 0,
        net_contribution: 0,
        coverage_percentage: 0,
        transactions_count: 0
      };
    });

    txs.forEach(tx => {
      const amt = Number(tx.amount || 0);
      currentBalance += amt;
      if (amt > 0) {
        totalAccumulated += amt;
      } else if (tx.transaction_type === 'RETIRADA_DESPESA') {
        totalUsed += Math.abs(amt);
      } else if (tx.transaction_type === 'ESTORNO_REEMBOLSO') {
        totalRefunded += Math.abs(amt);
      }

      if (tx.reservation_id) {
        contributingResIds.add(tx.reservation_id);
      }

      const cId = tx.chacara_id || 'sem_chacara';
      const cName = tx.chacara_name || (cId === 'sem_chacara' ? 'Geral / Não Especificada' : 'Chácara');
      if (!chacaraMap[cId]) {
        chacaraMap[cId] = {
          chacara_id: cId,
          chacara_name: cName,
          reservations_count: 0,
          reservations_gross_volume: 0,
          ideal_speculated_amount: 0,
          total_allocated: 0,
          total_used: 0,
          net_contribution: 0,
          coverage_percentage: 0,
          transactions_count: 0
        };
      }
      if (amt > 0) {
        chacaraMap[cId].total_allocated += amt;
      } else {
        chacaraMap[cId].total_used += Math.abs(amt);
      }
      chacaraMap[cId].net_contribution += amt;
      chacaraMap[cId].transactions_count += 1;
    });

    // Compute coverage percentage per chacara
    Object.values(chacaraMap).forEach(item => {
      item.total_allocated = Math.round(item.total_allocated * 100) / 100;
      item.total_used = Math.round(item.total_used * 100) / 100;
      item.net_contribution = Math.round(item.net_contribution * 100) / 100;
      if (item.ideal_speculated_amount > 0) {
        item.coverage_percentage = Math.min(100, Math.round((item.total_allocated / item.ideal_speculated_amount) * 100));
      } else if (item.total_allocated > 0) {
        item.coverage_percentage = 100;
      }
    });

    const recentEntries = txs.filter(t => Number(t.amount) > 0).slice(0, 10);
    const recentExits = txs.filter(t => Number(t.amount) < 0).slice(0, 10);

    // Calculate Ideal Speculated Accumulated Target
    const idealSpeculatedAccumulated = Math.round((totalReservationsGrossVolume * (percentage / 100)) * 100) / 100;
    const roundedCurrentBalance = Math.round(currentBalance * 100) / 100;
    const speculatedCoveragePercentage = idealSpeculatedAccumulated > 0
      ? Math.min(100, Math.round((roundedCurrentBalance / idealSpeculatedAccumulated) * 100))
      : (roundedCurrentBalance > 0 ? 100 : 0);

    const pendingSpeculatedBalance = Math.max(0, Math.round((idealSpeculatedAccumulated - totalAccumulated) * 100) / 100);

    return {
      fund,
      current_balance: roundedCurrentBalance,
      total_accumulated: Math.round(totalAccumulated * 100) / 100,
      total_used: Math.round(totalUsed * 100) / 100,
      total_refunded: Math.round(totalRefunded * 100) / 100,
      contributing_reservations_count: contributingResIds.size,
      total_reservations_count: activeReservations.length,
      total_reservations_gross_volume: Math.round(totalReservationsGrossVolume * 100) / 100,
      ideal_speculated_accumulated: idealSpeculatedAccumulated,
      speculated_coverage_percentage: speculatedCoveragePercentage,
      pending_speculated_balance: pendingSpeculatedBalance,
      configured_percentage: percentage,
      contributions_by_chacara: Object.values(chacaraMap).sort((a, b) => b.ideal_speculated_amount - a.ideal_speculated_amount),
      recent_entries: recentEntries,
      recent_exits: recentExits,
      all_transactions: txs
    };
  } catch (e) {
    console.error('[emergencyFundService] Exceção em getEmergencyFundSummary:', e);
    return demoRepository.getEmergencyFundSummary(filters);
  }
}

export async function allocateEmergencyFundFromPayment(
  payment: ReservationPayment,
  reservation?: Reservation
): Promise<EmergencyFundTransaction | null> {
  if (isDemoMode()) {
    return demoRepository.allocateEmergencyFundFromPayment(payment, reservation);
  }

  try {
    const fund = await getOrCreateEmergencyFund();

    // Idempotency check: verify if payment was already allocated
    const { data: existing } = await supabase
      .from('emergency_fund_transactions')
      .select('id')
      .eq('payment_id', payment.id)
      .eq('transaction_type', 'APORTE_AUTOMATICO')
      .maybeSingle();

    if (existing) {
      return existing as any;
    }

    let res = reservation;
    if (!res && payment.reservation_id) {
      const { data: resData } = await supabase
        .from('reservations')
        .select('*, chacara:chacaras(*)')
        .eq('id', payment.reservation_id)
        .maybeSingle();
      res = resData as any;
    }

    const percentage = Number(fund.default_percentage || 20);
    const allocatedAmount = Math.round((Number(payment.amount) * (percentage / 100)) * 100) / 100;
    if (allocatedAmount <= 0) return null;

    // Get current balance
    const { data: sumData } = await supabase
      .from('emergency_fund_transactions')
      .select('amount');
    const currentTotal = ((sumData as any[]) || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const balanceAfter = Math.round((currentTotal + allocatedAmount) * 100) / 100;

    const newTx = {
      fund_id: fund.id,
      chacara_id: res?.chacara_id || null,
      chacara_name: res?.chacara?.name || null,
      reservation_id: res?.id || payment.reservation_id || null,
      reservation_code: res?.code || null,
      payment_id: payment.id,
      transaction_type: 'APORTE_AUTOMATICO',
      amount: allocatedAmount,
      gross_amount: Number(payment.amount),
      percentage_applied: percentage,
      balance_after: balanceAfter,
      category: 'RECEITA_ALUGUEL_20%',
      description: `Aporte Automático (${percentage}%) - Reserva #${res?.code || 'N/A'}`,
      performed_by: payment.created_by || 'Sistema',
      notes: payment.notes || null
    };

    const { data: inserted, error: insErr } = await supabase
      .from('emergency_fund_transactions')
      .insert(newTx)
      .select()
      .single();

    if (insErr) {
      console.warn('[emergencyFundService] Erro ao inserir aporte no Supabase:', insErr.message);
      return demoRepository.allocateEmergencyFundFromPayment(payment, reservation);
    }

    // Update fund balance
    await supabase
      .from('emergency_funds')
      .update({ current_balance: balanceAfter, updated_at: new Date().toISOString() })
      .eq('id', fund.id);

    return inserted as EmergencyFundTransaction;
  } catch (e) {
    console.error('[emergencyFundService] Exceção em allocateEmergencyFundFromPayment:', e);
    return demoRepository.allocateEmergencyFundFromPayment(payment, reservation);
  }
}

export async function revertEmergencyFundFromRefund(
  refund: ReservationRefund,
  reservation?: Reservation
): Promise<EmergencyFundTransaction | null> {
  if (isDemoMode()) {
    return demoRepository.revertEmergencyFundFromRefund(refund, reservation);
  }

  try {
    const fund = await getOrCreateEmergencyFund();

    // Idempotency check
    const { data: existing } = await supabase
      .from('emergency_fund_transactions')
      .select('id')
      .eq('refund_id', refund.id)
      .eq('transaction_type', 'ESTORNO_REEMBOLSO')
      .maybeSingle();

    if (existing) {
      return existing as any;
    }

    let res = reservation;
    if (!res && refund.reservation_id) {
      const { data: resData } = await supabase
        .from('reservations')
        .select('*, chacara:chacaras(*)')
        .eq('id', refund.reservation_id)
        .maybeSingle();
      res = resData as any;
    }

    const percentage = Number(fund.default_percentage || 20);
    const reversalAmount = Math.round((Number(refund.amount) * (percentage / 100)) * 100) / 100;
    if (reversalAmount <= 0) return null;

    const { data: sumData } = await supabase
      .from('emergency_fund_transactions')
      .select('amount');
    const currentTotal = ((sumData as any[]) || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const balanceAfter = Math.round((currentTotal - reversalAmount) * 100) / 100;

    const newTx = {
      fund_id: fund.id,
      chacara_id: res?.chacara_id || null,
      chacara_name: res?.chacara?.name || null,
      reservation_id: res?.id || refund.reservation_id || null,
      reservation_code: res?.code || null,
      refund_id: refund.id,
      transaction_type: 'ESTORNO_REEMBOLSO',
      amount: -Math.abs(reversalAmount),
      gross_amount: Number(refund.amount),
      percentage_applied: percentage,
      balance_after: balanceAfter,
      category: 'ESTORNO_CANCELAMENTO_REEMBOLSO',
      description: `Estorno de Reembolso (${percentage}%) - Reserva #${res?.code || 'N/A'}: ${refund.reason || 'Cancelamento'}`,
      performed_by: refund.created_by || 'Sistema',
      notes: refund.reason || null
    };

    const { data: inserted, error: insErr } = await supabase
      .from('emergency_fund_transactions')
      .insert(newTx)
      .select()
      .single();

    if (insErr) {
      console.warn('[emergencyFundService] Erro ao inserir estorno no Supabase:', insErr.message);
      return demoRepository.revertEmergencyFundFromRefund(refund, reservation);
    }

    await supabase
      .from('emergency_funds')
      .update({ current_balance: balanceAfter, updated_at: new Date().toISOString() })
      .eq('id', fund.id);

    return inserted as EmergencyFundTransaction;
  } catch (e) {
    console.error('[emergencyFundService] Exceção em revertEmergencyFundFromRefund:', e);
    return demoRepository.revertEmergencyFundFromRefund(refund, reservation);
  }
}

export async function recordEmergencyFundExpense(input: RecordExpenseInput): Promise<EmergencyFundTransaction> {
  if (isDemoMode()) {
    return demoRepository.recordEmergencyFundExpense(input);
  }

  try {
    const fund = await getOrCreateEmergencyFund();
    const amount = Math.round(Number(input.amount) * 100) / 100;

    const { data: sumData } = await supabase
      .from('emergency_fund_transactions')
      .select('amount');
    const currentTotal = ((sumData as any[]) || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const balanceAfter = Math.round((currentTotal - amount) * 100) / 100;

    let chacaraName: string | null = null;
    if (input.chacara_id) {
      const { data: cData } = await supabase
        .from('chacaras')
        .select('name')
        .eq('id', input.chacara_id)
        .maybeSingle();
      chacaraName = cData?.name || null;
    }

    const newTx = {
      fund_id: fund.id,
      chacara_id: input.chacara_id || null,
      chacara_name: chacaraName,
      transaction_type: 'RETIRADA_DESPESA',
      amount: -Math.abs(amount),
      gross_amount: amount,
      balance_after: balanceAfter,
      category: input.category || 'INFRAESTRUTURA_EMERGENCIAL',
      description: input.description.trim(),
      performed_by: input.performed_by || 'Administrador',
      notes: input.notes || null
    };

    const { data: inserted, error: insErr } = await supabase
      .from('emergency_fund_transactions')
      .insert(newTx)
      .select()
      .single();

    if (insErr) {
      console.warn('[emergencyFundService] Erro ao registrar despesa no Supabase:', insErr.message);
      return demoRepository.recordEmergencyFundExpense(input);
    }

    await supabase
      .from('emergency_funds')
      .update({ current_balance: balanceAfter, updated_at: new Date().toISOString() })
      .eq('id', fund.id);

    return inserted as EmergencyFundTransaction;
  } catch (e) {
    console.error('[emergencyFundService] Exceção em recordEmergencyFundExpense:', e);
    return demoRepository.recordEmergencyFundExpense(input);
  }
}

export async function recordManualEmergencyContribution(input: RecordManualContributionInput): Promise<EmergencyFundTransaction> {
  if (isDemoMode()) {
    return demoRepository.recordManualEmergencyContribution(input);
  }

  try {
    const fund = await getOrCreateEmergencyFund();
    const amount = Math.round(Number(input.amount) * 100) / 100;

    const { data: sumData } = await supabase
      .from('emergency_fund_transactions')
      .select('amount');
    const currentTotal = ((sumData as any[]) || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const balanceAfter = Math.round((currentTotal + amount) * 100) / 100;

    let chacaraName: string | null = null;
    if (input.chacara_id) {
      const { data: cData } = await supabase
        .from('chacaras')
        .select('name')
        .eq('id', input.chacara_id)
        .maybeSingle();
      chacaraName = cData?.name || null;
    }

    const newTx = {
      fund_id: fund.id,
      chacara_id: input.chacara_id || null,
      chacara_name: chacaraName,
      transaction_type: 'APORTE_MANUAL',
      amount: Math.abs(amount),
      gross_amount: amount,
      balance_after: balanceAfter,
      category: 'APORTE_EXTRAORDINARIO',
      description: input.description.trim(),
      performed_by: input.performed_by || 'Administrador',
      notes: input.notes || null
    };

    const { data: inserted, error: insErr } = await supabase
      .from('emergency_fund_transactions')
      .insert(newTx)
      .select()
      .single();

    if (insErr) {
      console.warn('[emergencyFundService] Erro ao registrar aporte no Supabase:', insErr.message);
      return demoRepository.recordManualEmergencyContribution(input);
    }

    await supabase
      .from('emergency_funds')
      .update({ current_balance: balanceAfter, updated_at: new Date().toISOString() })
      .eq('id', fund.id);

    return inserted as EmergencyFundTransaction;
  } catch (e) {
    console.error('[emergencyFundService] Exceção em recordManualEmergencyContribution:', e);
    return demoRepository.recordManualEmergencyContribution(input);
  }
}

export async function recordManualEmergencyWithdrawal(input: RecordManualWithdrawalInput): Promise<EmergencyFundTransaction> {
  if (isDemoMode()) {
    return demoRepository.recordManualEmergencyWithdrawal(input);
  }

  try {
    const fund = await getOrCreateEmergencyFund();
    const amount = Math.round(Number(input.amount) * 100) / 100;

    const { data: sumData } = await supabase
      .from('emergency_fund_transactions')
      .select('amount');
    const currentTotal = ((sumData as any[]) || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const balanceAfter = Math.round((currentTotal - amount) * 100) / 100;

    let chacaraName: string | null = null;
    if (input.chacara_id) {
      const { data: cData } = await supabase
        .from('chacaras')
        .select('name')
        .eq('id', input.chacara_id)
        .maybeSingle();
      chacaraName = cData?.name || null;
    }

    const newTx = {
      fund_id: fund.id,
      chacara_id: input.chacara_id || null,
      chacara_name: chacaraName,
      transaction_type: 'AJUSTE_MANUAL',
      amount: -Math.abs(amount),
      gross_amount: amount,
      balance_after: balanceAfter,
      category: 'AJUSTE_RETIRADA_MANUAL',
      description: input.description.trim(),
      performed_by: input.performed_by || 'Administrador',
      notes: input.notes || null
    };

    const { data: inserted, error: insErr } = await supabase
      .from('emergency_fund_transactions')
      .insert(newTx)
      .select()
      .single();

    if (insErr) {
      console.warn('[emergencyFundService] Erro ao registrar ajuste no Supabase:', insErr.message);
      return demoRepository.recordManualEmergencyWithdrawal(input);
    }

    await supabase
      .from('emergency_funds')
      .update({ current_balance: balanceAfter, updated_at: new Date().toISOString() })
      .eq('id', fund.id);

    return inserted as EmergencyFundTransaction;
  } catch (e) {
    console.error('[emergencyFundService] Exceção em recordManualEmergencyWithdrawal:', e);
    return demoRepository.recordManualEmergencyWithdrawal(input);
  }
}

export async function updateEmergencyFundPercentage(newPercentage: number): Promise<EmergencyFund> {
  if (isDemoMode()) {
    return demoRepository.updateEmergencyFundPercentage(newPercentage);
  }

  try {
    const fund = await getOrCreateEmergencyFund();
    const pct = Math.round(Number(newPercentage) * 100) / 100;

    const { data: updated, error: updErr } = await supabase
      .from('emergency_funds')
      .update({
        default_percentage: pct,
        updated_at: new Date().toISOString()
      })
      .eq('id', fund.id)
      .select()
      .single();

    if (updErr) {
      console.warn('[emergencyFundService] Erro ao atualizar percentual no Supabase:', updErr.message);
      return demoRepository.updateEmergencyFundPercentage(newPercentage);
    }

    return updated as EmergencyFund;
  } catch (e) {
    console.error('[emergencyFundService] Exceção em updateEmergencyFundPercentage:', e);
    return demoRepository.updateEmergencyFundPercentage(newPercentage);
  }
}
