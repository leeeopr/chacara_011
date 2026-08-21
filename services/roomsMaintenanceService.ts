import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/appMode';
import {
  PropertyRoom,
  RoomType,
  MaintenanceRecord,
  MaintenanceImage,
  RoomMaintenanceFilter,
  INITIAL_ROOM_TYPES,
  RecurrencePeriod
} from '@/lib/roomsMaintenanceTypes';
import { saveOperationalEvent, deleteOperationalEvent } from '@/services/operationalCalendarService';
import { getHousePurchases } from '@/services/purchasesService';

// In-memory state for fallback/session retention
let memoryRoomTypes: RoomType[] = INITIAL_ROOM_TYPES.map((t, idx) => ({
  ...t,
  id: `type-${idx + 1}`,
  created_at: new Date().toISOString()
}));

let memoryRooms: PropertyRoom[] = [];
let memoryMaintenances: MaintenanceRecord[] = [];
let memoryMaintenanceImages: MaintenanceImage[] = [];
let memoryMaintenancePurchases: { maintenance_id: string; purchase_id: string }[] = [];

// =========================================================================
// 1. TIPOS DE CÔMODOS (ROOM TYPES)
// =========================================================================

export async function getRoomTypes(): Promise<RoomType[]> {
  if (!isDemoMode()) {
    try {
      const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as RoomType[];
      }
      
      // If table is empty or missing, try inserting initial defaults
      if (!error && data && data.length === 0) {
        const { data: inserted } = await supabase
          .from('room_types')
          .insert(INITIAL_ROOM_TYPES)
          .select();
        if (inserted && inserted.length > 0) {
          return inserted as RoomType[];
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar room_types do Supabase:', err);
    }
  }

  return memoryRoomTypes;
}

export async function createRoomType(typeData: {
  name: string;
  default_icon?: string;
  category?: string;
  color?: string;
}): Promise<RoomType> {
  const newType: RoomType = {
    id: `type-${Date.now()}`,
    name: typeData.name.trim(),
    default_icon: typeData.default_icon || 'DoorClosed',
    category: (typeData.category as any) || 'GERAL',
    color: typeData.color || '#3B82F6',
    is_custom: true,
    display_order: 50,
    created_at: new Date().toISOString()
  };

  if (!isDemoMode()) {
    try {
      const { data, error } = await supabase
        .from('room_types')
        .insert([{
          name: newType.name,
          default_icon: newType.default_icon,
          category: newType.category,
          color: newType.color,
          is_custom: true,
          display_order: newType.display_order
        }])
        .select()
        .single();

      if (!error && data) {
        return data as RoomType;
      }
    } catch (e) {
      console.warn('Erro ao salvar room_type no Supabase:', e);
    }
  }

  memoryRoomTypes.push(newType);
  return newType;
}

// =========================================================================
// 2. CÔMODOS DA CHÁCARA (PROPERTY ROOMS)
// =========================================================================

export async function getPropertyRooms(chacaraId: string): Promise<PropertyRoom[]> {
  let rooms: PropertyRoom[] = [];

  if (!isDemoMode()) {
    try {
      const { data, error } = await supabase
        .from('property_rooms')
        .select('*')
        .eq('chacara_id', chacaraId)
        .eq('is_deleted', false)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error && data) {
        rooms = data as PropertyRoom[];
      }
    } catch (err) {
      console.warn('Erro ao buscar property_rooms no Supabase:', err);
    }
  }

  // Fallback to memory if supabase query returned nothing or failed
  if (rooms.length === 0) {
    rooms = memoryRooms.filter(r => r.chacara_id === chacaraId && !r.is_deleted);
    rooms.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }

  // Attach live calculated stats and open maintenances for each room
  const maintenances = await getMaintenanceRecords({ chacara_id: chacaraId });
  
  return rooms.map(room => {
    const roomMaints = maintenances.filter(m => m.room_id === room.id && !m.is_deleted);
    const openMaints = roomMaints.filter(m => m.status !== 'CONCLUIDA' && m.status !== 'CANCELADA');
    const inProgress = roomMaints.filter(m => m.status === 'EM_ANDAMENTO');
    const urgent = openMaints.filter(m => m.priority === 'URGENTE');
    const completed = roomMaints.filter(m => m.status === 'CONCLUIDA');
    const totalSpent = roomMaints.reduce((sum, m) => sum + (m.actual_cost || m.estimated_cost || 0), 0);

    return {
      ...room,
      stats: {
        total_maintenances: roomMaints.length,
        open_maintenances: openMaints.length,
        in_progress_maintenances: inProgress.length,
        urgent_maintenances: urgent.length,
        completed_maintenances: completed.length,
        total_spent: totalSpent,
        has_urgent: urgent.length > 0
      },
      recent_maintenances: openMaints.slice(0, 3)
    };
  });
}

export async function getPropertyRoomById(roomId: string): Promise<PropertyRoom | null> {
  if (!isDemoMode()) {
    try {
      const { data, error } = await supabase
        .from('property_rooms')
        .select('*')
        .eq('id', roomId)
        .eq('is_deleted', false)
        .single();

      if (!error && data) {
        const room = data as PropertyRoom;
        const maintenances = await getMaintenanceRecords({ room_id: roomId });
        const openMaints = maintenances.filter(m => m.status !== 'CONCLUIDA' && m.status !== 'CANCELADA');
        const inProgress = maintenances.filter(m => m.status === 'EM_ANDAMENTO');
        const urgent = openMaints.filter(m => m.priority === 'URGENTE');
        const completed = maintenances.filter(m => m.status === 'CONCLUIDA');
        const totalSpent = maintenances.reduce((sum, m) => sum + (m.actual_cost || m.estimated_cost || 0), 0);

        return {
          ...room,
          stats: {
            total_maintenances: maintenances.length,
            open_maintenances: openMaints.length,
            in_progress_maintenances: inProgress.length,
            urgent_maintenances: urgent.length,
            completed_maintenances: completed.length,
            total_spent: totalSpent,
            has_urgent: urgent.length > 0
          },
          recent_maintenances: openMaints
        };
      }
    } catch (err) {
      console.warn('Erro ao consultar cômodo no Supabase:', err);
    }
  }

  const found = memoryRooms.find(r => r.id === roomId && !r.is_deleted);
  return found || null;
}

export async function createPropertyRoom(roomData: {
  chacara_id: string;
  name: string;
  room_type_id?: string;
  room_type_name?: string;
  description?: string;
  icon?: string;
  photo_url?: string;
  display_order?: number;
  status?: string;
  notes?: string;
}): Promise<PropertyRoom> {
  const newRoom: PropertyRoom = {
    id: `room-${Date.now()}`,
    chacara_id: roomData.chacara_id,
    room_type_id: roomData.room_type_id,
    room_type_name: roomData.room_type_name || 'Outro',
    name: roomData.name.trim(),
    description: roomData.description?.trim() || '',
    icon: roomData.icon || 'DoorClosed',
    photo_url: roomData.photo_url || '',
    display_order: roomData.display_order ?? 0,
    status: (roomData.status as any) || 'OPERACIONAL',
    notes: roomData.notes || '',
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stats: {
      total_maintenances: 0,
      open_maintenances: 0,
      in_progress_maintenances: 0,
      urgent_maintenances: 0,
      completed_maintenances: 0,
      total_spent: 0,
      has_urgent: false
    }
  };

  if (!isDemoMode()) {
    try {
      const { data, error } = await supabase
        .from('property_rooms')
        .insert([{
          chacara_id: newRoom.chacara_id,
          room_type_id: newRoom.room_type_id || null,
          room_type_name: newRoom.room_type_name,
          name: newRoom.name,
          description: newRoom.description,
          icon: newRoom.icon,
          photo_url: newRoom.photo_url,
          display_order: newRoom.display_order,
          status: newRoom.status,
          notes: newRoom.notes,
          is_deleted: false
        }])
        .select()
        .single();

      if (!error && data) {
        return {
          ...data,
          stats: newRoom.stats
        } as PropertyRoom;
      }
    } catch (e) {
      console.warn('Erro ao inserir cômodo no Supabase:', e);
    }
  }

  memoryRooms.push(newRoom);
  return newRoom;
}

export async function updatePropertyRoom(
  id: string,
  updates: Partial<PropertyRoom>
): Promise<PropertyRoom> {
  const updatedData = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  if (!isDemoMode()) {
    try {
      const { data, error } = await supabase
        .from('property_rooms')
        .update({
          name: updates.name,
          room_type_id: updates.room_type_id,
          room_type_name: updates.room_type_name,
          description: updates.description,
          icon: updates.icon,
          photo_url: updates.photo_url,
          display_order: updates.display_order,
          status: updates.status,
          notes: updates.notes,
          is_deleted: updates.is_deleted,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return data as PropertyRoom;
      }
    } catch (e) {
      console.warn('Erro ao atualizar cômodo no Supabase:', e);
    }
  }

  const idx = memoryRooms.findIndex(r => r.id === id);
  if (idx !== -1) {
    memoryRooms[idx] = { ...memoryRooms[idx], ...updatedData };
    return memoryRooms[idx];
  }

  throw new Error('Cômodo não encontrado.');
}

export async function reorderPropertyRooms(
  chacaraId: string,
  roomOrderIds: string[]
): Promise<void> {
  // Update display_order for each room
  if (!isDemoMode()) {
    try {
      const updatePromises = roomOrderIds.map((roomId, index) =>
        supabase
          .from('property_rooms')
          .update({ display_order: index })
          .eq('id', roomId)
      );
      await Promise.all(updatePromises);
    } catch (err) {
      console.warn('Erro ao salvar reordenação no Supabase:', err);
    }
  }

  roomOrderIds.forEach((roomId, index) => {
    const room = memoryRooms.find(r => r.id === roomId);
    if (room) {
      room.display_order = index;
    }
  });
}

export async function checkRoomDeletionSafety(roomId: string): Promise<{
  canDelete: boolean;
  totalMaintenances: number;
  activeMaintenances: number;
  message: string;
}> {
  const maintenances = await getMaintenanceRecords({ room_id: roomId });
  const activeMaints = maintenances.filter(m => m.status !== 'CONCLUIDA' && m.status !== 'CANCELADA' && !m.is_deleted);
  
  if (activeMaints.length > 0) {
    return {
      canDelete: false,
      totalMaintenances: maintenances.length,
      activeMaintenances: activeMaints.length,
      message: `Este ambiente possui ${activeMaints.length} manutenção(ões) ativa(s). Conclua ou cancele as manutenções antes de excluir o cômodo.`
    };
  }

  return {
    canDelete: true,
    totalMaintenances: maintenances.length,
    activeMaintenances: 0,
    message: maintenances.length > 0 
      ? `Este cômodo possui ${maintenances.length} registro(s) no histórico. Ao excluir, eles serão arquivados com segurança.`
      : 'Este ambiente não possui manutenções vinculadas e pode ser excluído com segurança.'
  };
}

export async function deletePropertyRoom(roomId: string): Promise<void> {
  if (!isDemoMode()) {
    try {
      const { error } = await supabase
        .from('property_rooms')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', roomId);

      if (!error) return;
    } catch (err) {
      console.warn('Erro ao excluir cômodo no Supabase:', err);
    }
  }

  const room = memoryRooms.find(r => r.id === roomId);
  if (room) {
    room.is_deleted = true;
  }
}

// =========================================================================
// 3. MANUTENÇÕES (MAINTENANCE RECORDS)
// =========================================================================

export async function getMaintenanceRecords(filter?: RoomMaintenanceFilter): Promise<MaintenanceRecord[]> {
  let records: MaintenanceRecord[] = [];

  if (!isDemoMode()) {
    try {
      let query = supabase
        .from('maintenance_records')
        .select(`
          *,
          property_rooms (name, icon),
          chacaras (name)
        `)
        .eq('is_deleted', false)
        .order('identified_at', { ascending: false });

      if (filter?.chacara_id) {
        query = query.eq('chacara_id', filter.chacara_id);
      }
      if (filter?.room_id) {
        query = query.eq('room_id', filter.room_id);
      }
      if (filter?.priority && filter.priority !== 'TODAS') {
        query = query.eq('priority', filter.priority);
      }
      if (filter?.assigned_crew_id) {
        query = query.eq('assigned_crew_member_id', filter.assigned_crew_id);
      }
      if (filter?.status && filter.status !== 'TODOS') {
        if (filter.status === 'ABERTAS') {
          query = query.in('status', ['IDENTIFICADA', 'PLANEJADA', 'AGUARDANDO', 'EM_ANDAMENTO']);
        } else {
          query = query.eq('status', filter.status);
        }
      }

      const { data, error } = await query;
      if (!error && data) {
        records = data.map((d: any) => ({
          ...d,
          room_name: d.property_rooms?.name || 'Cômodo',
          room_icon: d.property_rooms?.icon || 'DoorClosed',
          chacara_name: d.chacaras?.name || 'Chácara'
        })) as MaintenanceRecord[];
      }
    } catch (err) {
      console.warn('Erro ao consultar maintenance_records no Supabase:', err);
    }
  }

  // Fallback to memory
  if (records.length === 0) {
    records = memoryMaintenances.filter(m => !m.is_deleted);
    if (filter?.chacara_id) {
      records = records.filter(m => m.chacara_id === filter.chacara_id);
    }
    if (filter?.room_id) {
      records = records.filter(m => m.room_id === filter.room_id);
    }
    if (filter?.priority && filter.priority !== 'TODAS') {
      records = records.filter(m => m.priority === filter.priority);
    }
    if (filter?.assigned_crew_id) {
      records = records.filter(m => m.assigned_crew_member_id === filter.assigned_crew_id);
    }
    if (filter?.status && filter.status !== 'TODOS') {
      if (filter.status === 'ABERTAS') {
        records = records.filter(m => m.status !== 'CONCLUIDA' && m.status !== 'CANCELADA');
      } else {
        records = records.filter(m => m.status === filter.status);
      }
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      records = records.filter(m => 
        m.title.toLowerCase().includes(q) || 
        (m.description || '').toLowerCase().includes(q) ||
        (m.room_name || '').toLowerCase().includes(q)
      );
    }
  }

  // Populate images and purchases for each record
  const allImages = await getAllMaintenanceImages();
  const allPurchases = await getHousePurchases();

  return records.map(rec => {
    const images = allImages.filter(img => img.maintenance_id === rec.id);
    const linkedPurchases = memoryMaintenancePurchases
      .filter(mp => mp.maintenance_id === rec.id)
      .map(mp => allPurchases.find(p => p.id === mp.purchase_id))
      .filter(Boolean) as any[];

    return {
      ...rec,
      images,
      purchases: linkedPurchases,
      purchase_ids: linkedPurchases.map(p => p.id)
    };
  });
}

export async function createMaintenanceRecord(data: {
  chacara_id: string;
  room_id: string;
  title: string;
  description?: string;
  priority?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  status?: string;
  identified_at?: string;
  due_date?: string;
  assigned_crew_member_id?: string;
  assigned_crew_name?: string;
  estimated_cost?: number;
  actual_cost?: number;
  financial_transaction_id?: string;
  is_recurring?: boolean;
  recurrence_period?: RecurrencePeriod;
  recurrence_interval_days?: number;
  notes?: string;
  sync_calendar?: boolean;
  purchase_ids?: string[];
}): Promise<MaintenanceRecord> {
  const newMaint: MaintenanceRecord = {
    id: `maint-${Date.now()}`,
    chacara_id: data.chacara_id,
    room_id: data.room_id,
    title: data.title.trim(),
    description: data.description?.trim() || '',
    priority: data.priority || 'MEDIA',
    status: (data.status as any) || 'IDENTIFICADA',
    identified_at: data.identified_at || new Date().toISOString().split('T')[0],
    due_date: data.due_date || undefined,
    assigned_crew_member_id: data.assigned_crew_member_id || undefined,
    assigned_crew_name: data.assigned_crew_name || undefined,
    estimated_cost: data.estimated_cost || 0,
    actual_cost: data.actual_cost || 0,
    financial_transaction_id: data.financial_transaction_id || undefined,
    is_recurring: data.is_recurring || false,
    recurrence_period: data.recurrence_period || undefined,
    recurrence_interval_days: data.recurrence_interval_days || undefined,
    next_occurrence_date: data.is_recurring ? calculateNextRecurrenceDate(data.due_date || data.identified_at || new Date().toISOString().split('T')[0], data.recurrence_period, data.recurrence_interval_days) : undefined,
    notes: data.notes || '',
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    images: []
  };

  // 1. Integrar com Calendário Operacional se solicitado ou se possuir data e responsável
  if (data.sync_calendar && (data.due_date || data.identified_at)) {
    try {
      const eventDate = data.due_date || data.identified_at || new Date().toISOString().split('T')[0];
      const calEvent = await saveOperationalEvent({
        chacara_id: data.chacara_id,
        event_type_code: 'manutencao',
        title: `Manutenção: ${data.title}`,
        description: `Ambiente: ${data.room_id}\n${data.description || ''}`,
        start_date: eventDate,
        start_time: '08:00',
        end_date: eventDate,
        end_time: '12:00',
        staff_ids: data.assigned_crew_member_id ? [data.assigned_crew_member_id] : [],
        staff_names: data.assigned_crew_name ? [data.assigned_crew_name] : [],
        status: 'AGENDADO',
        metadata: {
          maintenance_id: newMaint.id,
          room_id: data.room_id
        }
      });
      if (calEvent?.id) {
        newMaint.operational_event_id = calEvent.id;
      }
    } catch (calErr) {
      console.warn('Não foi possível sincronizar com o calendário:', calErr);
    }
  }

  // 2. Persistir no Supabase
  if (!isDemoMode()) {
    try {
      const { data: inserted, error } = await supabase
        .from('maintenance_records')
        .insert([{
          chacara_id: newMaint.chacara_id,
          room_id: newMaint.room_id,
          title: newMaint.title,
          description: newMaint.description,
          priority: newMaint.priority,
          status: newMaint.status,
          identified_at: newMaint.identified_at,
          due_date: newMaint.due_date || null,
          assigned_crew_member_id: newMaint.assigned_crew_member_id || null,
          assigned_crew_name: newMaint.assigned_crew_name || null,
          estimated_cost: newMaint.estimated_cost,
          actual_cost: newMaint.actual_cost,
          financial_transaction_id: newMaint.financial_transaction_id || null,
          operational_event_id: newMaint.operational_event_id || null,
          is_recurring: newMaint.is_recurring,
          recurrence_period: newMaint.recurrence_period || null,
          recurrence_interval_days: newMaint.recurrence_interval_days || null,
          next_occurrence_date: newMaint.next_occurrence_date || null,
          notes: newMaint.notes,
          is_deleted: false
        }])
        .select()
        .single();

      if (!error && inserted) {
        newMaint.id = inserted.id;
      }
    } catch (e) {
      console.warn('Erro ao inserir maintenance_records no Supabase:', e);
    }
  }

  // 3. Vincular itens de compras
  if (data.purchase_ids && data.purchase_ids.length > 0) {
    for (const pId of data.purchase_ids) {
      await linkPurchaseToMaintenance(newMaint.id, pId);
    }
  }

  memoryMaintenances.unshift(newMaint);

  // Auto atualizar status do cômodo se for urgente
  if (newMaint.priority === 'URGENTE') {
    await updatePropertyRoom(newMaint.room_id, { status: 'MANUTENCAO_NECESSARIA' });
  }

  return newMaint;
}

export async function updateMaintenanceRecord(
  id: string,
  updates: Partial<MaintenanceRecord> & { sync_calendar?: boolean; purchase_ids?: string[] }
): Promise<MaintenanceRecord> {
  const updatedFields: any = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  // If marked as CONCLUIDA, timestamp completion
  if (updates.status === 'CONCLUIDA' && !updates.completed_at) {
    updatedFields.completed_at = new Date().toISOString();
  }

  // 1. Sincronizar evento de calendário existente se houver
  if (updates.operational_event_id && (updates.due_date || updates.title || updates.status)) {
    try {
      await saveOperationalEvent({
        id: updates.operational_event_id,
        title: updates.title ? `Manutenção: ${updates.title}` : undefined,
        start_date: updates.due_date || undefined,
        end_date: updates.due_date || undefined,
        status: updates.status === 'CONCLUIDA' ? 'CONCLUIDO' : updates.status === 'CANCELADA' ? 'CANCELADO' : 'AGENDADO'
      });
    } catch (calErr) {
      console.warn('Erro ao atualizar evento de calendário:', calErr);
    }
  }

  // 2. Persistir no Supabase
  if (!isDemoMode()) {
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .update({
          title: updates.title,
          description: updates.description,
          priority: updates.priority,
          status: updates.status,
          due_date: updates.due_date,
          completed_at: updatedFields.completed_at,
          assigned_crew_member_id: updates.assigned_crew_member_id,
          assigned_crew_name: updates.assigned_crew_name,
          estimated_cost: updates.estimated_cost,
          actual_cost: updates.actual_cost,
          financial_transaction_id: updates.financial_transaction_id,
          is_recurring: updates.is_recurring,
          recurrence_period: updates.recurrence_period,
          recurrence_interval_days: updates.recurrence_interval_days,
          next_occurrence_date: updates.next_occurrence_date,
          notes: updates.notes,
          is_deleted: updates.is_deleted,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        // Handle purchase link updates
        if (updates.purchase_ids) {
          await updateMaintenancePurchaseLinks(id, updates.purchase_ids);
        }
        return data as MaintenanceRecord;
      }
    } catch (e) {
      console.warn('Erro ao atualizar maintenance_records no Supabase:', e);
    }
  }

  const idx = memoryMaintenances.findIndex(m => m.id === id);
  if (idx !== -1) {
    memoryMaintenances[idx] = { ...memoryMaintenances[idx], ...updatedFields };

    if (updates.purchase_ids) {
      await updateMaintenancePurchaseLinks(id, updates.purchase_ids);
    }

    // Se recorrente e concluída, gerar próxima ocorrência de forma idempotente
    if (updates.status === 'CONCLUIDA' && memoryMaintenances[idx].is_recurring) {
      await handleRecurrenceGeneration(memoryMaintenances[idx]);
    }

    return memoryMaintenances[idx];
  }

  throw new Error('Manutenção não encontrada.');
}

export async function deleteMaintenanceRecord(id: string): Promise<void> {
  const maint = memoryMaintenances.find(m => m.id === id);

  if (maint?.operational_event_id) {
    try {
      await deleteOperationalEvent(maint.operational_event_id);
    } catch (e) {
      console.warn('Erro ao remover agendamento de calendário vinculado:', e);
    }
  }

  if (!isDemoMode()) {
    try {
      await supabase
        .from('maintenance_records')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      return;
    } catch (err) {
      console.warn('Erro ao excluir manutenção no Supabase:', err);
    }
  }

  if (maint) {
    maint.is_deleted = true;
  }
}

// =========================================================================
// 4. RECORRÊNCIA IDEMPOTENTE
// =========================================================================

export function calculateNextRecurrenceDate(
  baseDateStr: string,
  period?: RecurrencePeriod,
  customDays?: number
): string {
  const base = new Date(baseDateStr || Date.now());
  if (isNaN(base.getTime())) return new Date().toISOString().split('T')[0];

  const next = new Date(base);

  switch (period) {
    case 'SEMANAL':
      next.setDate(next.getDate() + 7);
      break;
    case 'QUINZENAL':
      next.setDate(next.getDate() + 15);
      break;
    case 'MENSAL':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'BIMESTRAL':
      next.setMonth(next.getMonth() + 2);
      break;
    case 'TRIMESTRAL':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'SEMESTRAL':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'ANUAL':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'PERSONALIZADA':
      next.setDate(next.getDate() + (customDays || 30));
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }

  return next.toISOString().split('T')[0];
}

async function handleRecurrenceGeneration(parentMaint: MaintenanceRecord): Promise<void> {
  if (!parentMaint.is_recurring || !parentMaint.recurrence_period) return;

  const nextDate = calculateNextRecurrenceDate(
    parentMaint.due_date || parentMaint.identified_at,
    parentMaint.recurrence_period,
    parentMaint.recurrence_interval_days
  );

  // Check if an open child recurrence already exists for this parent to avoid duplicates
  const existingChild = memoryMaintenances.find(
    m => m.recurrence_parent_id === parentMaint.id && m.status !== 'CONCLUIDA' && !m.is_deleted
  );

  if (existingChild) {
    return; // Already generated, idempotent
  }

  await createMaintenanceRecord({
    chacara_id: parentMaint.chacara_id,
    room_id: parentMaint.room_id,
    title: parentMaint.title,
    description: `Manutenção recorrente programada (${parentMaint.recurrence_period}).\n${parentMaint.description || ''}`,
    priority: parentMaint.priority,
    status: 'PLANEJADA',
    identified_at: new Date().toISOString().split('T')[0],
    due_date: nextDate,
    assigned_crew_member_id: parentMaint.assigned_crew_member_id,
    assigned_crew_name: parentMaint.assigned_crew_name,
    estimated_cost: parentMaint.estimated_cost,
    is_recurring: true,
    recurrence_period: parentMaint.recurrence_period,
    recurrence_interval_days: parentMaint.recurrence_interval_days,
    notes: `Gerada automaticamente a partir da conclusão da manutenção ${parentMaint.id}.`,
    sync_calendar: true
  });
}

// =========================================================================
// 5. IMAGENS E FOTOS DE MANUTENÇÃO & CÔMODOS
// =========================================================================

export async function uploadRoomPhoto(file: File, chacaraId: string): Promise<string> {
  if (!isDemoMode()) {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `room_${chacaraId}_${Date.now()}.${fileExt}`;
      const filePath = `rooms/${fileName}`;

      const { data, error } = await supabase.storage
        .from('property_rooms')
        .upload(filePath, file, { upsert: true });

      if (!error) {
        const { data: publicUrlData } = supabase.storage
          .from('property_rooms')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (e) {
      console.warn('Erro no upload de foto de cômodo no Supabase Storage:', e);
    }
  }

  // Fallback to data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export async function uploadMaintenanceImage(
  file: File,
  maintenanceId: string,
  stage: 'ANTES' | 'DURANTE' | 'DEPOIS' = 'DURANTE',
  caption?: string
): Promise<MaintenanceImage> {
  let photoUrl = '';

  if (!isDemoMode()) {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `maint_${maintenanceId}_${stage}_${Date.now()}.${fileExt}`;
      const filePath = `maintenances/${fileName}`;

      const { error } = await supabase.storage
        .from('maintenance_images')
        .upload(filePath, file, { upsert: true });

      if (!error) {
        const { data: publicUrlData } = supabase.storage
          .from('maintenance_images')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          photoUrl = publicUrlData.publicUrl;
        }
      }
    } catch (e) {
      console.warn('Erro ao enviar imagem de manutenção para o Storage:', e);
    }
  }

  if (!photoUrl) {
    photoUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  const newImg: MaintenanceImage = {
    id: `img-${Date.now()}`,
    maintenance_id: maintenanceId,
    photo_url: photoUrl,
    stage,
    caption: caption || '',
    display_order: 0,
    created_at: new Date().toISOString()
  };

  if (!isDemoMode()) {
    try {
      const { data, error } = await supabase
        .from('maintenance_images')
        .insert([{
          maintenance_id: newImg.maintenance_id,
          photo_url: newImg.photo_url,
          stage: newImg.stage,
          caption: newImg.caption,
          display_order: newImg.display_order
        }])
        .select()
        .single();

      if (!error && data) {
        return data as MaintenanceImage;
      }
    } catch (e) {
      console.warn('Erro ao registrar imagem no Supabase:', e);
    }
  }

  memoryMaintenanceImages.push(newImg);
  return newImg;
}

export async function getAllMaintenanceImages(): Promise<MaintenanceImage[]> {
  if (!isDemoMode()) {
    try {
      const { data, error } = await supabase
        .from('maintenance_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as MaintenanceImage[];
      }
    } catch (e) {
      console.warn('Erro ao consultar imagens de manutenção:', e);
    }
  }
  return memoryMaintenanceImages;
}

export async function deleteMaintenanceImage(imageId: string): Promise<void> {
  if (!isDemoMode()) {
    try {
      await supabase.from('maintenance_images').delete().eq('id', imageId);
      return;
    } catch (e) {
      console.warn('Erro ao deletar imagem de manutenção no Supabase:', e);
    }
  }

  memoryMaintenanceImages = memoryMaintenanceImages.filter(img => img.id !== imageId);
}

// =========================================================================
// 6. VÍNCULOS COM COMPRAS & MATERIAIS
// =========================================================================

export async function linkPurchaseToMaintenance(maintenanceId: string, purchaseId: string): Promise<void> {
  if (!isDemoMode()) {
    try {
      await supabase
        .from('maintenance_purchases')
        .insert([{ maintenance_id: maintenanceId, purchase_id: purchaseId }]);
    } catch (e) {
      console.warn('Erro ao vincular compra à manutenção:', e);
    }
  }

  if (!memoryMaintenancePurchases.some(mp => mp.maintenance_id === maintenanceId && mp.purchase_id === purchaseId)) {
    memoryMaintenancePurchases.push({ maintenance_id: maintenanceId, purchase_id: purchaseId });
  }
}

export async function unlinkPurchaseFromMaintenance(maintenanceId: string, purchaseId: string): Promise<void> {
  if (!isDemoMode()) {
    try {
      await supabase
        .from('maintenance_purchases')
        .delete()
        .match({ maintenance_id: maintenanceId, purchase_id: purchaseId });
    } catch (e) {
      console.warn('Erro ao desvincular compra:', e);
    }
  }

  memoryMaintenancePurchases = memoryMaintenancePurchases.filter(
    mp => !(mp.maintenance_id === maintenanceId && mp.purchase_id === purchaseId)
  );
}

async function updateMaintenancePurchaseLinks(maintenanceId: string, targetPurchaseIds: string[]): Promise<void> {
  // Clear and rewrite
  if (!isDemoMode()) {
    try {
      await supabase.from('maintenance_purchases').delete().eq('maintenance_id', maintenanceId);
      if (targetPurchaseIds.length > 0) {
        const rows = targetPurchaseIds.map(pId => ({ maintenance_id: maintenanceId, purchase_id: pId }));
        await supabase.from('maintenance_purchases').insert(rows);
      }
    } catch (e) {
      console.warn('Erro ao atualizar vínculos de compras:', e);
    }
  }

  memoryMaintenancePurchases = memoryMaintenancePurchases.filter(mp => mp.maintenance_id !== maintenanceId);
  targetPurchaseIds.forEach(pId => {
    memoryMaintenancePurchases.push({ maintenance_id: maintenanceId, purchase_id: pId });
  });
}

// =========================================================================
// 7. CONSULTAS PARA O DASHBOARD PRINCIPAL
// =========================================================================

export async function getDashboardMaintenanceAlerts(): Promise<{
  urgentList: MaintenanceRecord[];
  overdueList: MaintenanceRecord[];
  inProgressList: MaintenanceRecord[];
  upcomingRecurringList: MaintenanceRecord[];
  totalActive: number;
}> {
  const all = await getMaintenanceRecords();
  const todayStr = new Date().toISOString().split('T')[0];

  const active = all.filter(m => m.status !== 'CONCLUIDA' && m.status !== 'CANCELADA');
  const urgent = active.filter(m => m.priority === 'URGENTE');
  const overdue = active.filter(m => m.due_date && m.due_date < todayStr);
  const inProgress = active.filter(m => m.status === 'EM_ANDAMENTO');
  const recurring = all.filter(m => m.is_recurring && m.status !== 'CANCELADA');

  return {
    urgentList: urgent,
    overdueList: overdue,
    inProgressList: inProgress,
    upcomingRecurringList: recurring.slice(0, 5),
    totalActive: active.length
  };
}
