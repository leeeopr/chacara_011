import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/appMode';
import {
  HousePurchase,
  PurchaseFilters,
  PurchasePriority,
  PurchaseStatus,
  PurchaseCategory,
  PurchaseStats,
  PurchaseImage
} from '@/lib/purchasesTypes';

// Initial Demo Seed for offline/demo experience
let memoryPurchases: HousePurchase[] = [
  {
    id: 'pur-101',
    chacara_id: 'ch-1',
    chacara_nome: 'Chácara Bela Vista',
    product_name: 'Torneira Inox do Banheiro Principal',
    description: 'Substituir torneira quebrada na suíte máster.',
    quantity: 1,
    unit: 'un',
    estimated_price: 200,
    paid_price: 0,
    priority: 'INFRAESTRUTURA',
    status: 'A_COMPRAR',
    responsible_id: 'usr-leonardo',
    responsible_name: 'Leonardo Silva',
    due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    category: 'Manutenção',
    supplier: 'Leroy Merlin',
    product_url: 'https://www.leroymerlin.com.br',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'pur-102',
    chacara_id: 'ch-1',
    chacara_nome: 'Chácara Bela Vista',
    depends_on_purchase_id: 'pur-101',
    depends_on_purchase_name: 'Torneira Inox do Banheiro Principal',
    product_name: 'Reparo de Vedação da Torneira',
    description: 'Kit de vedações e fita rosca para instalar a torneira nova.',
    quantity: 2,
    unit: 'kit',
    estimated_price: 35,
    paid_price: 0,
    priority: 'ESTRUTURA',
    status: 'AGUARDANDO_DEPENDENCIA',
    responsible_id: 'usr-leonardo',
    responsible_name: 'Leonardo Silva',
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    category: 'Manutenção',
    supplier: 'Cilindros & Cia',
    product_url: 'https://www.mercadolivre.com.br',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'pur-103',
    chacara_id: 'ch-1',
    chacara_nome: 'Chácara Bela Vista',
    product_name: 'Cloro Granulado Ação Rápida 10kg',
    description: 'Tratamento de choque para a piscina da área social.',
    quantity: 2,
    unit: 'cx',
    estimated_price: 180,
    paid_price: 165,
    priority: 'ESTRUTURA',
    status: 'COMPRADO',
    responsible_id: 'usr-iolanda',
    responsible_name: 'Iolanda Ferreira',
    due_date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
    category: 'Piscina',
    supplier: 'Piscina Express',
    product_url: 'https://www.amazon.com.br',
    completed_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'pur-104',
    chacara_id: 'ch-2',
    chacara_nome: 'Recanto dos Pássaros',
    product_name: 'Jogo de Cama Casal 100% Algodão',
    description: 'Kit extra para chalé 2.',
    quantity: 3,
    unit: 'kit',
    estimated_price: 320,
    paid_price: 0,
    priority: 'SUPERESTRUTURA',
    status: 'A_COMPRAR',
    responsible_id: 'usr-iolanda',
    responsible_name: 'Iolanda Ferreira',
    due_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    category: 'Mobiliário',
    supplier: 'Enxovais Real',
    product_url: 'https://www.shopee.com.br',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString()
  }
];

let memoryPurchaseImages: Record<string, PurchaseImage[]> = {};

export async function getHousePurchases(filters?: PurchaseFilters): Promise<HousePurchase[]> {
  if (isDemoMode()) {
    return filterPurchasesInMemory(memoryPurchases, filters);
  }

  try {
    // 1. Fetch user profiles map to ensure real names/emails for responsible_id
    const profilesMap = new Map<string, string>();
    try {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, name, email');
      if (profs) {
        profs.forEach((p: any) => {
          const fn = p.full_name || p.name || (p.email ? p.email.split('@')[0] : '');
          if (p.id && fn) {
            profilesMap.set(p.id, fn);
          }
        });
      }
    } catch (e) {
      console.warn('[purchasesService] Nao foi possivel buscar profiles para enriquecer responsaveis:', e);
    }

    let query = supabase
      .from('house_purchases')
      .select(`
        *,
        chacara:chacaras(name),
        task:pendencias(titulo),
        depends_on:house_purchases!depends_on_purchase_id(product_name, status)
      `)
      .order('created_at', { ascending: false });

    if (filters?.chacara_id) {
      query = query.eq('chacara_id', filters.chacara_id);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.responsible_id) {
      query = query.eq('responsible_id', filters.responsible_id);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[purchasesService] Tabela house_purchases erro:', error.message);
      return filterPurchasesInMemory(memoryPurchases, filters);
    }

    // Fetch images for all purchases in batch if purchase_images table exists
    const purchaseIds = (data || []).map((d: any) => d.id);
    let imagesByPurchaseId: Record<string, PurchaseImage[]> = {};
    if (purchaseIds.length > 0) {
      try {
        const { data: imgData } = await supabase
          .from('purchase_images')
          .select('*')
          .in('purchase_id', purchaseIds)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true });

        if (imgData) {
          imgData.forEach((img: any) => {
            if (!imagesByPurchaseId[img.purchase_id]) {
              imagesByPurchaseId[img.purchase_id] = [];
            }
            imagesByPurchaseId[img.purchase_id].push({
              id: img.id,
              purchase_id: img.purchase_id,
              storage_path: img.storage_path,
              public_url: img.public_url,
              file_name: img.file_name,
              file_size: img.file_size,
              is_primary: img.is_primary,
              created_at: img.created_at
            });
          });
        }
      } catch (e) {
        // Table might not exist yet or empty
      }
    }

    let items: HousePurchase[] = (data || []).map((row: any) => {
      const depName = row.depends_on ? row.depends_on.product_name : undefined;
      const depStatus = row.depends_on ? row.depends_on.status : undefined;
      
      // Calculate effective status if blocked by dependency
      let calculatedStatus = row.status;
      if (row.depends_on_purchase_id && depStatus && depStatus !== 'COMPRADO' && row.status !== 'CANCELADO' && row.status !== 'COMPRADO') {
        calculatedStatus = 'AGUARDANDO_DEPENDENCIA';
      }

      // Dynamic name resolution for responsible user
      const dynamicRespName = row.responsible_id && profilesMap.has(row.responsible_id)
        ? profilesMap.get(row.responsible_id)
        : (row.responsible_name || '');

      const loadedImages = imagesByPurchaseId[row.id] || [];
      const primaryImg = loadedImages.find(i => i.is_primary)?.public_url || row.primary_image_url || loadedImages[0]?.public_url || null;

      return {
        id: row.id,
        chacara_id: row.chacara_id || null,
        chacara_nome: row.chacara?.name || row.chacara_nome || '',
        task_id: row.task_id || null,
        task_titulo: row.task?.titulo || row.task_titulo || '',
        transaction_id: row.transaction_id || null,
        depends_on_purchase_id: row.depends_on_purchase_id || null,
        depends_on_purchase_name: depName || row.depends_on_purchase_name || '',
        product_name: row.product_name,
        description: row.description || '',
        quantity: Number(row.quantity || 1),
        unit: row.unit || 'un',
        estimated_price: Number(row.estimated_price || 0),
        paid_price: Number(row.paid_price || 0),
        priority: row.priority || 'NORMAL',
        status: calculatedStatus,
        responsible_id: row.responsible_id || null,
        responsible_name: dynamicRespName,
        due_date: row.due_date ? String(row.due_date).split('T')[0] : null,
        category: row.category || 'Outros',
        supplier: row.supplier || '',
        product_url: row.product_url || null,
        primary_image_url: primaryImg,
        images: loadedImages,
        images_count: loadedImages.length || (primaryImg ? 1 : 0),
        completed_at: row.completed_at || null,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    // Apply Search Filter in JS
    if (filters?.search?.trim()) {
      const term = filters.search.toLowerCase();
      items = items.filter(i => 
        i.product_name.toLowerCase().includes(term) ||
        i.description?.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term) ||
        i.chacara_nome?.toLowerCase().includes(term) ||
        i.responsible_name?.toLowerCase().includes(term) ||
        i.supplier?.toLowerCase().includes(term)
      );
    }

    // Apply View Tab Filter
    if (filters?.viewTab) {
      if (filters.viewTab === 'canBuyNow') {
        items = items.filter(i => i.status !== 'COMPRADO' && i.status !== 'CANCELADO' && i.status !== 'AGUARDANDO_DEPENDENCIA');
      } else if (filters.viewTab === 'blocked') {
        items = items.filter(i => i.status === 'AGUARDANDO_DEPENDENCIA');
      } else if (filters.viewTab === 'urgent') {
        items = items.filter(i => (i.priority === 'INFRAESTRUTURA' || i.priority === 'URGENTE') && i.status !== 'COMPRADO' && i.status !== 'CANCELADO');
      } else if (filters.viewTab === 'allPending') {
        items = items.filter(i => i.status !== 'COMPRADO' && i.status !== 'CANCELADO');
      } else if (filters.viewTab === 'completed') {
        items = items.filter(i => i.status === 'COMPRADO');
      }
    }

    return items;
  } catch (err) {
    console.warn('[purchasesService] Fallback para memória local:', err);
    return filterPurchasesInMemory(memoryPurchases, filters);
  }
}

function filterPurchasesInMemory(list: HousePurchase[], filters?: PurchaseFilters): HousePurchase[] {
  let result = [...list];

  // Re-verify dependency statuses and images
  result = result.map(item => {
    const images = memoryPurchaseImages[item.id] || item.images || [];
    const primaryImg = images.find(i => i.is_primary)?.public_url || item.primary_image_url || images[0]?.public_url || null;

    let itemStatus = item.status;
    let depName = item.depends_on_purchase_name;

    if (item.depends_on_purchase_id && item.status !== 'COMPRADO' && item.status !== 'CANCELADO') {
      const parent = list.find(p => p.id === item.depends_on_purchase_id);
      if (parent) {
        depName = parent.product_name;
        if (parent.status !== 'COMPRADO') {
          itemStatus = 'AGUARDANDO_DEPENDENCIA';
        } else if (item.status === 'AGUARDANDO_DEPENDENCIA') {
          itemStatus = 'A_COMPRAR';
        }
      }
    }

    return {
      ...item,
      status: itemStatus,
      depends_on_purchase_name: depName,
      primary_image_url: primaryImg,
      images,
      images_count: images.length || (primaryImg ? 1 : 0)
    };
  });

  if (filters?.chacara_id) {
    result = result.filter(i => i.chacara_id === filters.chacara_id);
  }
  if (filters?.priority) {
    result = result.filter(i => i.priority === filters.priority);
  }
  if (filters?.status) {
    result = result.filter(i => i.status === filters.status);
  }
  if (filters?.category) {
    result = result.filter(i => i.category === filters.category);
  }
  if (filters?.responsible_id) {
    result = result.filter(i => i.responsible_id === filters.responsible_id);
  }

  if (filters?.search?.trim()) {
    const term = filters.search.toLowerCase();
    result = result.filter(i => 
      i.product_name.toLowerCase().includes(term) ||
      i.description?.toLowerCase().includes(term) ||
      i.category.toLowerCase().includes(term) ||
      i.chacara_nome?.toLowerCase().includes(term) ||
      i.responsible_name?.toLowerCase().includes(term)
    );
  }

  if (filters?.viewTab) {
    if (filters.viewTab === 'canBuyNow') {
      result = result.filter(i => i.status !== 'COMPRADO' && i.status !== 'CANCELADO' && i.status !== 'AGUARDANDO_DEPENDENCIA');
    } else if (filters.viewTab === 'blocked') {
      result = result.filter(i => i.status === 'AGUARDANDO_DEPENDENCIA');
    } else if (filters.viewTab === 'urgent') {
      result = result.filter(i => (i.priority === 'INFRAESTRUTURA' || i.priority === 'URGENTE') && i.status !== 'COMPRADO' && i.status !== 'CANCELADO');
    } else if (filters.viewTab === 'allPending') {
      result = result.filter(i => i.status !== 'COMPRADO' && i.status !== 'CANCELADO');
    } else if (filters.viewTab === 'completed') {
      result = result.filter(i => i.status === 'COMPRADO');
    }
  }

  return result;
}

export async function createHousePurchase(input: Omit<HousePurchase, 'id' | 'created_at' | 'updated_at'>): Promise<HousePurchase> {
  const now = new Date().toISOString();

  // Determine initial status based on dependency
  let initialStatus = input.status || 'A_COMPRAR';
  if (input.depends_on_purchase_id && initialStatus !== 'COMPRADO' && initialStatus !== 'CANCELADO') {
    let parentBought = false;
    if (isDemoMode()) {
      const parent = memoryPurchases.find(p => p.id === input.depends_on_purchase_id);
      if (parent && parent.status === 'COMPRADO') parentBought = true;
    } else {
      try {
        const { data: parent } = await supabase
          .from('house_purchases')
          .select('status')
          .eq('id', input.depends_on_purchase_id)
          .single();
        if (parent && parent.status === 'COMPRADO') parentBought = true;
      } catch (e) {}
    }
    if (!parentBought) {
      initialStatus = 'AGUARDANDO_DEPENDENCIA';
    }
  }

  const payload = {
    chacara_id: input.chacara_id || null,
    task_id: input.task_id || null,
    transaction_id: input.transaction_id || null,
    depends_on_purchase_id: input.depends_on_purchase_id || null,
    product_name: input.product_name.trim(),
    description: input.description || '',
    quantity: Number(input.quantity || 1),
    unit: input.unit || 'un',
    estimated_price: Number(input.estimated_price || 0),
    paid_price: Number(input.paid_price || 0),
    priority: input.priority || 'NORMAL',
    status: initialStatus,
    responsible_id: input.responsible_id || null,
    responsible_name: input.responsible_name || null,
    due_date: input.due_date || null,
    category: input.category || 'Outros',
    supplier: input.supplier || '',
    product_url: input.product_url ? input.product_url.trim() : null,
    primary_image_url: input.primary_image_url || null,
    completed_at: initialStatus === 'COMPRADO' ? now : null,
    created_at: now,
    updated_at: now
  };

  if (isDemoMode()) {
    const newId = `pur-${Date.now()}`;
    const newItem: HousePurchase = {
      ...payload,
      id: newId,
      chacara_nome: input.chacara_nome || '',
      task_titulo: input.task_titulo || '',
      depends_on_purchase_name: input.depends_on_purchase_name || '',
      responsible_name: input.responsible_name || '',
      images: input.images || [],
      images_count: input.images?.length || 0
    };
    memoryPurchases.unshift(newItem);
    if (input.images && input.images.length > 0) {
      memoryPurchaseImages[newId] = input.images.map(img => ({ ...img, purchase_id: newId }));
    }
    return newItem;
  }

  try {
    const { data, error } = await supabase
      .from('house_purchases')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn('[purchasesService] Erro ao inserir no Supabase, salvando localmente:', error.message);
      const newId = `pur-${Date.now()}`;
      const newItem: HousePurchase = {
        ...payload,
        id: newId,
        chacara_nome: input.chacara_nome || '',
        task_titulo: input.task_titulo || '',
        depends_on_purchase_name: input.depends_on_purchase_name || '',
        responsible_name: input.responsible_name || '',
        images: input.images || [],
        images_count: input.images?.length || 0
      };
      memoryPurchases.unshift(newItem);
      return newItem;
    }

    // Insert images if present
    if (input.images && input.images.length > 0) {
      try {
        const imgInserts = input.images.map(img => ({
          purchase_id: data.id,
          storage_path: img.storage_path || null,
          public_url: img.public_url,
          file_name: img.file_name || 'foto.jpg',
          file_size: img.file_size || 0,
          is_primary: Boolean(img.is_primary)
        }));
        await supabase.from('purchase_images').insert(imgInserts);
      } catch (e) {
        console.warn('Erro ao inserir fotos vinculadas:', e);
      }
    }

    return {
      ...data,
      chacara_nome: input.chacara_nome,
      task_titulo: input.task_titulo,
      depends_on_purchase_name: input.depends_on_purchase_name,
      responsible_name: input.responsible_name || data.responsible_name,
      images: input.images || []
    };
  } catch (e) {
    const newId = `pur-${Date.now()}`;
    const newItem: HousePurchase = {
      ...payload,
      id: newId,
      chacara_nome: input.chacara_nome || '',
      task_titulo: input.task_titulo || '',
      depends_on_purchase_name: input.depends_on_purchase_name || '',
      responsible_name: input.responsible_name || '',
      images: input.images || []
    };
    memoryPurchases.unshift(newItem);
    return newItem;
  }
}

/**
 * Update an existing purchase item strictly via UPDATE (never insert duplicate)
 */
export async function updateHousePurchase(id: string, updates: Partial<HousePurchase>): Promise<HousePurchase> {
  const now = new Date().toISOString();

  if (isDemoMode()) {
    const idx = memoryPurchases.findIndex(p => p.id === id);
    if (idx !== -1) {
      memoryPurchases[idx] = {
        ...memoryPurchases[idx],
        ...updates,
        updated_at: now
      };
      if (updates.images !== undefined) {
        memoryPurchaseImages[id] = updates.images;
      }
      if (updates.status === 'COMPRADO') {
        unlockDependentsInMemory(id);
      }
      return memoryPurchases[idx];
    }
  }

  try {
    // Sanitize updates payload to ONLY include valid DB columns!
    const dbUpdates: Record<string, any> = {
      updated_at: now
    };

    if (updates.product_name !== undefined) dbUpdates.product_name = updates.product_name.trim();
    if (updates.description !== undefined) dbUpdates.description = updates.description || '';
    if (updates.quantity !== undefined) dbUpdates.quantity = Number(updates.quantity || 1);
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit || 'un';
    if (updates.estimated_price !== undefined) dbUpdates.estimated_price = Number(updates.estimated_price || 0);
    if (updates.paid_price !== undefined) dbUpdates.paid_price = Number(updates.paid_price || 0);
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.chacara_id !== undefined) dbUpdates.chacara_id = updates.chacara_id || null;
    if (updates.task_id !== undefined) dbUpdates.task_id = updates.task_id || null;
    if (updates.transaction_id !== undefined) dbUpdates.transaction_id = updates.transaction_id || null;
    if (updates.depends_on_purchase_id !== undefined) dbUpdates.depends_on_purchase_id = updates.depends_on_purchase_id || null;
    if (updates.responsible_id !== undefined) dbUpdates.responsible_id = updates.responsible_id || null;
    if (updates.responsible_name !== undefined) dbUpdates.responsible_name = updates.responsible_name || null;
    if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date ? String(updates.due_date).split('T')[0] : null;
    if (updates.category !== undefined) dbUpdates.category = updates.category || 'Outros';
    if (updates.supplier !== undefined) dbUpdates.supplier = updates.supplier || '';
    if (updates.product_url !== undefined) dbUpdates.product_url = updates.product_url ? updates.product_url.trim() : null;
    if (updates.primary_image_url !== undefined) dbUpdates.primary_image_url = updates.primary_image_url || null;
    if (updates.completed_at !== undefined) dbUpdates.completed_at = updates.completed_at || null;

    const { data, error } = await supabase
      .from('house_purchases')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('[purchasesService] Erro ao atualizar no Supabase, buscando local:', error.message);
      const idx = memoryPurchases.findIndex(p => p.id === id);
      if (idx !== -1) {
        memoryPurchases[idx] = { ...memoryPurchases[idx], ...updates, updated_at: now };
        if (updates.status === 'COMPRADO') unlockDependentsInMemory(id);
        return memoryPurchases[idx];
      }
    }

    // Unlock dependent items if this item became COMPRADO
    if (updates.status === 'COMPRADO') {
      await unlockDependentsInDB(id);
    }

    return {
      ...data,
      chacara_nome: updates.chacara_nome,
      task_titulo: updates.task_titulo,
      depends_on_purchase_name: updates.depends_on_purchase_name,
      images: updates.images
    } as HousePurchase;
  } catch (e) {
    const idx = memoryPurchases.findIndex(p => p.id === id);
    if (idx !== -1) {
      memoryPurchases[idx] = { ...memoryPurchases[idx], ...updates, updated_at: now };
      if (updates.status === 'COMPRADO') unlockDependentsInMemory(id);
      return memoryPurchases[idx];
    }
    throw new Error('Item de compra não encontrado.');
  }
}

export async function deleteHousePurchase(id: string): Promise<void> {
  if (isDemoMode()) {
    memoryPurchases = memoryPurchases.filter(p => p.id !== id);
    delete memoryPurchaseImages[id];
    return;
  }

  try {
    const { error } = await supabase
      .from('house_purchases')
      .delete()
      .eq('id', id);

    if (error) {
      memoryPurchases = memoryPurchases.filter(p => p.id !== id);
    }
    delete memoryPurchaseImages[id];
  } catch (e) {
    memoryPurchases = memoryPurchases.filter(p => p.id !== id);
  }
}

/**
 * Fetch photos for a specific purchase
 */
export async function getPurchaseImages(purchaseId: string): Promise<PurchaseImage[]> {
  if (isDemoMode()) {
    return memoryPurchaseImages[purchaseId] || [];
  }

  try {
    const { data, error } = await supabase
      .from('purchase_images')
      .select('*')
      .eq('purchase_id', purchaseId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error || !data) {
      return memoryPurchaseImages[purchaseId] || [];
    }

    return data.map((img: any) => ({
      id: img.id,
      purchase_id: img.purchase_id,
      storage_path: img.storage_path,
      public_url: img.public_url,
      file_name: img.file_name,
      file_size: img.file_size,
      is_primary: img.is_primary,
      created_at: img.created_at
    }));
  } catch (e) {
    return memoryPurchaseImages[purchaseId] || [];
  }
}

/**
 * Upload a photo for a purchase (Supabase Storage or safe fallback)
 */
export async function uploadPurchasePhoto(
  purchaseId: string,
  file: File,
  isPrimary: boolean = false
): Promise<PurchaseImage> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${purchaseId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `purchases/${purchaseId}/${fileName}`;

  // Check if purchase currently has existing photos
  const existingImages = memoryPurchaseImages[purchaseId] || [];
  const shouldBePrimary = isPrimary || existingImages.length === 0;

  let publicUrl = '';

  if (!isDemoMode()) {
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('purchase-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('purchase-images')
          .getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      }
    } catch (e) {
      console.warn('Storage upload warning, fallback to base64:', e);
    }
  }

  // Fallback to Base64 Data URL if storage was not configured
  if (!publicUrl) {
    publicUrl = await fileToDataUrl(file);
  }

  const newImageRecord: PurchaseImage = {
    id: `img-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    purchase_id: purchaseId,
    storage_path: filePath,
    public_url: publicUrl,
    file_name: file.name,
    file_size: file.size,
    is_primary: shouldBePrimary,
    created_at: new Date().toISOString()
  };

  if (!isDemoMode()) {
    try {
      if (shouldBePrimary) {
        // Reset others to false
        await supabase
          .from('purchase_images')
          .update({ is_primary: false })
          .eq('purchase_id', purchaseId);
      }

      const { data: dbData } = await supabase
        .from('purchase_images')
        .insert([{
          purchase_id: purchaseId,
          storage_path: filePath,
          public_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          is_primary: shouldBePrimary
        }])
        .select()
        .single();

      if (dbData) {
        newImageRecord.id = dbData.id;
      }

      if (shouldBePrimary) {
        await supabase
          .from('house_purchases')
          .update({ primary_image_url: publicUrl })
          .eq('id', purchaseId);
      }
    } catch (e) {
      console.warn('DB insert image warning:', e);
    }
  }

  // Keep in memory
  if (!memoryPurchaseImages[purchaseId]) {
    memoryPurchaseImages[purchaseId] = [];
  }
  if (shouldBePrimary) {
    memoryPurchaseImages[purchaseId].forEach(img => { img.is_primary = false; });
  }
  memoryPurchaseImages[purchaseId].push(newImageRecord);

  // Update memory purchase primary_image_url
  const pIdx = memoryPurchases.findIndex(p => p.id === purchaseId);
  if (pIdx !== -1) {
    if (shouldBePrimary) {
      memoryPurchases[pIdx].primary_image_url = publicUrl;
    }
    memoryPurchases[pIdx].images_count = memoryPurchaseImages[purchaseId].length;
    memoryPurchases[pIdx].images = memoryPurchaseImages[purchaseId];
  }

  return newImageRecord;
}

/**
 * Delete a photo and promote remaining photo if needed
 */
export async function deletePurchasePhoto(imageId: string, purchaseId?: string): Promise<void> {
  let wasPrimary = false;

  if (purchaseId && memoryPurchaseImages[purchaseId]) {
    const target = memoryPurchaseImages[purchaseId].find(i => i.id === imageId);
    wasPrimary = Boolean(target?.is_primary);
    memoryPurchaseImages[purchaseId] = memoryPurchaseImages[purchaseId].filter(i => i.id !== imageId);
  }

  if (!isDemoMode()) {
    try {
      await supabase.from('purchase_images').delete().eq('id', imageId);
    } catch (e) {}
  }

  if (purchaseId) {
    const remaining = memoryPurchaseImages[purchaseId] || [];
    const pIdx = memoryPurchases.findIndex(p => p.id === purchaseId);

    if (remaining.length > 0) {
      if (wasPrimary || !remaining.some(r => r.is_primary)) {
        // Promote first remaining photo
        const newPrimary = remaining[0];
        newPrimary.is_primary = true;
        if (newPrimary.id && newPrimary.public_url) {
          await setPrimaryPurchasePhoto(purchaseId, newPrimary.id, newPrimary.public_url);
        }
      }
      if (pIdx !== -1) {
        memoryPurchases[pIdx].images_count = remaining.length;
        memoryPurchases[pIdx].images = remaining;
      }
    } else {
      // No images left
      if (!isDemoMode()) {
        try {
          await supabase
            .from('house_purchases')
            .update({ primary_image_url: null })
            .eq('id', purchaseId);
        } catch (e) {}
      }
      if (pIdx !== -1) {
        memoryPurchases[pIdx].primary_image_url = undefined;
        memoryPurchases[pIdx].images_count = 0;
        memoryPurchases[pIdx].images = [];
      }
    }
  }
}

/**
 * Set a photo as primary
 */
export async function setPrimaryPurchasePhoto(purchaseId: string, imageId: string, publicUrl: string): Promise<void> {
  if (!isDemoMode()) {
    try {
      await supabase
        .from('purchase_images')
        .update({ is_primary: false })
        .eq('purchase_id', purchaseId);

      await supabase
        .from('purchase_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      await supabase
        .from('house_purchases')
        .update({ primary_image_url: publicUrl })
        .eq('id', purchaseId);
    } catch (e) {}
  }

  if (memoryPurchaseImages[purchaseId]) {
    memoryPurchaseImages[purchaseId] = memoryPurchaseImages[purchaseId].map(img => ({
      ...img,
      is_primary: img.id === imageId
    }));
  }

  const pIdx = memoryPurchases.findIndex(p => p.id === purchaseId);
  if (pIdx !== -1) {
    memoryPurchases[pIdx].primary_image_url = publicUrl;
    if (memoryPurchaseImages[purchaseId]) {
      memoryPurchases[pIdx].images = memoryPurchaseImages[purchaseId];
    }
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Anti-circular dependency validator
 * Checks if setting `newParentId` as parent of `currentId` creates a cycle
 */
export function checkCircularDependency(
  currentId: string,
  newParentId: string,
  allPurchases: HousePurchase[]
): boolean {
  if (!currentId || !newParentId) return false;
  if (currentId === newParentId) return true; // Direct self-dependency

  const visited = new Set<string>();
  let checkId: string | null | undefined = newParentId;

  while (checkId) {
    if (checkId === currentId) {
      return true; // Circular loop detected!
    }
    if (visited.has(checkId)) {
      break;
    }
    visited.add(checkId);

    const parent = allPurchases.find(p => p.id === checkId);
    checkId = parent?.depends_on_purchase_id;
  }

  return false;
}

/**
 * Mark item as COMPRADO, handle paid_price, and sync with Chácara financial transaction if requested!
 */
export async function markPurchaseAsBought(
  id: string,
  paidPrice: number,
  createFinancialEntry: boolean = true,
  chacaraId?: string | null
): Promise<HousePurchase> {
  const now = new Date().toISOString();

  let transactionId: string | undefined = undefined;

  // 1. If financial entry is requested, create or update financial transaction
  if (createFinancialEntry && paidPrice > 0) {
    try {
      if (!isDemoMode()) {
        const expensePayload = {
          description: `Compra Chácara: Item id #${id}`,
          amount: paidPrice,
          expense_date: now.split('T')[0],
          created_by: 'Módulo Compras',
          created_at: now
        };

        const { data: exp } = await supabase
          .from('reservation_expenses')
          .insert([expensePayload])
          .select('id')
          .maybeSingle();

        if (exp?.id) {
          transactionId = exp.id;
        }
      }
      if (!transactionId) {
        transactionId = `fin-exp-${Date.now()}`;
      }
    } catch (e) {
      console.warn('[purchasesService] Erro ao criar lançamento financeiro:', e);
      transactionId = `fin-exp-${Date.now()}`;
    }
  }

  const updated = await updateHousePurchase(id, {
    status: 'COMPRADO',
    paid_price: paidPrice,
    completed_at: now,
    transaction_id: transactionId,
    chacara_id: chacaraId || undefined
  });

  return updated;
}

function unlockDependentsInMemory(parentId: string) {
  memoryPurchases = memoryPurchases.map(p => {
    if (p.depends_on_purchase_id === parentId && p.status === 'AGUARDANDO_DEPENDENCIA') {
      return { ...p, status: 'A_COMPRAR', updated_at: new Date().toISOString() };
    }
    return p;
  });
}

async function unlockDependentsInDB(parentId: string) {
  try {
    await supabase
      .from('house_purchases')
      .update({ status: 'A_COMPRAR', updated_at: new Date().toISOString() })
      .eq('depends_on_purchase_id', parentId)
      .eq('status', 'AGUARDANDO_DEPENDENCIA');
  } catch (e) {
    console.warn('[purchasesService] Erro ao desbloquear dependentes no DB:', e);
  }
}

export function computePurchasesStats(purchases: HousePurchase[]): PurchaseStats {
  let urgentCount = 0;
  let infraCount = 0;
  let estruturaCount = 0;
  let superestruturaCount = 0;
  let blockedCount = 0;
  let canBuyNowCount = 0;
  let completedCount = 0;
  let totalEstimated = 0;
  let totalPaid = 0;
  let pendingEstimated = 0;

  purchases.forEach(p => {
    totalEstimated += p.estimated_price || 0;

    if (p.status === 'COMPRADO') {
      completedCount++;
      totalPaid += p.paid_price || p.estimated_price || 0;
    } else if (p.status !== 'CANCELADO') {
      pendingEstimated += p.estimated_price || 0;

      if (p.status === 'AGUARDANDO_DEPENDENCIA') {
        blockedCount++;
      } else {
        canBuyNowCount++;
      }

      if (p.priority === 'INFRAESTRUTURA' || p.priority === 'URGENTE') {
        urgentCount++;
        infraCount++;
      } else if (p.priority === 'ESTRUTURA' || p.priority === 'ALTA') {
        estruturaCount++;
      } else if (p.priority === 'SUPERESTRUTURA' || p.priority === 'NORMAL' || p.priority === 'BAIXA') {
        superestruturaCount++;
      }
    }
  });

  return {
    totalItems: purchases.length,
    urgentCount,
    infraCount,
    estruturaCount,
    superestruturaCount,
    blockedCount,
    canBuyNowCount,
    completedCount,
    totalEstimated,
    totalPaid,
    pendingEstimated
  };
}
