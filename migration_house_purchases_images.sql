-- =========================================================================
-- MIGRATION: FOTOS E SUPORTE A IMAGENS NO MÓDULO DE COMPRAS (house_purchases)
-- =========================================================================

-- 1. Adicionar coluna primary_image_url na tabela house_purchases se não existir
ALTER TABLE public.house_purchases 
ADD COLUMN IF NOT EXISTS primary_image_url TEXT;

-- 2. Criar Tabela de Imagens de Compras (purchase_images)
CREATE TABLE IF NOT EXISTS public.purchase_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES public.house_purchases(id) ON DELETE CASCADE,
    storage_path TEXT,
    public_url TEXT NOT NULL,
    file_name TEXT,
    file_size NUMERIC,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices para Alto Desempenho
CREATE INDEX IF NOT EXISTS idx_purchase_images_purchase_id ON public.purchase_images(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_images_is_primary ON public.purchase_images(is_primary);

-- 4. Habilitar RLS
ALTER TABLE public.purchase_images ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Segurança Permissivas para Usuários Autenticados
DROP POLICY IF EXISTS "Acesso total a fotos de compras para usuarios autenticados" ON public.purchase_images;
CREATE POLICY "Acesso total a fotos de compras para usuarios autenticados"
ON public.purchase_images
FOR ALL
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR true)
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR true);

-- 6. Storage Bucket para Imagens de Compras (caso use storage.buckets)
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-images', 'purchase-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política de Storage para o bucket purchase-images
DROP POLICY IF EXISTS "Permitir upload publico purchase-images" ON storage.objects;
CREATE POLICY "Permitir upload publico purchase-images"
ON storage.objects FOR ALL
USING (bucket_id = 'purchase-images')
WITH CHECK (bucket_id = 'purchase-images');
