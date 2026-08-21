-- =================================================================================
-- MIGRATION: CRIAÇÃO DA TABELA DE COMPROVANTES FISCAIS E BUCKET DE STORAGE (CARNÊ-LEÃO)
-- =================================================================================

CREATE TABLE IF NOT EXISTS public.reservation_payment_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    competencia VARCHAR(7) NOT NULL, -- Formato YYYY-MM
    observacoes TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    uploaded_by TEXT
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_res_payment_docs_res_id ON public.reservation_payment_documents(reservation_id);
CREATE INDEX IF NOT EXISTS idx_res_payment_docs_competencia ON public.reservation_payment_documents(competencia);
CREATE INDEX IF NOT EXISTS idx_res_payment_docs_payment_date ON public.reservation_payment_documents(payment_date);

-- Habilitar RLS
ALTER TABLE public.reservation_payment_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Permitir leitura de comprovantes para usuarios autenticados" ON public.reservation_payment_documents;
CREATE POLICY "Permitir leitura de comprovantes para usuarios autenticados"
ON public.reservation_payment_documents FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Permitir insercao de comprovantes para usuarios autenticados" ON public.reservation_payment_documents;
CREATE POLICY "Permitir insercao de comprovantes para usuarios autenticados"
ON public.reservation_payment_documents FOR INSERT
TO authenticated, anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir alteracao de comprovantes para usuarios autenticados" ON public.reservation_payment_documents;
CREATE POLICY "Permitir alteracao de comprovantes para usuarios autenticados"
ON public.reservation_payment_documents FOR UPDATE
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Permitir exclusao de comprovantes para usuarios autenticados" ON public.reservation_payment_documents;
CREATE POLICY "Permitir exclusao de comprovantes para usuarios autenticados"
ON public.reservation_payment_documents FOR DELETE
TO authenticated, anon
USING (true);

-- Criar Bucket 'comprovantes_fiscais' se não existir no Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes_fiscais', 'comprovantes_fiscais', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies de Storage
DROP POLICY IF EXISTS "Permitir leitura publica de comprovantes fiscais" ON storage.objects;
CREATE POLICY "Permitir leitura publica de comprovantes fiscais"
ON storage.objects FOR SELECT
TO public, authenticated, anon
USING (bucket_id = 'comprovantes_fiscais');

DROP POLICY IF EXISTS "Permitir upload de comprovantes fiscais" ON storage.objects;
CREATE POLICY "Permitir upload de comprovantes fiscais"
ON storage.objects FOR INSERT
TO public, authenticated, anon
WITH CHECK (bucket_id = 'comprovantes_fiscais');

DROP POLICY IF EXISTS "Permitir delecao de comprovantes fiscais" ON storage.objects;
CREATE POLICY "Permitir delecao de comprovantes fiscais"
ON storage.objects FOR DELETE
TO public, authenticated, anon
USING (bucket_id = 'comprovantes_fiscais');
