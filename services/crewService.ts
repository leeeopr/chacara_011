import { supabase } from '@/lib/supabase';
import { 
  CrewRole, 
  CrewMember, 
  CrewMemberRole, 
  PropertyCrew, 
  CrewAuditLog, 
  Chacara,
  CrewReservationPaymentSchedule
} from '@/lib/chacaraTypes';
import { getChacaras } from '@/services/chacarasService';
import { getReservations } from '@/services/reservationsService';
import { isDemoMode } from '@/lib/appMode';
import { demoRepository } from '@/lib/demoRepository';

async function recordAuditLog(log: Omit<CrewAuditLog, 'id' | 'created_at'>) {
  try {
    await supabase.from('crew_audit_logs').insert([{
      ...log,
      created_at: new Date().toISOString()
    }]);
  } catch (e) {
    console.warn('[crewService] Erro ao registrar log de auditoria no Supabase:', e);
  }
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
  let currentPayload = { ...payload };
  Object.keys(currentPayload).forEach(k => {
    if (currentPayload[k] === undefined) delete currentPayload[k];
  });

  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await supabase
      .from(tableName)
      .update(currentPayload)
      .eq('id', id)
      .select();

    if (!error) {
      return data && data.length > 0 ? data[0] : { id, ...currentPayload };
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
  return { id, ...currentPayload };
}

// ==========================================
// FUNÇÕES DA EQUIPE (CREW ROLES)
// ==========================================

export async function getCrewRoles(includeInactive = true): Promise<CrewRole[]> {
  if (isDemoMode()) {
    return demoRepository.getCrewRoles(includeInactive);
  }
  try {
    const { data, error } = await supabase.from('crew_roles').select('*');
    if (error) {
      console.error('[crewService] Erro ao buscar funções da equipe:', error.message);
      return [];
    }
    let roles = ((data as any[]) || []).map(r => ({
      ...r,
      nome: r.nome || r.name || r.title || r.role_name || 'Sem nome',
      cor: r.cor || r.color || '#10B981',
      icone: r.icone || r.icon || 'Sparkles',
      descricao: r.descricao || r.description,
      ativo: r.ativo ?? r.active ?? r.is_active ?? true,
      ordem_exibicao: r.ordem_exibicao ?? r.order ?? 1,
    }));

    if (!includeInactive) {
      roles = roles.filter(r => r.ativo);
    }

    return roles.sort((a, b) => {
      if (a.ordem_exibicao !== undefined && b.ordem_exibicao !== undefined) {
        return (a.ordem_exibicao || 0) - (b.ordem_exibicao || 0);
      }
      return (a.nome || '').localeCompare(b.nome || '');
    });
  } catch (e) {
    console.error('[crewService] Exceção ao buscar funções:', e);
    return [];
  }
}

export async function createCrewRole(roleData: Omit<CrewRole, 'id' | 'created_at' | 'updated_at'>): Promise<CrewRole> {
  if (isDemoMode()) {
    return demoRepository.createCrewRole(roleData);
  }
  const { ordem_exibicao: _oe, ...cleanData } = roleData as any;
  const roleName = cleanData.nome || cleanData.name || cleanData.title || 'Sem nome';
  const payload = {
    ...cleanData,
    nome: roleName,
    name: roleName,
    title: roleName,
    ativo: roleData.ativo ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const data = await insertWithFallback('crew_roles', payload);

    await recordAuditLog({
      role_id: data.id,
      operation: 'CREATE_ROLE',
      details: `Criada função "${data.nome || data.name || roleName}"`,
      performed_by: 'Administrador'
    });

    return {
      ...data,
      nome: data.nome || data.name || roleName,
      cor: data.cor || roleData.cor,
      icone: data.icone || roleData.icone,
      descricao: data.descricao || roleData.descricao,
      ativo: data.ativo ?? true
    } as CrewRole;
  } catch (error: any) {
    console.error('[crewService] Erro ao criar função no Supabase:', error.message);
    throw new Error('Falha ao criar função no banco de dados: ' + error.message);
  }
}

export async function updateCrewRole(id: string, roleData: Partial<CrewRole>): Promise<CrewRole> {
  if (isDemoMode()) {
    return demoRepository.updateCrewRole(id, roleData);
  }
  const { ordem_exibicao: _oe, ...cleanData } = roleData as any;
  const roleName = cleanData.nome || cleanData.name || cleanData.title;
  const payload = {
    ...cleanData,
    ...(roleName !== undefined ? { nome: roleName, name: roleName, title: roleName } : {}),
    updated_at: new Date().toISOString()
  };

  try {
    const data = await updateWithFallback('crew_roles', id, payload);

    await recordAuditLog({
      role_id: id,
      operation: 'UPDATE_ROLE',
      details: `Atualizada função "${roleName || id}"`,
      performed_by: 'Administrador'
    });

    return (data || { id, ...roleData }) as CrewRole;
  } catch (error: any) {
    console.error('[crewService] Erro ao atualizar função:', error.message);
    throw new Error('Falha ao atualizar função no banco de dados: ' + error.message);
  }
}

export async function deleteCrewRole(id: string): Promise<void> {
  if (isDemoMode()) {
    return demoRepository.deleteCrewRole(id);
  }
  // Verificar se a função está em uso por algum funcionário
  const members = await getCrewMembers();
  const membersUsingRole = members.filter(m => m.role_ids?.includes(id));

  if (membersUsingRole.length > 0) {
    throw new Error(
      `Não é possível excluir esta função pois ela está associada a ${membersUsingRole.length} funcionário(s) (${membersUsingRole.map(m => m.nome).join(', ')}). Desative-a para ocultar das seleções.`
    );
  }

  const { error } = await supabase.from('crew_roles').delete().eq('id', id);
  if (error) {
    console.error('[crewService] Erro ao excluir função no Supabase:', error.message);
    throw new Error('Falha ao excluir função no banco de dados: ' + error.message);
  }

  await recordAuditLog({
    role_id: id,
    operation: 'DELETE_ROLE',
    details: `Função ${id} excluída do cadastro`,
    performed_by: 'Administrador'
  });
}

// ==========================================
// CADASTRO DE FUNCIONÁRIOS (CREW MEMBERS)
// ==========================================

export async function getCrewMembers(filters?: {
  search?: string;
  roleId?: string;
  chacaraId?: string;
  activeOnly?: boolean;
}): Promise<CrewMember[]> {
  if (isDemoMode()) {
    return demoRepository.getCrewMembers(filters);
  }
  const [allRoles, allChacaras] = await Promise.all([
    getCrewRoles(true),
    getChacaras()
  ]);

  let members: CrewMember[] = [];
  let memberRolesList: CrewMemberRole[] = [];
  let propertyCrewList: PropertyCrew[] = [];

  const { data: mData, error: mErr } = await supabase.from('crew_members').select('*');
  if (mErr) {
    console.error('[crewService] Erro ao buscar colaboradores:', mErr.message);
  } else if (mData) {
    members = (mData as any[]).map(m => ({
      ...m,
      nome: m.nome || m.name || m.full_name || '',
      pix_key: m.pix_key || m.pixKey || m.chave_pix || '',
      payment_frequency: m.payment_frequency || m.paymentFrequency || m.recorrencia_pagamento || 'MONTHLY',
      ativo: m.ativo ?? m.active ?? m.is_active ?? true
    })) as CrewMember[];
  }

  const { data: mrData, error: mrErr } = await supabase.from('crew_member_roles').select('*');
  if (mrErr) {
    console.warn('[crewService] Alerta ao buscar funções de colaboradores:', mrErr.message);
  } else if (mrData) {
    memberRolesList = (mrData as any[]).map(mr => ({
      ...mr,
      member_id: mr.member_id || mr.crew_member_id || mr.employee_id || mr.user_id,
      role_id: mr.role_id || mr.crew_role_id || mr.function_id
    })) as CrewMemberRole[];
  }

  const { data: pcData, error: pcErr } = await supabase.from('property_crew').select('*');
  if (pcErr) {
    console.warn('[crewService] Alerta ao buscar vínculos de chácara:', pcErr.message);
  } else if (pcData) {
    propertyCrewList = (pcData as any[]).map(pc => ({
      ...pc,
      member_id: pc.member_id || pc.crew_member_id || pc.crew_id || pc.user_id,
      chacara_id: pc.chacara_id || pc.property_id
    })) as PropertyCrew[];
  }

  // População de relações N:N
  const rolesMap = new Map<string, CrewRole>(allRoles.map(r => [r.id, r]));
  const chacarasMap = new Map<string, Chacara>(allChacaras.map(c => [c.id, c]));

  const populatedMembers: CrewMember[] = members.map(m => {
    const myRoleIds = memberRolesList.filter(mr => mr.member_id === m.id).map(mr => mr.role_id);
    const myChacaraIds = propertyCrewList.filter(pc => pc.member_id === m.id).map(pc => pc.chacara_id);

    const roles = myRoleIds.map(rid => rolesMap.get(rid)).filter(Boolean) as CrewRole[];
    const chacaras = myChacaraIds.map(cid => chacarasMap.get(cid)).filter(Boolean) as Chacara[];

    return {
      ...m,
      role_ids: myRoleIds,
      chacara_ids: myChacaraIds,
      roles,
      chacaras
    };
  });

  // Aplicar filtros
  let result = populatedMembers;

  if (filters?.activeOnly) {
    result = result.filter(m => m.ativo);
  }

  if (filters?.roleId && filters.roleId !== 'TODAS') {
    result = result.filter(m => m.role_ids?.includes(filters.roleId!));
  }

  if (filters?.chacaraId && filters.chacaraId !== 'TODAS') {
    result = result.filter(m => m.chacara_ids?.includes(filters.chacaraId!));
  }

  if (filters?.search?.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter(m => 
      (m.nome && m.nome.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.telefone && m.telefone.includes(q))
    );
  }

  return result.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}

export async function getCrewMemberById(id: string): Promise<CrewMember | null> {
  if (isDemoMode()) {
    return demoRepository.getCrewMemberById(id);
  }
  const members = await getCrewMembers();
  return members.find(m => m.id === id) || null;
}

export async function createCrewMember(
  memberData: Omit<CrewMember, 'id' | 'created_at' | 'updated_at' | 'roles' | 'chacaras'>,
  roleIds: string[],
  chacaraIds: string[]
): Promise<CrewMember> {
  if (isDemoMode()) {
    return demoRepository.createCrewMember(memberData, roleIds, chacaraIds);
  }
  const now = new Date().toISOString();
  const memberName = memberData.nome || (memberData as any).name || (memberData as any).full_name || 'Sem nome';
  const payload = {
    nome: memberName,
    name: memberName,
    full_name: memberName,
    telefone: memberData.telefone || null,
    phone: memberData.telefone || null,
    whatsapp: memberData.whatsapp || null,
    email: memberData.email || null,
    observacoes: memberData.observacoes || null,
    foto_url: memberData.foto_url || null,
    pix_key: memberData.pix_key || null,
    pixKey: memberData.pix_key || null,
    chave_pix: memberData.pix_key || null,
    payment_frequency: memberData.payment_frequency || 'MONTHLY',
    paymentFrequency: memberData.payment_frequency || 'MONTHLY',
    recorrencia_pagamento: memberData.payment_frequency || 'MONTHLY',
    ativo: memberData.ativo ?? true,
    created_at: now,
    updated_at: now
  };

  try {
    const insertedMember = await insertWithFallback('crew_members', payload);
    const memberId = insertedMember.id;

    // Inserir N:N Roles
    if (roleIds && roleIds.length > 0) {
      for (const role_id of roleIds) {
        try {
          await insertWithFallback('crew_member_roles', {
            crew_member_id: memberId,
            member_id: memberId,
            role_id,
            created_at: now
          });
        } catch (mrError: any) {
          console.error('[crewService] Erro ao associar função na criação:', mrError?.message);
          throw mrError;
        }
      }
    }

    // Inserir N:N Chácaras
    if (chacaraIds && chacaraIds.length > 0) {
      for (const chacara_id of chacaraIds) {
        try {
          await insertWithFallback('property_crew', {
            crew_member_id: memberId,
            member_id: memberId,
            chacara_id,
            property_id: chacara_id,
            created_at: now
          });
        } catch (pcError: any) {
          console.error('[crewService] Erro ao associar chácara na criação:', pcError?.message);
          throw pcError;
        }
      }
    }

    // Log de auditoria
    await recordAuditLog({
      member_id: memberId,
      operation: 'CREATE_MEMBER',
      details: `Cadastrado funcionário "${insertedMember.nome || insertedMember.name || insertedMember.full_name || memberName}" com ${roleIds.length} função(ões) e ${chacaraIds.length} chácara(s)`,
      performed_by: 'Administrador'
    });

    return (await getCrewMemberById(memberId)) || ({
      id: memberId,
      ...memberData,
      nome: insertedMember.nome || insertedMember.name || insertedMember.full_name || memberName,
      ativo: insertedMember.ativo ?? memberData.ativo ?? true
    } as CrewMember);
  } catch (insertError: any) {
    console.error('[crewService] Erro ao criar colaborador no Supabase:', insertError?.message);
    throw new Error('Falha ao criar funcionário no banco: ' + (insertError?.message || ''));
  }
}

export async function updateCrewMember(
  id: string,
  memberData: Partial<CrewMember>,
  roleIds?: string[],
  chacaraIds?: string[]
): Promise<CrewMember> {
  if (isDemoMode()) {
    return demoRepository.updateCrewMember(id, memberData, roleIds, chacaraIds);
  }
  const now = new Date().toISOString();
  const memberName = memberData.nome || (memberData as any).name || (memberData as any).full_name;

  try {
    const updatePayload: Record<string, any> = {
      telefone: memberData.telefone,
      phone: memberData.telefone,
      whatsapp: memberData.whatsapp,
      email: memberData.email,
      observacoes: memberData.observacoes,
      foto_url: memberData.foto_url,
      ativo: memberData.ativo,
      updated_at: now
    };
    if (memberData.pix_key !== undefined) {
      updatePayload.pix_key = memberData.pix_key || null;
      updatePayload.pixKey = memberData.pix_key || null;
      updatePayload.chave_pix = memberData.pix_key || null;
    }
    if (memberData.payment_frequency !== undefined) {
      updatePayload.payment_frequency = memberData.payment_frequency;
      updatePayload.paymentFrequency = memberData.payment_frequency;
      updatePayload.recorrencia_pagamento = memberData.payment_frequency;
    }
    if (memberName !== undefined) {
      updatePayload.nome = memberName;
      updatePayload.name = memberName;
      updatePayload.full_name = memberName;
    }

    await updateWithFallback('crew_members', id, updatePayload);
  } catch (updateError: any) {
    console.error('[crewService] Erro ao atualizar colaborador:', updateError.message);
    throw new Error('Falha ao atualizar colaborador: ' + updateError.message);
  }

  // Atualizar Roles N:N
  if (roleIds !== undefined) {
    try {
      await supabase.from('crew_member_roles').delete().eq('crew_member_id', id);
    } catch (_) {}
    try {
      await supabase.from('crew_member_roles').delete().eq('member_id', id);
    } catch (_) {}

    if (roleIds.length > 0) {
      for (const role_id of roleIds) {
        try {
          await insertWithFallback('crew_member_roles', {
            crew_member_id: id,
            member_id: id,
            role_id,
            created_at: now
          });
        } catch (e: any) {
          console.error('[crewService] Erro ao associar função na atualização:', e?.message);
          throw e;
        }
      }
    }

    await recordAuditLog({
      member_id: id,
      operation: 'CHANGE_ROLES',
      details: `Atualizadas funções do funcionário para ${roleIds.length} função(ões)`,
      performed_by: 'Administrador'
    });
  }

  // Atualizar Chácaras N:N
  if (chacaraIds !== undefined) {
    try {
      await supabase.from('property_crew').delete().eq('crew_member_id', id);
    } catch (_) {}
    try {
      await supabase.from('property_crew').delete().eq('member_id', id);
    } catch (_) {}

    if (chacaraIds.length > 0) {
      for (const chacara_id of chacaraIds) {
        try {
          await insertWithFallback('property_crew', {
            crew_member_id: id,
            member_id: id,
            chacara_id,
            property_id: chacara_id,
            created_at: now
          });
        } catch (e: any) {
          console.error('[crewService] Erro ao associar chácara na atualização:', e?.message);
          throw e;
        }
      }
    }

    await recordAuditLog({
      member_id: id,
      operation: 'CHANGE_PROPERTIES',
      details: `Atualizados vínculos de chácaras do funcionário para ${chacaraIds.length} chácara(s)`,
      performed_by: 'Administrador'
    });
  }

  await recordAuditLog({
    member_id: id,
    operation: 'UPDATE_MEMBER',
    details: `Atualizados dados cadastrais de "${memberData.nome || id}"`,
    performed_by: 'Administrador'
  });

  return (await getCrewMemberById(id))!;
}

export async function linkCrewMemberToChacara(memberId: string, chacaraId: string): Promise<void> {
  if (isDemoMode()) {
    const member = await demoRepository.getCrewMemberById(memberId);
    if (member) {
      const existing = member.chacara_ids || [];
      if (!existing.includes(chacaraId)) {
        await demoRepository.updateCrewMember(memberId, {}, undefined, [...existing, chacaraId]);
      }
    }
    return;
  }
  const member = await getCrewMemberById(memberId);
  if (member) {
    const current = member.chacara_ids || [];
    if (!current.includes(chacaraId)) {
      await updateCrewMember(memberId, {}, undefined, [...current, chacaraId]);
    }
  }
}

export async function unlinkCrewMemberFromChacara(memberId: string, chacaraId: string): Promise<void> {
  if (isDemoMode()) {
    const member = await demoRepository.getCrewMemberById(memberId);
    if (member) {
      const current = member.chacara_ids || [];
      await demoRepository.updateCrewMember(memberId, {}, undefined, current.filter((c: string) => c !== chacaraId));
    }
    return;
  }
  const member = await getCrewMemberById(memberId);
  if (member) {
    const current = member.chacara_ids || [];
    if (current.includes(chacaraId)) {
      await updateCrewMember(memberId, {}, undefined, current.filter((c: string) => c !== chacaraId));
    }
  }
}

export async function deleteCrewMember(id: string): Promise<void> {
  if (isDemoMode()) {
    return demoRepository.deleteCrewMember(id);
  }
  // Limpar relações órfãs em crew_member_roles
  try { await supabase.from('crew_member_roles').delete().eq('crew_member_id', id); } catch (_) {}
  try { await supabase.from('crew_member_roles').delete().eq('member_id', id); } catch (_) {}

  // Limpar relações órfãs em property_crew
  try { await supabase.from('property_crew').delete().eq('crew_member_id', id); } catch (_) {}
  try { await supabase.from('property_crew').delete().eq('member_id', id); } catch (_) {}

  const { error } = await supabase.from('crew_members').delete().eq('id', id);
  if (error) {
    console.error('[crewService] Erro ao excluir funcionário:', error.message);
    throw new Error('Falha ao excluir funcionário do banco de dados: ' + error.message);
  }

  await recordAuditLog({
    member_id: id,
    operation: 'DELETE_MEMBER',
    details: `Funcionário ${id} e suas relações foram excluídos do sistema`,
    performed_by: 'Administrador'
  });
}

export async function toggleCrewMemberStatus(id: string, active: boolean): Promise<void> {
  if (isDemoMode()) {
    return demoRepository.toggleCrewMemberStatus(id, active);
  }
  const member = await getCrewMemberById(id);
  await updateCrewMember(id, { ativo: active });

  await recordAuditLog({
    member_id: id,
    operation: 'TOGGLE_MEMBER_STATUS',
    details: `${active ? 'Ativado' : 'Desativado'} funcionário "${member?.nome || id}"`,
    performed_by: 'Administrador'
  });
}

export async function linkMemberToProperty(memberId: string, chacaraId: string): Promise<void> {
  if (isDemoMode()) {
    return demoRepository.linkMemberToProperty(memberId, chacaraId);
  }
  const now = new Date().toISOString();
  try {
    await insertWithFallback('property_crew', {
      member_id: memberId,
      chacara_id: chacaraId,
      property_id: chacaraId,
      created_at: now
    });
  } catch (error: any) {
    console.warn('[crewService] Alerta ao vincular funcionário à chácara:', error?.message);
  }

  await recordAuditLog({
    member_id: memberId,
    chacara_id: chacaraId,
    operation: 'LINK_PROPERTY',
    details: `Vinculado funcionário à chácara`,
    performed_by: 'Administrador'
  });
}

export async function unlinkMemberFromProperty(memberId: string, chacaraId: string): Promise<void> {
  if (isDemoMode()) {
    return demoRepository.unlinkMemberFromProperty(memberId, chacaraId);
  }
  try {
    await supabase.from('property_crew').delete().eq('member_id', memberId).eq('chacara_id', chacaraId);
  } catch (_) {}

  try {
    await supabase.from('property_crew').delete().eq('member_id', memberId).eq('property_id', chacaraId);
  } catch (_) {}

  await recordAuditLog({
    member_id: memberId,
    chacara_id: chacaraId,
    operation: 'UNLINK_PROPERTY',
    details: `Removido vínculo do funcionário com a chácara sem excluir o cadastro do funcionário`,
    performed_by: 'Administrador'
  });
}

export async function getPropertyCrewMembers(chacaraId: string): Promise<CrewMember[]> {
  if (isDemoMode()) {
    return demoRepository.getPropertyCrewMembers(chacaraId);
  }
  const members = await getCrewMembers();
  return members.filter(m => m.chacara_ids?.includes(chacaraId));
}

export async function getCrewAuditLogs(memberId?: string): Promise<CrewAuditLog[]> {
  if (isDemoMode()) {
    return demoRepository.getCrewAuditLogs(memberId);
  }
  try {
    let query = supabase.from('crew_audit_logs').select('*').order('created_at', { ascending: false });
    if (memberId) query = query.eq('member_id', memberId);
    const { data, error } = await query;
    if (error) {
      console.error('[crewService] Erro ao buscar logs de auditoria:', error.message);
      return [];
    }
    return (data as CrewAuditLog[]) || [];
  } catch (e) {
    console.error('[crewService] Exceção ao buscar logs:', e);
    return [];
  }
}

/**
 * Retorna a programação financeira para colaboradores com recorrência VINCULADA ÀS RESERVAS (PER_RESERVATION).
 * Regra: Data prevista do pagamento = CHECK-IN - 1 DIA.
 * Evita duplicidade usando chave única por membro e por reserva (reference_id: "crew_pay_${member_id}_${reservation_id}").
 */
export async function getCrewReservationPayments(memberId?: string): Promise<CrewReservationPaymentSchedule[]> {
  const [allMembers, allReservations, allChacaras] = await Promise.all([
    getCrewMembers({ activeOnly: true }),
    getReservations(),
    getChacaras()
  ]);

  const chacaraMap = new Map(allChacaras.map(c => [c.id, c.name]));
  let targetMembers = allMembers.filter(m => m.payment_frequency === 'PER_RESERVATION');

  if (memberId) {
    targetMembers = targetMembers.filter(m => m.id === memberId);
  }

  const validReservations = allReservations.filter(r => r.status !== 'CANCELADA');
  const schedules: CrewReservationPaymentSchedule[] = [];
  const processedKeys = new Set<string>();

  for (const member of targetMembers) {
    const memberChacaraIds = member.chacara_ids || [];

    for (const res of validReservations) {
      // Se o colaborador atende a chácara da reserva (ou não possui limitação de chácaras)
      const matchesChacara = memberChacaraIds.length === 0 || memberChacaraIds.includes(res.chacara_id);

      if (matchesChacara) {
        // Chave única para controle de idenpotência / deduplicação
        const refId = `crew_pay_${member.id}_${res.id}`;
        if (processedKeys.has(refId)) continue;
        processedKeys.add(refId);

        // Data Prevista: Check-in - 1 Dia
        let dueDateStr = res.checkin_date;
        if (res.checkin_date) {
          const checkinDate = new Date(`${res.checkin_date}T12:00:00`);
          checkinDate.setDate(checkinDate.getDate() - 1);
          dueDateStr = checkinDate.toISOString().split('T')[0];
        }

        schedules.push({
          reference_id: refId,
          member_id: member.id,
          member_name: member.nome,
          reservation_id: res.id,
          reservation_code: res.code || res.id.substring(0, 8),
          chacara_id: res.chacara_id,
          chacara_name: chacaraMap.get(res.chacara_id) || res.chacara?.name || 'Chácara',
          checkin_date: res.checkin_date,
          payment_due_date: dueDateStr,
          pix_key: member.pix_key,
          status: 'PENDENTE'
        });
      }
    }
  }

  return schedules.sort((a, b) => a.payment_due_date.localeCompare(b.payment_due_date));
}

