import { supabase } from '@/lib/supabase';
import { Billing, BillingStatus, BillingTransaction, BillingTransactionStatus, PaymentMethod } from '@/lib/types';

export const billingsService = {
  /**
   * Fetch all billings with associated appointment, patient, professional, and company details.
   */
  async getBillings(filters?: {
    company_id?: string | 'ALL' | 'PARTICULAR';
    status?: BillingStatus | 'ALL';
    startDate?: string;
    endDate?: string;
    fono_id?: string;
  }): Promise<any[]> {
    let query = supabase
      .from('billings')
      .select(`
        *,
        companies ( id, name, limit_value, limit_type ),
        appointments (
          id,
          appointment_date,
          start_time,
          status,
          price_source,
          fono_id,
          agreed_price,
          discount_value,
          net_value,
          invoice_needed,
          billing_company_id,
          patients ( id, full_name, whatsapp ),
          profiles ( id, full_name ),
          appointment_types ( id, name ),
          companies ( id, name )
        )
      `)
      .order('due_date', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }
      if (filters.company_id) {
        if (filters.company_id === 'PARTICULAR') {
          query = query.is('billing_company_id', null);
        } else if (filters.company_id !== 'ALL') {
          query = query.eq('billing_company_id', filters.company_id);
        }
      }
      if (filters.startDate) {
        query = query.gte('due_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('due_date', filters.endDate);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Busca de faturamento/cobranças finalizada:', error.message);
      return [];
    }

    let result = (data as any[]) || [];

    // Filter by professional (fono_id) in memory if it's in appointments
    if (filters?.fono_id) {
      result = result.filter(item => item.appointments?.fono_id === filters.fono_id);
    }

    return result;
  },

  /**
   * Fetch a single billing by its UUID, including its transaction history.
   */
  async getBillingById(id: string): Promise<any | null> {
    if (!id) return null;
    const { data: billing, error: billingError } = await supabase
      .from('billings')
      .select(`
        *,
        companies ( id, name, limit_value, limit_type ),
        appointments (
          id,
          appointment_date,
          start_time,
          status,
          price_source,
          fono_id,
          agreed_price,
          discount_value,
          net_value,
          invoice_needed,
          billing_company_id,
          patients ( id, full_name, whatsapp ),
          profiles ( id, full_name ),
          appointment_types ( id, name ),
          companies ( id, name )
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (billingError) {
      console.error(`Error in getBillingById for ${id}:`, billingError);
      throw billingError;
    }

    if (!billing) return null;

    // Fetch transactions
    const { data: transactions, error: txError } = await supabase
      .from('billing_transactions')
      .select('*')
      .eq('billing_id', id)
      .order('payment_date', { ascending: true });

    if (txError) {
      console.error(`Error fetching transactions for billing ${id}:`, txError);
    }

    return {
      ...billing,
      billing_transactions: transactions || []
    };
  },

  /**
   * Sync billing for an appointment.
   * This is part of Phase 4's Automatic Invoice Engine.
   */
  async syncBillingForAppointment(appointmentId: string): Promise<void> {
    if (!appointmentId) return;

    try {
      // 1. Fetch appointment details (with its snapshotted pricing and company details)
      const { data: appt, error: apptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .maybeSingle();

      if (apptError) {
        console.error('Error fetching appointment for billing sync:', apptError);
        return;
      }
      if (!appt) return;

      if (appt.parent_appointment_id || appt.is_continuation) {
        console.log(`Skipping billing sync for continuation appointment: ${appointmentId}`);
        await supabase.from('billings').delete().eq('appointment_id', appointmentId);
        return;
      }

      const isCompany = !!appt.billing_company_id;
      const isAttended = appt.status === 'ATENDIDO';
      const isCancelled = appt.status === 'CANCELADO';

      // Rules:
      // - Particular (isCompany = false): Billing ALWAYS exists, starts as PENDING immediately on appointment creation.
      // - Empresa (isCompany = true): Billing is ONLY created when status becomes 'ATENDIDO'.
      
      const { data: existingBilling, error: bError } = await supabase
        .from('billings')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      if (bError) {
        console.error('Error checking existing billing:', bError);
        return;
      }

      let shouldExist = false;
      if (!isCompany) {
        shouldExist = true; // For particulars, always exist
      } else {
        if (isAttended) {
          shouldExist = true; // Corporate invoice generates once status is ATENDIDO
        } else if (existingBilling) {
          // If a corporate billing already exists (e.g. was attended but status changed), we keep it to prevent delete
          shouldExist = true;
        }
      }

      if (!shouldExist) {
        return;
      }

      // Calculate totals
      const grossTotal = Number(appt.agreed_price || 0);
      const discountTotal = Number(appt.discount_value || 0);
      const netTotal = Math.max(0, grossTotal - discountTotal);
      const dueDate = appt.appointment_date || new Date().toISOString().split('T')[0];

      // Map status
      let initialStatus: BillingStatus = 'PENDING';
      if (isCancelled) {
        initialStatus = 'CANCELLED';
      } else {
        const nowStr = new Date().toISOString().split('T')[0];
        if (dueDate < nowStr) {
          initialStatus = 'OVERDUE';
        }
      }

      if (existingBilling) {
        // Update bill details. But keep the status as is if it's already PAID/PARTIALLY_PAID
        let finalStatus = existingBilling.status;
        if (isCancelled) {
          finalStatus = 'CANCELLED';
        } else if (existingBilling.status === 'PENDING' || existingBilling.status === 'OVERDUE') {
          const nowStr = new Date().toISOString().split('T')[0];
          finalStatus = dueDate < nowStr ? 'OVERDUE' : 'PENDING';
        }

        const { error: updateError } = await supabase
          .from('billings')
          .update({
            billing_company_id: appt.billing_company_id || null,
            gross_total: grossTotal,
            discount_total: discountTotal,
            net_total: netTotal,
            status: finalStatus,
            due_date: dueDate,
            invoice_needed: appt.invoice_needed ?? false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBilling.id);

        if (updateError) {
          console.error('Error updating billing on sync:', updateError);
        } else {
          await this.recalculateBillingStatus(existingBilling.id);
        }
      } else {
        // Insert new billing
        const { data: inserted, error: insertError } = await supabase
          .from('billings')
          .insert([
            {
              appointment_id: appointmentId,
              billing_company_id: appt.billing_company_id || null,
              gross_total: grossTotal,
              discount_total: discountTotal,
              net_total: netTotal,
              status: initialStatus,
              due_date: dueDate,
              invoice_needed: appt.invoice_needed ?? false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting billing on sync:', insertError);
        } else if (inserted) {
          await this.recalculateBillingStatus(inserted.id);
        }
      }
    } catch (err) {
      console.error('Crash in syncBillingForAppointment:', err);
    }
  },

  /**
   * Recalculates and updates the billing status.
   * Runs inside background operations or triggers to reflect true transactions state.
   */
  async recalculateBillingStatus(billingId: string): Promise<BillingStatus> {
    if (!billingId) return 'PENDING';

    try {
      const { data: bill, error: bError } = await supabase
        .from('billings')
        .select(`
          status,
          due_date,
          net_total,
          appointments (
            net_value,
            agreed_price,
            discount_value,
            appointment_date
          )
        `)
        .eq('id', billingId)
        .maybeSingle();

      if (bError || !bill) {
        console.error('Error fetching billing for status recalculation:', bError);
        return 'PENDING';
      }

      // Preserve manually frozen terminal states
      if (bill.status === 'CANCELLED' || bill.status === 'WAIVED') {
        return bill.status as BillingStatus;
      }

      // Fetch CLEARED or REFUNDED transactions
      const { data: txList, error: txError } = await supabase
        .from('billing_transactions')
        .select('amount, status')
        .eq('billing_id', billingId)
        .in('status', ['CLEARED', 'REFUNDED']);

      if (txError) {
        console.error('Error fetching transactions for recalculation:', txError);
        return bill.status as BillingStatus;
      }

      let totalCleared = 0;
      for (const tx of (txList || [])) {
        totalCleared += Number(tx.amount || 0);
      }

      const appointmentsData: any = Array.isArray(bill.appointments)
        ? bill.appointments[0]
        : bill.appointments;

      const netTotal = Number(appointmentsData?.net_value ?? bill.net_total ?? 0);
      const remaining = netTotal - totalCleared;

      let newStatus: BillingStatus = 'PENDING';

      if (totalCleared === 0) {
        const nowStr = new Date().toISOString().split('T')[0];
        const dueStr = (appointmentsData?.appointment_date || bill.due_date || '').split('T')[0];
        if (dueStr && dueStr < nowStr) {
          newStatus = 'OVERDUE';
        } else {
          newStatus = 'PENDING';
        }
      } else if (remaining <= 0) {
        newStatus = 'PAID';
      } else {
        newStatus = 'PARTIALLY_PAID';
      }

      if (newStatus !== bill.status) {
        const { error: updError } = await supabase
          .from('billings')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', billingId);

        if (updError) {
          console.error('Error updating recalculated status:', updError);
        }
      }

      return newStatus;
    } catch (err) {
      console.error('Crash in recalculateBillingStatus:', err);
      return 'PENDING';
    }
  },

  /**
   * Register a new payment transaction for a billing.
   * If there are multiple parts (installments/split payment), register multiple.
   */
  async registerTransaction(txData: {
    billing_id: string;
    amount: number;
    payment_method: PaymentMethod;
    payment_date?: string;
    status: BillingTransactionStatus;
    installments?: number;
  }): Promise<BillingTransaction> {
    const { data, error } = await supabase
      .from('billing_transactions')
      .insert([
        {
          billing_id: txData.billing_id,
          amount: txData.amount,
          payment_method: txData.payment_method,
          payment_date: txData.payment_date || new Date().toISOString(),
          status: txData.status || 'CLEARED',
          installments: txData.installments || 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error registering billing transaction:', error);
      throw error;
    }

    // Trigger state cascade across parent billing
    await this.recalculateBillingStatus(txData.billing_id);

    return data as BillingTransaction;
  },

  /**
   * Estorno (Refund) mechanism.
   * Deleting transactions is forbidden. Creates a twin offsetting negative transaction.
   */
  async refundTransaction(originalTxId: string, notes?: string): Promise<BillingTransaction> {
    const { data: orig, error: origError } = await supabase
      .from('billing_transactions')
      .select('*')
      .eq('id', originalTxId)
      .maybeSingle();

    if (origError || !orig) {
      throw new Error('Original transaction not found for refund: ' + (origError?.message || ''));
    }

    // Insert REFUNDED offset negative record
    const { data: refundedTx, error: refundError } = await supabase
      .from('billing_transactions')
      .insert([
        {
          billing_id: orig.billing_id,
          amount: -Math.abs(Number(orig.amount)), // guaranteed negative value
          payment_method: orig.payment_method,
          payment_date: new Date().toISOString(),
          status: 'REFUNDED',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (refundError) {
      console.error('Error inserting refund transaction:', refundError);
      throw refundError;
    }

    // Recalculate parent billing
    await this.recalculateBillingStatus(orig.billing_id);

    return refundedTx as BillingTransaction;
  },

  /**
   * Marcar como Isento (Waive) or Cancel (Cancelamento).
   * Freezes terminal states manually.
   */
  async updateBillingStatusDirectly(billingId: string, status: 'WAIVED' | 'CANCELLED' | 'PENDING'): Promise<void> {
    const { error } = await supabase
      .from('billings')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', billingId);

    if (error) {
      console.error(`Error forcing billing ${billingId} to ${status}:`, error);
      throw error;
    }

    if (status === 'PENDING') {
      await this.recalculateBillingStatus(billingId);
    }
  },

  /**
   * Emitir NF (Save or update invoice number on billing)
   */
  async updateInvoiceNumber(billingId: string, invoiceNumber: string): Promise<void> {
    const { error } = await supabase
      .from('billings')
      .update({
        invoice_number: invoiceNumber,
        invoice_needed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', billingId);

    if (error) {
      console.error(`Error saving invoice number:`, error);
      throw error;
    }
  },

  /**
   * ETAPA 10 — PREPARAÇÃO PARA AGENDA DE SEXTA
   * Aggregates stats by Professional (Fono) for Friday Close calculations.
   */
  async getProductionByProfessional(startDate?: string, endDate?: string): Promise<any[]> {
    let query = supabase
      .from('appointments')
      .select(`
        id,
        agreed_price,
        discount_value,
        fono_id,
        parent_appointment_id,
        is_continuation,
        profiles ( id, full_name )
      `)
      .eq('status', 'ATENDIDO');

    if (startDate) query = query.gte('appointment_date', startDate);
    if (endDate) query = query.lte('appointment_date', endDate);

    let { data, error } = await query;
    if (error) {
      console.warn('Production select with new columns failed, retrying without them...', error);
      const fallbackQuery = supabase
        .from('appointments')
        .select(`
          id,
          agreed_price,
          discount_value,
          fono_id,
          profiles ( id, full_name )
        `)
        .eq('status', 'ATENDIDO');

      if (startDate) fallbackQuery.gte('appointment_date', startDate);
      if (endDate) fallbackQuery.lte('appointment_date', endDate);

      const res = await fallbackQuery;
      if (res.error) {
        console.error('All production query attempts failed:', res.error);
        throw res.error;
      }
      data = (res.data || []).map(item => ({
        ...item,
        parent_appointment_id: null,
        is_continuation: false
      })) as any;
    }

    // Aggregate in memory
    const map = new Map<string, any>();
    for (const app of (data || [])) {
      if (app.parent_appointment_id || app.is_continuation) {
        continue; // Skip continuation appointments from production/commission calculations
      }
      const fonoId = app.fono_id || 'unassigned';
      const profilesObj = (app as any).profiles;
      const fonoName = (Array.isArray(profilesObj) ? profilesObj[0]?.full_name : profilesObj?.full_name) || 'Profissional Sem Nome';
      
      const gross = Number(app.agreed_price || 0);
      const discount = Number(app.discount_value || 0);
      const net = Math.max(0, gross - discount);

      if (!map.has(fonoId)) {
        map.set(fonoId, {
          fono_id: fonoId,
          name: fonoName,
          count: 0,
          gross_total: 0,
          discount_total: 0,
          net_total: 0
        });
      }

      const entry = map.get(fonoId);
      entry.count += 1;
      entry.gross_total += gross;
      entry.discount_total += discount;
      entry.net_total += net;
    }

    return Array.from(map.values());
  },

  /**
   * ETAPA 10 — PREPARAÇÃO PARA AGENDA DE SEXTA
   * Aggregates corporate billing faturamento and limits by Company.
   */
  async getFaturamentoByCompany(startDate?: string, endDate?: string): Promise<any[]> {
    // We want details about all corporate appointments and their companies
    let query = supabase
      .from('appointments')
      .select(`
        id,
        agreed_price,
        discount_value,
        billing_company_id,
        parent_appointment_id,
        is_continuation,
        companies ( id, name, limit_value, limit_type )
      `)
      .eq('status', 'ATENDIDO')
      .not('billing_company_id', 'is', null);

    if (startDate) query = query.gte('appointment_date', startDate);
    if (endDate) query = query.lte('appointment_date', endDate);

    let { data, error } = await query;
    if (error) {
      console.warn('Faturamento select with new columns failed, retrying without them...', error);
      const fallbackQuery = supabase
        .from('appointments')
        .select(`
          id,
          agreed_price,
          discount_value,
          billing_company_id,
          companies ( id, name, limit_value, limit_type )
        `)
        .eq('status', 'ATENDIDO')
        .not('billing_company_id', 'is', null);

      if (startDate) fallbackQuery.gte('appointment_date', startDate);
      if (endDate) fallbackQuery.lte('appointment_date', endDate);

      const res = await fallbackQuery;
      if (res.error) {
        console.error('All company stats query attempts failed:', res.error);
        throw res.error;
      }
      data = (res.data || []).map(item => ({
        ...item,
        parent_appointment_id: null,
        is_continuation: false
      })) as any;
    }

    const map = new Map<string, any>();

    for (const app of (data || [])) {
      if (app.parent_appointment_id || app.is_continuation) {
        continue; // Skip continuation/prolonged appointments from corporate faturamento/consumption limits
      }
      const companyId = app.billing_company_id;
      const companiesObj = (app as any).companies;
      const comp = (Array.isArray(companiesObj) ? companiesObj[0] : companiesObj) || { name: 'Empresa Desconhecida', limit_value: 0, limit_type: 'NONE' };
      const cName = comp.name;
      const cLimit = Number(comp.limit_value || 0);
      
      const gross = Number(app.agreed_price || 0);
      const discount = Number(app.discount_value || 0);
      const net = Math.max(0, gross - discount);

      if (!map.has(companyId)) {
        map.set(companyId, {
          company_id: companyId,
          name: cName,
          limit_value: cLimit,
          limit_type: comp.limit_type,
          count: 0,
          farturado_total: 0,
          remaining_limit: cLimit
        });
      }

      const entry = map.get(companyId);
      entry.count += 1;
      entry.farturado_total += net;
    }

    const resultList = Array.from(map.values());
    // Calculate remaining limit for each
    for (const entry of resultList) {
      if (entry.limit_type !== 'NONE') {
        entry.remaining_limit = Math.max(0, entry.limit_value - entry.farturado_total);
      } else {
        entry.remaining_limit = Infinity;
      }
    }

    return resultList;
  }
};
