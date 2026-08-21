import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/appMode';
import {
  PaymentDocument,
  FiscalReservationItem,
  FiscalCompetenceSummary,
  UploadDocumentDTO,
  FiscalChacaraGroup
} from '@/lib/fiscalTypes';
import { getReservations } from './reservationsService';
import { getChacaras } from './chacarasService';
import { getEffectiveReservationPrice } from '@/lib/chacaraTypes';

const BUCKET_NAME = 'comprovantes_fiscais';
const DEMO_DOCS_KEY = 'chacaras_demo_fiscal_docs_v2';

// Helper to load demo store from localStorage
function getDemoDocumentsStore(): PaymentDocument[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEMO_DOCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('[fiscalService] Erro ao ler comprovantes do localStorage:', err);
    return [];
  }
}

// Helper to save demo store to localStorage
function saveDemoDocumentsStore(docs: PaymentDocument[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEMO_DOCS_KEY, JSON.stringify(docs));
  } catch (err) {
    console.warn('[fiscalService] Erro ao salvar comprovantes no localStorage:', err);
  }
}

// Helper to convert file to Base64 data URL for demo persistence
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Normalizes YYYY-MM competencia from a date string (YYYY-MM-DD or ISO)
 */
export function deriveCompetencia(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().substring(0, 7);
  return dateStr.substring(0, 7);
}

/**
 * Uploads a payment receipt file and registers metadata in Supabase `reservation_payment_documents`
 */
export async function uploadPaymentDocument(dto: UploadDocumentDTO): Promise<PaymentDocument> {
  const competencia = dto.competencia || deriveCompetencia(dto.payment_date);

  if (isDemoMode()) {
    const fakeId = `doc-demo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const filePath = `chacaras/${dto.chacara_id}/reservas/${dto.reservation_id}/comprovantes/${fakeId}_${dto.file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
    
    let base64Url = '';
    try {
      base64Url = await fileToBase64(dto.file);
    } catch {
      base64Url = URL.createObjectURL(dto.file);
    }

    const newDoc: PaymentDocument = {
      id: fakeId,
      reservation_id: dto.reservation_id,
      file_path: filePath,
      file_name: dto.file.name,
      file_type: dto.file.type,
      file_size: dto.file.size,
      payment_date: dto.payment_date,
      amount: Number(dto.amount),
      description: dto.description || '',
      competencia,
      observacoes: dto.observacoes || '',
      uploaded_at: new Date().toISOString(),
      uploaded_by: dto.uploaded_by || 'demo-user',
      public_url: base64Url
    };

    const currentStore = getDemoDocumentsStore();
    const updatedStore = [newDoc, ...currentStore];
    saveDemoDocumentsStore(updatedStore);
    return newDoc;
  }

  let chacaraId = dto.chacara_id;
  if (!chacaraId && dto.reservation_id && !isDemoMode()) {
    try {
      const { data: resData } = await supabase
        .from('reservations')
        .select('chacara_id')
        .eq('id', dto.reservation_id)
        .maybeSingle();
      if (resData?.chacara_id) {
        chacaraId = resData.chacara_id;
      }
    } catch (_) {}
  }

  // 1. Storage Upload with graceful Base64 fallback
  const cleanFileName = dto.file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const uniqueStorageId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `file_${Date.now()}`;
  const filePath = `chacaras/${chacaraId || 'default'}/reservas/${dto.reservation_id}/comprovantes/${uniqueStorageId}_${cleanFileName}`;

  let publicUrl = '';
  let storageSuccess = false;

  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, dto.file, {
        cacheControl: '3600',
        upsert: true
      });

    if (!uploadError && uploadData) {
      storageSuccess = true;
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      publicUrl = publicUrlData?.publicUrl || '';
    } else {
      console.warn('[fiscalService] Aviso no Supabase Storage, usando fallback Base64:', uploadError?.message);
      publicUrl = await fileToBase64(dto.file);
    }
  } catch (storageEx: any) {
    console.warn('[fiscalService] Exceção no upload do Storage, aplicando fallback Base64:', storageEx?.message);
    try {
      publicUrl = await fileToBase64(dto.file);
    } catch {
      publicUrl = '';
    }
  }

  // 2. Insert Database Metadata Record
  let docPayload: Record<string, any> = {
    reservation_id: dto.reservation_id,
    chacara_id: chacaraId || null,
    file_path: filePath,
    file_name: dto.file.name,
    file_type: dto.file.type || 'application/octet-stream',
    file_size: dto.file.size || 0,
    payment_date: dto.payment_date,
    amount: Number(dto.amount) || 0,
    description: dto.description || null,
    observacoes: dto.observacoes || null,
    competencia,
    uploaded_at: new Date().toISOString(),
    uploaded_by: dto.uploaded_by || null
  };

  let insertedData: any = null;
  let dbError: any = null;

  // Attempt insert up to 4 times, dynamically dropping any column missing in Supabase schema cache
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await supabase
        .from('reservation_payment_documents')
        .insert(docPayload)
        .select()
        .single();

      if (!res.error) {
        insertedData = res.data;
        dbError = null;
        break;
      }

      dbError = res.error;
      const missingColMatch = dbError.message?.match(/Could not find the '([^']+)' column/i);
      if (missingColMatch && missingColMatch[1]) {
        const missingCol = missingColMatch[1];
        console.warn(`[fiscalService] Coluna '${missingCol}' não encontrada no Supabase, tentando sem ela.`);
        delete docPayload[missingCol];
      } else {
        break;
      }
    } catch (e: any) {
      dbError = e;
      break;
    }
  }

  // Fallback: If DB insert fails (e.g. table not created yet), save to local store
  if (dbError || !insertedData) {
    console.warn('[fiscalService] Tabela de comprovantes indisponível no Supabase, salvando localmente:', dbError?.message);
    
    if (!publicUrl) {
      try {
        publicUrl = await fileToBase64(dto.file);
      } catch {
        publicUrl = '';
      }
    }

    const fallbackDoc: PaymentDocument = {
      id: `doc-local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      reservation_id: dto.reservation_id,
      file_path: filePath,
      file_name: dto.file.name,
      file_type: dto.file.type,
      file_size: dto.file.size,
      payment_date: dto.payment_date,
      amount: Number(dto.amount) || 0,
      description: dto.description || '',
      competencia,
      observacoes: dto.observacoes || '',
      uploaded_at: new Date().toISOString(),
      uploaded_by: dto.uploaded_by || 'usuario-atual',
      public_url: publicUrl
    };

    const currentStore = getDemoDocumentsStore();
    const updatedStore = [fallbackDoc, ...currentStore.filter(d => d.id !== fallbackDoc.id)];
    saveDemoDocumentsStore(updatedStore);

    return fallbackDoc;
  }

  return {
    ...insertedData,
    description: dto.description || insertedData?.description || insertedData?.observacoes || '',
    observacoes: dto.observacoes || insertedData?.observacoes || '',
    public_url: publicUrl || (storageSuccess ? supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath).data?.publicUrl : '')
  };
}

/**
 * Fetches all payment documents for a specific reservation
 */
export async function getPaymentDocumentsForReservation(reservationId: string): Promise<PaymentDocument[]> {
  const localDocs = getDemoDocumentsStore().filter(d => d.reservation_id === reservationId);

  if (isDemoMode()) {
    return localDocs;
  }

  let dbDocs: PaymentDocument[] = [];
  try {
    const { data, error } = await supabase
      .from('reservation_payment_documents')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('payment_date', { ascending: false });

    if (!error && data) {
      dbDocs = data.map(doc => {
        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(doc.file_path);
        return {
          ...doc,
          description: doc.description || doc.observacoes || '',
          public_url: urlData?.publicUrl || ''
        };
      });
    }
  } catch (err) {
    console.warn('[fiscalService] Erro ao buscar comprovantes da reserva:', err);
  }

  // Combine dbDocs and localDocs avoiding duplicates
  const existingIds = new Set(dbDocs.map(d => d.id));
  const merged = [...dbDocs, ...localDocs.filter(d => !existingIds.has(d.id))];
  return merged.sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''));
}

/**
 * Deletes a payment document from storage and database
 */
export async function deletePaymentDocument(docId: string, filePath: string): Promise<boolean> {
  if (isDemoMode()) {
    const updatedStore = getDemoDocumentsStore().filter(d => d.id !== docId);
    saveDemoDocumentsStore(updatedStore);
    return true;
  }

  // 1. Delete file from Supabase Storage
  if (filePath) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    if (storageError) {
      console.warn('[fiscalService] Aviso ao remover arquivo do Storage:', storageError.message);
    }
  }

  // 2. Delete record from Supabase DB
  const { error: dbError } = await supabase
    .from('reservation_payment_documents')
    .delete()
    .eq('id', docId);

  if (dbError) {
    console.error('[fiscalService] Erro ao deletar comprovante do banco:', dbError.message);
    throw new Error(`Erro ao excluir comprovante: ${dbError.message}`);
  }

  return true;
}

/**
 * Fetches structured Fiscal / Carnê-Leão data grouped by competence (YYYY-MM) and Chacaras
 */
export async function getFiscalSummaryData(selectedCompetencia?: string): Promise<{
  allCompetencias: { value: string; label: string; count: number }[];
  currentCompetenceData: FiscalCompetenceSummary;
  allReservationsList: FiscalReservationItem[];
}> {
  // 1. Get all active reservations with chacara and client
  const reservations = await getReservations({});
  const chacarasList = await getChacaras();

  // 2. Fetch all payment documents from DB
  let allDocs: PaymentDocument[] = [];

  if (isDemoMode()) {
    allDocs = getDemoDocumentsStore();
  } else {
    try {
      const { data, error } = await supabase
        .from('reservation_payment_documents')
        .select('*')
        .order('payment_date', { ascending: false });

      if (error) {
        console.warn('[fiscalService] Tabela de comprovantes vazia ou inexistente:', error.message);
      } else if (data) {
        allDocs = data.map(doc => {
          const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(doc.file_path);
          return {
            ...doc,
            description: doc.description || doc.observacoes || '',
            public_url: urlData?.publicUrl || ''
          };
        });
      }
    } catch (err) {
      console.error('[fiscalService] Erro ao consultar comprovantes:', err);
    }

    // Merge any local store fallback docs
    const localStoreDocs = getDemoDocumentsStore();
    const existingDbIds = new Set(allDocs.map(d => d.id));
    localStoreDocs.forEach(ld => {
      if (!existingDbIds.has(ld.id)) {
        allDocs.push(ld);
      }
    });
  }

  // 3. Map docs to reservations
  const docMapByResId: Record<string, PaymentDocument[]> = {};
  allDocs.forEach(doc => {
    if (!docMapByResId[doc.reservation_id]) {
      docMapByResId[doc.reservation_id] = [];
    }
    docMapByResId[doc.reservation_id].push(doc);
  });

  // 4. Transform reservations into FiscalReservationItem
  const fiscalReservations: FiscalReservationItem[] = reservations.map(res => {
    const docs = docMapByResId[res.id] || [];
    const provenAmount = docs.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    return {
      reservation_id: res.id,
      code: res.code || `RES-${res.id.substring(0, 6)}`,
      chacara_id: res.chacara_id,
      chacara_nome: (res.chacara as any)?.nome || res.chacara?.name || 'Chácara sem nome',
      client_id: res.client_id,
      client_nome: res.client?.full_name || (res as any).guest_name || 'Hóspede não identificado',
      client_document: (res.client as any)?.cpf_cnpj || res.client?.document_number || res.client?.rg_number || 'CPF/CNPJ não informado',
      checkin_date: res.checkin_date,
      checkout_date: res.checkout_date,
      total_price: getEffectiveReservationPrice(res),
      status: res.status,
      documents: docs,
      total_proven_amount: provenAmount,
      has_documents: docs.length > 0,
      has_multiple_documents: docs.length > 1
    };
  });

  // 5. Gather all available YYYY-MM competencies from checkin_dates AND document payment_dates
  const competenciaSet = new Set<string>();

  fiscalReservations.forEach(r => {
    if (r.checkin_date) {
      competenciaSet.add(r.checkin_date.substring(0, 7));
    }
    r.documents.forEach(d => {
      if (d.competencia) competenciaSet.add(d.competencia);
    });
  });

  // Default current month if none
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  competenciaSet.add(currentMonthStr);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const sortedCompetencias = Array.from(competenciaSet)
    .sort((a, b) => b.localeCompare(a))
    .map(comp => {
      const [y, m] = comp.split('-');
      const mIdx = parseInt(m, 10) - 1;
      const mName = monthNames[mIdx] || m;
      const count = fiscalReservations.filter(r =>
        r.checkin_date.substring(0, 7) === comp ||
        r.documents.some(d => d.competencia === comp)
      ).length;

      return {
        value: comp,
        label: `${mName} / ${y}`,
        count
      };
    });

  const activeComp = selectedCompetencia || sortedCompetencias[0]?.value || currentMonthStr;
  const [activeYear, activeMonth] = activeComp.split('-').map(Number);
  const activeMonthName = monthNames[activeMonth - 1] || `${activeMonth}`;

  // 6. Filter reservations relevant to the active competence
  const compReservations = fiscalReservations.filter(r => {
    const isCheckinInComp = r.checkin_date.substring(0, 7) === activeComp;
    const hasDocInComp = r.documents.some(d => d.competencia === activeComp);
    return isCheckinInComp || hasDocInComp;
  });

  // 7. Group by Chácara
  const chacaraGroupMap: Record<string, FiscalChacaraGroup> = {};

  // Pre-fill all registered chacaras
  chacarasList.forEach(c => {
    chacaraGroupMap[c.id] = {
      chacara_id: c.id,
      chacara_nome: c.name || (c as any).nome || 'Chácara sem nome',
      total_estadias: 0,
      total_recebido: 0,
      total_comprovado: 0,
      reservas: []
    };
  });

  let totalEstadiasComp = 0;
  let totalRecebidoComp = 0;
  let totalComprovadoComp = 0;
  let estadiasSemComprovanteComp = 0;
  let estadiasComMultiplosComp = 0;

  compReservations.forEach(res => {
    if (!chacaraGroupMap[res.chacara_id]) {
      chacaraGroupMap[res.chacara_id] = {
        chacara_id: res.chacara_id,
        chacara_nome: res.chacara_nome,
        total_estadias: 0,
        total_recebido: 0,
        total_comprovado: 0,
        reservas: []
      };
    }

    const group = chacaraGroupMap[res.chacara_id];
    group.reservas.push(res);
    group.total_estadias += 1;
    group.total_recebido += res.total_price;
    group.total_comprovado += res.total_proven_amount;

    totalEstadiasComp += 1;
    totalRecebidoComp += res.total_price;
    totalComprovadoComp += res.total_proven_amount;

    if (!res.has_documents) {
      estadiasSemComprovanteComp += 1;
    }
    if (res.has_multiple_documents) {
      estadiasComMultiplosComp += 1;
    }
  });

  const chacarasGroups = Object.values(chacaraGroupMap).filter(g => g.reservas.length > 0 || chacarasList.some(c => c.id === g.chacara_id));

  const currentCompetenceData: FiscalCompetenceSummary = {
    competencia: activeComp,
    year: activeYear || new Date().getFullYear(),
    month: activeMonth || new Date().getMonth() + 1,
    label: `${activeMonthName} / ${activeYear}`,
    total_estadias: totalEstadiasComp,
    total_recebido: totalRecebidoComp,
    total_comprovado: totalComprovadoComp,
    estadias_sem_comprovante: estadiasSemComprovanteComp,
    estadias_com_multiplos: estadiasComMultiplosComp,
    chacaras: chacarasGroups
  };

  return {
    allCompetencias: sortedCompetencias,
    currentCompetenceData,
    allReservationsList: fiscalReservations
  };
}
