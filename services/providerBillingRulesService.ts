import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/appMode';
import { ProviderBillingRule, DueDateRuleType } from '@/lib/accountsPayableTypes';

const STORAGE_KEY = 'chacaras_provider_billing_rules_v1';

function getLocalBillingRules(): ProviderBillingRule[] {
  if (typeof window === 'undefined') return getDefaultSampleRules();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSampleRules();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : getDefaultSampleRules();
  } catch (e) {
    console.warn('[providerBillingRulesService] Erro ao ler cache local:', e);
    return getDefaultSampleRules();
  }
}

function saveLocalBillingRules(rules: ProviderBillingRule[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.warn('[providerBillingRulesService] Erro ao salvar cache local:', e);
  }
}

function getDefaultSampleRules(): ProviderBillingRule[] {
  return [
    {
      id: 'rule-sample-1',
      prestador_id: '00000000-0000-0000-0000-000000000001',
      prestador_nome: 'João Silva',
      prestador_role: 'Limpeza & Faxina',
      prestador_pix: 'joao.limpeza@email.com',
      chacara_id: null, // Todas as Chácaras
      chacara_nome: 'Geral (Todas as Chácaras)',
      descricao_padrao: 'Serviço de Limpeza & Faxina Pós-Reserva',
      categoria: 'EQUIPE_LIMPEZA',
      valor_padrao: 300.00,
      regra_vencimento: 'DAYS_AFTER',
      dias_apos_servico: 3,
      event_type_code: 'limpeza',
      ativo: true,
      observacao: 'Pagamento padrão de faxina por diária/serviço concluído',
      created_at: new Date().toISOString()
    },
    {
      id: 'rule-sample-2',
      prestador_id: '00000000-0000-0000-0000-000000000002',
      prestador_nome: 'Maria Santos',
      prestador_role: 'Piscineira & Manutenção',
      prestador_pix: 'maria.piscinas@email.com',
      chacara_id: null,
      chacara_nome: 'Geral (Todas as Chácaras)',
      descricao_padrao: 'Tratamento Químico e Aspiração de Piscina',
      categoria: 'PISCINA',
      valor_padrao: 180.00,
      regra_vencimento: 'SAME_DAY',
      dias_apos_servico: 0,
      event_type_code: 'piscina',
      ativo: true,
      observacao: 'Aplicação de cloro, algicida e aspiração semanal',
      created_at: new Date().toISOString()
    },
    {
      id: 'rule-sample-3',
      prestador_id: '00000000-0000-0000-0000-000000000003',
      prestador_nome: 'Carlos Oliveira',
      prestador_role: 'Jardineiro',
      prestador_pix: 'carlos.jardim@pix.com',
      chacara_id: null,
      chacara_nome: 'Geral (Todas as Chácaras)',
      descricao_padrao: 'Manutenção de Jardim, Gramado e Poda',
      categoria: 'JARDINAGEM',
      valor_padrao: 250.00,
      regra_vencimento: 'DAYS_AFTER',
      dias_apos_servico: 2,
      event_type_code: 'jardinagem',
      ativo: true,
      observacao: 'Roçagem de áreas externas e poda ornamental',
      created_at: new Date().toISOString()
    }
  ];
}

/**
 * Calcula a data de vencimento com base na data do serviço e na regra configurada
 */
export function calculateDueDateFromRule(
  serviceDateStr: string,
  regraVencimento: DueDateRuleType,
  diasAposServico?: number,
  diaFixoMes?: number
): string {
  if (!serviceDateStr) {
    serviceDateStr = new Date().toISOString().split('T')[0];
  }

  const baseDate = new Date(`${serviceDateStr.split('T')[0]}T12:00:00`);

  if (regraVencimento === 'SAME_DAY') {
    return serviceDateStr.split('T')[0];
  }

  if (regraVencimento === 'DAYS_AFTER') {
    const daysToAdd = diasAposServico != null && !isNaN(Number(diasAposServico)) ? Number(diasAposServico) : 0;
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    return targetDate.toISOString().split('T')[0];
  }

  if (regraVencimento === 'FIXED_DAY_MONTH') {
    const day = diaFixoMes || 5;
    const targetDate = new Date(baseDate);
    // Se o serviço foi depois do dia fixo, joga para o próximo mês
    if (targetDate.getDate() >= day) {
      targetDate.setMonth(targetDate.getMonth() + 1);
    }
    targetDate.setDate(Math.min(day, 28)); // limite seguro
    return targetDate.toISOString().split('T')[0];
  }

  return serviceDateStr.split('T')[0];
}

/**
 * Busca todas as regras de cobrança de prestadores
 */
export async function getProviderBillingRules(filters?: {
  prestador_id?: string;
  chacara_id?: string;
  activeOnly?: boolean;
}): Promise<ProviderBillingRule[]> {
  if (isDemoMode()) {
    let rules = getLocalBillingRules();
    if (filters?.prestador_id && filters.prestador_id !== 'ALL') {
      rules = rules.filter(r => r.prestador_id === filters.prestador_id);
    }
    if (filters?.chacara_id && filters.chacara_id !== 'ALL') {
      rules = rules.filter(r => !r.chacara_id || r.chacara_id === filters.chacara_id);
    }
    if (filters?.activeOnly) {
      rules = rules.filter(r => r.ativo);
    }
    return rules;
  }

  try {
    let query = supabase.from('provider_billing_rules').select('*').order('created_at', { ascending: false });

    if (filters?.prestador_id && filters.prestador_id !== 'ALL') {
      query = query.eq('prestador_id', filters.prestador_id);
    }
    if (filters?.activeOnly) {
      query = query.eq('ativo', true);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[providerBillingRulesService] Supabase falhou, usando cache local:', error.message);
      let localRules = getLocalBillingRules();
      if (filters?.prestador_id && filters.prestador_id !== 'ALL') {
        localRules = localRules.filter(r => r.prestador_id === filters.prestador_id);
      }
      return localRules;
    }

    if (data) {
      const formatted: ProviderBillingRule[] = data.map((r: any) => ({
        ...r,
        valor_padrao: Number(r.valor_padrao || 0),
        dias_apos_servico: r.dias_apos_servico != null ? Number(r.dias_apos_servico) : undefined,
        dia_fixo_mes: r.dia_fixo_mes != null ? Number(r.dia_fixo_mes) : undefined,
        ativo: r.ativo !== false
      }));
      saveLocalBillingRules(formatted);
      return formatted;
    }

    return [];
  } catch (e) {
    console.warn('[providerBillingRulesService] Exceção ao buscar regras, usando cache local:', e);
    return getLocalBillingRules();
  }
}

/**
 * Localiza a regra de cobrança mais específica e adequada para um determinado prestador e serviço
 */
export async function findMatchingBillingRule(
  prestadorId: string,
  chacaraId?: string | null,
  eventTypeCode?: string | null
): Promise<ProviderBillingRule | null> {
  if (!prestadorId) return null;

  const rules = await getProviderBillingRules({
    prestador_id: prestadorId,
    activeOnly: true
  });

  if (!rules || rules.length === 0) return null;

  // 1. Prioridade Máxima: Regra específica para esta chácara e este tipo de evento
  if (chacaraId && eventTypeCode) {
    const exactMatch = rules.find(r => r.chacara_id === chacaraId && r.event_type_code === eventTypeCode);
    if (exactMatch) return exactMatch;
  }

  // 2. Segunda Prioridade: Regra específica para esta chácara (qualquer evento)
  if (chacaraId) {
    const chacaraMatch = rules.find(r => r.chacara_id === chacaraId && !r.event_type_code);
    if (chacaraMatch) return chacaraMatch;
  }

  // 3. Terceira Prioridade: Regra geral com o mesmo tipo de evento (ex: 'limpeza')
  if (eventTypeCode) {
    const eventMatch = rules.find(r => (!r.chacara_id || r.chacara_id === null) && r.event_type_code === eventTypeCode);
    if (eventMatch) return eventMatch;
  }

  // 4. Quarta Prioridade: Regra geral do prestador (sem restrição de chácara ou evento)
  const generalRule = rules.find(r => !r.chacara_id && !r.event_type_code);
  if (generalRule) return generalRule;

  // Se houver qualquer regra ativa para o prestador, utiliza a primeira
  return rules[0] || null;
}

/**
 * Salva ou atualiza uma regra de cobrança de prestador
 */
export async function saveProviderBillingRule(rule: Partial<ProviderBillingRule>): Promise<ProviderBillingRule> {
  const localRules = getLocalBillingRules();
  const ruleId = rule.id || `rule-${Date.now()}`;
  const now = new Date().toISOString();

  const formattedRule: ProviderBillingRule = {
    id: ruleId,
    prestador_id: rule.prestador_id || '',
    prestador_nome: rule.prestador_nome || 'Prestador',
    prestador_pix: rule.prestador_pix || '',
    prestador_role: rule.prestador_role || '',
    chacara_id: rule.chacara_id || null,
    chacara_nome: rule.chacara_nome || (rule.chacara_id ? 'Chácara Vinculada' : 'Geral (Todas as Chácaras)'),
    descricao_padrao: rule.descricao_padrao || 'Serviço Prestado',
    categoria: rule.categoria || 'EQUIPE_DIARIA',
    valor_padrao: Number(rule.valor_padrao || 0),
    regra_vencimento: rule.regra_vencimento || 'SAME_DAY',
    dias_apos_servico: rule.dias_apos_servico != null ? Number(rule.dias_apos_servico) : 0,
    dia_fixo_mes: rule.dia_fixo_mes != null ? Number(rule.dia_fixo_mes) : 5,
    event_type_code: rule.event_type_code || null,
    ativo: rule.ativo !== false,
    observacao: rule.observacao || null,
    created_at: rule.created_at || now,
    updated_at: now
  };

  // Salvar no storage local
  const existingIdx = localRules.findIndex(r => r.id === ruleId);
  if (existingIdx >= 0) {
    localRules[existingIdx] = formattedRule;
  } else {
    localRules.unshift(formattedRule);
  }
  saveLocalBillingRules(localRules);

  if (isDemoMode()) {
    return formattedRule;
  }

  try {
    const { data, error } = await supabase
      .from('provider_billing_rules')
      .upsert([formattedRule])
      .select()
      .single();

    if (!error && data) {
      return {
        ...data,
        valor_padrao: Number(data.valor_padrao || 0),
        ativo: data.ativo !== false
      };
    }
  } catch (e) {
    console.warn('[providerBillingRulesService] Falha ao persistir no Supabase, mantido em cache local:', e);
  }

  return formattedRule;
}

/**
 * Exclui uma regra de cobrança
 */
export async function deleteProviderBillingRule(id: string): Promise<boolean> {
  const localRules = getLocalBillingRules().filter(r => r.id !== id);
  saveLocalBillingRules(localRules);

  if (isDemoMode()) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('provider_billing_rules')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('[providerBillingRulesService] Falha ao excluir no Supabase:', error.message);
    }
    return true;
  } catch (e) {
    console.warn('[providerBillingRulesService] Exceção ao excluir:', e);
    return true;
  }
}
