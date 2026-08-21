-- MIGRATION FASE 1: SISTEMA DE EMPRESAS/CONVÊNIOS

-- ETAPA 1 — BANCO DE DADOS: Criar a tabela public.companies
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  limit_value NUMERIC(10,2) DEFAULT 0.00,
  limit_type TEXT NOT NULL DEFAULT 'NONE',
  block_on_limit BOOLEAN NOT NULL DEFAULT true,
  document_number TEXT NULL,
  phone TEXT NULL,
  email TEXT NULL,
  billing_day INTEGER NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  
  -- CHECK Constraints
  CONSTRAINT companies_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT companies_limit_type_check CHECK (limit_type IN ('NONE', 'WEEKLY', 'MONTHLY', 'YEARLY'))
);

-- ETAPA 2 — ALTERAR PACIENTES
-- Adicionar coluna company_id em public.patients
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS company_id UUID NULL;

-- Adicionar foreign key constraint se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'patients_company_id_fkey'
    ) THEN
        ALTER TABLE public.patients 
        ADD CONSTRAINT patients_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_patients_company_id ON public.patients(company_id);

-- ETAPA 3 — ALTERAR CONSULTAS
-- Adicionar coluna billing_company_id em public.appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS billing_company_id UUID NULL;

-- Adicionar foreign key constraint se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_billing_company_id_fkey'
    ) THEN
        ALTER TABLE public.appointments 
        ADD CONSTRAINT appointments_billing_company_id_fkey 
        FOREIGN KEY (billing_company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_appointments_billing_company ON public.appointments(billing_company_id);

-- ETAPA 4 — MIGRAÇÃO DOS DADOS EXISTENTES
-- Copiar o status da empresa padrão salvos no paciente para a consulta
DO $$
BEGIN
    UPDATE public.appointments a
    SET billing_company_id = p.company_id
    FROM public.patients p
    WHERE a.patient_id = p.id
      AND a.billing_company_id IS NULL
      AND p.company_id IS NOT NULL;
END $$;

-- ETAPA 5 — RLS (Row Level Security)
-- Habilitar RLS na tabela principal
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Has perms to view companies" ON public.companies;
DROP POLICY IF EXISTS "Has perms to manage companies" ON public.companies;

-- Política de Leitura: Permitir que perfis autorizados leiam as empresas
CREATE POLICY "Has perms to view companies" ON public.companies
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SECRETARIA', 'DONA', 'OWNER', 'admin', 'PROFISSIONAL', 'FONO')
  );

-- Política de Modificação: Criação/Atualização restrita a SECRETARIA, DONA, OWNER e admin
CREATE POLICY "Has perms to manage companies" ON public.companies
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SECRETARIA', 'DONA', 'OWNER', 'admin')
  );
