-- =========================================================================
-- SCRIPT SQL: FOTOS DOS ITENS DE COMPRA (TABELAS, STORAGE, RLS E TRIGGERS)
-- Execute este script no SQL Editor do seu Supabase Dashboard
-- =========================================================================

-- 1. Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Garantir coluna primary_image_url na tabela house_purchases
ALTER TABLE IF EXISTS public.house_purchases 
ADD COLUMN IF NOT EXISTS primary_image_url TEXT;

-- 3. Criar Tabela de Imagens das Compras (purchase_images)
CREATE TABLE IF NOT EXISTS public.purchase_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.house_purchases(id) ON DELETE CASCADE,
    storage_path TEXT,
    public_url TEXT NOT NULL,
    file_name TEXT,
    file_size NUMERIC,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Índices para Consulta Rápida (sem N+1)
CREATE INDEX IF NOT EXISTS idx_purchase_images_purchase_id ON public.purchase_images(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_images_is_primary ON public.purchase_images(is_primary);
CREATE INDEX IF NOT EXISTS idx_purchase_images_created_at ON public.purchase_images(created_at);

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE public.purchase_images ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acesso na Tabela purchase_images
DROP POLICY IF EXISTS "Permitir leitura de fotos para todos autenticados" ON public.purchase_images;
CREATE POLICY "Permitir leitura de fotos para todos autenticados"
ON public.purchase_images
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Permitir criacao de fotos" ON public.purchase_images;
CREATE POLICY "Permitir criacao de fotos"
ON public.purchase_images
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao de fotos" ON public.purchase_images;
CREATE POLICY "Permitir atualizacao de fotos"
ON public.purchase_images
FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delecao de fotos" ON public.purchase_images;
CREATE POLICY "Permitir delecao de fotos"
ON public.purchase_images
FOR DELETE
USING (true);

-- 7. Trigger para Sincronizar Foto Principal e Promover Restantes
CREATE OR REPLACE FUNCTION sync_purchase_image_primary()
RETURNS TRIGGER AS $$
BEGIN
    -- Se uma nova foto foi marcada como principal
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.is_primary = true THEN
        -- Desmarcar outras fotos do mesmo item
        UPDATE public.purchase_images
        SET is_primary = false
        WHERE purchase_id = NEW.purchase_id
          AND id != NEW.id
          AND is_primary = true;

        -- Sincronizar campo primary_image_url no item pai
        UPDATE public.house_purchases
        SET primary_image_url = NEW.public_url,
            updated_at = NOW()
        WHERE id = NEW.purchase_id;
    END IF;

    -- Se a foto principal for excluída
    IF TG_OP = 'DELETE' AND OLD.is_primary = true THEN
        -- Verificar se ainda restam fotos para este item
        WITH next_img AS (
            SELECT id, public_url 
            FROM public.purchase_images
            WHERE purchase_id = OLD.purchase_id
            ORDER BY created_at ASC
            LIMIT 1
        )
        UPDATE public.purchase_images
        SET is_primary = true
        WHERE id = (SELECT id FROM next_img);

        -- Atualizar primary_image_url no item pai (ou NULL se não houver mais fotos)
        UPDATE public.house_purchases
        SET primary_image_url = (
            SELECT public_url 
            FROM public.purchase_images
            WHERE purchase_id = OLD.purchase_id
            ORDER BY created_at ASC
            LIMIT 1
        ),
        updated_at = NOW()
        WHERE id = OLD.purchase_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_purchase_image_primary ON public.purchase_images;
CREATE TRIGGER trigger_sync_purchase_image_primary
AFTER INSERT OR UPDATE OF is_primary OR DELETE ON public.purchase_images
FOR EACH ROW
EXECUTE FUNCTION sync_purchase_image_primary();

-- 8. Configuração dos Buckets no Supabase Storage
-- Criação do bucket público purchase-images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'purchase-images', 
    'purchase-images', 
    true, 
    52428800, -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif'];

-- 9. Políticas de Segurança do Supabase Storage
DROP POLICY IF EXISTS "Public read access for purchase images" ON storage.objects;
CREATE POLICY "Public read access for purchase images"
ON storage.objects FOR SELECT
USING (bucket_id = 'purchase-images');

DROP POLICY IF EXISTS "Upload access for purchase images" ON storage.objects;
CREATE POLICY "Upload access for purchase images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'purchase-images');

DROP POLICY IF EXISTS "Update access for purchase images" ON storage.objects;
CREATE POLICY "Update access for purchase images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'purchase-images');

DROP POLICY IF EXISTS "Delete access for purchase images" ON storage.objects;
CREATE POLICY "Delete access for purchase images"
ON storage.objects FOR DELETE
USING (bucket_id = 'purchase-images');
