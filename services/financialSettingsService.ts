import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/appMode';
import { demoRepository } from '@/lib/demoRepository';
import { 
  ChacaraFinancialSettings, 
  DEFAULT_FINANCIAL_SETTINGS, 
  validateFinancialPercent 
} from '@/lib/financialSettingsTypes';

const LOCAL_FALLBACK_KEY = 'chacaras_financial_settings_cache';

/**
 * Cache local rápido para leitura síncrona/instantânea em fallbacks
 */
function getLocalCachedSettings(): ChacaraFinancialSettings[] {
  if (typeof window === 'undefined') return [DEFAULT_FINANCIAL_SETTINGS];
  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[financialSettingsService] Falha ao ler cache local:', e);
  }
  return [DEFAULT_FINANCIAL_SETTINGS];
}

function saveLocalCachedSettings(settingsList: ChacaraFinancialSettings[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(settingsList));
  } catch (e) {
    console.warn('[financialSettingsService] Falha ao salvar cache local:', e);
  }
}

/**
 * Notifica todos os módulos da aplicação em tempo real via CustomEvent
 */
export function broadcastFinancialSettingsUpdated(settings: ChacaraFinancialSettings) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('financial-settings-updated', { detail: settings }));
    // Compatibilidade com ouvintes anteriores de viabilidade
    window.dispatchEvent(new CustomEvent('viability-config-updated', { 
      detail: { 
        maintenancePercent: settings.maintenance_percent,
        emergencyPercent: settings.emergency_reserve_percent 
      } 
    }));
  } catch (e) {
    console.warn('[financialSettingsService] Falha ao disparar evento:', e);
  }
}

/**
 * Registra ouvinte para alterações em tempo real dos percentuais
 */
export function subscribeToFinancialSettingsUpdates(callback: (settings: ChacaraFinancialSettings) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<ChacaraFinancialSettings>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  window.addEventListener('financial-settings-updated', handler);
  return () => {
    window.removeEventListener('financial-settings-updated', handler);
  };
}

/**
 * Busca todas as configurações financeiras (Global e por Chácara)
 */
export async function getAllFinancialSettings(): Promise<ChacaraFinancialSettings[]> {
  if (isDemoMode()) {
    return demoRepository.getAllFinancialSettings();
  }

  try {
    const { data, error } = await supabase
      .from('chacara_financial_settings')
      .select('*, chacara:chacaras(name)')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[financialSettingsService] Aviso ao buscar configurações no Supabase:', error.message);
      return getLocalCachedSettings();
    }

    if (data && data.length > 0) {
      const mapped: ChacaraFinancialSettings[] = data.map((item: any) => ({
        id: item.id,
        chacara_id: item.chacara_id || null,
        chacara_nome: item.chacara?.name || (item.chacara_id ? 'Chácara' : 'Configuração Padrão (Global)'),
        emergency_reserve_percent: validateFinancialPercent(item.emergency_reserve_percent),
        maintenance_percent: validateFinancialPercent(item.maintenance_percent),
        notes: item.notes || '',
        updated_at: item.updated_at,
        created_at: item.created_at
      }));

      // Garantir que haja pelo menos a configuração global
      const hasGlobal = mapped.some(s => s.chacara_id === null);
      if (!hasGlobal) {
        mapped.unshift(DEFAULT_FINANCIAL_SETTINGS);
      }

      saveLocalCachedSettings(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('[financialSettingsService] Exceção ao consultar Supabase:', err);
  }

  return getLocalCachedSettings();
}

/**
 * Busca a configuração aplicável a uma chácara específica (ou a Global como fallback)
 */
export async function getFinancialSettings(chacaraId?: string | null): Promise<ChacaraFinancialSettings> {
  if (isDemoMode()) {
    return demoRepository.getFinancialSettings(chacaraId);
  }

  const cleanChacaraId = chacaraId && chacaraId !== 'ALL' && chacaraId !== 'GENERAL' ? chacaraId : null;

  try {
    if (cleanChacaraId) {
      // 1. Tentar buscar configuração específica da chácara
      const { data: specificData, error: specErr } = await supabase
        .from('chacara_financial_settings')
        .select('*, chacara:chacaras(name)')
        .eq('chacara_id', cleanChacaraId)
        .maybeSingle();

      if (!specErr && specificData) {
        return {
          id: specificData.id,
          chacara_id: specificData.chacara_id,
          chacara_nome: specificData.chacara?.name || 'Chácara Selecionada',
          emergency_reserve_percent: validateFinancialPercent(specificData.emergency_reserve_percent),
          maintenance_percent: validateFinancialPercent(specificData.maintenance_percent),
          notes: specificData.notes || '',
          updated_at: specificData.updated_at,
          created_at: specificData.created_at
        };
      }
    }

    // 2. Buscar configuração Global padrão (chacara_id IS NULL)
    const { data: globalData, error: globErr } = await supabase
      .from('chacara_financial_settings')
      .select('*')
      .is('chacara_id', null)
      .maybeSingle();

    if (!globErr && globalData) {
      return {
        id: globalData.id,
        chacara_id: null,
        chacara_nome: 'Configuração Padrão (Global)',
        emergency_reserve_percent: validateFinancialPercent(globalData.emergency_reserve_percent),
        maintenance_percent: validateFinancialPercent(globalData.maintenance_percent),
        notes: globalData.notes || '',
        updated_at: globalData.updated_at,
        created_at: globalData.created_at
      };
    }
  } catch (err) {
    console.warn('[financialSettingsService] Erro ao buscar configuração no Supabase:', err);
  }

  // 3. Fallback para cache local
  const cachedList = getLocalCachedSettings();
  if (cleanChacaraId) {
    const cachedSpecific = cachedList.find(s => s.chacara_id === cleanChacaraId);
    if (cachedSpecific) return cachedSpecific;
  }
  const cachedGlobal = cachedList.find(s => s.chacara_id === null);
  return cachedGlobal || DEFAULT_FINANCIAL_SETTINGS;
}

/**
 * Salva ou atualiza os percentuais financeiros no Supabase (ou Demo)
 * e propaga a alteração instantaneamente via CustomEvents
 */
export async function saveFinancialSettings(settings: {
  chacara_id?: string | null;
  emergency_reserve_percent: number;
  maintenance_percent: number;
  notes?: string;
}): Promise<ChacaraFinancialSettings> {
  const cleanChacaraId = settings.chacara_id && settings.chacara_id !== 'ALL' && settings.chacara_id !== 'GENERAL'
    ? settings.chacara_id
    : null;

  const emergVal = validateFinancialPercent(settings.emergency_reserve_percent);
  const maintVal = validateFinancialPercent(settings.maintenance_percent);
  const now = new Date().toISOString();

  if (isDemoMode()) {
    const saved = await demoRepository.saveFinancialSettings({
      chacara_id: cleanChacaraId,
      emergency_reserve_percent: emergVal,
      maintenance_percent: maintVal,
      notes: settings.notes
    });
    broadcastFinancialSettingsUpdated(saved);
    return saved;
  }

  try {
    // 1. Verificar se já existe registro para esta chácara (ou global)
    let query = supabase.from('chacara_financial_settings').select('id');
    if (cleanChacaraId) {
      query = query.eq('chacara_id', cleanChacaraId);
    } else {
      query = query.is('chacara_id', null);
    }

    const { data: existing, error: findErr } = await query.maybeSingle();

    const payload = {
      chacara_id: cleanChacaraId,
      emergency_reserve_percent: emergVal,
      maintenance_percent: maintVal,
      notes: settings.notes || '',
      updated_at: now
    };

    let resultRecord: ChacaraFinancialSettings | null = null;

    if (existing?.id) {
      // Atualizar existente
      const { data: updated, error: updateErr } = await supabase
        .from('chacara_financial_settings')
        .update(payload)
        .eq('id', existing.id)
        .select('*, chacara:chacaras(name)')
        .single();

      if (!updateErr && updated) {
        resultRecord = {
          id: updated.id,
          chacara_id: updated.chacara_id,
          chacara_nome: updated.chacara?.name || (updated.chacara_id ? 'Chácara' : 'Configuração Padrão (Global)'),
          emergency_reserve_percent: validateFinancialPercent(updated.emergency_reserve_percent),
          maintenance_percent: validateFinancialPercent(updated.maintenance_percent),
          notes: updated.notes || '',
          updated_at: updated.updated_at,
          created_at: updated.created_at
        };
      }
    } else {
      // Inserir novo
      const { data: inserted, error: insertErr } = await supabase
        .from('chacara_financial_settings')
        .insert([{ ...payload, created_at: now }])
        .select('*, chacara:chacaras(name)')
        .single();

      if (!insertErr && inserted) {
        resultRecord = {
          id: inserted.id,
          chacara_id: inserted.chacara_id,
          chacara_nome: inserted.chacara?.name || (inserted.chacara_id ? 'Chácara' : 'Configuração Padrão (Global)'),
          emergency_reserve_percent: validateFinancialPercent(inserted.emergency_reserve_percent),
          maintenance_percent: validateFinancialPercent(inserted.maintenance_percent),
          notes: inserted.notes || '',
          updated_at: inserted.updated_at,
          created_at: inserted.created_at
        };
      }
    }

    if (resultRecord) {
      // Atualizar cache local
      const cached = getLocalCachedSettings();
      const idx = cached.findIndex(s => 
        cleanChacaraId ? s.chacara_id === cleanChacaraId : s.chacara_id === null
      );
      if (idx >= 0) {
        cached[idx] = resultRecord;
      } else {
        cached.push(resultRecord);
      }
      saveLocalCachedSettings(cached);

      // Disparar evento para re-cálculo global automático
      broadcastFinancialSettingsUpdated(resultRecord);
      return resultRecord;
    }
  } catch (e) {
    console.warn('[financialSettingsService] Erro ao salvar no Supabase, aplicando fallback local:', e);
  }

  // Fallback se o Supabase falhar (ex: tabela ainda não executada)
  const fallbackRecord: ChacaraFinancialSettings = {
    id: `local-${Date.now()}`,
    chacara_id: cleanChacaraId,
    chacara_nome: cleanChacaraId ? 'Chácara' : 'Configuração Padrão (Global)',
    emergency_reserve_percent: emergVal,
    maintenance_percent: maintVal,
    notes: settings.notes || '',
    updated_at: now,
    created_at: now
  };

  const cached = getLocalCachedSettings();
  const idx = cached.findIndex(s => 
    cleanChacaraId ? s.chacara_id === cleanChacaraId : s.chacara_id === null
  );
  if (idx >= 0) {
    cached[idx] = fallbackRecord;
  } else {
    cached.push(fallbackRecord);
  }
  saveLocalCachedSettings(cached);
  broadcastFinancialSettingsUpdated(fallbackRecord);

  return fallbackRecord;
}
