import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/appMode';
import {
  PlanningDecision,
  CreateDecisionInput,
  UpdateDecisionInput,
  DecisionStatus,
  DecisionType,
  DecisionClassification,
  DecisionStatusHistory,
  HistoryEventType
} from '@/lib/planningTypes';
import { formatCurrency } from '@/lib/utils';
import { getChacaras } from './chacarasService';

// In-memory / fallback store if offline or demo
let memoryDecisions: PlanningDecision[] = [];
let memoryHistory: DecisionStatusHistory[] = [];

// Helper to check valid UUID
function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Normaliza classificação com base no tipo se não for fornecida
 */
function deriveClassification(classification?: DecisionClassification, type?: DecisionType): DecisionClassification {
  if (classification) return classification;
  if (type === 'INVESTIMENTO' || type === 'REFORMA') return 'PROJETO_INVESTIMENTO';
  return 'OPERACIONAL';
}

/**
 * Normaliza linha vinda do Supabase garantindo campos estendidos via metadata
 */
function mapRowToDecision(row: any): PlanningDecision {
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const classification = row.classification || meta.classification || deriveClassification(undefined, row.decision_type);
  const postpone_reason = row.postpone_reason || meta.postpone_reason || null;
  const postponed_until = row.postponed_until || meta.postponed_until || null;
  const rejection_reason = row.rejection_reason || meta.rejection_reason || null;

  return {
    id: row.id,
    title: row.title || '',
    classification,
    description: row.description || '',
    chacara_id: row.chacara_id || null,
    decision_type: row.decision_type || 'OUTRO',
    estimated_cost: Number(row.estimated_cost || 0),
    target_date: row.target_date || null,
    status: row.status || 'EM_ANALISE',
    priority: row.priority || 'MEDIA',
    impact_notes: row.impact_notes || null,
    postpone_reason,
    postponed_until,
    rejection_reason,
    metadata: meta,
    created_by: row.created_by || null,
    created_by_name: row.created_by_name || null,
    is_deleted: Boolean(row.is_deleted),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    chacara: row.chacara || null
  };
}

/**
 * 1. Listar todas as Decisões de Planejamento com Filtros e Relacionamento com Chácara
 */
export async function getPlanningDecisions(filters?: {
  classification?: DecisionClassification | 'ALL';
  chacara_id?: string;
  status?: DecisionStatus | 'ALL';
  decision_type?: DecisionType | 'ALL';
  search?: string;
}): Promise<PlanningDecision[]> {
  if (isDemoMode()) {
    let list = [...memoryDecisions].filter(d => !d.is_deleted);
    if (filters?.classification && filters.classification !== 'ALL') {
      list = list.filter(d => d.classification === filters.classification);
    }
    if (filters?.chacara_id && filters.chacara_id !== 'ALL') {
      if (filters.chacara_id === 'GENERAL') {
        list = list.filter(d => !d.chacara_id);
      } else {
        list = list.filter(d => d.chacara_id === filters.chacara_id);
      }
    }
    if (filters?.status && (filters.status as string) !== 'ALL') {
      list = list.filter(d => d.status === filters.status);
    }
    if (filters?.decision_type && (filters.decision_type as string) !== 'ALL') {
      list = list.filter(d => d.decision_type === filters.decision_type);
    }
    if (filters?.search?.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(d => 
        d.title.toLowerCase().includes(q) || 
        (d.description && d.description.toLowerCase().includes(q)) ||
        (d.chacara?.name && d.chacara.name.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  try {
    let query = supabase
      .from('planning_decisions')
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
    if (filters?.status && (filters.status as string) !== 'ALL') {
      query = query.eq('status', filters.status);
    }
    if (filters?.decision_type && (filters.decision_type as string) !== 'ALL') {
      query = query.eq('decision_type', filters.decision_type);
    }
    if (filters?.search?.trim()) {
      query = query.ilike('title', `%${filters.search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[planningService] Erro ao buscar decisões no Supabase, usando memória:', error.message);
      return memoryDecisions.filter(d => !d.is_deleted);
    }

    let formatted: PlanningDecision[] = (data || []).map(mapRowToDecision);

    // Filtrar por classificação se necessário (garante tanto se veio da coluna quanto do metadata)
    if (filters?.classification && filters.classification !== 'ALL') {
      formatted = formatted.filter(d => d.classification === filters.classification);
    }

    // Sincronizar cache em memória
    memoryDecisions = formatted;
    return formatted;
  } catch (err) {
    console.error('[planningService] Exceção ao buscar decisões:', err);
    return memoryDecisions.filter(d => !d.is_deleted);
  }
}

/**
 * 2. Buscar Decisão por ID com Detalhes e Histórico
 */
export async function getPlanningDecisionById(id: string): Promise<PlanningDecision | null> {
  if (isDemoMode() || !isValidUUID(id)) {
    return memoryDecisions.find(d => d.id === id && !d.is_deleted) || null;
  }

  try {
    const { data, error } = await supabase
      .from('planning_decisions')
      .select(`
        *,
        chacara:chacaras(*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return memoryDecisions.find(d => d.id === id && !d.is_deleted) || null;
    }

    return mapRowToDecision(data);
  } catch (err) {
    console.error('[planningService] Erro ao buscar decisão por ID:', err);
    return memoryDecisions.find(d => d.id === id && !d.is_deleted) || null;
  }
}

/**
 * 3. Criar Nova Decisão de Planejamento e Gravar Evento Inicial no Histórico
 */
export async function createPlanningDecision(input: CreateDecisionInput): Promise<PlanningDecision> {
  const classification = deriveClassification(input.classification, input.decision_type);
  const newDecisionObj: PlanningDecision = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dec-${Date.now()}`,
    title: input.title.trim(),
    classification,
    description: input.description?.trim() || '',
    chacara_id: input.chacara_id && input.chacara_id !== 'NONE' ? input.chacara_id : null,
    decision_type: input.decision_type,
    estimated_cost: Number(input.estimated_cost || 0),
    target_date: input.target_date || null,
    status: input.status || 'EM_ANALISE',
    priority: input.priority || 'MEDIA',
    impact_notes: input.impact_notes?.trim() || null,
    postpone_reason: input.postpone_reason?.trim() || null,
    postponed_until: input.postponed_until || null,
    rejection_reason: input.rejection_reason?.trim() || null,
    metadata: {
      ...(input.metadata || {}),
      classification,
      postpone_reason: input.postpone_reason?.trim() || null,
      postponed_until: input.postponed_until || null,
      rejection_reason: input.rejection_reason?.trim() || null
    },
    created_by: input.created_by || null,
    created_by_name: input.created_by_name || 'Administrador',
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Preencher chácara localmente para retorno imediato se houver id
  if (newDecisionObj.chacara_id) {
    try {
      const allChacaras = await getChacaras();
      newDecisionObj.chacara = allChacaras.find(c => c.id === newDecisionObj.chacara_id) || null;
    } catch (e) {}
  }

  // Registrar histórico de criação na memória
  const historyItem: DecisionStatusHistory = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `hist-${Date.now()}`,
    decision_id: newDecisionObj.id,
    event_type: 'CRIACAO',
    previous_status: 'EM_ANALISE',
    new_status: newDecisionObj.status,
    reason: `CRIACAO: Decisão cadastrada no planejamento (Classificação: ${classification === 'PROJETO_INVESTIMENTO' ? 'Projeto / Investimento' : 'Decisão Operacional'} | Custo: ${formatCurrency(newDecisionObj.estimated_cost)})`,
    details: `Classificação: ${classification === 'PROJETO_INVESTIMENTO' ? 'Projeto / Investimento' : 'Decisão Operacional'} | Custo inicial: ${formatCurrency(newDecisionObj.estimated_cost)}`,
    changed_by: newDecisionObj.created_by_name || 'Administrador',
    created_at: new Date().toISOString()
  };
  memoryHistory.unshift(historyItem);

  if (isDemoMode()) {
    memoryDecisions.unshift(newDecisionObj);
    return newDecisionObj;
  }

  try {
    // Payload estritamente compatível com a tabela planning_decisions
    const payload: any = {
      title: newDecisionObj.title,
      description: newDecisionObj.description,
      chacara_id: newDecisionObj.chacara_id,
      decision_type: newDecisionObj.decision_type,
      estimated_cost: newDecisionObj.estimated_cost,
      target_date: newDecisionObj.target_date,
      status: newDecisionObj.status,
      priority: newDecisionObj.priority,
      impact_notes: newDecisionObj.impact_notes,
      metadata: newDecisionObj.metadata,
      created_by: newDecisionObj.created_by,
      created_by_name: newDecisionObj.created_by_name,
      is_deleted: false
    };

    const { data, error } = await supabase
      .from('planning_decisions')
      .insert([payload])
      .select(`
        *,
        chacara:chacaras(*)
      `)
      .single();

    if (error) {
      console.warn('[planningService] Erro ao inserir no Supabase, salvando em fallback:', error.message);
      memoryDecisions.unshift(newDecisionObj);
      return newDecisionObj;
    }

    const created = mapRowToDecision(data);
    if (!created.chacara && newDecisionObj.chacara) {
      created.chacara = newDecisionObj.chacara;
    }

    // Registrar histórico no Supabase
    try {
      await supabase.from('planning_decision_history').insert([{
        decision_id: created.id,
        previous_status: 'EM_ANALISE',
        new_status: created.status,
        reason: `CRIACAO: Decisão cadastrada - ${created.classification === 'PROJETO_INVESTIMENTO' ? 'Projeto / Investimento' : 'Decisão Operacional'} | Custo: ${formatCurrency(created.estimated_cost)}`,
        changed_by: created.created_by_name || 'Administrador'
      }]);
    } catch (e) {
      console.warn('[planningService] Falha ao gravar histórico de criação:', e);
    }

    // Atualiza cache em memória
    memoryDecisions = [created, ...memoryDecisions.filter(d => d.id !== created.id)];
    return created;
  } catch (err) {
    console.error('[planningService] Exceção ao criar decisão:', err);
    memoryDecisions.unshift(newDecisionObj);
    return newDecisionObj;
  }
}

/**
 * 4. Editar Decisão Existente (UPDATE) e Registrar Alterações Importantes
 */
export async function updatePlanningDecision(id: string, input: UpdateDecisionInput): Promise<PlanningDecision> {
  const existing = memoryDecisions.find(d => d.id === id);
  const previousCost = existing?.estimated_cost;
  const newCost = input.estimated_cost !== undefined ? Number(input.estimated_cost) : previousCost;

  const currentClassification = input.classification || existing?.classification || 'OPERACIONAL';
  const currentPostponeReason = input.postpone_reason !== undefined ? input.postpone_reason : existing?.postpone_reason;
  const currentPostponedUntil = input.postponed_until !== undefined ? input.postponed_until : existing?.postponed_until;
  const currentRejectionReason = input.rejection_reason !== undefined ? input.rejection_reason : existing?.rejection_reason;

  const mergedMetadata = {
    ...(existing?.metadata || {}),
    ...(input.metadata || {}),
    classification: currentClassification,
    postpone_reason: currentPostponeReason,
    postponed_until: currentPostponedUntil,
    rejection_reason: currentRejectionReason
  };

  const updatedLocal: PlanningDecision = {
    ...(existing || {}),
    id,
    title: input.title !== undefined ? input.title.trim() : (existing?.title || ''),
    classification: currentClassification,
    description: input.description !== undefined ? input.description.trim() : (existing?.description || ''),
    chacara_id: input.chacara_id !== undefined ? (input.chacara_id === 'NONE' ? null : input.chacara_id) : (existing?.chacara_id || null),
    decision_type: input.decision_type || existing?.decision_type || 'OUTRO',
    estimated_cost: newCost !== undefined ? Number(newCost) : 0,
    target_date: input.target_date !== undefined ? input.target_date : (existing?.target_date || null),
    status: input.status || existing?.status || 'EM_ANALISE',
    priority: input.priority || existing?.priority || 'MEDIA',
    impact_notes: input.impact_notes !== undefined ? input.impact_notes : (existing?.impact_notes || null),
    postpone_reason: currentPostponeReason || null,
    postponed_until: currentPostponedUntil || null,
    rejection_reason: currentRejectionReason || null,
    metadata: mergedMetadata,
    is_deleted: existing?.is_deleted || false,
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (updatedLocal.chacara_id) {
    try {
      const allChacaras = await getChacaras();
      updatedLocal.chacara = allChacaras.find(c => c.id === updatedLocal.chacara_id) || null;
    } catch (e) {}
  } else {
    updatedLocal.chacara = null;
  }

  // Se o custo foi modificado significativamente, registra histórico
  if (previousCost !== undefined && newCost !== undefined && Math.abs(previousCost - newCost) > 0.01) {
    const costHist: DecisionStatusHistory = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `hist-${Date.now()}`,
      decision_id: id,
      event_type: 'ALTERACAO_CUSTO',
      previous_status: updatedLocal.status,
      new_status: updatedLocal.status,
      reason: `Custo alterado: ${formatCurrency(previousCost)} → ${formatCurrency(newCost)}`,
      details: `${formatCurrency(previousCost)} → ${formatCurrency(newCost)}`,
      changed_by: 'Administrador',
      created_at: new Date().toISOString()
    };
    memoryHistory.unshift(costHist);

    if (!isDemoMode() && isValidUUID(id)) {
      supabase.from('planning_decision_history').insert([{
        decision_id: id,
        previous_status: updatedLocal.status,
        new_status: updatedLocal.status,
        reason: `Custo alterado: ${formatCurrency(previousCost)} → ${formatCurrency(newCost)}`,
        changed_by: 'Administrador'
      }]).then();
    }
  }

  if (isDemoMode() || !isValidUUID(id)) {
    memoryDecisions = memoryDecisions.map(d => d.id === id ? updatedLocal : d);
    return updatedLocal;
  }

  try {
    const payload: any = {
      updated_at: new Date().toISOString()
    };
    if (input.title !== undefined) payload.title = input.title.trim();
    if (input.description !== undefined) payload.description = input.description.trim();
    if (input.chacara_id !== undefined) payload.chacara_id = input.chacara_id === 'NONE' ? null : input.chacara_id;
    if (input.decision_type !== undefined) payload.decision_type = input.decision_type;
    if (input.estimated_cost !== undefined) payload.estimated_cost = Number(input.estimated_cost);
    if (input.target_date !== undefined) payload.target_date = input.target_date;
    if (input.status !== undefined) payload.status = input.status;
    if (input.priority !== undefined) payload.priority = input.priority;
    if (input.impact_notes !== undefined) payload.impact_notes = input.impact_notes;
    payload.metadata = mergedMetadata;

    const { data, error } = await supabase
      .from('planning_decisions')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        chacara:chacaras(*)
      `)
      .single();

    if (error) {
      console.warn('[planningService] Erro ao atualizar no Supabase:', error.message);
      memoryDecisions = memoryDecisions.map(d => d.id === id ? updatedLocal : d);
      return updatedLocal;
    }

    const updated = mapRowToDecision(data);
    if (!updated.chacara && updatedLocal.chacara) {
      updated.chacara = updatedLocal.chacara;
    }

    memoryDecisions = memoryDecisions.map(d => d.id === id ? updated : d);
    return updated;
  } catch (err) {
    console.error('[planningService] Exceção ao atualizar decisão:', err);
    memoryDecisions = memoryDecisions.map(d => d.id === id ? updatedLocal : d);
    return updatedLocal;
  }
}

/**
 * 5. Alteração Estruturada de Status com Justificativa, Prazos e Registro de Auditoria
 */
export async function updateDecisionStatus(
  id: string, 
  newStatus: DecisionStatus, 
  options?: {
    reason?: string;
    postponed_until?: string | null;
    changedBy?: string;
  }
): Promise<PlanningDecision> {
  const current = memoryDecisions.find(d => d.id === id);
  const previousStatus = current?.status || 'EM_ANALISE';
  const reason = options?.reason?.trim();
  const postponed_until = options?.postponed_until || null;
  const changedBy = options?.changedBy || 'Administrador';

  let eventType: HistoryEventType = 'MUDANCA_STATUS';
  if (newStatus === 'APROVADA') eventType = 'APROVACAO';
  else if (newStatus === 'ADIADA') eventType = 'ADIAMENTO';
  else if (newStatus === 'REJEITADA') eventType = 'REJEICAO';
  else if (newStatus === 'EM_ANALISE' && (previousStatus === 'ADIADA' || previousStatus === 'REJEITADA' || previousStatus === 'APROVADA')) {
    eventType = 'RETOMADA_ANALISE';
  }

  let detailsText = `${previousStatus} → ${newStatus}`;
  if (newStatus === 'ADIADA' && postponed_until) {
    const formattedReview = new Date(postponed_until + 'T00:00:00').toLocaleDateString('pt-BR');
    detailsText += ` | Revisão para: ${formattedReview}`;
  }
  if (reason) {
    detailsText += ` (${reason})`;
  }

  // Registrar histórico em memória
  const historyEntry: DecisionStatusHistory = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `hist-${Date.now()}`,
    decision_id: id,
    event_type: eventType,
    previous_status: previousStatus,
    new_status: newStatus,
    reason: reason || undefined,
    details: detailsText,
    changed_by: changedBy,
    created_at: new Date().toISOString()
  };
  memoryHistory.unshift(historyEntry);

  if (!isDemoMode() && isValidUUID(id)) {
    try {
      await supabase.from('planning_decision_history').insert([{
        decision_id: id,
        previous_status: previousStatus,
        new_status: newStatus,
        reason: `${eventType}: ${detailsText}`,
        changed_by: changedBy
      }]);
    } catch (e) {
      console.warn('[planningService] Falha ao registrar histórico no Supabase:', e);
    }
  }

  // Preparar payload de atualização
  const updatePayload: UpdateDecisionInput = {
    status: newStatus
  };

  if (newStatus === 'ADIADA') {
    updatePayload.postpone_reason = reason || null;
    updatePayload.postponed_until = postponed_until;
  } else if (newStatus === 'REJEITADA') {
    updatePayload.rejection_reason = reason || null;
  } else if (newStatus === 'EM_ANALISE') {
    // Ao retomar a análise
  }

  return updatePlanningDecision(id, updatePayload);
}

/**
 * 6. Excluir Decisão (Soft Delete)
 */
export async function deletePlanningDecision(id: string): Promise<boolean> {
  memoryDecisions = memoryDecisions.filter(d => d.id !== id);

  if (isDemoMode() || !isValidUUID(id)) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('planning_decisions')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.warn('[planningService] Erro ao deletar no Supabase:', error.message);
    }
    return !error;
  } catch (err) {
    console.error('[planningService] Exceção ao deletar decisão:', err);
    return true;
  }
}

/**
 * 7. Obter Histórico de Status e Eventos da Decisão
 */
export async function getDecisionStatusHistory(decisionId: string): Promise<DecisionStatusHistory[]> {
  if (isDemoMode() || !isValidUUID(decisionId)) {
    return memoryHistory
      .filter(h => h.decision_id === decisionId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  try {
    const { data, error } = await supabase
      .from('planning_decision_history')
      .select('*')
      .eq('decision_id', decisionId)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return memoryHistory
        .filter(h => h.decision_id === decisionId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const list: DecisionStatusHistory[] = data.map((row: any) => ({
      id: row.id,
      decision_id: row.decision_id,
      event_type: 'MUDANCA_STATUS',
      previous_status: row.previous_status,
      new_status: row.new_status,
      reason: row.reason || undefined,
      details: row.reason || undefined,
      changed_by: row.changed_by || undefined,
      created_at: row.created_at
    }));

    return list;
  } catch (err) {
    console.error('[planningService] Erro ao buscar histórico:', err);
    return memoryHistory
      .filter(h => h.decision_id === decisionId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

