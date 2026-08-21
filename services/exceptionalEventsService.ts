import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/appMode';

export interface ExceptionalEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string; // YYYY-MM-DD
  start_time?: string; // HH:MM
  end_time?: string; // HH:MM
  all_day: boolean;
  chacara_id?: string | null;
  chacara_nome?: string;
  responsible_id?: string | null;
  responsible_name?: string;
  priority: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  reminder_date?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ExceptionalEventInput {
  title: string;
  description?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  chacara_id?: string | null;
  chacara_nome?: string;
  responsible_id?: string | null;
  responsible_name?: string;
  priority?: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  status?: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  reminder_date?: string | null;
}

// In-memory fallback (starts empty - no mock/demo events)
let memoryExceptionalEvents: ExceptionalEvent[] = [];

const isValidUUID = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

export async function getExceptionalEvents(filters?: {
  chacara_id?: string;
  status?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}): Promise<ExceptionalEvent[]> {
  if (isDemoMode()) {
    return filterInMemory(memoryExceptionalEvents, filters);
  }

  try {
    // 1. Fetch user profiles map to enrich responsible names
    const profilesMap = new Map<string, string>();
    try {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, name, email');
      if (profs) {
        profs.forEach((p: any) => {
          const fn = p.full_name || p.name || (p.email ? p.email.split('@')[0] : '');
          if (p.id && fn) profilesMap.set(p.id, fn);
        });
      }
    } catch (e) {
      console.warn('[exceptionalEventsService] Não foi possível buscar profiles:', e);
    }

    let query = supabase
      .from('exceptional_events')
      .select(`
        *,
        chacara:chacaras(id, name)
      `)
      .is('deleted_at', null)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (filters?.chacara_id && filters.chacara_id !== 'TODAS') {
      query = query.eq('chacara_id', filters.chacara_id);
    }

    if (filters?.status && filters.status !== 'TODOS') {
      query = query.eq('status', filters.status);
    }

    if (filters?.start_date && filters?.end_date) {
      query = query.gte('event_date', filters.start_date).lte('event_date', filters.end_date);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[exceptionalEventsService] Erro ao buscar eventos excepcionais:', error.message);
      return filterInMemory(memoryExceptionalEvents, filters);
    }

    return (data || []).map((row: any) => {
      const respName = row.responsible_id && profilesMap.has(row.responsible_id)
        ? profilesMap.get(row.responsible_id)
        : (row.responsible_name || '');

      return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        event_date: row.event_date,
        start_time: row.start_time ? row.start_time.substring(0, 5) : '08:00',
        end_time: row.end_time ? row.end_time.substring(0, 5) : '09:00',
        all_day: Boolean(row.all_day),
        chacara_id: row.chacara_id || null,
        chacara_nome: row.chacara?.name || row.chacara_nome || '',
        responsible_id: row.responsible_id || null,
        responsible_name: respName,
        priority: row.priority || 'NORMAL',
        status: row.status || 'PENDENTE',
        reminder_date: row.reminder_date || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at || null
      };
    });
  } catch (err) {
    console.warn('[exceptionalEventsService] Exceção ao consultar Supabase:', err);
    return filterInMemory(memoryExceptionalEvents, filters);
  }
}

export async function createExceptionalEvent(input: ExceptionalEventInput): Promise<ExceptionalEvent> {
  const now = new Date().toISOString();
  const validChacaraId = isValidUUID(input.chacara_id) ? input.chacara_id : null;
  const validRespId = isValidUUID(input.responsible_id) ? input.responsible_id : null;

  const payload = {
    title: input.title.trim(),
    description: input.description || '',
    event_date: input.event_date,
    start_time: input.start_time || '08:00',
    end_time: input.end_time || '09:00',
    all_day: Boolean(input.all_day),
    chacara_id: validChacaraId,
    responsible_id: validRespId,
    responsible_name: input.responsible_name || null,
    priority: input.priority || 'NORMAL',
    status: input.status || 'PENDENTE',
    reminder_date: input.reminder_date || null,
    created_at: now,
    updated_at: now
  };

  if (isDemoMode()) {
    const newItem: ExceptionalEvent = {
      ...payload,
      id: `exc-${Date.now()}`,
      chacara_nome: input.chacara_nome || '',
      responsible_name: input.responsible_name || ''
    };
    memoryExceptionalEvents.unshift(newItem);
    return newItem;
  }

  try {
    const { data, error } = await supabase
      .from('exceptional_events')
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      console.warn('[exceptionalEventsService] Erro no INSERT Supabase:', error?.message);
      const newItem: ExceptionalEvent = {
        ...payload,
        id: `exc-${Date.now()}`,
        chacara_nome: input.chacara_nome || '',
        responsible_name: input.responsible_name || ''
      };
      memoryExceptionalEvents.unshift(newItem);
      return newItem;
    }

    return {
      ...data,
      chacara_nome: input.chacara_nome || '',
      responsible_name: input.responsible_name || data.responsible_name || ''
    };
  } catch (err) {
    console.warn('[exceptionalEventsService] Exceção no INSERT:', err);
    const newItem: ExceptionalEvent = {
      ...payload,
      id: `exc-${Date.now()}`,
      chacara_nome: input.chacara_nome || '',
      responsible_name: input.responsible_name || ''
    };
    memoryExceptionalEvents.unshift(newItem);
    return newItem;
  }
}

export async function updateExceptionalEvent(id: string, updates: Partial<ExceptionalEventInput>): Promise<ExceptionalEvent | null> {
  const now = new Date().toISOString();

  if (isDemoMode() || id.startsWith('exc-')) {
    const idx = memoryExceptionalEvents.findIndex(e => e.id === id);
    if (idx !== -1) {
      memoryExceptionalEvents[idx] = {
        ...memoryExceptionalEvents[idx],
        ...updates,
        updated_at: now
      };
      return memoryExceptionalEvents[idx];
    }
  }

  try {
    const dbUpdates: Record<string, any> = {
      updated_at: now
    };

    if (updates.title !== undefined) dbUpdates.title = updates.title.trim();
    if (updates.description !== undefined) dbUpdates.description = updates.description || '';
    if (updates.event_date !== undefined) dbUpdates.event_date = updates.event_date;
    if (updates.start_time !== undefined) dbUpdates.start_time = updates.start_time;
    if (updates.end_time !== undefined) dbUpdates.end_time = updates.end_time;
    if (updates.all_day !== undefined) dbUpdates.all_day = Boolean(updates.all_day);
    if (updates.chacara_id !== undefined) dbUpdates.chacara_id = isValidUUID(updates.chacara_id) ? updates.chacara_id : null;
    if (updates.responsible_id !== undefined) dbUpdates.responsible_id = isValidUUID(updates.responsible_id) ? updates.responsible_id : null;
    if (updates.responsible_name !== undefined) dbUpdates.responsible_name = updates.responsible_name || null;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.reminder_date !== undefined) dbUpdates.reminder_date = updates.reminder_date || null;

    const { data, error } = await supabase
      .from('exceptional_events')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.warn('[exceptionalEventsService] Erro no UPDATE Supabase:', error?.message);
      const idx = memoryExceptionalEvents.findIndex(e => e.id === id);
      if (idx !== -1) {
        memoryExceptionalEvents[idx] = {
          ...memoryExceptionalEvents[idx],
          ...updates,
          updated_at: now
        };
        return memoryExceptionalEvents[idx];
      }
      return null;
    }

    return {
      ...data,
      chacara_nome: updates.chacara_nome,
      responsible_name: updates.responsible_name || data.responsible_name
    } as ExceptionalEvent;
  } catch (err) {
    console.warn('[exceptionalEventsService] Exceção no UPDATE:', err);
    return null;
  }
}

export async function deleteExceptionalEvent(id: string, softDelete = true): Promise<boolean> {
  const now = new Date().toISOString();

  if (isDemoMode() || id.startsWith('exc-')) {
    memoryExceptionalEvents = memoryExceptionalEvents.filter(e => e.id !== id);
    return true;
  }

  try {
    if (softDelete) {
      const { error } = await supabase
        .from('exceptional_events')
        .update({ deleted_at: now, updated_at: now })
        .eq('id', id);

      if (error) {
        console.warn('[exceptionalEventsService] Soft delete erro:', error.message);
        // Fallback hard delete
        const { error: hardErr } = await supabase
          .from('exceptional_events')
          .delete()
          .eq('id', id);

        if (hardErr) return false;
      }
    } else {
      const { error } = await supabase
        .from('exceptional_events')
        .delete()
        .eq('id', id);

      if (error) return false;
    }

    memoryExceptionalEvents = memoryExceptionalEvents.filter(e => e.id !== id);
    return true;
  } catch (err) {
    console.warn('[exceptionalEventsService] Exceção ao deletar:', err);
    memoryExceptionalEvents = memoryExceptionalEvents.filter(e => e.id !== id);
    return true;
  }
}

function filterInMemory(items: ExceptionalEvent[], filters?: any): ExceptionalEvent[] {
  let list = items.filter(e => !e.deleted_at);

  if (filters?.chacara_id && filters.chacara_id !== 'TODAS') {
    list = list.filter(e => e.chacara_id === filters.chacara_id);
  }

  if (filters?.status && filters.status !== 'TODOS') {
    list = list.filter(e => e.status === filters.status);
  }

  if (filters?.start_date && filters?.end_date) {
    list = list.filter(e => e.event_date >= filters.start_date && e.event_date <= filters.end_date);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(e =>
      e.title.toLowerCase().includes(q) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.responsible_name && e.responsible_name.toLowerCase().includes(q))
    );
  }

  return list;
}
