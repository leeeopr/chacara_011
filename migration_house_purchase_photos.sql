-- =========================================================================
-- MIGRATION: FOTOS E IMAGENS EM ITENS DE COMPRA (house_purchase_images)
-- Sistema de Gestão de Chácaras & Compras
-- =========================================================================

-- 1. Extensão para UUID se ainda não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Adicionar coluna de foto principal na tabela house_purchases (para carregamento rápido)
ALTER TABLE public.house_purchases 
ADD COLUMN IF NOT EXISTS primary_image_url TEXT;

-- 3. Tabela Relacional de Múltiplas Fotos (house_purchase_images)
CREATE TABLE IF NOT EXISTS public.house_purchase_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES public.house_purchases(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    file_name TEXT,
    file_size BIGINT,
    content_type TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Índices para Alto Desempenho
CREATE INDEX IF NOT EXISTS idx_purchase_images_purchase_id ON public.house_purchase_images(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_images_is_primary ON public.house_purchase_images(is_primary);
CREATE INDEX IF NOT EXISTS idx_purchase_images_position ON public.house_purchase_images(position);
CREATE INDEX IF NOT EXISTS idx_purchase_images_created_at ON public.house_purchase_images(created_at);

-- 5. Trigger de Atualização Automática do campo updated_at
CREATE OR REPLACE FUNCTION update_house_purchase_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_house_purchase_images_updated_at ON public.house_purchase_images;
CREATE TRIGGER trigger_house_purchase_images_updated_at
BEFORE UPDATE ON public.house_purchase_images
FOR EACH ROW
EXECUTE FUNCTION update_house_purchase_images_updated_at();

-- 6. Trigger para Sincronizar Foto Principal e Desmarcar Outras
CREATE OR REPLACE FUNCTION sync_purchase_primary_image()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a foto foi marcada como principal
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.is_primary = true THEN
        -- Desmarcar outras fotos deste mesmo item
        UPDATE public.house_purchase_images
        SET is_primary = false
        WHERE purchase_id = NEW.purchase_id
          AND id != NEW.id
          AND is_primary = true;

        -- Atualizar primary_image_url na tabela pai
        UPDATE public.house_purchases
        SET primary_image_url = NEW.public_url,
            updated_at = NOW()
        WHERE id = NEW.purchase_id;
    END IF;

    -- Se a foto principal for excluída
    IF TG_OP = 'DELETE' AND OLD.is_primary = true THEN
        -- Tentar promover a primeira foto restante como principal
        WITH next_photo AS (
            SELECT id, public_url 
            FROM public.house_purchase_images
            WHERE purchase_id = OLD.purchase_id
            ORDER BY position ASC, created_at ASC
            LIMIT 1
        )
        UPDATE public.house_purchase_images
        SET is_primary = true
        WHERE id = (SELECT id FROM next_photo);

        UPDATE public.house_purchases
        SET primary_image_url = (
            SELECT public_url 
            FROM public.house_purchase_images
            WHERE purchase_id = OLD.purchase_id
            ORDER BY position ASC, created_at ASC
            LIMIT 1
        ),
        updated_at = NOW()
        WHERE id = OLD.purchase_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_purchase_primary_image ON public.house_purchase_images;
CREATE TRIGGER trigger_sync_purchase_primary_image
AFTER INSERT OR UPDATE OF is_primary OR DELETE ON public.house_purchase_images
FOR EACH ROW
EXECUTE FUNCTION sync_purchase_primary_image();

-- 7. Habilitar RLS (Row Level Security) na Tabela de Fotos
ALTER TABLE public.house_purchase_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total a fotos de compras para usuarios autenticados" ON public.house_purchase_images;
CREATE POLICY "Acesso total a fotos de compras para usuarios autenticados"
ON public.house_purchase_images
FOR ALL
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR true)
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR true);

-- 8. Configuração do Bucket no Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'purchase_images', 
    'purchase_images', 
    true, 
    52428800, -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif'];

-- 9. Políticas de Segurança RLS para o Storage
DROP POLICY IF EXISTS "Public read access for purchase images" ON storage.objects;
CREATE POLICY "Public read access for purchase images"
ON storage.objects FOR SELECT
USING (bucket_id = 'purchase_images');

DROP POLICY IF EXISTS "Upload access for purchase images" ON storage.objects;
CREATE POLICY "Upload access for purchase images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'purchase_images');

DROP POLICY IF EXISTS "Update access for purchase images" ON storage.objects;
CREATE POLICY "Update access for purchase images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'purchase_images');

DROP POLICY IF EXISTS "Delete access for purchase images" ON storage.objects;
CREATE POLICY "Delete access for purchase images"
ON storage.objects FOR DELETE
USING (bucket_id = 'purchase_images');
