-- =================================================================================
-- FASE 1: GESTÃO DE CHÁCARAS - SCRIPT SQL SUPABASE
-- Correção e Instalação Defensiva (evita o erro "column document_number does not exist")
-- =================================================================================

-- 1. Criar Tabela de Proprietários (Owners) se não existir
CREATE TABLE IF NOT EXISTS public.owners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    document_number TEXT, -- CPF / CNPJ
    email TEXT,
    phone TEXT,
    bank_info JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Garantir que a coluna document_number e outras colunas existam caso a tabela já tenha sido criada previamente sem elas
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS document_number TEXT;
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS bank_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Enum para Status da Chácara (Opcional ou via Constraint TEXT)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chacara_status') THEN
        CREATE TYPE chacara_status AS ENUM ('ATIVA', 'INATIVA', 'EM_MANUTENCAO', 'INTERDITADA', 'VENDIDA', 'OUTRO');
    END IF;
END $$;

-- 3. Criar Tabela Principal de Chácaras
CREATE TABLE IF NOT EXISTS public.chacaras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status chacara_status DEFAULT 'ATIVA'::chacara_status NOT NULL,
    
    -- Endereço Estruturado
    street TEXT,
    neighborhood TEXT,
    city TEXT,
    state VARCHAR(2),
    zip_code TEXT,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    
    -- Capacidade e Comodidades (Estrutura)
    capacity_people INTEGER DEFAULT 0 NOT NULL,
    bedrooms_count INTEGER DEFAULT 0 NOT NULL,
    bathrooms_count INTEGER DEFAULT 0 NOT NULL,
    has_pool BOOLEAN DEFAULT false NOT NULL,
    has_barbecue BOOLEAN DEFAULT false NOT NULL,
    has_event_hall BOOLEAN DEFAULT false NOT NULL,
    has_wifi BOOLEAN DEFAULT false NOT NULL,
    has_air_conditioning BOOLEAN DEFAULT false NOT NULL,
    has_equipped_kitchen BOOLEAN DEFAULT false NOT NULL,
    
    -- Regras e Horários
    rules TEXT,
    checkin_time TIME DEFAULT '14:00'::time,
    checkout_time TIME DEFAULT '12:00'::time,
    
    -- Preços Base e Financeiro Mínimo
    daily_rate_standard NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    daily_rate_weekend NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    deposit_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    cleaning_fee NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    
    -- Foto Principal (Atalho)
    main_photo_url TEXT,
    notes TEXT,
    
    -- Auditoria e Controle
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Garantir todas as colunas em public.chacaras caso a tabela já tenha sido criada previamente
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS status chacara_status DEFAULT 'ATIVA'::chacara_status;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS state VARCHAR(2);
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8);
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS capacity_people INTEGER DEFAULT 0;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS bedrooms_count INTEGER DEFAULT 0;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS bathrooms_count INTEGER DEFAULT 0;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS has_pool BOOLEAN DEFAULT false;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS has_barbecue BOOLEAN DEFAULT false;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS has_event_hall BOOLEAN DEFAULT false;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS has_wifi BOOLEAN DEFAULT false;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS has_air_conditioning BOOLEAN DEFAULT false;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS has_equipped_kitchen BOOLEAN DEFAULT false;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS rules TEXT;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS checkin_time TIME DEFAULT '14:00'::time;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS checkout_time TIME DEFAULT '12:00'::time;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS daily_rate_standard NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS daily_rate_weekend NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS cleaning_fee NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS main_photo_url TEXT;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Criar Tabela de Fotos da Chácara
CREATE TABLE IF NOT EXISTS public.chacara_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    is_main BOOLEAN DEFAULT false NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Criar Tabela de Funcionários Responsáveis
CREATE TABLE IF NOT EXISTS public.chacara_staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- Ex: 'PISCINEIRO', 'JARDINEIRO', 'FAXINEIRA', 'ADMINISTRADOR', 'MANUTENCAO'
    phone TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Índices para Alto Desempenho
CREATE INDEX IF NOT EXISTS idx_chacaras_owner_id ON public.chacaras(owner_id);
CREATE INDEX IF NOT EXISTS idx_chacaras_status ON public.chacaras(status);
CREATE INDEX IF NOT EXISTS idx_chacaras_is_deleted ON public.chacaras(is_deleted);
CREATE INDEX IF NOT EXISTS idx_chacara_photos_chacara_id ON public.chacara_photos(chacara_id);
CREATE INDEX IF NOT EXISTS idx_chacara_staff_chacara_id ON public.chacara_staff(chacara_id);

-- 7. Trigger para Atualização Automática do updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_owners_updated_at ON public.owners;
CREATE TRIGGER trg_owners_updated_at
    BEFORE UPDATE ON public.owners
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trg_chacaras_updated_at ON public.chacaras;
CREATE TRIGGER trg_chacaras_updated_at
    BEFORE UPDATE ON public.chacaras
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 8. Habilitar RLS (Row Level Security)
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chacaras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chacara_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chacara_staff ENABLE ROW LEVEL SECURITY;

-- 9. Políticas RLS Básicas (Permitir acesso total para usuários autenticados)
DROP POLICY IF EXISTS "Authenticated users full access to owners" ON public.owners;
CREATE POLICY "Authenticated users full access to owners" 
ON public.owners FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access to chacaras" ON public.chacaras;
CREATE POLICY "Authenticated users full access to chacaras" 
ON public.chacaras FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access to chacara_photos" ON public.chacara_photos;
CREATE POLICY "Authenticated users full access to chacara_photos" 
ON public.chacara_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access to chacara_staff" ON public.chacara_staff;
CREATE POLICY "Authenticated users full access to chacara_staff" 
ON public.chacara_staff FOR ALL TO authenticated USING (true) WITH CHECK (true);
