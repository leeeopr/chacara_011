import { supabase } from '@/lib/supabase';
import {
  FinancialStatus,
  PaymentMethod,
  DepositStatus,
  ReservationCharge,
  ReservationPayment,
  ReservationDeposit,
  ReservationExpense,
  ReservationRefund,
  FinancialAuditLog,
  ReservationFullFinancialSummary,
  Reservation,
  getEffectiveReservationPrice
} from '@/lib/chacaraTypes';
import { OperationalRevenueItem, OperationalRevenuePaymentDetail } from '@/lib/accountsPayableTypes';
import { getReservations } from './reservationsService';
import { isDemoMode } from '@/lib/appMode';
import { demoRepository } from '@/lib/demoRepository';

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * 1. Initialize or Fetch Reservation Charge (Snapshot Imutável)
 */
export async function getOrCreateReservationCharge(reservation: Reservation): Promise<ReservationCharge> {
  if (isDemoMode()) {
    return demoRepository.getOrCreateReservationCharge(reservation);
  }
  try {
    const { data: existingCharge, error: fetchErr } = await supabase
      .from('reservation_charges')
      .select('*')
      .eq('reservation_id', reservation.id)
      .maybeSingle();

    if (!fetchErr && existingCharge) {
      const effectivePrice = getEffectiveReservationPrice(reservation);
      if (effectivePrice > 0 && Number(existingCharge.total_amount) !== effectivePrice) {
        existingCharge.total_amount = effectivePrice;
        await supabase
          .from('reservation_charges')
          .update({ total_amount: effectivePrice, updated_at: new Date().toISOString() })
          .eq('id', existingCharge.id);
      }
      return existingCharge as ReservationCharge;
    }
  } catch (e) {
    console.warn('[financialService] Exceção ao buscar cobrança no Supabase:', e);
  }

  // Calculate snapshot values from reservation financial_summary or default calculation
  const fin = reservation.financial_summary || {};
  const dailyRatesSubtotal = Number(fin.daily_rates_subtotal || fin.subtotal_before_adjustment || fin.total_amount || 0);
  const cleaningFee = Number(fin.cleaning_fee || 0);
  const depositAmount = Number(fin.deposit_amount || 0);
  const petFee = Number(fin.pet_fee || 0);
  const energyFee = Number(fin.energy_fee || 0);
  const eventFee = Number(fin.event_fee || 0);
  const extraGuestsFee = Number(fin.extra_guests_total || 0);
  const discountsTotal = Number(fin.rule_discounts_total || 0);
  const surchargesTotal = Number(fin.rule_surcharges_total || 0);
  const manualAdjustment = Number(fin.manual_adjustment_amount || 0);

  const effectiveTotal = getEffectiveReservationPrice(reservation);
  const totalAmount = effectiveTotal > 0 ? effectiveTotal : Number(fin.total_amount || (
    dailyRatesSubtotal + cleaningFee + petFee + energyFee + eventFee + extraGuestsFee - discountsTotal + surchargesTotal + manualAdjustment
  ));

  const now = new Date().toISOString();
  const chargePayload = {
    reservation_id: reservation.id,
    daily_rates_subtotal: dailyRatesSubtotal,
    cleaning_fee: cleaningFee,
    deposit_amount: depositAmount,
    pet_fee: petFee,
    energy_fee: energyFee,
    event_fee: eventFee,
    extra_guests_fee: extraGuestsFee,
    discounts_total: discountsTotal,
    surcharges_total: surchargesTotal,
    manual_adjustment: manualAdjustment,
    total_amount: Math.max(0, totalAmount),
    due_date: reservation.checkin_date || now.split('T')[0],
    status: reservation.status === 'CANCELADA' ? 'CANCELADO' : 'EM_ABERTO',
    created_at: now,
    updated_at: now
  };

  const { data: insertedCharge, error: insertErr } = await supabase
    .from('reservation_charges')
    .insert([chargePayload])
    .select()
    .single();

  if (insertErr || !insertedCharge) {
    console.error('[financialService] Erro ao criar cobrança no Supabase:', insertErr?.message);
    throw new Error('Falha ao registrar cobrança no banco: ' + (insertErr?.message || ''));
  }

  const charge = insertedCharge as ReservationCharge;

  // Initialize Deposit Record in DB if expected
  try {
    const { data: existingDeposit } = await supabase
      .from('reservation_deposits')
      .select('*')
      .eq('reservation_id', reservation.id)
      .maybeSingle();

    if (!existingDeposit) {
      await supabase.from('reservation_deposits').insert([{
        reservation_id: reservation.id,
        expected_amount: depositAmount,
        received_amount: 0,
        returned_amount: 0,
        status: depositAmount > 0 ? 'PREVISTO' : 'RECEBIDO',
        created_at: now,
        updated_at: now
      }]);
    }
  } catch (e) {
    console.warn('[financialService] Erro ao criar registro inicial de caução:', e);
  }

  // Create initial audit log
  await recordFinancialAudit({
    reservation_id: reservation.id,
    operation: 'COBRANCA_CRIADA_SNAPSHOT',
    new_value: charge,
    reason: 'Snapshot imutável gerado na contratação da reserva',
    performed_by: 'Sistema / Admin'
  });

  return charge;
}

/**
 * 2. Get Full Financial Summary for a Reservation
 */
export async function getReservationFinancialSummary(reservation: Reservation): Promise<ReservationFullFinancialSummary> {
  if (isDemoMode()) {
    return demoRepository.getReservationFinancialSummary(reservation);
  }
  const charge = await getOrCreateReservationCharge(reservation);

  let payments: ReservationPayment[] = [];
  let deposit: ReservationDeposit = {
    id: `dep_${reservation.id}`,
    reservation_id: reservation.id,
    expected_amount: charge.deposit_amount,
    received_amount: 0,
    returned_amount: 0,
    status: 'PREVISTO'
  };
  let expenses: ReservationExpense[] = [];
  let refunds: ReservationRefund[] = [];
  let auditLogs: FinancialAuditLog[] = [];

  try {
    const [pRes, dRes, eRes, rRes, aRes] = await Promise.all([
      supabase.from('reservation_payments').select('*').eq('reservation_id', reservation.id).order('created_at', { ascending: true }),
      supabase.from('reservation_deposits').select('*').eq('reservation_id', reservation.id).maybeSingle(),
      supabase.from('reservation_expenses').select('*').eq('reservation_id', reservation.id).order('created_at', { ascending: true }),
      supabase.from('reservation_refunds').select('*').eq('reservation_id', reservation.id).order('created_at', { ascending: true }),
      supabase.from('financial_audit_logs').select('*').eq('reservation_id', reservation.id).order('created_at', { ascending: false })
    ]);

    if (pRes.data) payments = pRes.data as ReservationPayment[];
    if (dRes.data) deposit = dRes.data as ReservationDeposit;
    if (eRes.data) expenses = eRes.data as ReservationExpense[];
    if (rRes.data) refunds = rRes.data as ReservationRefund[];
    if (aRes.data) auditLogs = aRes.data as FinancialAuditLog[];
  } catch (e) {
    console.error('[financialService] Erro ao carregar dados do financeiro da reserva:', e);
  }

  const totalContracted = Number(charge.total_amount || 0);
  const totalReceived = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const totalRefunds = refunds.reduce((acc, r) => acc + Number(r.amount || 0), 0);

  // Grand Total considering extras
  const grandTotalPayable = totalContracted + totalExpenses - totalRefunds;
  const netBalance = grandTotalPayable - totalReceived;

  // Determine Financial Status
  let currentStatus: FinancialStatus = charge.status;
  if (reservation.status === 'CANCELADA') {
    currentStatus = totalRefunds > 0 && totalReceived > 0 && netBalance <= 0 ? 'REEMBOLSADO' : 'CANCELADO';
  } else if (totalReceived <= 0) {
    currentStatus = 'EM_ABERTO';
  } else if (netBalance > 0.01) {
    currentStatus = 'PARCIALMENTE_PAGO';
  } else if (netBalance <= 0.01) {
    currentStatus = 'PAGO';
  }

  // Sync charge status in DB if changed
  if (charge.status !== currentStatus) {
    charge.status = currentStatus;
    await supabase
      .from('reservation_charges')
      .update({ status: currentStatus, updated_at: new Date().toISOString() })
      .eq('id', charge.id);
  }

  return {
    reservation_id: reservation.id,
    charge,
    payments,
    deposit,
    expenses,
    refunds,
    total_contracted: totalContracted,
    total_received: totalReceived,
    total_expenses: totalExpenses,
    total_refunds: totalRefunds,
    net_balance: netBalance,
    financial_status: currentStatus,
    audit_logs: auditLogs
  };
}

/**
 * 3. Record Payment (Recebimento)
 */
export async function addReservationPayment(
  reservation: Reservation,
  paymentData: {
    amount: number;
    payment_method: PaymentMethod;
    payment_date?: string;
    notes?: string;
    performed_by?: string;
  }
): Promise<ReservationPayment> {
  if (isDemoMode()) {
    return demoRepository.addReservationPayment(reservation, paymentData);
  }
  if (paymentData.amount <= 0) {
    throw new Error('O valor do pagamento deve ser maior que zero.');
  }

  const charge = await getOrCreateReservationCharge(reservation);
  const now = new Date().toISOString();

  const payload = {
    reservation_id: reservation.id,
    charge_id: charge.id,
    amount: Number(paymentData.amount),
    payment_date: paymentData.payment_date || now.split('T')[0],
    payment_method: paymentData.payment_method,
    notes: paymentData.notes || '',
    created_by: paymentData.performed_by || 'Admin',
    created_at: now
  };

  const { data: insertedPayment, error } = await supabase
    .from('reservation_payments')
    .insert([payload])
    .select()
    .single();

  if (error || !insertedPayment) {
    console.error('[financialService] Erro ao registrar pagamento:', error?.message);
    throw new Error('Falha ao registrar pagamento no banco: ' + (error?.message || ''));
  }

  const payment = insertedPayment as ReservationPayment;

  // Audit log
  await recordFinancialAudit({
    reservation_id: reservation.id,
    operation: 'PAGAMENTO_REGISTRADO',
    new_value: payment,
    reason: `Recebimento registrado (${payment.payment_method}): R$ ${payment.amount.toFixed(2)}`,
    performed_by: paymentData.performed_by || 'Admin'
  });

  // Trigger recalculation & status sync
  await getReservationFinancialSummary(reservation);

  return payment;
}

/**
 * 4. Manage Caução (Security Deposit)
 */
export async function updateReservationDeposit(
  reservation: Reservation,
  updates: {
    received_amount?: number;
    received_at?: string;
    returned_amount?: number;
    returned_at?: string;
    status?: DepositStatus;
    retention_reason?: string;
    notes?: string;
    performed_by?: string;
  }
): Promise<ReservationDeposit> {
  if (isDemoMode()) {
    return demoRepository.updateReservationDeposit(reservation, updates);
  }
  const now = new Date().toISOString();

  const { data: currentDeposit } = await supabase
    .from('reservation_deposits')
    .select('*')
    .eq('reservation_id', reservation.id)
    .maybeSingle();

  const oldVal = currentDeposit || {};

  const payload = {
    reservation_id: reservation.id,
    expected_amount: currentDeposit ? currentDeposit.expected_amount : Number(reservation.financial_summary?.deposit_amount || 0),
    received_amount: updates.received_amount !== undefined ? Number(updates.received_amount) : (currentDeposit?.received_amount || 0),
    received_at: updates.received_at || currentDeposit?.received_at || (updates.received_amount ? now : null),
    returned_amount: updates.returned_amount !== undefined ? Number(updates.returned_amount) : (currentDeposit?.returned_amount || 0),
    returned_at: updates.returned_at || currentDeposit?.returned_at || (updates.returned_amount ? now : null),
    status: updates.status || currentDeposit?.status || 'PREVISTO',
    retention_reason: updates.retention_reason !== undefined ? updates.retention_reason : currentDeposit?.retention_reason || null,
    notes: updates.notes !== undefined ? updates.notes : currentDeposit?.notes || null,
    updated_at: now
  };

  let updatedDeposit: ReservationDeposit | null = null;

  if (currentDeposit) {
    const { data, error } = await supabase
      .from('reservation_deposits')
      .update(payload)
      .eq('id', currentDeposit.id)
      .select()
      .single();
    if (error) console.error('[financialService] Erro ao atualizar caução:', error.message);
    updatedDeposit = data as ReservationDeposit;
  } else {
    const { data, error } = await supabase
      .from('reservation_deposits')
      .insert([{ ...payload, created_at: now }])
      .select()
      .single();
    if (error) console.error('[financialService] Erro ao criar caução:', error.message);
    updatedDeposit = data as ReservationDeposit;
  }

  await recordFinancialAudit({
    reservation_id: reservation.id,
    operation: 'CAUCAO_ATUALIZADO',
    old_value: oldVal,
    new_value: updatedDeposit || payload,
    reason: `Atualização no controle de caução (Status: ${updatedDeposit?.status || payload.status})`,
    performed_by: updates.performed_by || 'Admin'
  });

  return updatedDeposit || (payload as unknown as ReservationDeposit);
}

/**
 * 5. Add Extra Expense (Despesa Extra / Lançamento adicional)
 */
export async function addReservationExpense(
  reservation: Reservation,
  expenseData: {
    description: string;
    amount: number;
    expense_date?: string;
    performed_by?: string;
  }
): Promise<ReservationExpense> {
  if (isDemoMode()) {
    return demoRepository.addReservationExpense(reservation, expenseData);
  }
  if (expenseData.amount <= 0) {
    throw new Error('O valor da despesa extra deve ser positivo.');
  }
  if (!expenseData.description.trim()) {
    throw new Error('Informe a descrição do lançamento extra.');
  }

  const now = new Date().toISOString();
  const payload = {
    reservation_id: reservation.id,
    description: expenseData.description.trim(),
    amount: Number(expenseData.amount),
    expense_date: expenseData.expense_date || now.split('T')[0],
    created_by: expenseData.performed_by || 'Admin',
    created_at: now
  };

  const { data: insertedExpense, error } = await supabase
    .from('reservation_expenses')
    .insert([payload])
    .select()
    .single();

  if (error || !insertedExpense) {
    console.error('[financialService] Erro ao registrar despesa extra:', error?.message);
    throw new Error('Falha ao registrar despesa extra: ' + (error?.message || ''));
  }

  const expense = insertedExpense as ReservationExpense;

  await recordFinancialAudit({
    reservation_id: reservation.id,
    operation: 'DESPESA_EXTRA_ADICIONADA',
    new_value: expense,
    reason: `Lançamento extra: ${expense.description} - R$ ${expense.amount.toFixed(2)}`,
    performed_by: expenseData.performed_by || 'Admin'
  });

  await getReservationFinancialSummary(reservation);

  return expense;
}

/**
 * 6. Record Refund (Reembolso)
 */
export async function addReservationRefund(
  reservation: Reservation,
  refundData: {
    amount: number;
    reason: string;
    refund_date?: string;
    payment_method?: PaymentMethod;
    performed_by?: string;
  }
): Promise<ReservationRefund> {
  if (isDemoMode()) {
    return demoRepository.addReservationRefund(reservation, refundData);
  }
  if (refundData.amount <= 0) {
    throw new Error('O valor do reembolso deve ser maior que zero.');
  }
  if (!refundData.reason.trim()) {
    throw new Error('Informe o motivo do reembolso.');
  }

  const now = new Date().toISOString();
  const payload = {
    reservation_id: reservation.id,
    amount: Number(refundData.amount),
    reason: refundData.reason.trim(),
    refund_date: refundData.refund_date || now.split('T')[0],
    payment_method: refundData.payment_method || 'PIX',
    created_by: refundData.performed_by || 'Admin',
    created_at: now
  };

  const { data: insertedRefund, error } = await supabase
    .from('reservation_refunds')
    .insert([payload])
    .select()
    .single();

  if (error || !insertedRefund) {
    console.error('[financialService] Erro ao registrar reembolso:', error?.message);
    throw new Error('Falha ao registrar reembolso: ' + (error?.message || ''));
  }

  const refund = insertedRefund as ReservationRefund;

  await recordFinancialAudit({
    reservation_id: reservation.id,
    operation: 'REEMBOLSO_REGISTRADO',
    new_value: refund,
    reason: `Reembolso realizado: R$ ${refund.amount.toFixed(2)} - Motivo: ${refund.reason}`,
    performed_by: refundData.performed_by || 'Admin'
  });

  await getReservationFinancialSummary(reservation);

  return refund;
}

/**
 * 7. Edit Charge Adjustment or Discounts
 */
export async function updateChargeDiscountOrAdjustment(
  reservation: Reservation,
  data: {
    manual_adjustment?: number;
    discounts_total?: number;
    reason: string;
    performed_by?: string;
  }
): Promise<ReservationCharge> {
  if (!data.reason.trim()) {
    throw new Error('Informe justificativa/motivo obrigatório para alteração financeira.');
  }

  const charge = await getOrCreateReservationCharge(reservation);
  const oldCharge = { ...charge };

  if (data.manual_adjustment !== undefined) {
    charge.manual_adjustment = Number(data.manual_adjustment);
  }
  if (data.discounts_total !== undefined) {
    charge.discounts_total = Number(data.discounts_total);
  }

  charge.total_amount = Math.max(0, 
    charge.daily_rates_subtotal + 
    charge.cleaning_fee + 
    charge.pet_fee + 
    charge.energy_fee + 
    charge.event_fee + 
    charge.extra_guests_fee - 
    charge.discounts_total + 
    charge.surcharges_total + 
    charge.manual_adjustment
  );

  charge.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('reservation_charges')
    .update({
      manual_adjustment: charge.manual_adjustment,
      discounts_total: charge.discounts_total,
      total_amount: charge.total_amount,
      updated_at: charge.updated_at
    })
    .eq('id', charge.id)
    .select()
    .single();

  if (error) {
    console.error('[financialService] Erro ao atualizar cobrança:', error.message);
    throw new Error('Falha ao atualizar cobrança no banco: ' + error.message);
  }

  await recordFinancialAudit({
    reservation_id: reservation.id,
    operation: 'COBRANCA_EDITADA',
    old_value: oldCharge,
    new_value: updated || charge,
    reason: data.reason,
    performed_by: data.performed_by || 'Admin'
  });

  await getReservationFinancialSummary(reservation);

  return (updated as ReservationCharge) || charge;
}

/**
 * 8. Audit Logger
 */
export async function recordFinancialAudit(audit: {
  reservation_id?: string;
  operation: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  reason?: string;
  performed_by?: string;
}): Promise<FinancialAuditLog> {
  const validResId = audit.reservation_id && isValidUUID(audit.reservation_id) ? audit.reservation_id : null;

  const payload = {
    reservation_id: validResId,
    operation: audit.operation,
    old_value: audit.old_value || null,
    new_value: audit.new_value || null,
    reason: audit.reason || '',
    performed_by: audit.performed_by || 'Admin',
    ip_address: typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1',
    created_at: new Date().toISOString()
  };

  try {
    const { data } = await supabase
      .from('financial_audit_logs')
      .insert([payload])
      .select()
      .maybeSingle();

    if (data) return data as FinancialAuditLog;
  } catch (e) {
    console.warn('[financialService] Exceção ao gravar log financeiro:', e);
  }

  return { id: 'temp', ...payload } as unknown as FinancialAuditLog;
}

/**
 * 9. Global Financial Analytics & Dashboard Metrics
 */
export interface GlobalFinancialMetrics {
  receitaPrevista: number;
  receitaRecebida: number;
  receitaPendente: number;
  caucoesEmAberto: number;
  totalReembolsos: number;
  totalReservas: number;
  totalCanceladas: number;
  taxaOcupacao: number;
  ticketMedio: number;
  tempoMedioHospedagem: number;
  valorMedioDiaria: number;
  receitaPorChacara: Record<string, { chacaraName: string; total: number; count: number }>;
  receitaPorOrigem: Record<string, { total: number; count: number }>;
  itemsList: Array<{
    reservation: Reservation;
    summary: ReservationFullFinancialSummary;
  }>;
  revenueItems: OperationalRevenueItem[];
}

export async function getGlobalFinancialData(filters?: {
  startDate?: string;
  endDate?: string;
  chacaraId?: string;
  clientId?: string;
  financialStatus?: string;
  paymentMethod?: string;
}): Promise<GlobalFinancialMetrics> {
  if (isDemoMode()) {
    return demoRepository.getGlobalFinancialData(filters);
  }

  const selectedChacaraId = filters?.chacaraId && filters.chacaraId !== 'TODAS' && filters.chacaraId !== 'ALL'
    ? filters.chacaraId
    : undefined;

  // 1. Fetch reservations
  const allReservations = await getReservations({
    chacara_id: selectedChacaraId !== 'GENERAL' ? selectedChacaraId : undefined
  });

  let activeReservations = allReservations.filter(r => !r.is_deleted);

  if (filters?.clientId) {
    activeReservations = activeReservations.filter(r => r.client_id === filters.clientId);
  }

  // 2. Fetch all payment documents for cross-referencing proof of payments
  let allPaymentDocs: any[] = [];
  try {
    const { data: docsData } = await supabase
      .from('reservation_payment_documents')
      .select('*')
      .order('payment_date', { ascending: false });
    if (docsData) allPaymentDocs = docsData;
  } catch (docErr) {
    console.warn('[financialService] Aviso ao carregar comprovantes de pagamento:', docErr);
  }

  const docsByReservation = new Map<string, any[]>();
  for (const doc of allPaymentDocs) {
    if (!doc.reservation_id) continue;
    const list = docsByReservation.get(doc.reservation_id) || [];
    list.push(doc);
    docsByReservation.set(doc.reservation_id, list);
  }

  // 3. Fetch financial transactions of type RECEITA for non-reservation / direct revenues
  let directRevenues: any[] = [];
  try {
    let query = supabase
      .from('financial_transactions')
      .select('*')
      .eq('transaction_type', 'RECEITA')
      .eq('status', 'PAGO');

    if (selectedChacaraId && selectedChacaraId !== 'GENERAL') {
      query = query.eq('chacara_id', selectedChacaraId);
    } else if (selectedChacaraId === 'GENERAL') {
      query = query.is('chacara_id', null);
    }

    const { data: transData } = await query;
    if (transData) directRevenues = transData;
  } catch (transErr) {
    console.warn('[financialService] Aviso ao carregar transações financeiras de receita:', transErr);
  }

  let receitaPrevista = 0;
  let receitaRecebida = 0;
  let caucoesEmAberto = 0;
  let totalReembolsos = 0;
  let totalCanceladas = 0;
  let totalNights = 0;

  const receitaPorChacara: Record<string, { chacaraName: string; total: number; count: number }> = {};
  const receitaPorOrigem: Record<string, { total: number; count: number }> = {};

  const itemsList: Array<{ reservation: Reservation; summary: ReservationFullFinancialSummary }> = [];
  const revenueItems: OperationalRevenueItem[] = [];

  const startDateFilter = filters?.startDate || '';
  const endDateFilter = filters?.endDate || '';

  // Track processed reservation IDs to prevent double counting with transactions
  const processedReservationIds = new Set<string>();

  for (const res of activeReservations) {
    processedReservationIds.add(res.id);

    if (res.status === 'CANCELADA') {
      totalCanceladas++;
    }

    const summary = await getReservationFinancialSummary(res);
    const attachedDocs = docsByReservation.get(res.id) || [];

    // SINGLE SOURCE OF TRUTH:
    // If payments are already registered in reservation_payments, they are authoritative.
    // We ONLY use attached fiscal documents (comprovantes) as fallback payment entries
    // if the reservation has NO registered payments in reservation_payments table at all.
    // This strictly prevents double-counting (e.g. R$ 420 from payment + R$ 420 from document = R$ 840).
    if (summary.payments.length === 0 && attachedDocs.length > 0) {
      for (const doc of attachedDocs) {
        const docAmount = Number(doc.amount || 0);
        if (docAmount > 0) {
          const docDate = doc.payment_date 
            ? doc.payment_date.split('T')[0] 
            : (doc.uploaded_at ? doc.uploaded_at.split('T')[0] : res.checkin_date);
          const synPayment: ReservationPayment = {
            id: doc.id,
            reservation_id: res.id,
            amount: docAmount,
            payment_date: docDate,
            payment_method: 'OUTRO' as PaymentMethod,
            notes: doc.description || doc.observacoes || 'Comprovante fiscal anexado',
            created_by: doc.uploaded_by || 'Comprovante'
          };
          summary.payments.push(synPayment);
        }
      }
      summary.total_received = summary.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
      summary.net_balance = Math.max(0, (summary.total_contracted + summary.total_expenses) - summary.total_received);
    }

    // Filter payments in the selected period strictly by normalized payment_date (YYYY-MM-DD)
    let periodPayments = summary.payments;
    if (startDateFilter || endDateFilter) {
      periodPayments = summary.payments.filter(p => {
        const pDate = p.payment_date ? p.payment_date.split('T')[0] : '';
        if (!pDate) return false;
        if (startDateFilter && pDate < startDateFilter) return false;
        if (endDateFilter && pDate > endDateFilter) return false;
        return true;
      });
    }

    // Apply method filter if requested
    if (filters?.paymentMethod && filters.paymentMethod !== 'TODAS') {
      periodPayments = periodPayments.filter(p => p.payment_method === filters.paymentMethod);
    }

    const periodReceived = periodPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    summary.period_received = periodReceived;
    summary.period_payments = periodPayments;

    // Check whether the reservation belongs to the selected view:
    // A reservation is included in itemsList if:
    // 1. Its checkin date falls within the period, OR
    // 2. It had payments received within the period, OR
    // 3. No date filter was specified.
    const isCheckinInPeriod = (!startDateFilter || res.checkin_date >= startDateFilter) &&
                              (!endDateFilter || res.checkin_date <= endDateFilter);
    const hasPaymentsInPeriod = periodReceived > 0;
    const shouldIncludeInView = !startDateFilter || isCheckinInPeriod || hasPaymentsInPeriod;

    if (!shouldIncludeInView) {
      continue;
    }

    if (filters?.financialStatus && filters.financialStatus !== 'TODOS') {
      if (summary.financial_status !== filters.financialStatus) {
        continue;
      }
    }

    itemsList.push({ reservation: res, summary });

    // Calculate revenue metrics
    receitaRecebida += periodReceived;

    if (res.status !== 'CANCELADA') {
      if (isCheckinInPeriod) {
        receitaPrevista += (summary.total_contracted + summary.total_expenses);
      } else if (hasPaymentsInPeriod) {
        // If check-in is in a different month, the expected revenue for this payment is at least the received amount
        receitaPrevista += periodReceived;
      }

      if (summary.deposit.status === 'PREVISTO' || summary.deposit.status === 'RECEBIDO') {
        caucoesEmAberto += Number(summary.deposit.expected_amount || 0);
      }

      // Calculation of nights (if check-in is in period)
      if (isCheckinInPeriod) {
        const start = new Date(res.checkin_date).getTime();
        const end = new Date(res.checkout_date).getTime();
        const nights = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        totalNights += nights;
      }

      // Grouping by Chacara by received amount in period
      const cName = res.chacara?.name || 'Chácara Não Especificada';
      if (!receitaPorChacara[cName]) {
        receitaPorChacara[cName] = { chacaraName: cName, total: 0, count: 0 };
      }
      receitaPorChacara[cName].total += periodReceived;
      if (isCheckinInPeriod || hasPaymentsInPeriod) {
        receitaPorChacara[cName].count += 1;
      }

      // Grouping by Origin
      const orig = res.origin || 'OUTRO';
      if (!receitaPorOrigem[orig]) {
        receitaPorOrigem[orig] = { total: 0, count: 0 };
      }
      receitaPorOrigem[orig].total += periodReceived;
      if (isCheckinInPeriod || hasPaymentsInPeriod) {
        receitaPorOrigem[orig].count += 1;
      }
    }

    // Refunds filtering
    if (summary.total_refunds > 0) {
      let refundsInPeriod = summary.refunds;
      if (startDateFilter || endDateFilter) {
        refundsInPeriod = summary.refunds.filter(r => {
          const rDate = r.refund_date;
          if (!rDate) return false;
          if (startDateFilter && rDate < startDateFilter) return false;
          if (endDateFilter && rDate > endDateFilter) return false;
          return true;
        });
      }
      totalReembolsos += refundsInPeriod.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    }

    // Create OperationalRevenueItem for MonthlyRevenuesSection / AccountsPayable
    if (periodReceived > 0 || isCheckinInPeriod) {
      const guestName = res.client?.full_name || (res as any).client_name || (res as any).guest_name || 'Hóspede Direto';
      const title = res.code || res.chacara?.name || 'Hospedagem';

      const paymentDetails: OperationalRevenuePaymentDetail[] = periodPayments.map(p => {
        const cleanPDate = p.payment_date ? p.payment_date.split('T')[0] : '';
        const matchingDoc = attachedDocs.find(d => {
          const dDate = d.payment_date ? d.payment_date.split('T')[0] : '';
          return (d.payment_id && d.payment_id === p.id) ||
                 (dDate && cleanPDate && dDate === cleanPDate && Math.abs(Number(d.amount || 0) - Number(p.amount || 0)) < 0.01);
        }) || (attachedDocs.length === 1 ? attachedDocs[0] : undefined);

        return {
          id: p.id,
          amount: Number(p.amount || 0),
          payment_date: cleanPDate || res.checkin_date,
          payment_method: p.payment_method,
          notes: p.notes,
          receipt_url: matchingDoc?.public_url || (p as any).receipt_url,
          is_proven: !!matchingDoc || !!(p as any).receipt_url || !!p.id
        };
      });

      revenueItems.push({
        id: res.id,
        reservation_id: res.id,
        guest_name: guestName,
        descricao: `Reserva ${title}`,
        valor_total: summary.total_contracted + summary.total_expenses,
        valor_recebido: periodReceived,
        valor_total_recebido: summary.total_received,
        valor_pendente: Math.max(0, summary.net_balance),
        data_referencia: periodPayments[0]?.payment_date || res.checkin_date,
        data_checkout: res.checkout_date,
        chacara_id: res.chacara_id,
        chacara_nome: res.chacara?.name || 'Chácara Vinculada',
        origem: res.origin || 'Direto',
        status: summary.financial_status || 'EM_ABERTO',
        payments_count: periodPayments.length,
        payments_detail: paymentDetails,
        has_receipt_document: attachedDocs.length > 0,
        is_avulsa: false
      });
    }
  }

  // 4. Process non-reservation / direct revenues from financial_transactions (anti-double-counting)
  for (const trans of directRevenues) {
    if (trans.reservation_id && processedReservationIds.has(trans.reservation_id)) {
      // Already accounted for through reservation payments! Skip to avoid double counting.
      continue;
    }

    const tDate = trans.paid_date || trans.due_date || (trans.created_at ? trans.created_at.split('T')[0] : '');
    if (startDateFilter && tDate < startDateFilter) continue;
    if (endDateFilter && tDate > endDateFilter) continue;

    const val = Number(trans.amount || 0);
    if (val <= 0) continue;

    receitaRecebida += val;
    receitaPrevista += val;

    const cName = trans.chacara?.name || 'Receitas Diversas';
    if (!receitaPorChacara[cName]) {
      receitaPorChacara[cName] = { chacaraName: cName, total: 0, count: 0 };
    }
    receitaPorChacara[cName].total += val;
    receitaPorChacara[cName].count += 1;

    revenueItems.push({
      id: trans.id,
      reservation_id: trans.id,
      guest_name: trans.description || 'Receita Direta / Avulsa',
      descricao: `Receita Avulsa: ${trans.category || trans.description}`,
      valor_total: val,
      valor_recebido: val,
      valor_total_recebido: val,
      valor_pendente: 0,
      data_referencia: tDate,
      chacara_id: trans.chacara_id,
      chacara_nome: cName,
      origem: trans.payment_method || 'AVULSO',
      status: 'PAGO',
      payments_count: 1,
      payments_detail: [{
        id: trans.id,
        amount: val,
        payment_date: tDate,
        payment_method: trans.payment_method,
        notes: trans.notes || trans.description,
        is_proven: true
      }],
      has_receipt_document: false,
      is_avulsa: true
    });
  }

  // Sort revenue items by payment / reference date descending
  revenueItems.sort((a, b) => (b.data_referencia || '').localeCompare(a.data_referencia || ''));

  const receitaPendente = Math.max(0, receitaPrevista - receitaRecebida);
  const activeReservationsCount = itemsList.filter(i => i.reservation.status !== 'CANCELADA').length;
  const ticketMedio = activeReservationsCount > 0 ? receitaPrevista / activeReservationsCount : 0;
  const tempoMedioHospedagem = activeReservationsCount > 0 ? totalNights / activeReservationsCount : 0;
  const valorMedioDiaria = totalNights > 0 ? receitaPrevista / totalNights : 0;

  const totalDaysAvailable = Math.max(30, (receitaPorChacara ? Object.keys(receitaPorChacara).length : 1) * 30);
  const taxaOcupacao = Math.min(100, Math.round((totalNights / totalDaysAvailable) * 100));

  return {
    receitaPrevista,
    receitaRecebida,
    receitaPendente,
    caucoesEmAberto,
    totalReembolsos,
    totalReservas: itemsList.length,
    totalCanceladas,
    taxaOcupacao,
    ticketMedio,
    tempoMedioHospedagem,
    valorMedioDiaria,
    receitaPorChacara,
    receitaPorOrigem,
    itemsList,
    revenueItems
  };
}

export async function getFinancialSummary() {
  const data = await getGlobalFinancialData();
  return {
    ...data,
    caixa_liquido_disponivel: data.receitaRecebida - data.totalReembolsos
  };
}

