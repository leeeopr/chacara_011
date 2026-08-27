export interface ChacaraFinancialSettings {
  id?: string;
  chacara_id: string | null; // null = Configuração Padrão / Global
  chacara_nome?: string;
  emergency_reserve_percent: number; // ex: 20.00 (20%)
  maintenance_percent: number; // ex: 15.00 (15%)
  notes?: string;
  updated_at?: string;
  created_at?: string;
}

export const DEFAULT_FINANCIAL_SETTINGS: ChacaraFinancialSettings = {
  chacara_id: null,
  chacara_nome: 'Configuração Padrão (Global)',
  emergency_reserve_percent: 20,
  maintenance_percent: 15,
  notes: 'Percentuais padrão do sistema'
};

/**
 * Validação dos percentuais financeiros:
 * - Deve estar estritamente entre 0 e 100
 * - Sem valores negativos
 * - 0% é válido para desabilitar a categoria
 */
export function validateFinancialPercent(value: number | string | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed * 100) / 100));
}
