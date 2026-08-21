-- MIGRATION FASE 4: OPERAÇÃO FINANCEIRA DA CONSULTA

-- 1. Criar tabela public.billings
CREATE TABLE IF NOT EXISTS public.billings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID UNIQUE REFERENCES public.appointments(id) ON DELETE SET NULL,
  billing_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  gross_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  discount_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  net_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WAIVED', 'CANCELLED')) DEFAULT 'PENDING',
  due_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invoice_needed BOOLEAN NOT NULL DEFAULT false,
  invoice_number TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Criar tabela public.billing_transactions
CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_id UUID NOT NULL REFERENCES public.billings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('PIX', 'CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'BOLETO')),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'CLEARED', 'FAILED', 'REFUNDED')) DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Garantir campos adicionais na tabela de Appointments (SNAPSHOT e FINANCEIRO)
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS billing_company_id UUID NULL REFERENCES public.companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS agreed_price NUMERIC(10,2) NULL,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS price_source TEXT NULL,
ADD COLUMN IF NOT EXISTS net_value NUMERIC(10,2) NULL,
ADD COLUMN IF NOT EXISTS commission_rate_snapshot NUMERIC(5,2) NULL,
ADD COLUMN IF NOT EXISTS invoice_needed BOOLEAN DEFAULT false;

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

-- 4. RLS - Row Level Security para billings
ALTER TABLE public.billings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select billings" ON public.billings;
CREATE POLICY "Select billings" ON public.billings
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.appointments a 
      WHERE a.id = appointment_id AND a.fono_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Insert billings" ON public.billings;
CREATE POLICY "Insert billings" ON public.billings
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
  );

DROP POLICY IF EXISTS "Update billings" ON public.billings;
CREATE POLICY "Update billings" ON public.billings
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
  );

DROP POLICY IF EXISTS "Delete billings" ON public.billings;
CREATE POLICY "Delete billings" ON public.billings
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'admin')
  );

-- 5. RLS - Row Level Security para billing_transactions
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select billing_transactions" ON public.billing_transactions;
CREATE POLICY "Select billing_transactions" ON public.billing_transactions
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.billings b
      JOIN public.appointments a ON a.id = b.appointment_id
      WHERE b.id = billing_id AND a.fono_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Insert billing_transactions" ON public.billing_transactions;
CREATE POLICY "Insert billing_transactions" ON public.billing_transactions
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
  );

DROP POLICY IF EXISTS "Update billing_transactions" ON public.billing_transactions;
CREATE POLICY "Update billing_transactions" ON public.billing_transactions
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
  );

DROP POLICY IF EXISTS "Delete billing_transactions" ON public.billing_transactions;
CREATE POLICY "Delete billing_transactions" ON public.billing_transactions
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'admin')
  );
