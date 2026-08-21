-- ==============================================================================
-- SCHEMA & MIGRATION: CONTAS A PAGAR (Obrigações Financeiras & Recorrências)
-- ==============================================================================

-- 1. Criação da tabela principal
CREATE TABLE IF NOT EXISTS public.accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
  chacara_nome TEXT,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'OUTROS',
  tipo TEXT NOT NULL DEFAULT 'AVULSA',
  recorrencia_frequencia TEXT,
  recorrencia_dia_vencimento INTEGER,
  recorrencia_pai_id UUID REFERENCES public.accounts_payable(id) ON DELETE SET NULL,
  data_vencimento DATE NOT NULL,
  valor_previsto NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  valor_real NUMERIC(12,2) DEFAULT NULL,
  valor_pago NUMERIC(12,2),
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  prestador_id UUID REFERENCES public.crew_members(id) ON DELETE SET NULL,
  prestador_nome TEXT,
  prestador_pix TEXT,
  prestador_role TEXT,
  comprovante_url TEXT,
  observacao TEXT,
  responsavel_pagamento TEXT,
  cancelado_em TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices de performance para consultas frequentes e filtros
CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON public.accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_vencimento ON public.accounts_payable(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_chacara ON public.accounts_payable(chacara_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_prestador ON public.accounts_payable(prestador_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_categoria ON public.accounts_payable(categoria);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_tipo ON public.accounts_payable(tipo);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_recorrencia_pai ON public.accounts_payable(recorrencia_pai_id);

-- 3. Habilitação de RLS (Row Level Security)
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acesso
DROP POLICY IF EXISTS "accounts_payable_select_policy" ON public.accounts_payable;
CREATE POLICY "accounts_payable_select_policy" 
  ON public.accounts_payable 
  FOR SELECT 
  TO authenticated, anon 
  USING (true);

DROP POLICY IF EXISTS "accounts_payable_insert_policy" ON public.accounts_payable;
CREATE POLICY "accounts_payable_insert_policy" 
  ON public.accounts_payable 
  FOR INSERT 
  TO authenticated, anon 
  WITH CHECK (true);

DROP POLICY IF EXISTS "accounts_payable_update_policy" ON public.accounts_payable;
CREATE POLICY "accounts_payable_update_policy" 
  ON public.accounts_payable 
  FOR UPDATE 
  TO authenticated, anon 
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "accounts_payable_delete_policy" ON public.accounts_payable;
CREATE POLICY "accounts_payable_delete_policy" 
  ON public.accounts_payable 
  FOR DELETE 
  TO authenticated, anon 
  USING (true);

-- 5. Trigger para atualização automática de updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at_accounts_payable()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounts_payable_updated_at ON public.accounts_payable;
CREATE TRIGGER trg_accounts_payable_updated_at
  BEFORE UPDATE ON public.accounts_payable
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_accounts_payable();
