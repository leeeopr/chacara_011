-- ==============================================================================
-- SCHEMA & MIGRATION: REGRAS DE COBRANÇA DE PRESTADORES E AUTOMAÇÃO CONTAS A PAGAR
-- ==============================================================================

-- 1. Criação da tabela de Regras de Cobrança por Prestador
CREATE TABLE IF NOT EXISTS public.provider_billing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_id UUID REFERENCES public.crew_members(id) ON DELETE CASCADE,
  prestador_nome TEXT NOT NULL,
  prestador_pix TEXT,
  prestador_role TEXT,
  chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
  chacara_nome TEXT,
  descricao_padrao TEXT NOT NULL DEFAULT 'Serviço Operacional',
  categoria TEXT NOT NULL DEFAULT 'EQUIPE_LIMPEZA',
  valor_padrao NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  regra_vencimento TEXT NOT NULL DEFAULT 'DAYS_AFTER', -- 'SAME_DAY', 'DAYS_AFTER', 'FIXED_DAY_MONTH'
  dias_apos_servico INTEGER DEFAULT 3,
  dia_fixo_mes INTEGER DEFAULT 5,
  event_type_code TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices de performance para regras de cobrança
CREATE INDEX IF NOT EXISTS idx_provider_billing_rules_prestador ON public.provider_billing_rules(prestador_id);
CREATE INDEX IF NOT EXISTS idx_provider_billing_rules_chacara ON public.provider_billing_rules(chacara_id);
CREATE INDEX IF NOT EXISTS idx_provider_billing_rules_ativo ON public.provider_billing_rules(ativo);
CREATE INDEX IF NOT EXISTS idx_provider_billing_rules_event_type ON public.provider_billing_rules(event_type_code);

-- 3. Atualização da tabela accounts_payable para suportar rastreamento de origem
ALTER TABLE public.accounts_payable 
  ADD COLUMN IF NOT EXISTS origem_tipo TEXT DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS origem_id TEXT,
  ADD COLUMN IF NOT EXISTS origem_data_servico DATE,
  ADD COLUMN IF NOT EXISTS provider_billing_rule_id UUID REFERENCES public.provider_billing_rules(id) ON DELETE SET NULL;

-- 4. Índices para consulta de contas por origem (serviço operacional agendado)
CREATE INDEX IF NOT EXISTS idx_accounts_payable_origem_id ON public.accounts_payable(origem_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_origem_tipo ON public.accounts_payable(origem_tipo);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_billing_rule ON public.accounts_payable(provider_billing_rule_id);

-- 5. Habilitação de RLS (Row Level Security) na tabela de regras
ALTER TABLE public.provider_billing_rules ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acesso RLS para provider_billing_rules
DROP POLICY IF EXISTS "provider_billing_rules_select_policy" ON public.provider_billing_rules;
CREATE POLICY "provider_billing_rules_select_policy" 
  ON public.provider_billing_rules 
  FOR SELECT 
  TO authenticated, anon 
  USING (true);

DROP POLICY IF EXISTS "provider_billing_rules_insert_policy" ON public.provider_billing_rules;
CREATE POLICY "provider_billing_rules_insert_policy" 
  ON public.provider_billing_rules 
  FOR INSERT 
  TO authenticated, anon 
  WITH CHECK (true);

DROP POLICY IF EXISTS "provider_billing_rules_update_policy" ON public.provider_billing_rules;
CREATE POLICY "provider_billing_rules_update_policy" 
  ON public.provider_billing_rules 
  FOR UPDATE 
  TO authenticated, anon 
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "provider_billing_rules_delete_policy" ON public.provider_billing_rules;
CREATE POLICY "provider_billing_rules_delete_policy" 
  ON public.provider_billing_rules 
  FOR DELETE 
  TO authenticated, anon 
  USING (true);

-- 7. Trigger para atualização automática de updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at_provider_billing_rules()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_provider_billing_rules_updated_at ON public.provider_billing_rules;
CREATE TRIGGER trg_provider_billing_rules_updated_at
  BEFORE UPDATE ON public.provider_billing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_provider_billing_rules();
