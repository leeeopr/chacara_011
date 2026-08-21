-- =================================================================================
-- FASE 7: GESTÃO DE CÔMODOS, AMBIENTES E MANUTENÇÕES DAS CHÁCARAS
-- Estrutura Completa de Banco de Dados Supabase (PostgreSQL + RLS + Triggers)
-- =================================================================================

-- 1. Extensão para UUID (caso ainda não esteja habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Tipos de Cômodos / Ambientes (Configurável e Dinâmica)
CREATE TABLE IF NOT EXISTS public.room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    default_icon VARCHAR(50) NOT NULL DEFAULT 'DoorClosed',
    category VARCHAR(50) DEFAULT 'GERAL', -- 'DORMITORIO', 'SOCIAL', 'LAZER', 'SERVICO', 'EXTERNO', 'TECNICO', 'GERAL'
    color VARCHAR(30) DEFAULT '#3B82F6',
    is_custom BOOLEAN DEFAULT false NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir os tipos iniciais padrão
INSERT INTO public.room_types (name, default_icon, category, color, is_custom, display_order)
VALUES
    ('Quarto', 'BedDouble', 'DORMITORIO', '#3B82F6', false, 1),
    ('Suíte', 'Bed', 'DORMITORIO', '#8B5CF6', false, 2),
    ('Banheiro', 'Bath', 'SERVICO', '#06B6D4', false, 3),
    ('Cozinha', 'UtensilsCrossed', 'SERVICO', '#F59E0B', false, 4),
    ('Sala', 'Sofa', 'SOCIAL', '#10B981', false, 5),
    ('Sala de Jantar', 'Utensils', 'SOCIAL', '#6366F1', false, 6),
    ('Área Gourmet', 'Flame', 'LAZER', '#EF4444', false, 7),
    ('Churrasqueira', 'Flame', 'LAZER', '#F97316', false, 8),
    ('Piscina', 'Waves', 'LAZER', '#0EA5E9', false, 9),
    ('Jardim', 'Trees', 'EXTERNO', '#84CC16', false, 10),
    ('Área Externa', 'Sun', 'EXTERNO', '#14B8A6', false, 11),
    ('Varanda', 'Maximize2', 'SOCIAL', '#A855F7', false, 12),
    ('Garagem', 'Car', 'SERVICO', '#64748B', false, 13),
    ('Lavanderia', 'Shirt', 'SERVICO', '#0284C7', false, 14),
    ('Escritório', 'Laptop', 'SOCIAL', '#475569', false, 15),
    ('Depósito', 'Boxes', 'SERVICO', '#78716C', false, 16),
    ('Casa de Máquinas', 'Cog', 'TECNICO', '#DC2626', false, 17),
    ('Salão de Jogos', 'Gamepad2', 'LAZER', '#EC4899', false, 18),
    ('Canil', 'Dog', 'EXTERNO', '#D97706', false, 19),
    ('Outro', 'MoreHorizontal', 'GERAL', '#94A3B8', false, 99)
ON CONFLICT (name) DO UPDATE 
SET default_icon = EXCLUDED.default_icon,
    category = EXCLUDED.category,
    color = EXCLUDED.color;


-- 3. Tabela Principal de Cômodos / Ambientes da Chácara (property_rooms)
CREATE TABLE IF NOT EXISTS public.property_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID NOT NULL REFERENCES public.chacaras(id) ON DELETE CASCADE,
    room_type_id UUID REFERENCES public.room_types(id) ON DELETE SET NULL,
    room_type_name VARCHAR(100) NOT NULL DEFAULT 'Outro',
    name VARCHAR(150) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'DoorClosed',
    photo_url TEXT,
    display_order INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'OPERACIONAL' NOT NULL, -- 'OPERACIONAL', 'MANUTENCAO_NECESSARIA', 'INTERDITADO', 'EM_REFORMA'
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir colunas essenciais caso a tabela já exista
ALTER TABLE public.property_rooms ADD COLUMN IF NOT EXISTS chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE;
ALTER TABLE public.property_rooms ADD COLUMN IF NOT EXISTS room_type_id UUID REFERENCES public.room_types(id) ON DELETE SET NULL;
ALTER TABLE public.property_rooms ADD COLUMN IF NOT EXISTS room_type_name VARCHAR(100) DEFAULT 'Outro';
ALTER TABLE public.property_rooms ADD COLUMN IF NOT EXISTS name VARCHAR(150);
ALTER TABLE public.property_rooms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.property_rooms ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'DoorClosed';
ALTER TABLE public.property_rooms ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.property_rooms ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE public.property_rooms ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'OPERACIONAL';
ALTER TABLE public.property_rooms ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.property_rooms ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;


-- 4. Tabela de Registros de Manutenções (maintenance_records)
CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID NOT NULL REFERENCES public.chacaras(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.property_rooms(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(30) DEFAULT 'MEDIA' NOT NULL, -- 'BAIXA', 'MEDIA', 'ALTA', 'URGENTE'
    status VARCHAR(40) DEFAULT 'IDENTIFICADA' NOT NULL, -- 'IDENTIFICADA', 'PLANEJADA', 'AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'
    identified_at DATE DEFAULT CURRENT_DATE NOT NULL,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    
    -- Responsável (Equipe Real)
    assigned_crew_member_id UUID REFERENCES public.crew_members(id) ON DELETE SET NULL,
    assigned_crew_name VARCHAR(150),
    
    -- Financeiro
    estimated_cost NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    actual_cost NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    financial_transaction_id TEXT,
    
    -- Integração com Calendário Operacional
    operational_event_id UUID REFERENCES public.operational_events(id) ON DELETE SET NULL,
    
    -- Recorrência
    is_recurring BOOLEAN DEFAULT false NOT NULL,
    recurrence_period VARCHAR(40), -- 'SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'PERSONALIZADA'
    recurrence_interval_days INTEGER,
    recurrence_parent_id UUID REFERENCES public.maintenance_records(id) ON DELETE SET NULL,
    next_occurrence_date DATE,
    
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir colunas caso maintenance_records já exista
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.property_rooms(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS title VARCHAR(200);
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS priority VARCHAR(30) DEFAULT 'MEDIA';
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS status VARCHAR(40) DEFAULT 'IDENTIFICADA';
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS identified_at DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS assigned_crew_member_id UUID REFERENCES public.crew_members(id) ON DELETE SET NULL;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS assigned_crew_name VARCHAR(150);
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS actual_cost NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS financial_transaction_id TEXT;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS operational_event_id UUID REFERENCES public.operational_events(id) ON DELETE SET NULL;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS recurrence_period VARCHAR(40);
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS recurrence_interval_days INTEGER;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES public.maintenance_records(id) ON DELETE SET NULL;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS next_occurrence_date DATE;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;


-- 5. Tabela de Fotos da Manutenção (Antes / Durante / Depois)
CREATE TABLE IF NOT EXISTS public.maintenance_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID NOT NULL REFERENCES public.maintenance_records(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    stage VARCHAR(30) DEFAULT 'DURANTE' NOT NULL, -- 'ANTES', 'DURANTE', 'DEPOIS'
    caption TEXT,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 6. Tabela de Vínculo entre Manutenções e Compras de Insumos (maintenance_purchases)
CREATE TABLE IF NOT EXISTS public.maintenance_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID NOT NULL REFERENCES public.maintenance_records(id) ON DELETE CASCADE,
    purchase_id UUID NOT NULL REFERENCES public.house_purchases(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_maintenance_purchase UNIQUE(maintenance_id, purchase_id)
);


-- 7. Índices para Alto Desempenho e Consultas Rápidas
CREATE INDEX IF NOT EXISTS idx_property_rooms_chacara ON public.property_rooms(chacara_id);
CREATE INDEX IF NOT EXISTS idx_property_rooms_type ON public.property_rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_property_rooms_order ON public.property_rooms(chacara_id, display_order);
CREATE INDEX IF NOT EXISTS idx_property_rooms_status ON public.property_rooms(status);
CREATE INDEX IF NOT EXISTS idx_property_rooms_deleted ON public.property_rooms(is_deleted);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_chacara ON public.maintenance_records(chacara_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_room ON public.maintenance_records(room_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_priority ON public.maintenance_records(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_status ON public.maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_due_date ON public.maintenance_records(due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_crew ON public.maintenance_records(assigned_crew_member_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_event ON public.maintenance_records(operational_event_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_recurring ON public.maintenance_records(is_recurring);

CREATE INDEX IF NOT EXISTS idx_maintenance_images_maint ON public.maintenance_images(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_purchases_maint ON public.maintenance_purchases(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_purchases_purch ON public.maintenance_purchases(purchase_id);


-- 8. Triggers para Atualização Automática de updated_at
CREATE OR REPLACE FUNCTION update_maintenance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_property_rooms_updated_at ON public.property_rooms;
CREATE TRIGGER trg_property_rooms_updated_at
    BEFORE UPDATE ON public.property_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_updated_at();

DROP TRIGGER IF EXISTS trg_maintenance_records_updated_at ON public.maintenance_records;
CREATE TRIGGER trg_maintenance_records_updated_at
    BEFORE UPDATE ON public.maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_updated_at();


-- 9. Trigger de Auto-atualização de Status do Cômodo conforme Manutenções
CREATE OR REPLACE FUNCTION sync_room_status_on_maintenance_change()
RETURNS TRIGGER AS $$
DECLARE
    v_room_id UUID;
    v_urgent_count INTEGER;
    v_open_count INTEGER;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_room_id := OLD.room_id;
    ELSE
        v_room_id := NEW.room_id;
    END IF;

    -- Contar manutenções ativas urgentes e gerais
    SELECT 
        COUNT(*) FILTER (WHERE priority = 'URGENTE' AND status IN ('IDENTIFICADA', 'PLANEJADA', 'AGUARDANDO', 'EM_ANDAMENTO')),
        COUNT(*) FILTER (WHERE status IN ('IDENTIFICADA', 'PLANEJADA', 'AGUARDANDO', 'EM_ANDAMENTO'))
    INTO v_urgent_count, v_open_count
    FROM public.maintenance_records
    WHERE room_id = v_room_id AND is_deleted = false;

    -- Se há urgente aberta, marca cômodo com manutenção necessária
    IF v_urgent_count > 0 THEN
        UPDATE public.property_rooms 
        SET status = 'MANUTENCAO_NECESSARIA', updated_at = NOW()
        WHERE id = v_room_id AND status != 'INTERDITADO' AND status != 'EM_REFORMA';
    ELSIF v_open_count = 0 THEN
        UPDATE public.property_rooms
        SET status = 'OPERACIONAL', updated_at = NOW()
        WHERE id = v_room_id AND status = 'MANUTENCAO_NECESSARIA';
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_room_status ON public.maintenance_records;
CREATE TRIGGER trg_sync_room_status
    AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION sync_room_status_on_maintenance_change();


-- 10. Habilitar RLS (Row Level Security) em Todas as Novas Tabelas
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_purchases ENABLE ROW LEVEL SECURITY;


-- 11. Políticas de Acesso RLS
DROP POLICY IF EXISTS "Permissao total room_types" ON public.room_types;
CREATE POLICY "Permissao total room_types" ON public.room_types
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao total property_rooms" ON public.property_rooms;
CREATE POLICY "Permissao total property_rooms" ON public.property_rooms
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao total maintenance_records" ON public.maintenance_records;
CREATE POLICY "Permissao total maintenance_records" ON public.maintenance_records
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao total maintenance_images" ON public.maintenance_images;
CREATE POLICY "Permissao total maintenance_images" ON public.maintenance_images
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao total maintenance_purchases" ON public.maintenance_purchases;
CREATE POLICY "Permissao total maintenance_purchases" ON public.maintenance_purchases
FOR ALL USING (true) WITH CHECK (true);


-- 12. Storage Bucket para Fotos de Cômodos e Manutenções
INSERT INTO storage.buckets (id, name, public)
VALUES ('property_rooms', 'property_rooms', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance_images', 'maintenance_images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
DROP POLICY IF EXISTS "Acesso público fotos comodos" ON storage.objects;
CREATE POLICY "Acesso público fotos comodos"
ON storage.objects FOR ALL
USING (bucket_id IN ('property_rooms', 'maintenance_images', 'chacaras'))
WITH CHECK (bucket_id IN ('property_rooms', 'maintenance_images', 'chacaras'));
