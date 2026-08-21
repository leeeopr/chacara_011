-- MIGRATION FASE 3: COMPLEMENTOS DE PRECIFICAÇÃO POR EMPRESA

-- ETAPA 1: Adicionar coluna default_price na tabela de tipos de consulta (Particulares Gerais)
ALTER TABLE public.appointment_types 
ADD COLUMN IF NOT EXISTS default_price NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- ETAPA 2: Garantir que todos os índices únicos da tabela company_prices estejam criados
-- (Caso não tenham sido criados na migração anterior)
DROP INDEX IF EXISTS company_prices_company_type_idx;
DROP INDEX IF EXISTS company_prices_particular_type_idx;

CREATE UNIQUE INDEX IF NOT EXISTS company_prices_company_type_idx 
  ON public.company_prices (company_id, appointment_type_id) 
  WHERE company_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS company_prices_particular_type_idx 
  ON public.company_prices (appointment_type_id) 
  WHERE company_id IS NULL;

-- ETAPA 3: Garantir que as colunas na tabela de appointments existam
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS billing_company_id UUID NULL REFERENCES public.companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS agreed_price NUMERIC(10,2) NULL,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS price_source TEXT NULL;

-- CHECK CONSTRAINT para price_source se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_price_source_check'
    ) THEN
        ALTER TABLE public.appointments 
        ADD CONSTRAINT appointments_price_source_check 
        CHECK (price_source IN ('DEFAULT_PRICE', 'COMPANY_PRICE', 'MANUAL_OVERRIDE'));
    END IF;
END $$;
