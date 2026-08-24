import { supabase } from '@/lib/supabase';
import { Chacara, ChacaraPhoto, Owner } from '@/lib/chacaraTypes';
import { isDemoMode } from '@/lib/appMode';
import { demoRepository } from '@/lib/demoRepository';

function normalizeChacara(item: any): Chacara {
  if (!item) return item;
  const capacity = Number(item.capacity_people ?? item.max_capacity ?? 0);
  return {
    ...item,
    capacity_people: capacity,
    max_capacity: Number(item.max_capacity ?? capacity)
  } as Chacara;
}

export async function getChacaras(filters?: { search?: string; status?: string }): Promise<Chacara[]> {
  if (isDemoMode()) {
    return demoRepository.getChacaras(filters);
  }
  try {
    let query = supabase
      .from('chacaras')
      .select('*, owner:owners(*), photos:chacara_photos(*)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'TODOS') {
      query = query.eq('status', filters.status);
    }

    if (filters?.search && filters.search.trim() !== '') {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`name.ilike.${term},city.ilike.${term},neighborhood.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[chacarasService] Erro ao buscar chácaras no Supabase (usando fallback demo):', error.message);
      return demoRepository.getChacaras(filters);
    }
    const list = ((data as any[]) || []).map(normalizeChacara);
    if (list.length === 0 && !filters?.search && (!filters?.status || filters.status === 'TODOS')) {
      const demoList = await demoRepository.getChacaras(filters);
      return demoList;
    }
    return list;
  } catch (e) {
    console.warn('[chacarasService] Exceção ao buscar chácaras (usando fallback demo):', e);
    return demoRepository.getChacaras(filters);
  }
}

export async function getChacaraById(id: string): Promise<Chacara | null> {
  if (!id) return null;
  if (isDemoMode()) {
    return demoRepository.getChacaraById(id);
  }
  try {
    const { data, error } = await supabase
      .from('chacaras')
      .select('*, owner:owners(*), photos:chacara_photos(*), staff:chacara_staff(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn('[chacarasService] Erro ao buscar chácara por ID (usando fallback demo):', error.message);
      return demoRepository.getChacaraById(id);
    }
    return data ? normalizeChacara(data) : demoRepository.getChacaraById(id);
  } catch (e) {
    console.warn('[chacarasService] Exceção ao buscar chácara por ID (usando fallback demo):', e);
    return demoRepository.getChacaraById(id);
  }
}

async function runWithMissingColumnFilter<T>(
  payload: Record<string, any>,
  operation: (cleanPayload: Record<string, any>) => Promise<{ data: T | null; error: any }>
): Promise<T> {
  let lastError: any = null;

  for (let attempt = 0; attempt < 25; attempt++) {
    const res = await operation(payload);

    if (!res.error && res.data) {
      return res.data;
    }

    lastError = res.error;
    const msg = res.error?.message || '';

    // 1. Missing column in schema (PostgREST or Postgres column does not exist)
    const matchNotFound = msg.match(/Could not find the '([^']+)' column/i) || msg.match(/column "([^"]+)" does not exist/i);
    if (matchNotFound && matchNotFound[1]) {
      const col = matchNotFound[1];
      if (payload.hasOwnProperty(col)) {
        console.warn(`[chacarasService] Removing non-existent column '${col}' from payload.`);
        delete payload[col];
        continue;
      }
    }

    // 2. Not-null constraint violation
    const matchNotNull = msg.match(/null value in column "([^"]+)"/i);
    if (matchNotNull && matchNotNull[1]) {
      const col = matchNotNull[1];
      console.warn(`[chacarasService] Setting default value for NOT NULL column '${col}'.`);
      if (col === 'number' || col === 'address_number') {
        payload[col] = 'S/N';
      } else if (col === 'code') {
        payload[col] = `CHA-${Math.floor(100 + Math.random() * 900)}`;
      } else if (col === 'cpf_cnpj' || col === 'document_number') {
        payload[col] = '000.000.000-00';
      } else if (col.includes('count') || col.includes('fee') || col.includes('rate') || col.includes('amount') || col.includes('capacity') || col.includes('price') || col.includes('guests')) {
        payload[col] = 0;
      } else if (col.startsWith('has_') || col.startsWith('is_') || col.startsWith('allow_')) {
        payload[col] = false;
      } else {
        payload[col] = 'N/A';
      }
      continue;
    }

    // 3. Fallback for column mentioned in relation constraint or other error where payload has the key
    const matchCol = msg.match(/column "([^"]+)"/i);
    if (matchCol && matchCol[1]) {
      const col = matchCol[1];
      if (payload.hasOwnProperty(col)) {
        console.warn(`[chacarasService] Removing problematic column '${col}' from payload.`);
        delete payload[col];
        continue;
      }
    }

    break;
  }

  throw new Error(lastError?.message || 'Erro de execução no banco de dados.');
}

export async function createChacara(chacara: Partial<Chacara>, photos: string[] = []): Promise<Chacara> {
  if (isDemoMode()) {
    return demoRepository.createChacara(chacara, photos);
  }
  const { photos: _p, staff: _s, owner: _o, ...insertData } = chacara as any;
  
  const capacity = Number(insertData.capacity_people ?? insertData.max_capacity ?? 0);

  const payload: any = {
    ...insertData,
    number: insertData.number || insertData.address_number || 'S/N',
    is_deleted: false,
    status: insertData.status || 'ATIVA',
  };

  if (capacity > 0 && payload.max_capacity === undefined) {
    payload.max_capacity = capacity;
  }

  if (!payload.code || typeof payload.code !== 'string' || !payload.code.trim()) {
    const rawName = (insertData.name || 'CHA')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase() || 'CHA';
    payload.code = `${rawName}-${Math.floor(100 + Math.random() * 900)}`;
  }

  const created = await runWithMissingColumnFilter<Chacara>(payload, async (p) => {
    return await supabase
      .from('chacaras')
      .insert([p])
      .select()
      .single();
  });

  const createdChacara = normalizeChacara(created);

  // Insert photos if present
  if (photos && photos.length > 0) {
    try {
      const photoRecords = photos.map((url, idx) => ({
        chacara_id: createdChacara.id,
        url,
        is_main: idx === 0,
        display_order: idx
      }));

      const photoData = await runWithMissingColumnFilter<ChacaraPhoto[]>(photoRecords as any, async (p) => {
        return await supabase
          .from('chacara_photos')
          .insert(p)
          .select();
      });

      if (photoData) {
        createdChacara.photos = photoData;
      }
    } catch (e) {
      console.warn('[chacarasService] Error saving photos to chacara_photos:', e);
    }
  }

  return createdChacara;
}

export async function updateChacara(id: string, chacara: Partial<Chacara>, photos?: string[]): Promise<Chacara> {
  if (isDemoMode()) {
    return demoRepository.updateChacara(id, chacara, photos);
  }
  const { photos: _p, staff: _s, owner: _o, id: _id, created_at: _c, ...updateData } = chacara as any;

  const capacity = Number(updateData.capacity_people ?? updateData.max_capacity ?? 0);

  const payload: any = {
    ...updateData,
    updated_at: new Date().toISOString()
  };

  if (capacity > 0 && payload.max_capacity === undefined) {
    payload.max_capacity = capacity;
  }

  const updated = await runWithMissingColumnFilter<Chacara>(payload, async (p) => {
    return await supabase
      .from('chacaras')
      .update(p)
      .eq('id', id)
      .select()
      .single();
  });

  const updatedChacara = normalizeChacara(updated);

  if (photos !== undefined) {
    try {
      // Delete previous photos and insert new list
      await supabase.from('chacara_photos').delete().eq('chacara_id', id);

      if (photos.length > 0) {
        const photoRecords = photos.map((url, idx) => ({
          chacara_id: id,
          url,
          is_main: idx === 0,
          display_order: idx
        }));

        const photoData = await runWithMissingColumnFilter<ChacaraPhoto[]>(photoRecords as any, async (p) => {
          return await supabase
            .from('chacara_photos')
            .insert(p)
            .select();
        });

        if (photoData) {
          updatedChacara.photos = photoData;
        }
      }
    } catch (e) {
      console.warn('[chacarasService] Error updating photos in chacara_photos:', e);
    }
  }

  return updatedChacara;
}

export async function deleteChacara(id: string): Promise<boolean> {
  if (isDemoMode()) {
    return demoRepository.deleteChacara(id);
  }
  const { error } = await supabase
    .from('chacaras')
    .update({ is_deleted: true, status: 'INATIVA', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[chacarasService] Erro ao excluir chácara:', error.message);
    throw new Error('Falha ao excluir chácara: ' + error.message);
  }

  return true;
}

export async function duplicateChacara(id: string): Promise<Chacara> {
  if (isDemoMode()) {
    return demoRepository.duplicateChacara(id);
  }
  const original = await getChacaraById(id);
  if (!original) throw new Error('Chácara original não encontrada.');

  const { id: _id, created_at: _c, updated_at: _u, owner, photos, staff, ...rest } = original;
  const newName = `${original.name} (Cópia)`;
  
  const photosUrls = photos?.map(p => p.url) || [];
  return await createChacara({ ...rest, name: newName }, photosUrls);
}

export async function getOwners(): Promise<Owner[]> {
  if (isDemoMode()) {
    return demoRepository.getOwners();
  }
  try {
    const { data, error } = await supabase
      .from('owners')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('[chacarasService] Erro ao buscar proprietários:', error.message);
      return [];
    }
    return (data as Owner[]) || [];
  } catch (e) {
    console.error('[chacarasService] Exceção ao buscar proprietários:', e);
    return [];
  }
}

export async function createOwner(owner: Partial<Owner>): Promise<Owner> {
  if (isDemoMode()) {
    return demoRepository.createOwner(owner);
  }
  const docNum = owner.document_number?.trim() || owner.cpf_cnpj?.trim() || '';
  const newOwnerData: any = {
    full_name: owner.full_name?.trim() || 'Proprietário',
    phone: owner.phone?.trim() || '',
    email: owner.email?.trim() || '',
    document_number: docNum,
    cpf_cnpj: docNum || '000.000.000-00',
    notes: owner.notes?.trim() || ''
  };

  const data = await runWithMissingColumnFilter<Owner>(newOwnerData, async (p) => {
    return await supabase
      .from('owners')
      .insert([p])
      .select()
      .single();
  });

  return data;
}

