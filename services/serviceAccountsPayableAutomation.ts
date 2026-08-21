import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/appMode';
import { OperationalEvent, CrewMember } from '@/lib/chacaraTypes';
import { 
  AccountPayable, 
  ProviderBillingRule, 
  CreateAccountPayableInput,
  AccountPayableStatus 
} from '@/lib/accountsPayableTypes';
import { 
  getProviderBillingRules, 
  findMatchingBillingRule, 
  calculateDueDateFromRule 
} from '@/services/providerBillingRulesService';
import { 
  getAccountsPayable, 
  createAccountPayable, 
  updateAccountPayable, 
  deleteAccountPayable,
  cancelAccountPayable
} from '@/services/accountsPayableService';
import { getCrewMembers } from '@/services/crewService';
import { getChacaras } from '@/services/chacarasService';

export interface ServiceAccountPayableAuditItem {
  event: OperationalEvent;
  hasLinkedAccount: boolean;
  linkedAccount?: AccountPayable;
  matchingRule?: ProviderBillingRule;
  staffMember?: CrewMember;
  chacara?: { id?: string; name?: string };
}

export interface ServiceAccountPayableAuditResult {
  totalEventsAudited: number;
  totalWithMatchingRules: number;
  totalAlreadyLinked: number;
  totalMissingToGenerate: number;
  missingServices: {
    event: OperationalEvent;
    rule: ProviderBillingRule;
    proposedDueDate: string;
    proposedAmount: number;
    staffMember?: CrewMember;
  }[];
  auditItems?: ServiceAccountPayableAuditItem[];
}

/**
 * Localiza conta a pagar já vinculada a uma prestação de serviço
 */
export async function getLinkedAccountPayableForService(serviceId: string): Promise<AccountPayable | null> {
  if (!serviceId) return null;

  try {
    const allAccounts = await getAccountsPayable({ status: 'ALL', origem_tipo: 'ALL' });
    const found = allAccounts.find(
      acc => acc.origem_id === serviceId && acc.status !== 'CANCELADA'
    );
    if (found) return found;

    // Se não encontrou não-cancelada, busca qualquer uma vinculada
    const anyLinked = allAccounts.find(acc => acc.origem_id === serviceId);
    return anyLinked || null;
  } catch (e) {
    console.warn('[serviceAccountsPayableAutomation] Erro ao buscar conta vinculada:', e);
    return null;
  }
}

/**
 * Cria automaticamente uma conta a pagar quando uma prestação de serviço é registrada
 */
export async function generateAccountPayableForService(
  event: OperationalEvent,
  customRuleOverride?: Partial<ProviderBillingRule>
): Promise<{ account: AccountPayable | null; created: boolean; reason?: string }> {
  if (!event || !event.id) {
    return { account: null, created: false, reason: 'Evento inválido ou sem ID' };
  }

  // 1. Verificação de Duplicidade: Se já existe conta a pagar ativa para este serviço, não cria duplicata!
  const existing = await getLinkedAccountPayableForService(event.id);
  if (existing && existing.status !== 'CANCELADA') {
    return { 
      account: existing, 
      created: false, 
      reason: 'Conta a pagar já existe para esta prestação de serviço.' 
    };
  }

  // 2. Identificar o prestador responsável
  const staffIds = Array.isArray(event.staff_ids) ? event.staff_ids.filter(Boolean) : [];
  if (staffIds.length === 0) {
    return { 
      account: null, 
      created: false, 
      reason: 'Nenhum funcionário/prestador atribuído ao serviço.' 
    };
  }

  const primaryStaffId = staffIds[0];

  // 3. Buscar dados do prestador
  let staffName = (event.staff_names && event.staff_names[0]) || 'Prestador de Serviço';
  let staffPix = '';
  let staffRole = 'Prestador';

  try {
    const crewMembers = await getCrewMembers();
    const staffObj = crewMembers.find(c => c.id === primaryStaffId);
    if (staffObj) {
      staffName = staffObj.nome || staffObj.name || staffName;
      staffPix = staffObj.pix_key || staffObj.chave_pix || '';
      staffRole = (staffObj.roles && staffObj.roles[0]?.nome) || staffObj.funcao || staffObj.role || staffRole;
    }
  } catch (e) {
    console.warn('[serviceAccountsPayableAutomation] Falha ao carregar prestador:', e);
  }

  // 4. Buscar regra de cobrança ativa para este prestador
  let rule: ProviderBillingRule | null = null;

  if (customRuleOverride && customRuleOverride.valor_padrao != null) {
    rule = {
      id: customRuleOverride.id || 'custom-override',
      prestador_id: primaryStaffId,
      prestador_nome: staffName,
      prestador_pix: staffPix,
      prestador_role: staffRole,
      chacara_id: event.chacara_id || null,
      chacara_nome: event.chacara_name || null,
      descricao_padrao: customRuleOverride.descricao_padrao || event.title || 'Serviço Operacional',
      categoria: customRuleOverride.categoria || 'EQUIPE_DIARIA',
      valor_padrao: Number(customRuleOverride.valor_padrao),
      regra_vencimento: customRuleOverride.regra_vencimento || 'SAME_DAY',
      dias_apos_servico: customRuleOverride.dias_apos_servico != null ? Number(customRuleOverride.dias_apos_servico) : 0,
      dia_fixo_mes: customRuleOverride.dia_fixo_mes,
      ativo: true
    };
  } else {
    rule = await findMatchingBillingRule(primaryStaffId, event.chacara_id, event.event_type_code);
  }

  if (!rule || !rule.ativo || rule.valor_padrao <= 0) {
    return { 
      account: null, 
      created: false, 
      reason: 'Nenhuma regra de cobrança ativa com valor configurado para este prestador.' 
    };
  }

  // 5. Calcular a data de vencimento com base na DATA REAL DO SERVIÇO (event.start_date)
  const serviceDate = event.start_date || new Date().toISOString().split('T')[0];
  const dueDate = calculateDueDateFromRule(
    serviceDate,
    rule.regra_vencimento,
    rule.dias_apos_servico,
    rule.dia_fixo_mes
  );

  // 6. Montar o payload da nova conta a pagar
  const createInput: CreateAccountPayableInput = {
    chacara_id: event.chacara_id || null,
    chacara_nome: event.chacara_name || (event.chacara_id ? 'Chácara Vinculada' : 'Geral'),
    descricao: rule.descricao_padrao || `${event.title} - ${staffName}`,
    categoria: rule.categoria || 'EQUIPE_DIARIA',
    tipo: 'AVULSA',
    data_vencimento: dueDate,
    valor_previsto: Number(rule.valor_padrao),
    prestador_id: primaryStaffId,
    prestador_nome: staffName,
    prestador_pix: staffPix || rule.prestador_pix || '',
    prestador_role: staffRole || rule.prestador_role || '',
    origem_tipo: 'PRESTACAO_SERVICO',
    origem_id: event.id,
    origem_titulo: event.title,
    origem_data_servico: serviceDate,
    provider_billing_rule_id: rule.id,
    observacao: `Gerado automaticamente via prestação de serviço agendada para ${serviceDate}. ${rule.observacao ? `(${rule.observacao})` : ''}`,
    registrado_por: 'Sistema Automático'
  };

  // 7. Criar a conta no módulo Contas a Pagar
  const createdAccount = await createAccountPayable(createInput);

  return { 
    account: createdAccount, 
    created: true 
  };
}

/**
 * Sincroniza a conta a pagar quando a prestação de serviço é alterada
 * Garante que contas já PAGAS NÃO sejam sobrescritas nem apagadas!
 */
export async function syncAccountPayableOnServiceUpdate(event: OperationalEvent): Promise<{ updated: boolean; reason?: string }> {
  if (!event || !event.id) return { updated: false, reason: 'Evento inválido' };

  const existingAccount = await getLinkedAccountPayableForService(event.id);
  if (!existingAccount) {
    // Se ainda não tinha conta gerada, tenta gerar agora se houver regra
    const genResult = await generateAccountPayableForService(event);
    return { updated: genResult.created, reason: genResult.reason };
  }

  // REGRA DE SEGURANÇA CRÍTICA: Se a conta já estiver PAGA, NÃO sobrescreve nem apaga o histórico!
  if (existingAccount.status === 'PAGA') {
    return {
      updated: false,
      reason: 'A conta vinculada já foi liquidada (PAGA). O histórico financeiro foi preservado integralmente.'
    };
  }

  // Se a conta for cancelada, não reativa automaticamente a menos que solicitado
  if (existingAccount.status === 'CANCELADA') {
    return { updated: false, reason: 'Conta a pagar estava cancelada.' };
  }

  // Recalcular data de vencimento com base na nova data do serviço
  const serviceDate = event.start_date || new Date().toISOString().split('T')[0];
  let newDueDate = existingAccount.data_vencimento;

  if (existingAccount.provider_billing_rule_id) {
    const rules = await getProviderBillingRules();
    const rule = rules.find(r => r.id === existingAccount.provider_billing_rule_id);
    if (rule) {
      newDueDate = calculateDueDateFromRule(
        serviceDate,
        rule.regra_vencimento,
        rule.dias_apos_servico,
        rule.dia_fixo_mes
      );
    }
  } else {
    newDueDate = serviceDate;
  }

  const staffIds = Array.isArray(event.staff_ids) ? event.staff_ids.filter(Boolean) : [];
  const primaryStaffId = staffIds[0] || existingAccount.prestador_id;

  await updateAccountPayable(existingAccount.id, {
    chacara_id: event.chacara_id || existingAccount.chacara_id,
    chacara_nome: event.chacara_name || existingAccount.chacara_nome,
    data_vencimento: newDueDate,
    origem_data_servico: serviceDate,
    origem_titulo: event.title,
    prestador_id: primaryStaffId,
    prestador_nome: (event.staff_names && event.staff_names[0]) || existingAccount.prestador_nome,
    observacao: `${existingAccount.observacao || ''} (Atualizado sincronizado com alteração no agendamento do serviço para ${serviceDate})`
  });

  return { updated: true };
}

/**
 * Gerencia o cancelamento ou exclusão de um serviço operacional
 * Preserva o histórico caso a conta já tenha sido paga!
 */
export async function handleAccountPayableOnServiceCancelOrDelete(
  serviceId: string, 
  motivo = 'Prestação de serviço operacional cancelada'
): Promise<{ handled: boolean; actionTaken: string }> {
  if (!serviceId) return { handled: false, actionTaken: 'ID inválido' };

  const existingAccount = await getLinkedAccountPayableForService(serviceId);
  if (!existingAccount) {
    return { handled: false, actionTaken: 'Nenhuma conta vinculada encontrada' };
  }

  // REGRA DE OURO: Se a conta já estiver PAGA, PRESERVA o registro financeiro!
  if (existingAccount.status === 'PAGA') {
    return { 
      handled: true, 
      actionTaken: 'Conta já está PAGA. Registro financeiro e comprovante foram preservados integralmente no histórico.' 
    };
  }

  // Se a conta estiver PENDENTE ou VENCIDA, marca como CANCELADA
  await cancelAccountPayable(existingAccount.id, motivo);
  return { 
    handled: true, 
    actionTaken: 'Conta a pagar pendente foi cancelada com sucesso.' 
  };
}

/**
 * Audita todos os serviços existentes para verificar quais não possuem contas a pagar geradas
 */
export async function auditExistingServicesForAccountsPayable(): Promise<ServiceAccountPayableAuditResult> {
  const { getOperationalEvents } = await import('@/services/operationalCalendarService');
  
  const [events, rules, accounts, crewMembers] = await Promise.all([
    getOperationalEvents(),
    getProviderBillingRules({ activeOnly: true }),
    getAccountsPayable({ status: 'ALL', origem_tipo: 'ALL' }),
    getCrewMembers()
  ]);

  const activeAccountsLinkedMap = new Map<string, AccountPayable>();
  accounts.forEach(acc => {
    if (acc.origem_id && acc.status !== 'CANCELADA') {
      activeAccountsLinkedMap.set(acc.origem_id, acc);
    }
  });

  const missingServices: ServiceAccountPayableAuditResult['missingServices'] = [];
  const auditItems: ServiceAccountPayableAuditItem[] = [];
  let totalWithMatchingRules = 0;
  let totalAlreadyLinked = 0;

  for (const event of events) {
    if (event.status === 'CANCELADO') continue;

    const staffIds = Array.isArray(event.staff_ids) ? event.staff_ids.filter(Boolean) : [];
    const primaryStaffId = staffIds.length > 0 ? staffIds[0] : null;
    const matchingRule = primaryStaffId 
      ? await findMatchingBillingRule(primaryStaffId, event.chacara_id, event.event_type_code)
      : null;
    const staffObj = primaryStaffId ? crewMembers.find(c => c.id === primaryStaffId) : undefined;
    const linkedAcc = activeAccountsLinkedMap.get(event.id);

    auditItems.push({
      event,
      hasLinkedAccount: !!linkedAcc,
      linkedAccount: linkedAcc,
      matchingRule: (matchingRule && matchingRule.ativo) ? matchingRule : undefined,
      staffMember: staffObj,
      chacara: event.chacara ? { id: event.chacara.id, name: event.chacara.name } : undefined
    });

    if (matchingRule && matchingRule.ativo && matchingRule.valor_padrao > 0) {
      totalWithMatchingRules++;

      if (activeAccountsLinkedMap.has(event.id)) {
        totalAlreadyLinked++;
      } else {
        const serviceDate = event.start_date || new Date().toISOString().split('T')[0];
        const proposedDueDate = calculateDueDateFromRule(
          serviceDate,
          matchingRule.regra_vencimento,
          matchingRule.dias_apos_servico,
          matchingRule.dia_fixo_mes
        );

        missingServices.push({
          event,
          rule: matchingRule,
          proposedDueDate,
          proposedAmount: matchingRule.valor_padrao,
          staffMember: staffObj
        });
      }
    }
  }

  return {
    totalEventsAudited: events.length,
    totalWithMatchingRules,
    totalAlreadyLinked,
    totalMissingToGenerate: missingServices.length,
    missingServices,
    auditItems
  };
}

/**
 * Geração em lote com prevenção total de duplicidades
 */
export async function batchGenerateAccountsForExistingServices(
  serviceIds?: string[]
): Promise<{ generatedCount: number; errors: string[] }> {
  const audit = await auditExistingServicesForAccountsPayable();
  let itemsToProcess = audit.missingServices;

  if (serviceIds && serviceIds.length > 0) {
    itemsToProcess = itemsToProcess.filter(item => serviceIds.includes(item.event.id));
  }

  let generatedCount = 0;
  const errors: string[] = [];

  for (const item of itemsToProcess) {
    try {
      const res = await generateAccountPayableForService(item.event, item.rule);
      if (res.created) {
        generatedCount++;
      } else if (res.reason) {
        errors.push(`Serviço ${item.event.title}: ${res.reason}`);
      }
    } catch (e: any) {
      errors.push(`Erro no serviço ${item.event.title}: ${e.message || 'Falha desconhecida'}`);
    }
  }

  return {
    generatedCount,
    errors
  };
}
