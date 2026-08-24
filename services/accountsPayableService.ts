import { supabase } from '@/lib/supabase';
import { 
  AccountPayable, 
  AccountPayableStatus, 
  AccountPayableType, 
  CreateAccountPayableInput, 
  UpdateAccountPayableInput, 
  MarkAsPaidInput, 
  AccountsPayableSummary, 
  AccountsPayableFilters,
  getAccountEffectiveValue,
  hasAccountRealValue
} from '@/lib/accountsPayableTypes';
import { isDemoMode } from '@/lib/appMode';

const STORAGE_KEY = 'chacaras_accounts_payable_cache_v1';
const DELETED_KEY = 'chacaras_accounts_payable_deleted_ids_v1';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

function getDeletedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function addDeletedId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getDeletedIds();
    current.add(id);
    localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn('[accountsPayableService] Erro ao registrar ID excluído:', e);
  }
}

function getLocalAccounts(): AccountPayable[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const defaults = getDefaultSampleAccounts();
      saveLocalAccounts(defaults);
      return defaults;
    }
    const parsed = JSON.parse(raw);
    const deleted = getDeletedIds();
    const list = Array.isArray(parsed) ? parsed : [];
    return list.filter(item => !deleted.has(item.id));
  } catch (e) {
    console.warn('[accountsPayableService] Erro ao ler cache local:', e);
    return [];
  }
}

function saveLocalAccounts(accounts: AccountPayable[]) {
  if (typeof window === 'undefined') return;
  try {
    const deleted = getDeletedIds();
    const filtered = accounts.filter(item => !deleted.has(item.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('[accountsPayableService] Erro ao salvar cache local:', e);
  }
}

function getDefaultSampleAccounts(): AccountPayable[] {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 5);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - 3);
  const pastDateStr = pastDate.toISOString().split('T')[0];

  const lastMonth = new Date(today);
  lastMonth.setDate(today.getDate() - 15);
  const lastMonthStr = lastMonth.toISOString().split('T')[0];

  return [
    {
      id: 'ap-sample-1',
      chacara_nome: 'Chácara Recanto Verde',
      descricao: 'Conta de Energia Elétrica (CPFL)',
      categoria: 'ENERGIA',
      tipo: 'RECORRENTE',
      recorrencia_frequencia: 'MENSAL',
      recorrencia_dia_vencimento: 10,
      data_vencimento: pastDateStr,
      valor_previsto: 500.00,
      valor_real: 537.82,
      status: 'VENCIDA',
      observacao: 'Fatura fechada com valor real apurado',
      created_at: new Date().toISOString()
    },
    {
      id: 'ap-sample-2',
      chacara_nome: 'Chácara Paraíso Solar',
      descricao: 'Tratamento Químico e Cloro da Piscina',
      categoria: 'PISCINA',
      tipo: 'AVULSA',
      data_vencimento: todayStr,
      valor_previsto: 250.00,
      valor_real: null,
      status: 'PENDENTE',
      prestador_nome: 'Carlos Piscinas',
      prestador_pix: 'carlos.piscinas@email.com',
      prestador_role: 'Piscineiro',
      observacao: 'Aplicação de sulfato e cloro para o fim de semana',
      created_at: new Date().toISOString()
    },
    {
      id: 'ap-sample-3',
      chacara_nome: 'Chácara Recanto Verde',
      descricao: 'Serviço de Roçagem e Jardinagem Geral',
      categoria: 'JARDINAGEM',
      tipo: 'RECORRENTE',
      recorrencia_frequencia: 'QUINZENAL',
      data_vencimento: nextWeekStr,
      valor_previsto: 380.00,
      valor_real: null,
      status: 'PENDENTE',
      prestador_nome: 'José Jardineiro',
      prestador_pix: '11999887766',
      prestador_role: 'Jardineiro',
      observacao: 'Poda de cerca viva e gramado principal',
      created_at: new Date().toISOString()
    },
    {
      id: 'ap-sample-4',
      chacara_nome: 'Geral / Compartilhada',
      descricao: 'Mensalidade Fibra Óptica Starlink / Provedor',
      categoria: 'INTERNET',
      tipo: 'RECORRENTE',
      recorrencia_frequencia: 'MENSAL',
      recorrencia_dia_vencimento: 15,
      data_vencimento: lastMonthStr,
      valor_previsto: 189.90,
      valor_real: 189.90,
      valor_pago: 189.90,
      data_pagamento: lastMonthStr,
      status: 'PAGA',
      responsavel_pagamento: 'Administrador',
      observacao: 'Pago via débito / PIX com comprovante arquivado',
      created_at: new Date().toISOString()
    }
  ];
}

async function insertWithFallback(tableName: string, payload: Record<string, any>) {
  let currentPayload = { ...payload };
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await supabase
      .from(tableName)
      .insert([currentPayload])
      .select();

    if (!error) {
      if (data && data.length > 0) {
        return data[0];
      }
      return { id: crypto.randomUUID(), ...currentPayload };
    }

    if (error) {
      const errMsg = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
      const match = errMsg.match(/Could not find the '([^']+)' column/i) || 
                    errMsg.match(/column [^\s\.]+\.([^\s]+) does not exist/i) ||
                    errMsg.match(/column "([^"]+)"/i) ||
                    errMsg.match(/column ([^\s]+) does not exist/i);
      if (match && match[1] && currentPayload[match[1]] !== undefined) {
        delete currentPayload[match[1]];
        continue;
      }
      throw error;
    }
  }
  return { id: crypto.randomUUID(), ...currentPayload };
}

async function updateWithFallback(tableName: string, id: string, payload: Record<string, any>) {
  if (!isValidUUID(id)) {
    return null;
  }
  let currentPayload = { ...payload };
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await supabase
      .from(tableName)
      .update(currentPayload)
      .eq('id', id)
      .select();

    if (!error) {
      if (data && data.length > 0) {
        return data[0];
      }
      return currentPayload;
    }

    if (error) {
      const errMsg = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
      const match = errMsg.match(/Could not find the '([^']+)' column/i) || 
                    errMsg.match(/column [^\s\.]+\.([^\s]+) does not exist/i) ||
                    errMsg.match(/column "([^"]+)"/i) ||
                    errMsg.match(/column ([^\s]+) does not exist/i);
      if (match && match[1] && currentPayload[match[1]] !== undefined) {
        delete currentPayload[match[1]];
        continue;
      }
      console.error('[accountsPayableService] Erro ao atualizar no Supabase:', error.message, error.details || '');
      return null;
    }
  }
  return null;
}

export async function getAccountsPayable(filters?: AccountsPayableFilters): Promise<AccountPayable[]> {
  const todayStr = new Date().toISOString().split('T')[0];
  const deleted = getDeletedIds();

  if (isDemoMode()) {
    let list = getLocalAccounts();
    // Auto-update status for overdue items
    list = list.map(acc => {
      if (acc.status === 'PENDENTE' && acc.data_vencimento < todayStr) {
        return { ...acc, status: 'VENCIDA' as AccountPayableStatus };
      }
      return acc;
    });
    saveLocalAccounts(list);
    return applyFilters(list, filters);
  }

  try {
    let query = supabase.from('accounts_payable').select('*').order('data_vencimento', { ascending: true });

    if (filters) {
      if (filters.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }
      if (filters.chacara_id && filters.chacara_id !== 'ALL') {
        if (filters.chacara_id === 'GENERAL') {
          query = query.is('chacara_id', null);
        } else {
          query = query.eq('chacara_id', filters.chacara_id);
        }
      }
      if (filters.categoria && filters.categoria !== 'ALL') {
        query = query.eq('categoria', filters.categoria);
      }
      if (filters.prestador_id && filters.prestador_id !== 'ALL') {
        query = query.eq('prestador_id', filters.prestador_id);
      }
      if (filters.tipo && filters.tipo !== 'ALL') {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters.startDate) {
        query = query.gte('data_vencimento', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('data_vencimento', filters.endDate);
      }
    }

    const { data, error } = await query;
    let localList = getLocalAccounts();

    if (error) {
      console.warn('[accountsPayableService] Supabase query falhou, usando cache local:', error.message);
      return applyFilters(localList, filters);
    }

    if (data) {
      // Map remote accounts
      const remoteFormatted: AccountPayable[] = data
        .filter((item: any) => !deleted.has(item.id))
        .map((item: any) => ({
          ...item,
          valor_previsto: Number(item.valor_previsto || 0),
          valor_real: item.valor_real !== undefined && item.valor_real !== null 
            ? Number(item.valor_real) 
            : (item.valor_pago != null ? Number(item.valor_pago) : null),
          valor_pago: item.valor_pago != null ? Number(item.valor_pago) : null,
          status: (item.status === 'PENDENTE' && item.data_vencimento < todayStr) 
            ? 'VENCIDA' 
            : item.status
        }));

      // Merge: keep local accounts that have been created or modified locally
      const mergedMap = new Map<string, AccountPayable>();
      
      // Remote first
      for (const rem of remoteFormatted) {
        mergedMap.set(rem.id, rem);
      }

      // Local accounts (overlay or local-only sample/offline accounts)
      for (const loc of localList) {
        if (deleted.has(loc.id)) continue;
        const existing = mergedMap.get(loc.id);
        if (!existing) {
          mergedMap.set(loc.id, loc);
        } else {
          // If local has newer updated_at or is more up-to-date, prioritize local
          if (loc.updated_at && (!existing.updated_at || loc.updated_at >= existing.updated_at)) {
            mergedMap.set(loc.id, { ...existing, ...loc });
          }
        }
      }

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => 
        (a.data_vencimento || '').localeCompare(b.data_vencimento || '')
      );

      saveLocalAccounts(mergedList);
      return applyFilters(mergedList, filters);
    }

    return applyFilters(localList, filters);
  } catch (e) {
    console.warn('[accountsPayableService] Exceção ao buscar contas, usando local:', e);
    return applyFilters(getLocalAccounts(), filters);
  }
}

function applyFilters(list: AccountPayable[], filters?: AccountsPayableFilters): AccountPayable[] {
  if (!filters) return list;
  return list.filter(acc => {
    if (filters.status && filters.status !== 'ALL') {
      if (acc.status !== filters.status) return false;
    }
    if (filters.chacara_id && filters.chacara_id !== 'ALL') {
      if (filters.chacara_id === 'GENERAL') {
        if (acc.chacara_id) return false;
      } else {
        if (acc.chacara_id !== filters.chacara_id) return false;
      }
    }
    if (filters.categoria && filters.categoria !== 'ALL') {
      if (acc.categoria !== filters.categoria) return false;
    }
    if (filters.prestador_id && filters.prestador_id !== 'ALL') {
      if (acc.prestador_id !== filters.prestador_id) return false;
    }
    if (filters.tipo && filters.tipo !== 'ALL') {
      if (acc.tipo !== filters.tipo) return false;
    }
    if (filters.startDate && acc.data_vencimento < filters.startDate) return false;
    if (filters.endDate && acc.data_vencimento > filters.endDate) return false;
    if (filters.search && filters.search.trim()) {
      const term = filters.search.toLowerCase().trim();
      const desc = acc.descricao.toLowerCase();
      const obs = acc.observacao ? acc.observacao.toLowerCase() : '';
      const prest = acc.prestador_nome ? acc.prestador_nome.toLowerCase() : '';
      const chac = acc.chacara_nome ? acc.chacara_nome.toLowerCase() : '';
      if (!desc.includes(term) && !obs.includes(term) && !prest.includes(term) && !chac.includes(term)) {
        return false;
      }
    }
    return true;
  });
}

export async function createAccountPayable(input: CreateAccountPayableInput): Promise<AccountPayable> {
  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = input.data_vencimento < todayStr;
  const initialStatus: AccountPayableStatus = isOverdue ? 'VENCIDA' : 'PENDENTE';

  const newRecord: AccountPayable = {
    id: crypto.randomUUID(),
    chacara_id: input.chacara_id || null,
    chacara_nome: input.chacara_nome || null,
    descricao: input.descricao.trim(),
    categoria: input.categoria,
    tipo: input.tipo,
    recorrencia_frequencia: input.recorrencia_frequencia || null,
    recorrencia_dia_vencimento: input.recorrencia_dia_vencimento || null,
    data_vencimento: input.data_vencimento,
    valor_previsto: Number(input.valor_previsto || 0),
    valor_real: input.valor_real !== undefined && input.valor_real !== null ? Number(input.valor_real) : null,
    status: initialStatus,
    prestador_id: input.prestador_id || null,
    prestador_nome: input.prestador_nome || null,
    prestador_pix: input.prestador_pix || null,
    prestador_role: input.prestador_role || null,
    origem_tipo: input.origem_tipo || 'MANUAL',
    origem_id: input.origem_id || null,
    origem_titulo: input.origem_titulo || null,
    origem_data_servico: input.origem_data_servico || null,
    provider_billing_rule_id: input.provider_billing_rule_id || null,
    observacao: input.observacao?.trim() || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. Local update
  const localList = getLocalAccounts();
  localList.unshift(newRecord);
  saveLocalAccounts(localList);

  if (isDemoMode()) {
    return newRecord;
  }

  // 2. Supabase insert
  try {
    const inserted = await insertWithFallback('accounts_payable', {
      chacara_id: newRecord.chacara_id,
      chacara_nome: newRecord.chacara_nome,
      descricao: newRecord.descricao,
      categoria: newRecord.categoria,
      tipo: newRecord.tipo,
      recorrencia_frequencia: newRecord.recorrencia_frequencia,
      recorrencia_dia_vencimento: newRecord.recorrencia_dia_vencimento,
      data_vencimento: newRecord.data_vencimento,
      valor_previsto: newRecord.valor_previsto,
      valor_real: newRecord.valor_real,
      status: newRecord.status,
      prestador_id: newRecord.prestador_id,
      prestador_nome: newRecord.prestador_nome,
      prestador_pix: newRecord.prestador_pix,
      prestador_role: newRecord.prestador_role,
      origem_tipo: newRecord.origem_tipo,
      origem_id: newRecord.origem_id,
      origem_titulo: newRecord.origem_titulo,
      origem_data_servico: newRecord.origem_data_servico,
      provider_billing_rule_id: newRecord.provider_billing_rule_id,
      observacao: newRecord.observacao
    });
    return inserted || newRecord;
  } catch (e) {
    console.warn('[accountsPayableService] Erro ao inserir no Supabase, salvo localmente:', e);
    return newRecord;
  }
}

export async function updateAccountPayable(id: string, input: UpdateAccountPayableInput): Promise<AccountPayable> {
  const localList = getLocalAccounts();
  const index = localList.findIndex(a => a.id === id);
  const existing = index >= 0 ? localList[index] : null;

  const isPaid = (input.status || existing?.status) === 'PAGA';
  const targetValorPrevisto = input.valor_previsto != null 
    ? Number(input.valor_previsto) 
    : (existing?.valor_previsto || 0);

  const targetValorReal = input.valor_real !== undefined 
    ? (input.valor_real != null ? Number(input.valor_real) : null) 
    : (existing?.valor_real ?? (existing?.valor_pago ?? null));

  let targetValorPago: number | null | undefined = input.valor_pago;
  if (targetValorPago === undefined) {
    if (isPaid) {
      // Se a conta está paga, o valor pago acompanha o valor real (se preenchido) ou o valor previsto
      targetValorPago = targetValorReal !== null ? targetValorReal : targetValorPrevisto;
    } else {
      targetValorPago = existing?.valor_pago ?? null;
    }
  } else {
    targetValorPago = targetValorPago != null ? Number(targetValorPago) : null;
  }

  const updated: AccountPayable = {
    ...(existing || { id } as AccountPayable),
    ...input,
    valor_previsto: targetValorPrevisto,
    valor_real: targetValorReal,
    valor_pago: targetValorPago,
    status: input.status || existing?.status || 'PENDENTE',
    updated_at: new Date().toISOString()
  };

  if (index >= 0) {
    localList[index] = updated;
  } else {
    localList.unshift(updated);
  }
  saveLocalAccounts(localList);

  if (isDemoMode()) {
    return updated;
  }

  try {
    const supabasePayload: Record<string, any> = {
      descricao: updated.descricao,
      categoria: updated.categoria,
      tipo: updated.tipo,
      recorrencia_frequencia: updated.recorrencia_frequencia ?? null,
      recorrencia_dia_vencimento: updated.recorrencia_dia_vencimento ?? null,
      data_vencimento: updated.data_vencimento,
      valor_previsto: updated.valor_previsto,
      valor_pago: updated.valor_pago,
      valor_real: updated.valor_real,
      status: updated.status,
      data_pagamento: updated.data_pagamento ?? null,
      responsavel_pagamento: updated.responsavel_pagamento ?? null,
      chacara_id: updated.chacara_id ?? null,
      chacara_nome: updated.chacara_nome ?? null,
      prestador_id: updated.prestador_id ?? null,
      prestador_nome: updated.prestador_nome ?? null,
      prestador_pix: updated.prestador_pix ?? null,
      prestador_role: updated.prestador_role ?? null,
      origem_tipo: updated.origem_tipo ?? 'MANUAL',
      origem_id: updated.origem_id ?? null,
      origem_titulo: updated.origem_titulo ?? null,
      origem_data_servico: updated.origem_data_servico ?? null,
      provider_billing_rule_id: updated.provider_billing_rule_id ?? null,
      observacao: updated.observacao ?? null,
      updated_at: new Date().toISOString()
    };

    const remote = await updateWithFallback('accounts_payable', id, supabasePayload);
    if (remote) {
      const mergedRemote: AccountPayable = {
        ...updated,
        ...remote,
        valor_previsto: Number(remote.valor_previsto ?? updated.valor_previsto),
        valor_real: remote.valor_real !== undefined && remote.valor_real !== null 
          ? Number(remote.valor_real) 
          : (remote.valor_pago != null ? Number(remote.valor_pago) : updated.valor_real),
        valor_pago: remote.valor_pago != null ? Number(remote.valor_pago) : updated.valor_pago
      };
      
      // Update local storage with remote merged confirmation
      const freshList = getLocalAccounts();
      const freshIdx = freshList.findIndex(a => a.id === id);
      if (freshIdx >= 0) {
        freshList[freshIdx] = mergedRemote;
      } else {
        freshList.unshift(mergedRemote);
      }
      saveLocalAccounts(freshList);
      return mergedRemote;
    }
    return updated;
  } catch (e) {
    console.error('[accountsPayableService] Exceção ao atualizar no Supabase:', e);
    return updated;
  }
}

export async function markAccountPayableAsPaid(id: string, input: MarkAsPaidInput): Promise<AccountPayable> {
  const valorPagoNum = Number(input.valor_pago);
  const payload: UpdateAccountPayableInput = {
    valor_pago: valorPagoNum,
    valor_real: valorPagoNum, // O valor efetivamente pago atualiza o valor real
    data_pagamento: input.data_pagamento,
    status: 'PAGA',
    responsavel_pagamento: input.responsavel_pagamento || 'Administrador',
    observacao: input.observacao
  };

  const updatedAccount = await updateAccountPayable(id, payload);

  // If this was a recurrent account, auto-generate the next recurring cycle with the standard valor_previsto
  if (updatedAccount.tipo === 'RECORRENTE') {
    try {
      await generateNextRecurringInstance(updatedAccount);
    } catch (e) {
      console.warn('[accountsPayableService] Erro ao gerar próxima recorrência:', e);
    }
  }

  return updatedAccount;
}

export async function generateNextRecurringInstance(account: AccountPayable): Promise<AccountPayable | null> {
  if (account.tipo !== 'RECORRENTE') return null;

  const curDate = new Date(account.data_vencimento + 'T12:00:00');
  let nextDate = new Date(curDate);

  const freq = account.recorrencia_frequencia || 'MENSAL';

  if (freq === 'SEMANAL') {
    nextDate.setDate(curDate.getDate() + 7);
  } else if (freq === 'QUINZENAL') {
    nextDate.setDate(curDate.getDate() + 15);
  } else if (freq === 'ANUAL') {
    nextDate.setFullYear(curDate.getFullYear() + 1);
  } else {
    // MENSAL (default)
    nextDate.setMonth(curDate.getMonth() + 1);
    if (account.recorrencia_dia_vencimento) {
      nextDate.setDate(account.recorrencia_dia_vencimento);
    }
  }

  const nextDateStr = nextDate.toISOString().split('T')[0];

  const nextInput: CreateAccountPayableInput = {
    chacara_id: account.chacara_id,
    chacara_nome: account.chacara_nome,
    descricao: account.descricao,
    categoria: account.categoria,
    tipo: 'RECORRENTE',
    recorrencia_frequencia: account.recorrencia_frequencia,
    recorrencia_dia_vencimento: account.recorrencia_dia_vencimento,
    data_vencimento: nextDateStr,
    valor_previsto: account.valor_previsto,
    prestador_id: account.prestador_id,
    prestador_nome: account.prestador_nome,
    prestador_pix: account.prestador_pix,
    prestador_role: account.prestador_role,
    observacao: account.observacao || undefined
  };

  return await createAccountPayable(nextInput);
}

export async function reopenAccountPayable(id: string): Promise<AccountPayable> {
  const localList = getLocalAccounts();
  const acc = localList.find(a => a.id === id);
  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = acc ? acc.data_vencimento < todayStr : false;

  return await updateAccountPayable(id, {
    valor_pago: null,
    data_pagamento: null,
    status: isOverdue ? 'VENCIDA' : 'PENDENTE',
    responsavel_pagamento: null
  });
}

export async function cancelAccountPayable(id: string, motivo?: string): Promise<AccountPayable> {
  return await updateAccountPayable(id, {
    status: 'CANCELADA',
    observacao: motivo ? `[Cancelado]: ${motivo}` : undefined
  });
}

export async function deleteAccountPayable(id: string): Promise<boolean> {
  addDeletedId(id);
  const localList = getLocalAccounts().filter(a => a.id !== id);
  saveLocalAccounts(localList);

  if (isDemoMode()) return true;
  if (!isValidUUID(id)) return true;

  try {
    const { error } = await supabase.from('accounts_payable').delete().eq('id', id);
    if (error) {
      console.warn('[accountsPayableService] Erro ao deletar no Supabase:', error.message);
    }
    return true;
  } catch (e) {
    console.warn('[accountsPayableService] Exceção ao excluir no Supabase:', e);
    return true;
  }
}

export async function getAccountsPayableSummary(): Promise<AccountsPayableSummary> {
  const accounts = await getAccountsPayable();
  const todayStr = new Date().toISOString().split('T')[0];

  let totalPrevisto = 0;
  let totalPago = 0;
  let totalVencido = 0;
  let totalHoje = 0;
  let totalProximo = 0;

  const vencidas: AccountPayable[] = [];
  const vencemHoje: AccountPayable[] = [];
  const proximas: AccountPayable[] = [];
  const pagas: AccountPayable[] = [];
  const recorrentes: AccountPayable[] = [];

  for (const acc of accounts) {
    if (acc.status === 'CANCELADA') continue;

    const valorConsiderado = getAccountEffectiveValue(acc);

    if (acc.tipo === 'RECORRENTE') {
      recorrentes.push(acc);
    }

    if (acc.status === 'PAGA') {
      pagas.push(acc);
      totalPago += valorConsiderado;
    } else {
      totalPrevisto += valorConsiderado;

      if (acc.data_vencimento < todayStr || acc.status === 'VENCIDA') {
        vencidas.push(acc);
        totalVencido += valorConsiderado;
      } else if (acc.data_vencimento === todayStr) {
        vencemHoje.push(acc);
        totalHoje += valorConsiderado;
      } else {
        proximas.push(acc);
        totalProximo += valorConsiderado;
      }
    }
  }

  return {
    totalPrevisto,
    totalPago,
    totalVencido,
    totalHoje,
    totalProximo,
    vencidas,
    vencemHoje,
    proximas,
    pagas,
    recorrentes
  };
}
