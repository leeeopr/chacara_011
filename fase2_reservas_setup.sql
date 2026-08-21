-- =================================================================================
-- FASE 2: SISTEMA DE RESERVAS - SCRIPT SQL SUPABASE DEFENSIVO
-- Arquitetura Pronta para Produção e Futuras Extensões (Financeiro, Automação, Checklists)
-- =================================================================================

-- 1. Habilitar Extensão btree_gist (Necessária para Constraints de Exclusão Sem Sobreposição no PostgreSQL)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. ENUMS DA FASE 2

-- Status da Reserva (Ciclo de Vida Completo)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
        CREATE TYPE reservation_status AS ENUM (
            'PRE_RESERVA',             -- Cotação / Bloqueio temporário com expiração
            'AGUARDANDO_CONFIRMACAO',  -- Sinal pago ou aguardando aprovação
            'CONFIRMADA',              -- Reserva confirmada e garantida
            'CHECKIN_REALIZADO',       -- Cliente deu entrada na chácara
            'HOSPEDADO',               -- Estadia em andamento
            'CHECKOUT_REALIZADO',      -- Cliente saiu da chácara
            'FINALIZADA',              -- Estadia concluída sem pendências
            'CANCELADA',               -- Reserva cancelada
            'NO_SHOW'                  -- Cliente não compareceu
        );
    END IF;
END $$;

-- Origem da Reserva (Canais de Atendimento)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_origin') THEN
        CREATE TYPE reservation_origin AS ENUM (
            'WHATSAPP',
            'INSTAGRAM',
            'AIRBNB',
            'BOOKING',
            'SITE_DIRETO',
            'INDICACAO',
            'TELEFONE',
            'OUTRO'
        );
    END IF;
END $$;

-- Motivos de Bloqueio Administrativo
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'block_reason') THEN
        CREATE TYPE block_reason AS ENUM (
            'MANUTENCAO',
            'USO_PROPRIETARIO',
            'RESERVA_EXTERNA_MANUAL',
            'REFORMA',
            'OUTRO'
        );
    END IF;
END $$;


-- 3. TABELA DE CLIENTES / HÓSPEDES RESPONSÁVEIS (CRM Base)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    document_number TEXT, -- CPF ou CNPJ
    rg_number TEXT,        -- RG ou Passaporte
    email TEXT,
    phone TEXT NOT NULL,   -- WhatsApp / Celular Principal
    secondary_phone TEXT,
    
    -- Endereço Completo
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state VARCHAR(2),
    zip_code TEXT,
    
    -- Perfil e Preferências
    notes TEXT,
    tags TEXT[] DEFAULT '{}', -- Ex: ['VIP', 'RECORRENTE', 'CUIDADOS_PET']
    is_blacklisted BOOLEAN DEFAULT false NOT NULL,
    blacklist_reason TEXT,
    
    -- Métricas Consolidadas (Atualizadas via Triggers no futuro)
    total_reservations INTEGER DEFAULT 0 NOT NULL,
    total_spent NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Garantir colunas em clients caso a tabela já exista
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS document_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS rg_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS secondary_phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state VARCHAR(2);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_reservations INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_spent NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();


-- 4. TABELA PRINCIPAL DE RESERVAS
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE RESTRICT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT NOT NULL,
    
    -- Código Curto Amigável para o Usuário (Ex: RES-8492)
    code VARCHAR(12) UNIQUE NOT NULL DEFAULT ('RES-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6))),
    
    -- Período da Reserva
    checkin_date DATE NOT NULL,
    checkin_time TIME DEFAULT '14:00'::time NOT NULL,
    checkout_date DATE NOT NULL,
    checkout_time TIME DEFAULT '12:00'::time NOT NULL,
    
    -- Intervalo de Tempo UTC para Validação de Sobreposição Indiscutível (GIST Exclude)
    booking_period TSTZRANGE NOT NULL,
    
    -- Ocupação
    guests_adults INTEGER DEFAULT 1 NOT NULL,
    guests_children INTEGER DEFAULT 0 NOT NULL,
    guests_infants INTEGER DEFAULT 0 NOT NULL,
    guests_pets INTEGER DEFAULT 0 NOT NULL,
    total_guests INTEGER GENERATED ALWAYS AS (guests_adults + guests_children) STORED,
    
    -- Status e Origem
    status reservation_status DEFAULT 'PRE_RESERVA'::reservation_status NOT NULL,
    origin reservation_origin DEFAULT 'WHATSAPP'::reservation_origin NOT NULL,
    external_reference_id TEXT, -- Ex: Código do Airbnb ou Booking
    
    -- Expiração de Pré-Reserva
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Check-in & Check-out Executados (Real)
    actual_checkin_at TIMESTAMP WITH TIME ZONE,
    actual_checkin_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    checkin_notes TEXT,
    
    actual_checkout_at TIMESTAMP WITH TIME ZONE,
    actual_checkout_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    checkout_notes TEXT,
    
    -- Congelamento de Histórico (Snapshots da Chácara)
    chacara_snapshot JSONB DEFAULT '{}'::jsonb NOT NULL, -- Capacidade, Regras, Comodidades congeladas no momento da reserva
    
    -- Campos Estruturais para os Próximos Módulos (Financeiro, Automação, iCal)
    financial_summary JSONB DEFAULT '{
        "daily_rate_applied": 0.00,
        "cleaning_fee": 0.00,
        "deposit_amount": 0.00,
        "total_amount": 0.00,
        "paid_amount": 0.00,
        "payment_status": "PENDENTE"
    }'::jsonb NOT NULL,
    
    -- Cancelamento
    canceled_at TIMESTAMP WITH TIME ZONE,
    canceled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cancel_reason TEXT,
    cancellation_fee NUMERIC(10, 2) DEFAULT 0.00,
    
    -- Observações e Regras
    special_requests TEXT,
    internal_notes TEXT,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Validação: Checkout deve ser posterior ao Checkin
    CONSTRAINT chk_dates_valid CHECK (checkout_date >= checkin_date)
);

-- Garantir colunas em reservations caso a tabela já exista
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS chacara_id UUID REFERENCES public.chacaras(id) ON DELETE RESTRICT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS code VARCHAR(12);
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS checkin_date DATE;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS checkin_time TIME DEFAULT '14:00'::time;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS checkout_date DATE;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS checkout_time TIME DEFAULT '12:00'::time;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS booking_period TSTZRANGE;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS guests_adults INTEGER DEFAULT 1;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS guests_children INTEGER DEFAULT 0;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS guests_infants INTEGER DEFAULT 0;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS guests_pets INTEGER DEFAULT 0;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS status reservation_status DEFAULT 'PRE_RESERVA'::reservation_status;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS origin reservation_origin DEFAULT 'WHATSAPP'::reservation_origin;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS external_reference_id TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS actual_checkin_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS actual_checkin_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS checkin_notes TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS actual_checkout_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS actual_checkout_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS checkout_notes TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS chacara_snapshot JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS financial_summary JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS canceled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS special_requests TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();


-- 5. TABELA DE LISTA DE HÓSPEDES DA RESERVA (Controle de Portaria e Segurança)
CREATE TABLE IF NOT EXISTS public.reservation_guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    document_number TEXT, -- CPF / RG
    is_responsible BOOLEAN DEFAULT false NOT NULL,
    is_child BOOLEAN DEFAULT false NOT NULL,
    vehicle_plate TEXT, -- Placa de veículo para liberação na portaria
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);


-- 6. TABELA DE BLOQUEIOS ADMINISTRATIVOS DA CHÁCARA (Manutenções / Uso dos Donos)
CREATE TABLE IF NOT EXISTS public.chacara_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    block_period TSTZRANGE NOT NULL,
    reason block_reason DEFAULT 'MANUTENCAO'::block_reason NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);


-- 7. TABELA DE HISTÓRICO E AUDITORIA DA RESERVA
CREATE TABLE IF NOT EXISTS public.reservation_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL, -- Ex: 'CRIACAO', 'ALTERACAO_DATA', 'MUDANCA_STATUS', 'CANCELAMENTO'
    previous_status reservation_status,
    new_status reservation_status,
    changed_fields JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);


-- 8. TRIGGER AUTOMÁTICO PARA POPULAR O TSTZRANGE (booking_period) E ATUALIZAR TIMESTAMP
CREATE OR REPLACE FUNCTION process_reservation_booking_period()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcula o timestamp UTC exato de checkin e checkout
    NEW.booking_period := tstzrange(
        (NEW.checkin_date || ' ' || NEW.checkin_time)::timestamp with time zone,
        (NEW.checkout_date || ' ' || NEW.checkout_time)::timestamp with time zone,
        '[)' -- Inclui inicio, exclui fim para permitir checkout e checkin no mesmo dia em horarios diferentes
    );
    
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reservations_booking_period ON public.reservations;
CREATE TRIGGER trg_reservations_booking_period
    BEFORE INSERT OR UPDATE ON public.reservations
    FOR EACH ROW
    EXECUTE FUNCTION process_reservation_booking_period();

-- Trigger para chacara_blocks
CREATE OR REPLACE FUNCTION process_block_period()
RETURNS TRIGGER AS $$
BEGIN
    NEW.block_period := tstzrange(
        (NEW.start_date || ' 00:00:00')::timestamp with time zone,
        (NEW.end_date || ' 23:59:59')::timestamp with time zone,
        '[]'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chacara_blocks_period ON public.chacara_blocks;
CREATE TRIGGER trg_chacara_blocks_period
    BEFORE INSERT OR UPDATE ON public.chacara_blocks
    FOR EACH ROW
    EXECUTE FUNCTION process_block_period();


-- 9. FUNÇÃO DE DBO / CHECAGEM DE CONFLITO DE DATAS (Utilizada pelo Frontend / API antes do Insert)
CREATE OR REPLACE FUNCTION check_chacara_availability(
    p_chacara_id UUID,
    p_checkin_date DATE,
    p_checkin_time TIME,
    p_checkout_date DATE,
    p_checkout_time TIME,
    p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS TABLE (
    is_available BOOLEAN,
    conflict_type TEXT,
    conflict_code VARCHAR
) AS $$
DECLARE
    v_requested_range TSTZRANGE;
    v_has_res_conflict BOOLEAN;
    v_has_block_conflict BOOLEAN;
BEGIN
    v_requested_range := tstzrange(
        (p_checkin_date || ' ' || p_checkin_time)::timestamp with time zone,
        (p_checkout_date || ' ' || p_checkout_time)::timestamp with time zone,
        '[)'
    );

    -- Verifica conflito com outras reservas ativas
    SELECT EXISTS (
        SELECT 1 FROM public.reservations
        WHERE chacara_id = p_chacara_id
          AND is_deleted = false
          AND status NOT IN ('CANCELADA', 'NO_SHOW')
          AND (p_exclude_reservation_id IS NULL OR id != p_exclude_reservation_id)
          AND booking_period && v_requested_range
    ) INTO v_has_res_conflict;

    IF v_has_res_conflict THEN
        RETURN QUERY SELECT false, 'RESERVA_EXISTENTE', 'CONFLICT_RESERVATION';
        RETURN;
    END IF;

    -- Verifica conflito com bloqueios administrativos
    SELECT EXISTS (
        SELECT 1 FROM public.chacara_blocks
        WHERE chacara_id = p_chacara_id
          AND block_period && v_requested_range
    ) INTO v_has_block_conflict;

    IF v_has_block_conflict THEN
        RETURN QUERY SELECT false, 'BLOQUEIO_ADMINISTRATIVO', 'CONFLICT_BLOCK';
        RETURN;
    END IF;

    RETURN QUERY SELECT true, 'DISPONIVEL', 'OK';
END;
$$ LANGUAGE plpgsql;


-- 10. ÍNDICES DE DESEMPENHO E BUSCA RÁPIDA
CREATE INDEX IF NOT EXISTS idx_reservations_chacara_status ON public.reservations(chacara_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_client_id ON public.reservations(client_id);
CREATE INDEX IF NOT EXISTS idx_reservations_checkin_date ON public.reservations(checkin_date);
CREATE INDEX IF NOT EXISTS idx_reservations_checkout_date ON public.reservations(checkout_date);
CREATE INDEX IF NOT EXISTS idx_reservations_code ON public.reservations(code);

-- Índice GIST para consultas ultra-rápidas por período em mapas/calendários
CREATE INDEX IF NOT EXISTS idx_reservations_booking_period ON public.reservations USING GIST (booking_period);
CREATE INDEX IF NOT EXISTS idx_chacara_blocks_period ON public.chacara_blocks USING GIST (block_period);

CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_document_number ON public.clients(document_number);
CREATE INDEX IF NOT EXISTS idx_reservation_guests_res_id ON public.reservation_guests(reservation_id);


-- 11. POLÍTICAS RLS (ROW LEVEL SECURITY) SUPABASE
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chacara_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users full access to clients" ON public.clients;
CREATE POLICY "Authenticated users full access to clients" 
ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access to reservations" ON public.reservations;
CREATE POLICY "Authenticated users full access to reservations" 
ON public.reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access to reservation_guests" ON public.reservation_guests;
CREATE POLICY "Authenticated users full access to reservation_guests" 
ON public.reservation_guests FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access to chacara_blocks" ON public.chacara_blocks;
CREATE POLICY "Authenticated users full access to chacara_blocks" 
ON public.chacara_blocks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access to reservation_history" ON public.reservation_history;
CREATE POLICY "Authenticated users full access to reservation_history" 
ON public.reservation_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
