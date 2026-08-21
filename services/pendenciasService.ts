import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/appMode';
import {
  Pendencia,
  PendenciaGrupo,
  PendenciaSubitem,
  PendenciaHistorico,
  PendenciaNotificacao,
  UserProfileOption,
  PendenciaFilters,
  CreatePendenciaInput,
  PendenciaStatus,
  PendenciaPrioridade
} from '@/lib/pendenciasTypes';

// Initial Demo Seed for offline/demo experience
const DEFAULT_DEMO_GROUPS: PendenciaGrupo[] = [
  { id: 'grp-1', nome: 'Limpeza', cor: '#06B6D4', ativo: true, ordem_exibicao: 1 },
  { id: 'grp-2', nome: 'Reservas', cor: '#10B981', ativo: true, ordem_exibicao: 2 },
  { id: 'grp-3', nome: 'Financeiro', cor: '#F59E0B', ativo: true, ordem_exibicao: 3 },
  { id: 'grp-4', nome: 'Piscina', cor: '#0EA5E9', ativo: true, ordem_exibicao: 4 },
  { id: 'grp-5', nome: 'Manutenção', cor: '#EF4444', ativo: true, ordem_exibicao: 5 },
  { id: 'grp-6', nome: 'Documentação', cor: '#8B5CF6', ativo: true, ordem_exibicao: 6 },
  { id: 'grp-7', nome: 'Marketing', cor: '#EC4899', ativo: true, ordem_exibicao: 7 },
  { id: 'grp-8', nome: 'Outros', cor: '#6B7280', ativo: true, ordem_exibicao: 8 }
];

let memoryGroups: PendenciaGrupo[] = [...DEFAULT_DEMO_GROUPS];

let memoryPendencias: Pendencia[] = [
  {
    id: 'pen-101',
    grupo_id: 'grp-6',
    grupo: DEFAULT_DEMO_GROUPS[5], // Documentação
    titulo: 'Vistoria e Atualização de Documentação Sanitária',
    descricao: 'Favor conferir alvará de funcionamento, laudo da vigilância e contrato do seguro anual para a Chácara Bela Vista.',
    prazo: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    prazo_hora: '17:00',
    prioridade: 'Alta',
    status: 'Em andamento',
    criado_por: 'usr-iolanda',
    criado_por_nome: 'Iolanda Ferreira (Anfitriã)',
    criado_por_email: 'iolanda@chacaras.com.br',
    responsavel_atual: 'usr-leonardo',
    responsavel_atual_nome: 'Leonardo Silva (Coanfitrião)',
    responsavel_atual_email: 'leonardo@chacaras.com.br',
    subitens: [
      {
        id: 'sub-1',
        pendencia_id: 'pen-101',
        descricao: 'Tirar certidão de matrícula atualizada',
        concluido: false
      },
      {
        id: 'sub-2',
        pendencia_id: 'pen-101',
        descricao: 'Conferir carnê do IPTU e taxas de saneamento',
        concluido: true,
        concluido_por: 'usr-leonardo',
        concluido_por_nome: 'Leonardo Silva',
        concluido_em: new Date().toISOString()
      },
      {
        id: 'sub-3',
        pendencia_id: 'pen-101',
        descricao: 'Solicitar renovação do AVCB com o bombeiro técnico',
        concluido: true,
        concluido_por: 'usr-leonardo',
        concluido_por_nome: 'Leonardo Silva',
        concluido_em: new Date().toISOString()
      },
      {
        id: 'sub-4',
        pendencia_id: 'pen-101',
        descricao: 'Coletar cotação do Seguro de Danos a Hóspedes',
        concluido: false
      }
    ],
    historico: [
      {
        id: 'hist-1',
        pendencia_id: 'pen-101',
        de_usuario_id: 'usr-iolanda',
        de_usuario_nome: 'Iolanda Ferreira (Anfitriã)',
        para_usuario_id: 'usr-leonardo',
        para_usuario_nome: 'Leonardo Silva (Coanfitrião)',
        tipo_acao: 'CRIACAO',
        observacoes: 'Enviei checklist inicial para vistoria da documentação da chácara.',
        status_anterior: undefined,
        status_novo: 'Aberta',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'hist-2',
        pendencia_id: 'pen-101',
        de_usuario_id: 'usr-leonardo',
        de_usuario_nome: 'Leonardo Silva (Coanfitrião)',
        para_usuario_id: 'usr-iolanda',
        para_usuario_nome: 'Iolanda Ferreira (Anfitriã)',
        tipo_acao: 'DEVOLUCAO',
        observacoes: 'Consegui os comprovantes do IPTU e encaminhei solicitação do AVCB. Falta a matrícula e a cotação do seguro.',
        status_anterior: 'Em andamento',
        status_novo: 'Devolvida',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString()
      }
    ],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'pen-102',
    grupo_id: 'grp-4',
    grupo: DEFAULT_DEMO_GROUPS[3], // Piscina
    titulo: 'Limpeza Pesada e Troca do Filtro da Piscina Principal',
    descricao: 'Realizar aspiração do fundo, medição de pH e cloração antes do check-in do próximo fim de semana.',
    prazo: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
    prazo_hora: '10:00',
    prioridade: 'Urgente',
    status: 'Aberta',
    criado_por: 'usr-leonardo',
    criado_por_nome: 'Leonardo Silva (Coanfitrião)',
    criado_por_email: 'leonardo@chacaras.com.br',
    responsavel_atual: 'usr-iolanda',
    responsavel_atual_nome: 'Iolanda Ferreira (Anfitriã)',
    responsavel_atual_email: 'iolanda@chacaras.com.br',
    subitens: [
      {
        id: 'sub-10',
        pendencia_id: 'pen-102',
        descricao: 'Comprar produto clarificante e cloro granulado',
        concluido: true,
        concluido_por: 'usr-leonardo',
        concluido_por_nome: 'Leonardo Silva',
        concluido_em: new Date().toISOString()
      },
      {
        id: 'sub-11',
        pendencia_id: 'pen-102',
        descricao: 'Trocar areia do filtro da bomba da piscina',
        concluido: false
      },
      {
        id: 'sub-12',
        pendencia_id: 'pen-102',
        descricao: 'Ajustar timer automático da cascata',
        concluido: false
      }
    ],
    historico: [
      {
        id: 'hist-10',
        pendencia_id: 'pen-102',
        de_usuario_id: 'usr-leonardo',
        de_usuario_nome: 'Leonardo Silva (Coanfitrião)',
        para_usuario_id: 'usr-iolanda',
        para_usuario_nome: 'Iolanda Ferreira (Anfitriã)',
        tipo_acao: 'CRIACAO',
        observacoes: 'Comprei o cloro, mas a bomba precisa do técnico para a troca da areia do filtro.',
        status_anterior: undefined,
        status_novo: 'Aberta',
        created_at: new Date(Date.now() - 3600000 * 12).toISOString()
      }
    ],
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date().toISOString()
  }
];

let memoryNotifications: PendenciaNotificacao[] = [];

// ==========================================
// 1. GRUPOS CRUD
// ==========================================

export async function getPendenciaGrupos(): Promise<PendenciaGrupo[]> {
  if (isDemoMode()) {
    return memoryGroups.sort((a, b) => a.ordem_exibicao - b.ordem_exibicao);
  }

  try {
    const { data, error } = await supabase
      .from('pendencia_grupos')
      .select('*')
      .order('ordem_exibicao', { ascending: true })
      .order('nome', { ascending: true });

    if (error) {
      console.warn('[pendenciasService] Erro ao buscar grupos no Supabase, usando memória fallback:', error.message);
      return memoryGroups;
    }

    if (!data || data.length === 0) {
      // Seed initial groups if table is empty
      for (const g of DEFAULT_DEMO_GROUPS) {
        try {
          await supabase.from('pendencia_grupos').insert({
            nome: g.nome,
            cor: g.cor,
            ativo: g.ativo,
            ordem_exibicao: g.ordem_exibicao
          });
        } catch (e) {
          // ignore seed errors
        }
      }
      return DEFAULT_DEMO_GROUPS;
    }

    return data as PendenciaGrupo[];
  } catch (e) {
    console.error('[pendenciasService] Exceção em getPendenciaGrupos:', e);
    return memoryGroups;
  }
}

export async function createPendenciaGrupo(grupo: Partial<PendenciaGrupo>): Promise<PendenciaGrupo> {
  const newGrupo: PendenciaGrupo = {
    id: `grp-${Date.now()}`,
    nome: grupo.nome || 'Novo Grupo',
    cor: grupo.cor || '#3B82F6',
    ativo: grupo.ativo !== undefined ? grupo.ativo : true,
    ordem_exibicao: grupo.ordem_exibicao || memoryGroups.length + 1,
    created_at: new Date().toISOString()
  };

  if (isDemoMode()) {
    memoryGroups.push(newGrupo);
    return newGrupo;
  }

  try {
    const { data, error } = await supabase
      .from('pendencia_grupos')
      .insert({
        nome: newGrupo.nome,
        cor: newGrupo.cor,
        ativo: newGrupo.ativo,
        ordem_exibicao: newGrupo.ordem_exibicao
      })
      .select()
      .single();

    if (error) {
      console.warn('[pendenciasService] Erro ao inserir grupo no Supabase, mantendo na memória local:', error.message);
      memoryGroups.push(newGrupo);
      return newGrupo;
    }

    return data as PendenciaGrupo;
  } catch (e) {
    memoryGroups.push(newGrupo);
    return newGrupo;
  }
}

export async function updatePendenciaGrupo(id: string, grupo: Partial<PendenciaGrupo>): Promise<PendenciaGrupo | null> {
  if (isDemoMode()) {
    const idx = memoryGroups.findIndex(g => g.id === id);
    if (idx !== -1) {
      memoryGroups[idx] = { ...memoryGroups[idx], ...grupo, updated_at: new Date().toISOString() };
      return memoryGroups[idx];
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('pendencia_grupos')
      .update({
        nome: grupo.nome,
        cor: grupo.cor,
        ativo: grupo.ativo,
        ordem_exibicao: grupo.ordem_exibicao
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('[pendenciasService] Erro ao atualizar grupo no Supabase:', error.message);
      return null;
    }
    return data as PendenciaGrupo;
  } catch (e) {
    return null;
  }
}

export async function deletePendenciaGrupo(id: string): Promise<boolean> {
  if (isDemoMode()) {
    memoryGroups = memoryGroups.filter(g => g.id !== id);
    return true;
  }

  try {
    const { error } = await supabase.from('pendencia_grupos').delete().eq('id', id);
    if (error) {
      console.warn('[pendenciasService] Erro ao deletar grupo no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// ==========================================
// 2. BUSCA DE USUÁRIOS PARA AUTOCOMPLETE DO DESTINATÁRIO
// ==========================================

// Helper to normalize strings for accent-insensitive search
function normalizeSearchText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export async function getUserProfilesForAutocomplete(search?: string): Promise<UserProfileOption[]> {
  const cleanSearch = (search || '').trim();
  const normalizedTerm = normalizeSearchText(cleanSearch);

  console.log('[Autocomplete] Buscando usuários reais do Supabase Auth com o termo:', cleanSearch || '(todos)');

  try {
    const optionsMap = new Map<string, UserProfileOption>();

    // 1. Consulta oficial na tabela public.profiles (espelho de auth.users)
    const { data: profData, error: profError } = await supabase
      .from('profiles')
      .select('*');

    if (profError) {
      console.warn('[Autocomplete] Erro do Supabase ao consultar public.profiles:', profError.message);
    } else if (profData && profData.length > 0) {
      profData.forEach((p: any) => {
        if (p.is_active === false || p.ativo === false || p.status === 'INATIVO') return;

        const fullName = p.full_name || p.nome || p.name || p.email?.split('@')[0] || 'Usuário';
        const email = p.email || '';
        const role = p.role || p.cargo || p.funcao || 'Membro';
        const cargo = p.cargo || p.role || p.funcao || '';
        const avatarUrl = p.avatar_url || p.avatar || p.photo_url;

        optionsMap.set(p.id, {
          id: p.id,
          email,
          full_name: fullName,
          role,
          cargo,
          avatar_url: avatarUrl,
          is_active: true
        });
      });
    }

    // 2. Garantia do usuário atualmente autenticado no Supabase Auth
    try {
      const { data: authUserRes } = await supabase.auth.getUser();
      if (authUserRes?.user) {
        const u = authUserRes.user;
        if (!optionsMap.has(u.id)) {
          const fallbackUser: UserProfileOption = {
            id: u.id,
            email: u.email || '',
            full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Usuário Logado',
            role: u.user_metadata?.role || 'SECRETARIA',
            cargo: 'Usuário Ativo',
            is_active: true
          };
          optionsMap.set(u.id, fallbackUser);

          // Auto-healing no Supabase (salva registro em public.profiles se não existia)
          await supabase.from('profiles').upsert({
            id: u.id,
            email: u.email,
            full_name: fallbackUser.full_name,
            role: fallbackUser.role
          }, { onConflict: 'id' }).then(({ error }) => {
            if (error) console.warn('[Autocomplete] Alerta no auto-heal de perfil:', error.message);
          });
        }
      }
    } catch (e) {
      console.warn('[Autocomplete] Erro na verificação do usuário logado:', e);
    }

    let allResults = Array.from(optionsMap.values());

    // 3. Filtro inteligente de busca por nome, e-mail, cargo ou função
    if (normalizedTerm) {
      allResults = allResults.filter(u => {
        const nameNorm = normalizeSearchText(u.full_name);
        const emailNorm = normalizeSearchText(u.email);
        const roleNorm = normalizeSearchText(u.role || '');
        const cargoNorm = normalizeSearchText(u.cargo || '');

        return (
          nameNorm.includes(normalizedTerm) ||
          emailNorm.includes(normalizedTerm) ||
          roleNorm.includes(normalizedTerm) ||
          cargoNorm.includes(normalizedTerm)
        );
      });
    }

    return allResults;
  } catch (e) {
    console.error('[Autocomplete] Exceção ao buscar usuários reais:', e);
    return [];
  }
}

// ==========================================
// 3. CONSULTA E LISTAGEM DE PENDÊNCIAS
// ==========================================

export async function getPendencias(filters?: PendenciaFilters, currentUserId?: string): Promise<Pendencia[]> {
  const groups = await getPendenciaGrupos();
  const groupsMap = new Map(groups.map(g => [g.id, g]));

  if (isDemoMode()) {
    let result = memoryPendencias.map(p => ({
      ...p,
      grupo: p.grupo_id ? groupsMap.get(p.grupo_id) || p.grupo : undefined
    }));

    if (filters?.grupo_id) {
      result = result.filter(p => p.grupo_id === filters.grupo_id);
    }
    if (filters?.status) {
      result = result.filter(p => p.status === filters.status);
    }
    if (filters?.prioridade) {
      result = result.filter(p => p.prioridade === filters.prioridade);
    }
    if (filters?.search && filters.search.trim() !== '') {
      const term = filters.search.toLowerCase().trim();
      result = result.filter(p =>
        p.titulo.toLowerCase().includes(term) ||
        (p.descricao && p.descricao.toLowerCase().includes(term)) ||
        (p.responsavel_atual_nome && p.responsavel_atual_nome.toLowerCase().includes(term)) ||
        (p.criado_por_nome && p.criado_por_nome.toLowerCase().includes(term))
      );
    }

    if (currentUserId && filters?.visaoTab) {
      if (filters.visaoTab === 'minhas' || filters.visaoTab === 'recebidas') {
        result = result.filter(p => p.responsavel_atual === currentUserId);
      } else if (filters.visaoTab === 'enviadas') {
        result = result.filter(p => p.criado_por === currentUserId && p.responsavel_atual !== currentUserId);
      }
    }

    return result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  try {
    let query = supabase
      .from('pendencias')
      .select(`
        *,
        grupo:pendencia_grupos(*),
        subitens:pendencia_subitens(*),
        historico:pendencia_historico(*)
      `)
      .order('updated_at', { ascending: false });

    if (filters?.grupo_id) {
      query = query.eq('grupo_id', filters.grupo_id);
    }
    if (filters?.responsavel_id) {
      query = query.eq('responsavel_atual', filters.responsavel_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.prioridade) {
      query = query.eq('prioridade', filters.prioridade);
    }
    if (filters?.chacara_id) {
      query = query.eq('chacara_id', filters.chacara_id);
    }

    if (filters?.search && filters.search.trim() !== '') {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`titulo.ilike.${term},descricao.ilike.${term},responsavel_atual_nome.ilike.${term},criado_por_nome.ilike.${term}`);
    }

    if (currentUserId && filters?.visaoTab) {
      if (filters.visaoTab === 'minhas' || filters.visaoTab === 'recebidas') {
        query = query.eq('responsavel_atual', currentUserId);
      } else if (filters.visaoTab === 'enviadas') {
        query = query.eq('criado_por', currentUserId).neq('responsavel_atual', currentUserId);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[pendenciasService] Erro ao carregar pendências no Supabase, usando dados locais:', error.message);
      return memoryPendencias;
    }

    return (data || []).map((p: any) => ({
      ...p,
      subitens: (p.subitens || []).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)),
      historico: (p.historico || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }));
  } catch (e) {
    console.error('[pendenciasService] Exceção ao consultar pendências:', e);
    return memoryPendencias;
  }
}

export async function getPendenciaById(id: string): Promise<Pendencia | null> {
  if (isDemoMode()) {
    const found = memoryPendencias.find(p => p.id === id);
    return found ? { ...found } : null;
  }

  try {
    const { data, error } = await supabase
      .from('pendencias')
      .select(`
        *,
        grupo:pendencia_grupos(*),
        subitens:pendencia_subitens(*),
        historico:pendencia_historico(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      ...data,
      subitens: (data.subitens || []).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)),
      historico: (data.historico || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    };
  } catch (e) {
    return null;
  }
}

// ==========================================
// 4. CRIAÇÃO DE PENDÊNCIA COM SUBITENS E HISTÓRICO
// ==========================================

export async function createPendencia(
  input: CreatePendenciaInput,
  currentUser: { id: string; email: string; full_name: string }
): Promise<Pendencia> {
  const groups = await getPendenciaGrupos();
  const grupoObj = groups.find(g => g.id === input.grupo_id);

  const pendenciaId = `pen-${Date.now()}`;
  const now = new Date().toISOString();

  const newPendencia: Pendencia = {
    id: pendenciaId,
    grupo_id: input.grupo_id,
    grupo: grupoObj,
    chacara_id: input.chacara_id,
    titulo: input.titulo,
    descricao: input.descricao || '',
    prazo: input.prazo,
    prazo_hora: input.prazo_hora || '18:00',
    prioridade: input.prioridade || 'Média',
    status: 'Aberta',
    criado_por: currentUser.id,
    criado_por_nome: currentUser.full_name || currentUser.email,
    criado_por_email: currentUser.email,
    responsavel_atual: input.responsavel_atual_id,
    responsavel_atual_nome: input.responsavel_atual_nome,
    responsavel_atual_email: input.responsavel_atual_email,
    subitens: input.subitens.map((sub, idx) => ({
      id: `sub-${Date.now()}-${idx}`,
      pendencia_id: pendenciaId,
      descricao: sub,
      concluido: false,
      ordem: idx
    })),
    historico: [
      {
        id: `hist-${Date.now()}`,
        pendencia_id: pendenciaId,
        de_usuario_id: currentUser.id,
        de_usuario_nome: currentUser.full_name || currentUser.email,
        para_usuario_id: input.responsavel_atual_id,
        para_usuario_nome: input.responsavel_atual_nome,
        tipo_acao: 'CRIACAO',
        observacoes: 'Pendência criada e encaminhada para execução.',
        status_novo: 'Aberta',
        created_at: now
      }
    ],
    created_at: now,
    updated_at: now
  };

  if (isDemoMode()) {
    memoryPendencias.unshift(newPendencia);
    return newPendencia;
  }

  try {
    // 1. Inserir Pendência principal
    const { data: createdPen, error: penError } = await supabase
      .from('pendencias')
      .insert({
        grupo_id: input.grupo_id,
        chacara_id: input.chacara_id,
        titulo: input.titulo,
        descricao: input.descricao,
        prazo: input.prazo,
        prazo_hora: input.prazo_hora || '18:00',
        prioridade: input.prioridade,
        status: 'Aberta',
        criado_por: currentUser.id,
        criado_por_nome: currentUser.full_name,
        criado_por_email: currentUser.email,
        responsavel_atual: input.responsavel_atual_id,
        responsavel_atual_nome: input.responsavel_atual_nome,
        responsavel_atual_email: input.responsavel_atual_email
      })
      .select()
      .single();

    if (penError || !createdPen) {
      console.warn('[pendenciasService] Erro ao criar pendência no Supabase:', penError?.message);
      memoryPendencias.unshift(newPendencia);
      return newPendencia;
    }

    const realId = createdPen.id;

    // 2. Inserir subitens
    if (input.subitens && input.subitens.length > 0) {
      const subPayload = input.subitens.map((sub, idx) => ({
        pendencia_id: realId,
        descricao: sub,
        concluido: false,
        ordem: idx
      }));
      await supabase.from('pendencia_subitens').insert(subPayload);
    }

    // 3. Registrar Histórico de Criação
    await supabase.from('pendencia_historico').insert({
      pendencia_id: realId,
      de_usuario_id: currentUser.id,
      de_usuario_nome: currentUser.full_name,
      para_usuario_id: input.responsavel_atual_id,
      para_usuario_nome: input.responsavel_atual_nome,
      tipo_acao: 'CRIACAO',
      observacoes: 'Pendência criada e direcionada ao responsável.',
      status_novo: 'Aberta'
    });

    // 4. Inserir Notificação interna
    await supabase.from('pendencia_notificacoes').insert({
      pendencia_id: realId,
      destinatario_id: input.responsavel_atual_id,
      destinatario_email: input.responsavel_atual_email,
      remetente_id: currentUser.id,
      remetente_nome: currentUser.full_name,
      titulo: `Nova pendência recebida: ${input.titulo}`,
      mensagem: `${currentUser.full_name} atribuiu uma nova pendência a você no grupo ${grupoObj?.nome || 'Geral'}.`
    });

    return (await getPendenciaById(realId)) || newPendencia;
  } catch (e) {
    console.error('[pendenciasService] Exceção ao criar pendência:', e);
    memoryPendencias.unshift(newPendencia);
    return newPendencia;
  }
}

// ==========================================
// 5. MOVIMENTAÇÃO / TRAMITAÇÃO / DEVOLUÇÃO
// ==========================================

export async function tramitarPendencia(
  id: string,
  paraUsuario: UserProfileOption,
  observacoes: string,
  novoStatus: PendenciaStatus,
  currentUser: { id: string; email: string; full_name: string }
): Promise<boolean> {
  const now = new Date().toISOString();
  const isDevolucao = novoStatus === 'Devolvida' || novoStatus === 'Aguardando devolução';
  const acaoTipo = isDevolucao ? 'DEVOLUCAO' : 'TRAMITE';

  if (isDemoMode()) {
    const pen = memoryPendencias.find(p => p.id === id);
    if (!pen) return false;

    const statusAnt = pen.status;
    const deNome = currentUser.full_name || currentUser.email;

    pen.responsavel_atual = paraUsuario.id;
    pen.responsavel_atual_nome = paraUsuario.full_name;
    pen.responsavel_atual_email = paraUsuario.email;
    pen.status = novoStatus;
    pen.updated_at = now;

    if (!pen.historico) pen.historico = [];
    pen.historico.unshift({
      id: `hist-${Date.now()}`,
      pendencia_id: id,
      de_usuario_id: currentUser.id,
      de_usuario_nome: deNome,
      para_usuario_id: paraUsuario.id,
      para_usuario_nome: paraUsuario.full_name,
      tipo_acao: acaoTipo,
      observacoes: observacoes || (isDevolucao ? 'Devolveu pendência com atualizações do checklist.' : 'Encaminhou pendência.'),
      status_anterior: statusAnt,
      status_novo: novoStatus,
      created_at: now
    });

    return true;
  }

  try {
    const penAnt = await getPendenciaById(id);
    const statusAnt = penAnt?.status || 'Aberta';

    // 1. Atualizar responsável e status da pendência
    const { error: updErr } = await supabase
      .from('pendencias')
      .update({
        responsavel_atual: paraUsuario.id,
        responsavel_atual_nome: paraUsuario.full_name,
        responsavel_atual_email: paraUsuario.email,
        status: novoStatus,
        updated_at: now
      })
      .eq('id', id);

    if (updErr) {
      console.warn('[pendenciasService] Erro ao tramitar pendência:', updErr.message);
      return false;
    }

    // 2. Gravar no Histórico
    await supabase.from('pendencia_historico').insert({
      pendencia_id: id,
      de_usuario_id: currentUser.id,
      de_usuario_nome: currentUser.full_name,
      para_usuario_id: paraUsuario.id,
      para_usuario_nome: paraUsuario.full_name,
      tipo_acao: acaoTipo,
      observacoes: observacoes || (isDevolucao ? 'Devolução de pendência.' : 'Tramitação de pendência.'),
      status_anterior: statusAnt,
      status_novo: novoStatus
    });

    // 3. Criar Notificação
    await supabase.from('pendencia_notificacoes').insert({
      pendencia_id: id,
      destinatario_id: paraUsuario.id,
      destinatario_email: paraUsuario.email,
      remetente_id: currentUser.id,
      remetente_nome: currentUser.full_name,
      titulo: isDevolucao ? `Pendência devolvida por ${currentUser.full_name}` : `Pendência encaminhada para você por ${currentUser.full_name}`,
      mensagem: observacoes || `Status alterado para ${novoStatus}.`
    });

    return true;
  } catch (e) {
    console.error('[pendenciasService] Exceção ao tramitar pendência:', e);
    return false;
  }
}

// ==========================================
// 6. TOGGLE E MANIPULAÇÃO DE CHECKLIST SUBITENS
// ==========================================

export async function toggleSubitem(
  subitemId: string,
  pendenciaId: string,
  concluido: boolean,
  currentUser: { id: string; email: string; full_name: string }
): Promise<boolean> {
  const now = new Date().toISOString();

  if (isDemoMode()) {
    const pen = memoryPendencias.find(p => p.id === pendenciaId);
    if (!pen) return false;

    const sub = pen.subitens?.find(s => s.id === subitemId);
    if (!sub) return false;

    sub.concluido = concluido;
    sub.concluido_por = concluido ? currentUser.id : undefined;
    sub.concluido_por_nome = concluido ? currentUser.full_name : undefined;
    sub.concluido_em = concluido ? now : undefined;
    pen.updated_at = now;

    // Registrar breve log no histórico se desejado
    if (!pen.historico) pen.historico = [];
    pen.historico.unshift({
      id: `hist-${Date.now()}`,
      pendencia_id: pendenciaId,
      de_usuario_id: currentUser.id,
      de_usuario_nome: currentUser.full_name,
      tipo_acao: 'ATUALIZACAO_CHECKLIST',
      observacoes: `${concluido ? '☑ Marcou' : '☐ Desmarcou'} item: "${sub.descricao}"`,
      created_at: now
    });

    return true;
  }

  try {
    const { error } = await supabase
      .from('pendencia_subitens')
      .update({
        concluido,
        concluido_por: concluido ? currentUser.id : null,
        concluido_por_nome: concluido ? currentUser.full_name : null,
        concluido_em: concluido ? now : null
      })
      .eq('id', subitemId);

    if (error) {
      console.warn('[pendenciasService] Erro ao alternar subitem:', error.message);
      return false;
    }

    // Atualizar updated_at da pendência
    await supabase.from('pendencias').update({ updated_at: now }).eq('id', pendenciaId);

    // Registrar evento de checklist no histórico
    const { data: subData } = await supabase.from('pendencia_subitens').select('descricao').eq('id', subitemId).maybeSingle();
    await supabase.from('pendencia_historico').insert({
      pendencia_id: pendenciaId,
      de_usuario_id: currentUser.id,
      de_usuario_nome: currentUser.full_name,
      tipo_acao: 'ATUALIZACAO_CHECKLIST',
      observacoes: `${concluido ? '☑ Concluiu' : '☐ Desmarcou'} item: "${subData?.descricao || 'Subitem'}"`
    });

    return true;
  } catch (e) {
    return false;
  }
}

export async function addSubitem(
  pendenciaId: string,
  descricao: string,
  currentUser: { id: string; email: string; full_name: string }
): Promise<boolean> {
  if (!descricao.trim()) return false;
  const now = new Date().toISOString();

  if (isDemoMode()) {
    const pen = memoryPendencias.find(p => p.id === pendenciaId);
    if (!pen) return false;
    if (!pen.subitens) pen.subitens = [];

    pen.subitens.push({
      id: `sub-${Date.now()}`,
      pendencia_id: pendenciaId,
      descricao: descricao.trim(),
      concluido: false,
      ordem: pen.subitens.length
    });
    pen.updated_at = now;
    return true;
  }

  try {
    const { error } = await supabase.from('pendencia_subitens').insert({
      pendencia_id: pendenciaId,
      descricao: descricao.trim(),
      concluido: false
    });

    if (error) return false;
    await supabase.from('pendencias').update({ updated_at: now }).eq('id', pendenciaId);
    return true;
  } catch (e) {
    return false;
  }
}

export async function deleteSubitem(subitemId: string, pendenciaId: string): Promise<boolean> {
  if (isDemoMode()) {
    const pen = memoryPendencias.find(p => p.id === pendenciaId);
    if (!pen || !pen.subitens) return false;
    pen.subitens = pen.subitens.filter(s => s.id !== subitemId);
    return true;
  }

  try {
    const { error } = await supabase.from('pendencia_subitens').delete().eq('id', subitemId);
    return !error;
  } catch (e) {
    return false;
  }
}

// ==========================================
// 7. COMENTÁRIOS E HISTÓRICO MANUAL
// ==========================================

export async function addComentario(
  pendenciaId: string,
  observacoes: string,
  currentUser: { id: string; email: string; full_name: string }
): Promise<boolean> {
  if (!observacoes.trim()) return false;
  const now = new Date().toISOString();

  if (isDemoMode()) {
    const pen = memoryPendencias.find(p => p.id === pendenciaId);
    if (!pen) return false;
    if (!pen.historico) pen.historico = [];

    pen.historico.unshift({
      id: `hist-${Date.now()}`,
      pendencia_id: pendenciaId,
      de_usuario_id: currentUser.id,
      de_usuario_nome: currentUser.full_name,
      tipo_acao: 'COMENTARIO',
      observacoes: observacoes.trim(),
      created_at: now
    });
    pen.updated_at = now;
    return true;
  }

  try {
    const { error } = await supabase.from('pendencia_historico').insert({
      pendencia_id: pendenciaId,
      de_usuario_id: currentUser.id,
      de_usuario_nome: currentUser.full_name,
      tipo_acao: 'COMENTARIO',
      observacoes: observacoes.trim()
    });

    if (error) return false;
    await supabase.from('pendencias').update({ updated_at: now }).eq('id', pendenciaId);
    return true;
  } catch (e) {
    return false;
  }
}

// ==========================================
// 8. CONCLUIR E CANCELAR PENDÊNCIA
// ==========================================

export async function concluirPendencia(
  id: string,
  observacoes: string,
  currentUser: { id: string; email: string; full_name: string }
): Promise<boolean> {
  const now = new Date().toISOString();

  if (isDemoMode()) {
    const pen = memoryPendencias.find(p => p.id === id);
    if (!pen) return false;

    const stAnt = pen.status;
    pen.status = 'Concluída';
    pen.updated_at = now;

    // marcar todos subitens como concluídos
    if (pen.subitens) {
      pen.subitens.forEach(s => {
        if (!s.concluido) {
          s.concluido = true;
          s.concluido_por = currentUser.id;
          s.concluido_por_nome = currentUser.full_name;
          s.concluido_em = now;
        }
      });
    }

    if (!pen.historico) pen.historico = [];
    pen.historico.unshift({
      id: `hist-${Date.now()}`,
      pendencia_id: id,
      de_usuario_id: currentUser.id,
      de_usuario_nome: currentUser.full_name,
      tipo_acao: 'CONCLUSAO',
      observacoes: observacoes || 'Pendência concluída com sucesso.',
      status_anterior: stAnt,
      status_novo: 'Concluída',
      created_at: now
    });

    return true;
  }

  try {
    const penAnt = await getPendenciaById(id);

    const { error } = await supabase
      .from('pendencias')
      .update({
        status: 'Concluída',
        updated_at: now
      })
      .eq('id', id);

    if (error) return false;

    // Concluir subitens pendentes automaticamente se desejar
    await supabase
      .from('pendencia_subitens')
      .update({
        concluido: true,
        concluido_por: currentUser.id,
        concluido_por_nome: currentUser.full_name,
        concluido_em: now
      })
      .eq('pendencia_id', id)
      .eq('concluido', false);

    // Registrar histórico
    await supabase.from('pendencia_historico').insert({
      pendencia_id: id,
      de_usuario_id: currentUser.id,
      de_usuario_nome: currentUser.full_name,
      tipo_acao: 'CONCLUSAO',
      observacoes: observacoes || 'Pendência finalizada e encerrada.',
      status_anterior: penAnt?.status || 'Aberta',
      status_novo: 'Concluída'
    });

    // Notificar criador caso não seja o mesmo
    if (penAnt?.criado_por && penAnt.criado_por !== currentUser.id) {
      await supabase.from('pendencia_notificacoes').insert({
        pendencia_id: id,
        destinatario_id: penAnt.criado_por,
        destinatario_email: penAnt.criado_por_email,
        remetente_id: currentUser.id,
        remetente_nome: currentUser.full_name,
        titulo: `Pendência concluída: ${penAnt.titulo}`,
        mensagem: `${currentUser.full_name} marcou a pendência como Concluída.`
      });
    }

    return true;
  } catch (e) {
    return false;
  }
}

export async function cancelarPendencia(
  id: string,
  observacoes: string,
  currentUser: { id: string; email: string; full_name: string }
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();
  console.log('[cancelarPendencia] Executando ação de cancelamento...', {
    pendenciaId: id,
    observacoes,
    usuario: currentUser
  });

  if (isDemoMode()) {
    const pen = memoryPendencias.find(p => p.id === id);
    if (!pen) {
      console.warn('[cancelarPendencia] Pendência não encontrada na memória:', id);
      return { success: false, error: 'Pendência não encontrada.' };
    }

    const stAnt = pen.status;
    pen.status = 'Cancelada';
    pen.updated_at = now;

    if (!pen.historico) pen.historico = [];
    pen.historico.unshift({
      id: `hist-${Date.now()}`,
      pendencia_id: id,
      de_usuario_id: currentUser.id,
      de_usuario_nome: currentUser.full_name,
      tipo_acao: 'CANCELAMENTO',
      observacoes: observacoes || 'Pendência cancelada pelo usuário.',
      status_anterior: stAnt,
      status_novo: 'Cancelada',
      created_at: now
    });

    console.log('[cancelarPendencia] Sucesso no cancelamento (modo memória):', id);
    return { success: true };
  }

  try {
    const penAnt = await getPendenciaById(id);

    console.log('[cancelarPendencia] Enviando UPDATE para o Supabase (status: Cancelada)...');
    const { error: updateError } = await supabase
      .from('pendencias')
      .update({
        status: 'Cancelada',
        updated_at: now
      })
      .eq('id', id);

    if (updateError) {
      console.error('[cancelarPendencia] Erro no UPDATE do Supabase:', updateError);
      // Fallback para estado de memória local
      const pen = memoryPendencias.find(p => p.id === id);
      if (pen) {
        pen.status = 'Cancelada';
        pen.updated_at = now;
      }
      return { success: false, error: updateError.message || 'Erro ao atualizar banco de dados.' };
    }

    // Atualiza cópia local
    const penLocal = memoryPendencias.find(p => p.id === id);
    if (penLocal) {
      penLocal.status = 'Cancelada';
      penLocal.updated_at = now;
    }

    console.log('[cancelarPendencia] Registrando no histórico de pendências...');
    const { error: histError } = await supabase.from('pendencia_historico').insert({
      pendencia_id: id,
      de_usuario_id: currentUser.id,
      de_usuario_nome: currentUser.full_name,
      tipo_acao: 'CANCELAMENTO',
      observacoes: observacoes || 'Pendência cancelada pelo usuário.',
      status_anterior: penAnt?.status || 'Aberta',
      status_novo: 'Cancelada'
    });

    if (histError) {
      console.warn('[cancelarPendencia] Aviso ao inserir histórico:', histError.message);
    }

    console.log('[cancelarPendencia] Cancelamento concluído com sucesso!');
    return { success: true };
  } catch (e: any) {
    console.error('[cancelarPendencia] Exceção crítica durante o cancelamento:', e);
    return { success: false, error: e?.message || 'Erro inesperado na execução do cancelamento.' };
  }
}

// ==========================================
// 9. NOTIFICAÇÕES INTERNAS
// ==========================================

export async function getNotificacoesUsuario(userId: string): Promise<PendenciaNotificacao[]> {
  if (isDemoMode()) {
    return memoryNotifications.filter(n => n.destinatario_id === userId);
  }

  try {
    const { data, error } = await supabase
      .from('pendencia_notificacoes')
      .select('*')
      .eq('destinatario_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) return [];
    return data as PendenciaNotificacao[];
  } catch (e) {
    return [];
  }
}

export async function marcarNotificacaoLida(notifId: string): Promise<boolean> {
  if (isDemoMode()) {
    const n = memoryNotifications.find(x => x.id === notifId);
    if (n) n.lida = true;
    return true;
  }

  try {
    const { error } = await supabase.from('pendencia_notificacoes').update({ lida: true }).eq('id', notifId);
    return !error;
  } catch (e) {
    return false;
  }
}

// ==========================================
// 10. EDITOR DE BLOCOS (MIRO STYLE - TASK BLOCKS)
// ==========================================

import { PendenciaBlock } from '@/lib/pendenciasTypes';

let memoryTaskBlocks: Record<string, PendenciaBlock[]> = {};

export async function getTaskBlocks(taskId: string): Promise<PendenciaBlock[]> {
  try {
    // 1. Check if Supabase task_blocks table has data
    const { data, error } = await supabase
      .from('task_blocks')
      .select('*')
      .eq('task_id', taskId)
      .order('order_index', { ascending: true });

    if (!error && data && data.length > 0) {
      memoryTaskBlocks[taskId] = data as PendenciaBlock[];
      return data as PendenciaBlock[];
    }
  } catch (e) {
    console.warn('[pendenciasService] Exceção ao consultar task_blocks no Supabase:', e);
  }

  // 2. Return from memory if available
  if (memoryTaskBlocks[taskId] && memoryTaskBlocks[taskId].length > 0) {
    return memoryTaskBlocks[taskId];
  }

  // 3. Fallback/Initial Conversion from pendencia.descricao & subitens
  const pen = await getPendenciaById(taskId);
  const initialBlocks: PendenciaBlock[] = [];

  if (pen?.descricao && pen.descricao.trim().length > 0) {
    initialBlocks.push({
      id: `blk-${taskId}-desc`,
      task_id: taskId,
      order_index: 0,
      type: 'TEXT',
      content: { text: pen.descricao }
    });
  } else {
    initialBlocks.push({
      id: `blk-${taskId}-init`,
      task_id: taskId,
      order_index: 0,
      type: 'TEXT',
      content: { text: '' }
    });
  }

  if (pen?.subitens && pen.subitens.length > 0) {
    initialBlocks.push({
      id: `blk-${taskId}-subitens`,
      task_id: taskId,
      order_index: initialBlocks.length,
      type: 'CHECKLIST',
      content: {
        items: pen.subitens.map(sub => ({
          id: sub.id,
          text: sub.descricao,
          checked: sub.concluido
        }))
      }
    });
  }

  memoryTaskBlocks[taskId] = initialBlocks;
  return initialBlocks;
}

export async function saveTaskBlocks(taskId: string, blocks: PendenciaBlock[]): Promise<boolean> {
  memoryTaskBlocks[taskId] = blocks;

  try {
    // Save/Upsert all blocks into task_blocks table
    const payload = blocks.map((b, idx) => ({
      id: b.id,
      task_id: taskId,
      order_index: idx,
      type: b.type,
      content: b.content,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('task_blocks')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[pendenciasService] Erro ao salvar task_blocks no Supabase:', error.message);
    }
    return true;
  } catch (e) {
    console.error('[pendenciasService] Exceção ao salvar task_blocks:', e);
    return true; // Still preserved in memory
  }
}

export async function deleteTaskBlock(blockId: string, taskId: string): Promise<boolean> {
  if (memoryTaskBlocks[taskId]) {
    memoryTaskBlocks[taskId] = memoryTaskBlocks[taskId].filter(b => b.id !== blockId);
  }

  try {
    const { error } = await supabase
      .from('task_blocks')
      .delete()
      .eq('id', blockId);
    return !error;
  } catch (e) {
    return true;
  }
}

// ==========================================
// QUICK WRAPPER HELPERS FOR ACTION CARDS
// ==========================================

export async function completePendencia(
  id: string,
  userId: string,
  obs: string = 'Concluído via ação rápida'
): Promise<boolean> {
  const profiles = await getUserProfilesForAutocomplete();
  const found = profiles.find(p => p.id === userId) || {
    id: userId,
    email: 'usuario@chacaras.com.br',
    full_name: 'Usuário do Sistema',
    role: 'Coanfitriã'
  };
  return await concluirPendencia(id, obs, found);
}

export async function updatePendenciaStatus(
  id: string,
  novoStatus: PendenciaStatus,
  userId: string,
  obs: string = 'Status alterado'
): Promise<boolean> {
  const profiles = await getUserProfilesForAutocomplete();
  const current = profiles.find(p => p.id === userId) || {
    id: userId,
    email: 'usuario@chacaras.com.br',
    full_name: 'Usuário do Sistema',
    role: 'Coanfitriã'
  };

  const pen = await getPendenciaById(id);
  const targetUser: UserProfileOption = (pen?.criado_por && pen.criado_por !== userId)
    ? { id: pen.criado_por, email: pen.criado_por_email || '', full_name: pen.criado_por_nome || 'Criador', role: 'Anfitriã' }
    : current;

  return await tramitarPendencia(id, targetUser, obs, novoStatus, current);
}

