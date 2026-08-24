import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/appMode';
import {
  PlanningProcess,
  CreatePlanningProcessInput,
  UpdatePlanningProcessInput,
  PlanningProcessStatus,
  PlanningProcessType,
  ProcessDisbursement,
  ProcessViabilityResult
} from '@/lib/planningProcessTypes';
import { simulateProcessViability } from './financialProjectionService';
import { getChacaras } from './chacarasService';

// In-memory store for demo / offline fallback
let memoryProcesses: PlanningProcess[] = [];

async function ensureSeedProcesses(chacaras: any[]) {
  if (memoryProcesses.length > 0) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const chacara1 = chacaras[0];

  // Processo 1: Manutenção do motor da piscina (R$ 8.000)
  const disb1: ProcessDisbursement[] = [
    {
      id: 'disb-seed-1',
      process_id: 'proc-seed-1',
      installment_number: 1,
      due_date: todayStr,
      amount: 4000,
      notes: 'Entrada 50% na contratação'
    },
    {
      id: 'disb-seed-2',
      process_id: 'proc-seed-1',
      installment_number: 2,
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      amount: 4000,
      notes: 'Final 50% após conclusão'
    }
  ];

  try {
    const viability1 = await simulateProcessViability({
      title: 'Manutenção do motor da piscina',
      processType: 'MANUTENCAO',
      estimatedCost: 8000,
      disbursements: disb1,
      safetyBuffer: 5000,
      chacara_id: chacara1?.id
    });

    memoryProcesses.push({
      id: 'proc-seed-1',
      title: 'Manutenção do motor da piscina',
      description: 'Troca do rotor, vedação e revisão elétrica completa do motor principal da piscina.',
      chacara_id: chacara1?.id || null,
      process_type: 'MANUTENCAO',
      estimated_cost: 8000,
      payment_method: 'PARCELADO',
      disbursements: disb1,
      start_date: todayStr,
      target_date: disb1[0].due_date,
      priority: 'ALTA',
      status: viability1.verdict === 'VIAVEL' ? 'VIAVEL' : viability1.verdict === 'VIAVEL_COM_ATENCAO' ? 'VIAVEL_COM_ATENCAO' : 'NAO_VIAVEL',
      notes: 'Fornecedor HidroTech com garantia de 12 meses.',
      responsible_name: 'Carlos Manutenção',
      safety_buffer_amount: 5000,
      latest_viability_analysis: viability1,
      metadata: { disbursements: disb1, safety_buffer_amount: 5000, latest_viability_analysis: viability1 },
      is_deleted: false,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date().toISOString(),
      chacara: chacara1 || null
    });
  } catch (err) {
    console.warn('[planningProcessService] Falha ao simular seed 1:', err);
  }
}

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function mapRowToPlanningProcess(row: any): PlanningProcess {
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  
  let disbursements: ProcessDisbursement[] = [];
  if (Array.isArray(row.disbursements)) {
    disbursements = row.disbursements;
  } else if (meta.disbursements && Array.isArray(meta.disbursements)) {
    disbursements = meta.disbursements;
  } else {
    // Fallback: único desembolso no target_date ou hoje
    const cost = Number(row.estimated_cost || 0);
    if (cost > 0) {
      disbursements = [{
        id: `disb-${row.id || '1'}-1`,
        process_id: row.id,
        installment_number: 1,
        due_date: row.target_date || row.start_date || new Date().toISOString().split('T')[0],
        amount: cost,
        notes: 'Desembolso principal'
      }];
    }
  }

  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    chacara_id: row.chacara_id || null,
    process_type: row.process_type || 'OUTRO',
    estimated_cost: Number(row.estimated_cost || 0),
    payment_method: row.payment_method || (disbursements.length > 1 ? 'PARCELADO' : 'A_VISTA'),
    disbursements,
    start_date: row.start_date || null,
    target_date: row.target_date || null,
    priority: row.priority || 'MEDIA',
    status: row.status || 'EM_ANALISE',
    notes: row.notes || null,
    responsible_name: row.responsible_name || null,
    safety_buffer_amount: Number(row.safety_buffer_amount || meta.safety_buffer_amount || 5000),
    latest_viability_analysis: row.latest_viability_analysis || meta.latest_viability_analysis || null,
    metadata: meta,
    created_by: row.created_by || null,
    is_deleted: Boolean(row.is_deleted),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    chacara: row.chacara || null
  };
}

/**
 * 1. Listar todos os Processos de Planejamento com filtros
 */
export async function getPlanningProcesses(filters?: {
  chacara_id?: string;
  process_type?: PlanningProcessType | 'ALL';
  status?: PlanningProcessStatus | 'ALL';
  search?: string;
}): Promise<PlanningProcess[]> {
  const chacaras = await getChacaras();
  const chacaraMap = new Map(chacaras.map(c => [c.id, c]));

  if (isDemoMode()) {
    await ensureSeedProcesses(chacaras);
    let list = [...memoryProcesses].filter(p => !p.is_deleted);
    if (filters?.chacara_id && filters.chacara_id !== 'ALL') {
      if (filters.chacara_id === 'GENERAL') {
        list = list.filter(p => !p.chacara_id);
      } else {
        list = list.filter(p => p.chacara_id === filters.chacara_id);
      }
    }
    if (filters?.process_type && (filters.process_type as string) !== 'ALL') {
      list = list.filter(p => p.process_type === filters.process_type);
    }
    if (filters?.status && (filters.status as string) !== 'ALL') {
      list = list.filter(p => p.status === filters.status);
    }
    if (filters?.search?.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.responsible_name && p.responsible_name.toLowerCase().includes(q))
      );
    }

    list.forEach(p => {
      if (p.chacara_id && chacaraMap.has(p.chacara_id)) {
        p.chacara = chacaraMap.get(p.chacara_id);
      }
    });

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  try {
    let query = supabase
      .from('planning_processes')
      .select(`
        *,
        chacara:chacaras(*)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (filters?.chacara_id && filters.chacara_id !== 'ALL') {
      if (filters.chacara_id === 'GENERAL') {
        query = query.is('chacara_id', null);
      } else {
        query = query.eq('chacara_id', filters.chacara_id);
      }
    }
    if (filters?.process_type && (filters.process_type as string) !== 'ALL') {
      query = query.eq('process_type', filters.process_type);
    }
    if (filters?.status && (filters.status as string) !== 'ALL') {
      query = query.eq('status', filters.status);
    }
    if (filters?.search?.trim()) {
      query = query.ilike('title', `%${filters.search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[planningProcessService] Tabela planning_processes no Supabase não encontrada ou erro, usando fallback:', error.message);
      return memoryProcesses.filter(p => !p.is_deleted);
    }

    const formatted = (data || []).map(row => {
      const item = mapRowToPlanningProcess(row);
      if (item.chacara_id && chacaraMap.has(item.chacara_id) && !item.chacara) {
        item.chacara = chacaraMap.get(item.chacara_id);
      }
      return item;
    });

    memoryProcesses = formatted;
    return formatted;
  } catch (err) {
    console.error('[planningProcessService] Erro ao carregar processos:', err);
    return memoryProcesses.filter(p => !p.is_deleted);
  }
}

/**
 * 2. Obter Processo por ID
 */
export async function getPlanningProcessById(id: string): Promise<PlanningProcess | null> {
  const all = await getPlanningProcesses();
  return all.find(p => p.id === id) || null;
}

/**
 * 3. Criar Processo de Planejamento com Auto-Simulação de Viabilidade
 */
export async function createPlanningProcess(input: CreatePlanningProcessInput): Promise<PlanningProcess> {
  const now = new Date().toISOString();
  const processId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proc-${Date.now()}`;

  // Formatar parcelas/desembolsos
  const disbursements: ProcessDisbursement[] = (input.disbursements || []).map((d, index) => ({
    id: `disb-${processId}-${index + 1}`,
    process_id: processId,
    installment_number: d.installment_number || (index + 1),
    due_date: d.due_date,
    amount: Number(d.amount),
    notes: d.notes || undefined
  }));

  // Executar simulação de viabilidade imediata
  const viabilityAnalysis = await simulateProcessViability({
    title: input.title,
    processType: input.process_type,
    estimatedCost: Number(input.estimated_cost),
    disbursements,
    safetyBuffer: input.safety_buffer_amount !== undefined ? input.safety_buffer_amount : 5000,
    chacara_id: input.chacara_id || undefined
  });

  // Atualizar status conforme a viabilidade inicial caso esteja em análise
  let finalStatus: PlanningProcessStatus = input.status || 'EM_ANALISE';
  if (finalStatus === 'EM_ANALISE') {
    if (viabilityAnalysis.verdict === 'VIAVEL') finalStatus = 'VIAVEL';
    else if (viabilityAnalysis.verdict === 'VIAVEL_COM_ATENCAO') finalStatus = 'VIAVEL_COM_ATENCAO';
    else if (viabilityAnalysis.verdict === 'NAO_VIAVEL') finalStatus = 'NAO_VIAVEL';
  }

  const meta = {
    ...(input.metadata || {}),
    disbursements,
    safety_buffer_amount: input.safety_buffer_amount !== undefined ? input.safety_buffer_amount : 5000,
    latest_viability_analysis: viabilityAnalysis
  };

  const newProcess: PlanningProcess = {
    id: processId,
    title: input.title,
    description: input.description || '',
    chacara_id: input.chacara_id || null,
    process_type: input.process_type,
    estimated_cost: Number(input.estimated_cost),
    payment_method: input.payment_method,
    disbursements,
    start_date: input.start_date || null,
    target_date: input.target_date || (disbursements[0]?.due_date || null),
    priority: input.priority || 'MEDIA',
    status: finalStatus,
    notes: input.notes || null,
    responsible_name: input.responsible_name || null,
    safety_buffer_amount: input.safety_buffer_amount !== undefined ? input.safety_buffer_amount : 5000,
    latest_viability_analysis: viabilityAnalysis,
    metadata: meta,
    is_deleted: false,
    created_at: now,
    updated_at: now
  };

  // Se tiver chácara vinculada, carregar info
  if (newProcess.chacara_id) {
    const chacaras = await getChacaras();
    newProcess.chacara = chacaras.find(c => c.id === newProcess.chacara_id) || null;
  }

  // Tentar salvar no Supabase
  if (!isDemoMode()) {
    try {
      const payload: any = {
        id: newProcess.id,
        title: newProcess.title,
        description: newProcess.description,
        chacara_id: newProcess.chacara_id,
        process_type: newProcess.process_type,
        estimated_cost: newProcess.estimated_cost,
        payment_method: newProcess.payment_method,
        start_date: newProcess.start_date,
        target_date: newProcess.target_date,
        priority: newProcess.priority,
        status: newProcess.status,
        notes: newProcess.notes,
        responsible_name: newProcess.responsible_name,
        metadata: meta,
        is_deleted: false,
        created_at: now,
        updated_at: now
      };

      const { data, error } = await supabase
        .from('planning_processes')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.warn('[planningProcessService] Tabela no Supabase indisponível, salvo localmente:', error.message);
      }
    } catch (err) {
      console.warn('[planningProcessService] Erro ao persistir no Supabase:', err);
    }
  }

  memoryProcesses = [newProcess, ...memoryProcesses.filter(p => p.id !== newProcess.id)];
  return newProcess;
}

/**
 * 4. Atualizar Processo com Recálculo de Viabilidade
 */
export async function updatePlanningProcess(id: string, input: UpdatePlanningProcessInput): Promise<PlanningProcess> {
  const existing = await getPlanningProcessById(id);
  if (!existing) {
    throw new Error(`Processo com ID ${id} não encontrado.`);
  }

  const now = new Date().toISOString();

  let disbursements = existing.disbursements;
  if (input.disbursements) {
    disbursements = input.disbursements.map((d, index) => ({
      id: d.id || `disb-${id}-${index + 1}`,
      process_id: id,
      installment_number: d.installment_number || (index + 1),
      due_date: d.due_date,
      amount: Number(d.amount),
      notes: d.notes || undefined
    }));
  }

  const title = input.title !== undefined ? input.title : existing.title;
  const process_type = input.process_type !== undefined ? input.process_type : existing.process_type;
  const estimated_cost = input.estimated_cost !== undefined ? Number(input.estimated_cost) : existing.estimated_cost;
  const chacara_id = input.chacara_id !== undefined ? input.chacara_id : existing.chacara_id;
  const safety_buffer_amount = input.safety_buffer_amount !== undefined ? input.safety_buffer_amount : (existing.safety_buffer_amount || 5000);

  // Recalcular simulação se houve alteração em custos, datas ou colchão
  let viabilityAnalysis = input.latest_viability_analysis;
  if (!viabilityAnalysis) {
    viabilityAnalysis = await simulateProcessViability({
      title,
      processType: process_type,
      estimatedCost: estimated_cost,
      disbursements,
      safetyBuffer: safety_buffer_amount,
      chacara_id: chacara_id || undefined
    });
  }

  let finalStatus = input.status !== undefined ? input.status : existing.status;
  if (input.status === undefined && existing.status !== 'RASCUNHO' && existing.status !== 'ARQUIVADO') {
    if (viabilityAnalysis.verdict === 'VIAVEL') finalStatus = 'VIAVEL';
    else if (viabilityAnalysis.verdict === 'VIAVEL_COM_ATENCAO') finalStatus = 'VIAVEL_COM_ATENCAO';
    else if (viabilityAnalysis.verdict === 'NAO_VIAVEL') finalStatus = 'NAO_VIAVEL';
  }

  const meta = {
    ...(existing.metadata || {}),
    ...(input.metadata || {}),
    disbursements,
    safety_buffer_amount,
    latest_viability_analysis: viabilityAnalysis
  };

  const updated: PlanningProcess = {
    ...existing,
    title,
    description: input.description !== undefined ? input.description : existing.description,
    chacara_id,
    process_type,
    estimated_cost,
    payment_method: input.payment_method !== undefined ? input.payment_method : existing.payment_method,
    disbursements,
    start_date: input.start_date !== undefined ? input.start_date : existing.start_date,
    target_date: input.target_date !== undefined ? input.target_date : existing.target_date,
    priority: input.priority !== undefined ? input.priority : existing.priority,
    status: finalStatus,
    notes: input.notes !== undefined ? input.notes : existing.notes,
    responsible_name: input.responsible_name !== undefined ? input.responsible_name : existing.responsible_name,
    safety_buffer_amount,
    latest_viability_analysis: viabilityAnalysis,
    metadata: meta,
    updated_at: now
  };

  if (!isDemoMode()) {
    try {
      const payload: any = {
        title: updated.title,
        description: updated.description,
        chacara_id: updated.chacara_id,
        process_type: updated.process_type,
        estimated_cost: updated.estimated_cost,
        payment_method: updated.payment_method,
        start_date: updated.start_date,
        target_date: updated.target_date,
        priority: updated.priority,
        status: updated.status,
        notes: updated.notes,
        responsible_name: updated.responsible_name,
        metadata: meta,
        updated_at: now
      };

      await supabase
        .from('planning_processes')
        .update(payload)
        .eq('id', id);
    } catch (err) {
      console.warn('[planningProcessService] Erro ao atualizar no Supabase:', err);
    }
  }

  memoryProcesses = memoryProcesses.map(p => p.id === id ? updated : p);
  return updated;
}

/**
 * 5. Excluir / Arquivar Processo
 */
export async function deletePlanningProcess(id: string): Promise<boolean> {
  if (!isDemoMode()) {
    try {
      await supabase
        .from('planning_processes')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.warn('[planningProcessService] Erro ao excluir no Supabase:', err);
    }
  }

  memoryProcesses = memoryProcesses.filter(p => p.id !== id);
  return true;
}
