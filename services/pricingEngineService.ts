import { supabase } from '@/lib/supabase';
import { getChacaraById, updateChacara } from '@/services/chacarasService';
import {
  Chacara,
  ChacaraPricingRule,
  PricingCalculationInput,
  PricingBreakdownResult,
  DailyRateDetail,
  PricingAuditLog
} from '@/lib/chacaraTypes';

const LOCAL_STORAGE_RULES_KEY = 'chacara_pricing_rules_cache';

function getLocalRulesCache(): ChacaraPricingRule[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalRulesCache(rules: ChacaraPricingRule[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(rules));
  } catch (e) {}
}

function addOrUpdateLocalRule(rule: ChacaraPricingRule): void {
  const list = getLocalRulesCache();
  const idx = list.findIndex(r => r.id === rule.id);
  if (idx >= 0) {
    list[idx] = rule;
  } else {
    list.unshift(rule);
  }
  saveLocalRulesCache(list);
}

function removeLocalRule(ruleId: string): void {
  const list = getLocalRulesCache();
  const updated = list.filter(r => r.id !== ruleId);
  saveLocalRulesCache(updated);
}

export const pricingEngineService = {
  /**
   * Busca todas as regras de preço de uma chácara
   */
  async getPricingRules(chacaraId: string): Promise<ChacaraPricingRule[]> {
    if (!chacaraId) return [];

    let supabaseRules: ChacaraPricingRule[] = [];
    try {
      const { data, error } = await supabase
        .from('chacara_pricing_rules')
        .select('*')
        .eq('chacara_id', chacaraId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        supabaseRules = data as ChacaraPricingRule[];
      }
    } catch (err) {
      console.warn('[pricingEngineService] Supabase indisponível ao carregar regras:', err);
    }

    const localRules = getLocalRulesCache().filter(r => r.chacara_id === chacaraId);

    const supabaseIds = new Set(supabaseRules.map(r => r.id));
    const merged = [...supabaseRules];
    for (const lr of localRules) {
      if (!supabaseIds.has(lr.id)) {
        merged.push(lr);
      }
    }

    merged.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return merged;
  },

  /**
   * Cria uma nova regra de preço
   */
  async createPricingRule(
    ruleData: Partial<ChacaraPricingRule>,
    performedByName?: string
  ): Promise<ChacaraPricingRule> {
    const generatedId = ruleData.id || `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload: ChacaraPricingRule = {
      id: generatedId,
      chacara_id: ruleData.chacara_id!,
      name: ruleData.name || 'Nova Regra de Preço',
      rule_type: ruleData.rule_type || 'SPECIFIC_PERIOD',
      start_date: ruleData.start_date || undefined,
      end_date: ruleData.end_date || undefined,
      days_of_week: ruleData.days_of_week ?? [0, 1, 2, 3, 4, 5, 6],
      price_override: ruleData.price_override != null ? Number(ruleData.price_override) : undefined,
      discount_percentage: ruleData.discount_percentage ? Number(ruleData.discount_percentage) : 0,
      discount_amount: ruleData.discount_amount ? Number(ruleData.discount_amount) : 0,
      surcharge_percentage: ruleData.surcharge_percentage ? Number(ruleData.surcharge_percentage) : 0,
      surcharge_amount: ruleData.surcharge_amount ? Number(ruleData.surcharge_amount) : 0,
      min_stay_nights: ruleData.min_stay_nights ? Number(ruleData.min_stay_nights) : 1,
      min_reservation_value: ruleData.min_reservation_value ? Number(ruleData.min_reservation_value) : 0,
      priority: ruleData.priority ? Number(ruleData.priority) : 10,
      is_active: ruleData.is_active ?? true,
      notes: ruleData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    addOrUpdateLocalRule(payload);

    try {
      const { data, error } = await supabase
        .from('chacara_pricing_rules')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        addOrUpdateLocalRule(data as ChacaraPricingRule);
      }
    } catch (e) {
      console.warn('[pricingEngineService] Salvo localmente, erro Supabase:', e);
    }

    await this.logAudit({
      chacara_id: ruleData.chacara_id,
      action_type: 'RULE_CREATE',
      new_value: payload,
      reason: `Criação da regra "${payload.name}"`,
      performed_by_name: performedByName || 'Sistema'
    });

    return payload;
  },

  /**
   * Atualiza uma regra de preço existente
   */
  async updatePricingRule(
    id: string,
    ruleData: Partial<ChacaraPricingRule>,
    performedByName?: string
  ): Promise<ChacaraPricingRule> {
    const localList = getLocalRulesCache();
    const existingLocal = localList.find(r => r.id === id);

    const updatedRule: ChacaraPricingRule = {
      ...(existingLocal || ({} as ChacaraPricingRule)),
      ...ruleData,
      id,
      updated_at: new Date().toISOString()
    };

    addOrUpdateLocalRule(updatedRule);

    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (ruleData.name !== undefined) payload.name = ruleData.name;
      if (ruleData.rule_type !== undefined) payload.rule_type = ruleData.rule_type;
      if (ruleData.start_date !== undefined) payload.start_date = ruleData.start_date || null;
      if (ruleData.end_date !== undefined) payload.end_date = ruleData.end_date || null;
      if (ruleData.days_of_week !== undefined) payload.days_of_week = ruleData.days_of_week;
      if (ruleData.price_override !== undefined) payload.price_override = ruleData.price_override != null ? Number(ruleData.price_override) : null;
      if (ruleData.discount_percentage !== undefined) payload.discount_percentage = Number(ruleData.discount_percentage);
      if (ruleData.discount_amount !== undefined) payload.discount_amount = Number(ruleData.discount_amount);
      if (ruleData.surcharge_percentage !== undefined) payload.surcharge_percentage = Number(ruleData.surcharge_percentage);
      if (ruleData.surcharge_amount !== undefined) payload.surcharge_amount = Number(ruleData.surcharge_amount);
      if (ruleData.min_stay_nights !== undefined) payload.min_stay_nights = Number(ruleData.min_stay_nights);
      if (ruleData.min_reservation_value !== undefined) payload.min_reservation_value = Number(ruleData.min_reservation_value);
      if (ruleData.priority !== undefined) payload.priority = Number(ruleData.priority);
      if (ruleData.is_active !== undefined) payload.is_active = ruleData.is_active;
      if (ruleData.notes !== undefined) payload.notes = ruleData.notes;

      await supabase
        .from('chacara_pricing_rules')
        .update(payload)
        .eq('id', id);
    } catch (e) {
      console.warn('[pricingEngineService] Atualizado localmente, erro Supabase:', e);
    }

    await this.logAudit({
      chacara_id: updatedRule.chacara_id,
      action_type: 'RULE_UPDATE',
      old_value: existingLocal || {},
      new_value: updatedRule,
      reason: `Atualização da regra "${updatedRule.name || id}"`,
      performed_by_name: performedByName || 'Sistema'
    });

    return updatedRule;
  },

  /**
   * Remove uma regra de preço
   */
  async deletePricingRule(id: string, performedByName?: string): Promise<boolean> {
    const localList = getLocalRulesCache();
    const oldData = localList.find(r => r.id === id);

    removeLocalRule(id);

    try {
      await supabase
        .from('chacara_pricing_rules')
        .delete()
        .eq('id', id);
    } catch (e) {
      console.warn('[pricingEngineService] Excluído localmente, erro Supabase:', e);
    }

    if (oldData) {
      await this.logAudit({
        chacara_id: oldData.chacara_id,
        action_type: 'RULE_DELETE',
        old_value: oldData,
        reason: `Exclusão da regra "${oldData.name || id}"`,
        performed_by_name: performedByName || 'Sistema'
      });
    }

    return true;
  },

  /**
   * Duplica uma regra existente
   */
  async duplicatePricingRule(id: string, performedByName?: string): Promise<ChacaraPricingRule> {
    const rules = getLocalRulesCache();
    let rule = rules.find(r => r.id === id);

    if (!rule) {
      try {
        const { data } = await supabase
          .from('chacara_pricing_rules')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (data) rule = data as ChacaraPricingRule;
      } catch (e) {}
    }

    if (!rule) {
      throw new Error('Regra não encontrada para duplicação.');
    }

    const { id: _id, created_at: _c, updated_at: _u, ...rest } = rule;
    return this.createPricingRule(
      {
        ...rest,
        name: `${rule.name} (Cópia)`
      },
      performedByName
    );
  },

  /**
   * Atualiza as configurações de valores base e políticas da Chácara
   */
  async updateChacaraBasePricing(
    chacaraId: string,
    pricingData: Partial<Chacara>,
    performedByName?: string,
    reason?: string
  ): Promise<Chacara> {
    const oldChacara = await getChacaraById(chacaraId);

    const payload: Partial<Chacara> = {
      daily_rate_standard: Number(pricingData.daily_rate_standard ?? 0),
      daily_rate_weekend: Number(pricingData.daily_rate_weekend ?? 0),
      daily_rate_holiday: Number(pricingData.daily_rate_holiday ?? 0),
      cleaning_fee: Number(pricingData.cleaning_fee ?? 0),
      deposit_amount: Number(pricingData.deposit_amount ?? 0),
      extra_guest_fee: Number(pricingData.extra_guest_fee ?? 0),
      included_guests: Number(pricingData.included_guests ?? 0),
      max_capacity: Number(pricingData.max_capacity ?? pricingData.capacity_people ?? 0),
      capacity_people: Number(pricingData.max_capacity ?? pricingData.capacity_people ?? 0),
      allow_pets: Boolean(pricingData.allow_pets ?? true),
      pet_fee: Number(pricingData.pet_fee ?? 0),
      energy_fee: Number(pricingData.energy_fee ?? 0),
      event_fee: Number(pricingData.event_fee ?? 0),
      financial_notes: pricingData.financial_notes || ''
    };

    const updated = await updateChacara(chacaraId, payload);

    // Auditoria
    await this.logAudit({
      chacara_id: chacaraId,
      action_type: 'BASE_PRICING_UPDATE',
      old_value: oldChacara || {},
      new_value: updated,
      reason: reason || 'Atualização dos Valores Base e Políticas Financeiras',
      performed_by_name: performedByName || 'Sistema'
    });

    return updated;
  },

  /**
   * MOTOR DE PREÇOS: CÁLCULO AUTOMÁTICO DE RESERVA
   * Calcula diárias, taxas, descontos, acréscimos e total final.
   */
  calculateReservationPrice(
    input: PricingCalculationInput,
    chacara: Chacara,
    rules: ChacaraPricingRule[] = []
  ): PricingBreakdownResult {
    if (!input.checkin_date || !input.checkout_date) {
      return this.emptyResult(input, chacara);
    }

    const checkin = new Date(input.checkin_date + 'T00:00:00');
    const checkout = new Date(input.checkout_date + 'T00:00:00');

    if (isNaN(checkin.getTime()) || isNaN(checkout.getTime()) || checkout <= checkin) {
      return this.emptyResult(input, chacara);
    }

    // Número de diárias (noites)
    const diffTime = checkout.getTime() - checkin.getTime();
    const nightsCount = Math.ceil(diffTime / (1000 * 3600 * 24));

    const activeRules = rules
      .filter((r) => r.is_active)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const dailyDetails: DailyRateDetail[] = [];
    let dailyRatesSubtotal = 0;
    let ruleDiscountsTotal = 0;
    let ruleSurchargesTotal = 0;

    // Calcular dia a dia
    const currentDate = new Date(checkin);
    for (let i = 0; i < nightsCount; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay(); // 0=Domingo, 1=Segunda ... 6=Sábado
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6; // Sex, Sáb, Dom
      const isHoliday = false;

      // Tentar encontrar regra aplicável com maior prioridade
      const matchedRule = activeRules.find((rule) => {
        if (rule.min_stay_nights && nightsCount < rule.min_stay_nights) {
          return false;
        }

        if (rule.start_date && dateStr < rule.start_date) return false;
        if (rule.end_date && dateStr > rule.end_date) return false;

        if (rule.days_of_week && rule.days_of_week.length > 0) {
          if (!rule.days_of_week.includes(dayOfWeek)) return false;
        }

        return true;
      });

      let baseRate = Number(chacara.daily_rate_standard || 0);
      if (isWeekend && chacara.daily_rate_weekend) {
        baseRate = Number(chacara.daily_rate_weekend);
      }
      if (isHoliday && chacara.daily_rate_holiday) {
        baseRate = Number(chacara.daily_rate_holiday);
      }

      let appliedRate = baseRate;
      let appliedRuleName: string | undefined = undefined;

      if (matchedRule) {
        appliedRuleName = matchedRule.name;

        if (matchedRule.price_override != null && matchedRule.price_override > 0) {
          appliedRate = Number(matchedRule.price_override);
        }

        if (matchedRule.discount_percentage && matchedRule.discount_percentage > 0) {
          const disc = (appliedRate * matchedRule.discount_percentage) / 100;
          appliedRate -= disc;
          ruleDiscountsTotal += disc;
        } else if (matchedRule.discount_amount && matchedRule.discount_amount > 0) {
          appliedRate -= matchedRule.discount_amount;
          ruleDiscountsTotal += matchedRule.discount_amount;
        }

        if (matchedRule.surcharge_percentage && matchedRule.surcharge_percentage > 0) {
          const sur = (appliedRate * matchedRule.surcharge_percentage) / 100;
          appliedRate += sur;
          ruleSurchargesTotal += sur;
        } else if (matchedRule.surcharge_amount && matchedRule.surcharge_amount > 0) {
          appliedRate += matchedRule.surcharge_amount;
          ruleSurchargesTotal += matchedRule.surcharge_amount;
        }
      }

      dailyRatesSubtotal += appliedRate;

      dailyDetails.push({
        date: dateStr,
        day_of_week: dayOfWeek,
        is_weekend: isWeekend,
        is_holiday: isHoliday,
        applied_rule_name: appliedRuleName,
        base_rate: baseRate,
        applied_rate: appliedRate
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Cálculo de Hóspedes e Taxa Excedente
    const adults = Number(input.guests_adults || 0);
    const children = Number(input.guests_children || 0);
    const totalGuests = adults + children;
    const includedGuests = Number(chacara.included_guests || chacara.capacity_people || 0);
    const extraGuestsCount = Math.max(0, totalGuests - includedGuests);
    const extraGuestFeePerNight = Number(chacara.extra_guest_fee || 0);
    const extraGuestsTotal = extraGuestsCount * extraGuestFeePerNight * nightsCount;

    // Taxas da Chácara
    const cleaningFee = Number(chacara.cleaning_fee || 0);
    const depositAmount = Number(chacara.deposit_amount || 0);
    const petFee = (input.guests_pets && input.guests_pets > 0 && chacara.allow_pets) ? Number(chacara.pet_fee || 0) : 0;
    const energyFee = Number(chacara.energy_fee || 0);
    const eventFee = input.is_event ? Number(chacara.event_fee || 0) : 0;

    const totalFees = cleaningFee + petFee + energyFee + eventFee + extraGuestsTotal;

    const subtotalBeforeAdjustment = dailyRatesSubtotal + totalFees;

    const manualAdjustment = Number(input.manual_adjustment_amount || 0);

    const calculatedTotal = Math.max(0, subtotalBeforeAdjustment + manualAdjustment);

    const isCustomPrice = Boolean(input.is_custom_price || (input.custom_price != null && !isNaN(Number(input.custom_price))));
    const customPriceVal = input.custom_price != null && !isNaN(Number(input.custom_price)) ? Number(input.custom_price) : null;

    const totalAmount = isCustomPrice && customPriceVal != null ? Math.max(0, customPriceVal) : calculatedTotal;

    return {
      chacara_id: input.chacara_id,
      checkin_date: input.checkin_date,
      checkout_date: input.checkout_date,
      nights_count: nightsCount,
      daily_rates_details: dailyDetails,
      daily_rates_subtotal: dailyRatesSubtotal,
      total_guests: totalGuests,
      included_guests: includedGuests,
      extra_guests_count: extraGuestsCount,
      extra_guest_fee_per_night: extraGuestFeePerNight,
      extra_guests_total: extraGuestsTotal,
      cleaning_fee: cleaningFee,
      deposit_amount: depositAmount,
      pet_fee: petFee,
      energy_fee: energyFee,
      event_fee: eventFee,
      rule_discounts_total: ruleDiscountsTotal,
      rule_surcharges_total: ruleSurchargesTotal,
      manual_adjustment_amount: manualAdjustment,
      manual_adjustment_reason: input.manual_adjustment_reason || '',
      total_fees: totalFees,
      subtotal_before_adjustment: subtotalBeforeAdjustment,
      calculated_total: calculatedTotal,
      custom_price: customPriceVal,
      is_custom_price: isCustomPrice,
      total_amount: totalAmount
    };
  },

  emptyResult(input: PricingCalculationInput, chacara: Partial<Chacara>): PricingBreakdownResult {
    const adults = Number(input.guests_adults || 0);
    const children = Number(input.guests_children || 0);
    const totalGuests = adults + children;
    const cleaningFee = Number(chacara.cleaning_fee || 0);
    const depositAmount = Number(chacara.deposit_amount || 0);
    const calculatedTotal = cleaningFee + Number(input.manual_adjustment_amount || 0);

    const isCustomPrice = Boolean(input.is_custom_price || (input.custom_price != null && !isNaN(Number(input.custom_price))));
    const customPriceVal = input.custom_price != null && !isNaN(Number(input.custom_price)) ? Number(input.custom_price) : null;
    const totalAmount = isCustomPrice && customPriceVal != null ? Math.max(0, customPriceVal) : calculatedTotal;

    return {
      chacara_id: input.chacara_id,
      checkin_date: input.checkin_date || '',
      checkout_date: input.checkout_date || '',
      nights_count: 0,
      daily_rates_details: [],
      daily_rates_subtotal: 0,
      total_guests: totalGuests,
      included_guests: Number(chacara.included_guests || chacara.capacity_people || 0),
      extra_guests_count: 0,
      extra_guest_fee_per_night: Number(chacara.extra_guest_fee || 0),
      extra_guests_total: 0,
      cleaning_fee: cleaningFee,
      deposit_amount: depositAmount,
      pet_fee: 0,
      energy_fee: Number(chacara.energy_fee || 0),
      event_fee: 0,
      rule_discounts_total: 0,
      rule_surcharges_total: 0,
      manual_adjustment_amount: Number(input.manual_adjustment_amount || 0),
      manual_adjustment_reason: input.manual_adjustment_reason || '',
      total_fees: cleaningFee,
      subtotal_before_adjustment: cleaningFee,
      calculated_total: calculatedTotal,
      custom_price: customPriceVal,
      is_custom_price: isCustomPrice,
      total_amount: totalAmount
    };
  },

  /**
   * Grava log de auditoria
   */
  async logAudit(log: Partial<PricingAuditLog>): Promise<void> {
    try {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validChacaraId = log.chacara_id && UUID_REGEX.test(log.chacara_id) ? log.chacara_id : null;
      const validReservationId = log.reservation_id && UUID_REGEX.test(log.reservation_id) ? log.reservation_id : null;

      const payload = {
        chacara_id: validChacaraId,
        reservation_id: validReservationId,
        action_type: log.action_type || 'MANUAL_RESERVATION_ADJUSTMENT',
        old_value: log.old_value || {},
        new_value: log.new_value || {},
        reason: log.reason || '',
        performed_by_name: log.performed_by_name || 'Usuário do Sistema',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('pricing_audit_logs')
        .insert([payload]);

      if (error) {
        console.warn('[pricingEngineService] Log de auditoria aviso:', error.message);
      }
    } catch (e) {
      console.error('[pricingEngineService] Erro ao registrar auditoria:', e);
    }
  },

  /**
   * Obtém histórico de auditoria
   */
  async getAuditLogs(chacaraId?: string): Promise<PricingAuditLog[]> {
    try {
      let query = supabase
        .from('pricing_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (chacaraId) {
        query = query.eq('chacara_id', chacaraId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[pricingEngineService] Logs de auditoria indisponíveis:', error.message);
        return [];
      }
      return (data as PricingAuditLog[]) || [];
    } catch (e) {
      console.warn('[pricingEngineService] Erro ao buscar logs de auditoria:', e);
      return [];
    }
  }
};
