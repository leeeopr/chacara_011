-- MIGRATION FASE 2: CAMADA DE PRECIFICAÇÃO

-- ETAPA 1 — BANCO DE DADOS: Criar a tabela public.company_prices
CREATE TABLE IF NOT EXISTS public.company_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  appointment_type_id UUID NOT NULL REFERENCES public.appointment_types(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- CONSTRAINTS: Não permitir duplicidade de company_id + appointment_type_id
-- No PostgreSQL, um índice único padrão em colunas que podem ser NULL permite múltiplos valores NULL.
-- Para contornar isso e garantir um único preço por combinação, criamos índices parciais únicos.
DROP INDEX IF EXISTS company_prices_company_type_idx;
DROP INDEX IF EXISTS company_prices_particular_type_idx;

CREATE UNIQUE INDEX company_prices_company_type_idx 
  ON public.company_prices (company_id, appointment_type_id) 
  WHERE company_id IS NOT NULL;

CREATE UNIQUE INDEX company_prices_particular_type_idx 
  ON public.company_prices (appointment_type_id) 
  WHERE company_id IS NULL;


-- ETAPA 7 — CONGELAMENTO DO PREÇO EM CONSULTAS (appointments)
-- Adicionar novas colunas ao cadastrar uma consulta
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS agreed_price NUMERIC(10,2) NULL,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS price_source TEXT NULL;

-- Adicionar CHECK constraint para as origens válidas se não existir
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


-- ETAPA 10 — MIGRAÇÃO DE CONTEXTO HISTÓRICO
-- Garantir que as consultas antigas permaneçam com valores nulos para evitar inferências incorretas
UPDATE public.appointments
SET agreed_price = NULL,
    price_source = NULL
WHERE agreed_price IS NULL AND price_source IS NULL;


-- ETAPA 11 — RLS (Row Level Security) na tabela company_prices
ALTER TABLE public.company_prices ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Has perms to view company prices" ON public.company_prices;
DROP POLICY IF EXISTS "Has perms to manage company prices" ON public.company_prices;

-- Política de Leitura: Qualquer perfil autorizado
CREATE POLICY "Has perms to view company prices" ON public.company_prices
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SECRETARIA', 'DONA', 'OWNER', 'admin', 'PROFISSIONAL', 'FONO')
  );

-- Política de Modificação: Criação/Edição restrita a secretárias e administradores/donos
CREATE POLICY "Has perms to manage company prices" ON public.company_prices
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SECRETARIA', 'DONA', 'OWNER', 'admin')
  );
