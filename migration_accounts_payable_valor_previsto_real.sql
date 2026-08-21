-- ==============================================================================
-- MIGRATION: ADICIONAR VALOR REAL E IMPLEMENTAR REGRA PREVISTO x REAL
-- ==============================================================================

-- 1. Adicionar a coluna valor_real na tabela accounts_payable (se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'accounts_payable' 
      AND column_name = 'valor_real'
  ) THEN
    ALTER TABLE public.accounts_payable ADD COLUMN valor_real NUMERIC(12,2) DEFAULT NULL;
    RAISE NOTICE 'Coluna valor_real adicionada com sucesso em public.accounts_payable';
  ELSE
    RAISE NOTICE 'Coluna valor_real já existe em public.accounts_payable';
  END IF;
END $$;

-- 2. Migração de dados legados:
-- Se a conta já possui valor_pago preenchido e valor_real é NULL, preencher valor_real com valor_pago
UPDATE public.accounts_payable
SET valor_real = valor_pago
WHERE valor_pago IS NOT NULL 
  AND valor_real IS NULL;

-- 3. Criar índice para buscas e ordenações por valor considerado
CREATE INDEX IF NOT EXISTS idx_accounts_payable_valor_real ON public.accounts_payable(valor_real);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_valor_previsto ON public.accounts_payable(valor_previsto);

-- 4. Função auxiliar SQL para cálculo do valor considerado (COALESCE):
-- Retorna valor_real se preenchido; caso contrário valor_previsto
CREATE OR REPLACE FUNCTION public.get_account_payable_effective_value(
  p_valor_previsto NUMERIC,
  p_valor_real NUMERIC,
  p_valor_pago NUMERIC DEFAULT NULL
)
RETURNS NUMERIC AS $$
BEGIN
  IF p_valor_real IS NOT NULL THEN
    RETURN p_valor_real;
  ELSIF p_valor_pago IS NOT NULL THEN
    RETURN p_valor_pago;
  ELSE
    RETURN COALESCE(p_valor_previsto, 0.00);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. View operacional com coluna calculada valor_considerado
CREATE OR REPLACE VIEW public.v_accounts_payable_operacional AS
SELECT 
  ap.*,
  COALESCE(ap.valor_real, ap.valor_pago, ap.valor_previsto, 0.00) AS valor_considerado,
  CASE 
    WHEN ap.valor_real IS NOT NULL THEN 'REAL'
    WHEN ap.valor_pago IS NOT NULL THEN 'PAGO'
    ELSE 'PREVISTO'
  END AS tipo_valor_considerado,
  (COALESCE(ap.valor_real, ap.valor_pago, ap.valor_previsto, 0.00) - ap.valor_previsto) AS diferenca_previsto_real
FROM public.accounts_payable ap;
