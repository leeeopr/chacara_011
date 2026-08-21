import { supabase } from '@/lib/supabase';
import { Client } from '@/lib/chacaraTypes';
import { isDemoMode } from '@/lib/appMode';
import { demoRepository } from '@/lib/demoRepository';

export async function getClients(filters?: { search?: string }): Promise<Client[]> {
  if (isDemoMode()) {
    return demoRepository.getClients(filters);
  }
  try {
    let query = supabase
      .from('clients')
      .select('*')
      .order('full_name', { ascending: true });

    if (filters?.search && filters.search.trim() !== '') {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`full_name.ilike.${term},phone.ilike.${term},document_number.ilike.${term},email.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[clientsService] Erro no Supabase ao buscar clientes:', error.message);
      return [];
    }
    return (data as Client[]) || [];
  } catch (e) {
    console.error('[clientsService] Exceção ao buscar clientes:', e);
    return [];
  }
}

export async function getClientById(id: string): Promise<Client | null> {
  if (!id) return null;
  if (isDemoMode()) {
    return demoRepository.getClientById(id);
  }
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[clientsService] Erro ao buscar cliente por ID:', error.message);
      return null;
    }
    return data as Client;
  } catch (e) {
    console.error('[clientsService] Exceção em getClientById:', e);
    return null;
  }
}

export async function createClient(clientData: Partial<Client>): Promise<Client> {
  if (isDemoMode()) {
    return demoRepository.createClient(clientData);
  }
  const { id: _i, created_at: _c, updated_at: _u, ...insertData } = clientData as any;

  const payload = {
    ...insertData,
    total_reservations: insertData.total_reservations || 0,
    total_spent: insertData.total_spent || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('clients')
    .insert([payload])
    .select()
    .single();

  if (error || !data) {
    console.error('[clientsService] Erro ao criar cliente no Supabase:', error?.message);
    throw new Error('Falha ao cadastrar cliente no banco: ' + (error?.message || ''));
  }

  return data as Client;
}

export async function updateClient(id: string, clientData: Partial<Client>): Promise<Client> {
  if (isDemoMode()) {
    return demoRepository.updateClient(id, clientData);
  }
  const { id: _i, created_at: _c, updated_at: _u, ...updateData } = clientData as any;

  const { data, error } = await supabase
    .from('clients')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    console.error('[clientsService] Erro ao atualizar cliente no Supabase:', error?.message);
    throw new Error('Falha ao atualizar cliente: ' + (error?.message || ''));
  }

  return data as Client;
}

export async function deleteClient(id: string): Promise<boolean> {
  if (isDemoMode()) {
    return demoRepository.deleteClient(id);
  }

  try {
    // 1. Tentar desvincular as reservas ajustando client_id para null
    const { error: unbindError } = await supabase
      .from('reservations')
      .update({ client_id: null })
      .eq('client_id', id);

    if (unbindError) {
      console.warn('[clientsService] Não foi possível definir client_id como null nas reservas, excluindo dependências:', unbindError.message);

      // Buscar IDs das reservas atreladas a este cliente
      const { data: clientReservations } = await supabase
        .from('reservations')
        .select('id')
        .eq('client_id', id);

      if (clientReservations && clientReservations.length > 0) {
        const resIds = clientReservations.map(r => r.id);

        // Limpar registros em tabelas filhas (guests e history) se existirem
        await supabase.from('reservation_guests').delete().in('reservation_id', resIds);
        await supabase.from('reservation_history').delete().in('reservation_id', resIds);

        // Excluir as reservas atreladas ao cliente para desobstruir a FK
        const { error: delResError } = await supabase
          .from('reservations')
          .delete()
          .eq('client_id', id);

        if (delResError) {
          console.error('[clientsService] Erro ao excluir reservas associadas:', delResError.message);
        }
      }
    }
  } catch (e) {
    console.warn('[clientsService] Exceção ao limpar dependências do cliente:', e);
  }

  // 2. Excluir o cliente da tabela clients
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[clientsService] Erro ao excluir cliente no Supabase:', error.message);
    throw new Error('Falha ao excluir cliente: ' + error.message);
  }

  return true;
}
