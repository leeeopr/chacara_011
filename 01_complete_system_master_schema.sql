-- =================================================================================
-- SCRIPT MASTER SUPABASE - ESTRUTURA COMPLETA DE PRODUÇÃO (SEM DADOS MOCK)
-- SISTEMA DE GESTÃO DE CHÁCARAS, RESERVAS, PRECIFICAÇÃO, OPERAÇÕES, EQUIPE E FINANCEIRO
-- =================================================================================

-- 0. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------------
-- 1. EMPRESAS E CONVÊNIOS (COMPANIES)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    limit_value NUMERIC(12, 2) DEFAULT 0.00,
    limit_type TEXT DEFAULT 'NONE' CHECK (limit_type IN ('NONE', 'DAILY', 'MONTHLY', 'TOTAL')),
    block_on_limit BOOLEAN DEFAULT true,
    document_number TEXT,
    phone TEXT,
    email TEXT,
    billing_day INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);

-- ---------------------------------------------------------------------------------
-- 2. PROPRIETÁRIOS E CHÁCARAS (OWNERS & CHACARAS)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    document_number TEXT,
    email TEXT,
    phone TEXT,
    bank_info JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chacara_status') THEN
        CREATE TYPE chacara_status AS ENUM ('ATIVA', 'INATIVA', 'EM_MANUTENCAO', 'INTERDITADA', 'VENDIDA', 'OUTRO');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.chacaras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status chacara_status DEFAULT 'ATIVA'::chacara_status NOT NULL,
    
    street TEXT,
    neighborhood TEXT,
    city TEXT,
    state VARCHAR(2) DEFAULT 'SP',
    zip_code TEXT,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    
    capacity_people INTEGER DEFAULT 0 NOT NULL,
    bedrooms_count INTEGER DEFAULT 0 NOT NULL,
    bathrooms_count INTEGER DEFAULT 0 NOT NULL,
    has_pool BOOLEAN DEFAULT false NOT NULL,
    has_barbecue BOOLEAN DEFAULT false NOT NULL,
    has_event_hall BOOLEAN DEFAULT false NOT NULL,
    has_wifi BOOLEAN DEFAULT false NOT NULL,
    has_air_conditioning BOOLEAN DEFAULT false NOT NULL,
    has_equipped_kitchen BOOLEAN DEFAULT false NOT NULL,
    
    rules TEXT,
    checkin_time TIME DEFAULT '14:00'::time,
    checkout_time TIME DEFAULT '12:00'::time,
    
    daily_rate_standard NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    daily_rate_weekend NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    deposit_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    cleaning_fee NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    
    main_photo_url TEXT,
    notes TEXT,
    
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chacara_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    is_main BOOLEAN DEFAULT false NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chacaras_owner_id ON public.chacaras(owner_id);
CREATE INDEX IF NOT EXISTS idx_chacaras_status ON public.chacaras(status);
CREATE INDEX IF NOT EXISTS idx_chacaras_is_deleted ON public.chacaras(is_deleted);
CREATE INDEX IF NOT EXISTS idx_chacara_photos_chacara_id ON public.chacara_photos(chacara_id);

-- ---------------------------------------------------------------------------------
-- 3. REGRAS DE PRECIFICAÇÃO (PRICING)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    appointment_type_id UUID,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chacara_pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    rule_type TEXT NOT NULL DEFAULT 'SPECIFIC_PERIOD',
    start_date DATE,
    end_date DATE,
    days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
    price_override NUMERIC(12, 2),
    discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    surcharge_percentage NUMERIC(5, 2) DEFAULT 0.00,
    surcharge_amount NUMERIC(12, 2) DEFAULT 0.00,
    min_stay_nights INTEGER DEFAULT 1,
    min_reservation_value NUMERIC(12, 2) DEFAULT 0.00,
    priority INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_company_prices_company_id ON public.company_prices(company_id);
CREATE INDEX IF NOT EXISTS idx_chacara_pricing_rules_chacara_id ON public.chacara_pricing_rules(chacara_id);

-- ---------------------------------------------------------------------------------
-- 4. CLIENTES E HÓSPEDES (CLIENTS)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    document_number TEXT,
    rg_number TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    secondary_phone TEXT,
    
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state VARCHAR(2),
    zip_code TEXT,
    
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    is_blacklisted BOOLEAN DEFAULT false NOT NULL,
    blacklist_reason TEXT,
    
    total_reservations INTEGER DEFAULT 0 NOT NULL,
    total_spent NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_document_number ON public.clients(document_number);

-- ---------------------------------------------------------------------------------
-- 5. RESERVAS E PRÉ-RESERVAS (RESERVATIONS)
-- ---------------------------------------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
        CREATE TYPE reservation_status AS ENUM (
            'PRE_RESERVA',
            'AGUARDANDO_CONFIRMACAO',
            'CONFIRMADA',
            'CHECKIN_REALIZADO',
            'HOSPEDADO',
            'CHECKOUT_REALIZADO',
            'FINALIZADA',
            'CANCELADA',
            'NO_SHOW'
        );
    END IF;
END $$;

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

CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE RESTRICT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    
    code VARCHAR(12) UNIQUE NOT NULL DEFAULT ('RES-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6))),
    
    checkin_date DATE NOT NULL,
    checkin_time TIME DEFAULT '14:00'::time NOT NULL,
    checkout_date DATE NOT NULL,
    checkout_time TIME DEFAULT '12:00'::time NOT NULL,
    booking_period TSTZRANGE,
    
    guests_adults INTEGER DEFAULT 1 NOT NULL,
    guests_children INTEGER DEFAULT 0 NOT NULL,
    guests_infants INTEGER DEFAULT 0 NOT NULL,
    guests_pets INTEGER DEFAULT 0 NOT NULL,
    
    status reservation_status DEFAULT 'PRE_RESERVA'::reservation_status NOT NULL,
    origin reservation_origin DEFAULT 'WHATSAPP'::reservation_origin NOT NULL,
    external_reference_id TEXT,
    
    expires_at TIMESTAMP WITH TIME ZONE,
    actual_checkin_at TIMESTAMP WITH TIME ZONE,
    checkin_notes TEXT,
    actual_checkout_at TIMESTAMP WITH TIME ZONE,
    checkout_notes TEXT,
    
    chacara_snapshot JSONB DEFAULT '{}'::jsonb NOT NULL,
    financial_summary JSONB DEFAULT '{}'::jsonb NOT NULL,
    
    canceled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    cancellation_fee NUMERIC(12, 2) DEFAULT 0.00,
    
    special_requests TEXT,
    internal_notes TEXT,
    
    primary_staff_id UUID,
    staff_ids UUID[] DEFAULT '{}',
    staff_names TEXT[] DEFAULT '{}',
    custom_price NUMERIC(12, 2),
    is_custom_price BOOLEAN DEFAULT false,
    created_by TEXT,
    
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    CONSTRAINT chk_dates_valid CHECK (checkout_date >= checkin_date)
);

CREATE TABLE IF NOT EXISTS public.reservation_guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    document_number TEXT,
    is_responsible BOOLEAN DEFAULT false NOT NULL,
    is_child BOOLEAN DEFAULT false NOT NULL,
    vehicle_plate TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reservations_chacara_status ON public.reservations(chacara_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_client_id ON public.reservations(client_id);
CREATE INDEX IF NOT EXISTS idx_reservations_checkin_date ON public.reservations(checkin_date);
CREATE INDEX IF NOT EXISTS idx_reservations_code ON public.reservations(code);

-- ---------------------------------------------------------------------------------
-- 6. FINANCEIRO GERAL & COBRANÇAS
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservation_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL UNIQUE,
    daily_rates_subtotal NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    cleaning_fee NUMERIC(12, 2) DEFAULT 0.00,
    deposit_amount NUMERIC(12, 2) DEFAULT 0.00,
    pet_fee NUMERIC(12, 2) DEFAULT 0.00,
    energy_fee NUMERIC(12, 2) DEFAULT 0.00,
    event_fee NUMERIC(12, 2) DEFAULT 0.00,
    extra_guests_fee NUMERIC(12, 2) DEFAULT 0.00,
    discounts_total NUMERIC(12, 2) DEFAULT 0.00,
    surcharges_total NUMERIC(12, 2) DEFAULT 0.00,
    manual_adjustment NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'EM_ABERTO' CHECK (status IN ('EM_ABERTO', 'PAGO_PARCIAL', 'PAGO_TOTAL', 'ATRASADO', 'CANCELADO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reservation_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
    charge_id UUID REFERENCES public.reservation_charges(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('PIX', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'TRANSFERENCIA', 'BOLETO', 'OUTRO')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reservation_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    refund_date DATE DEFAULT CURRENT_DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reservation_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL UNIQUE,
    deposit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'RECEBIDO', 'RETIDO', 'DEVOLVIDO_PARCIAL', 'DEVOLVIDO_TOTAL')),
    amount_retained NUMERIC(12, 2) DEFAULT 0.00,
    amount_refunded NUMERIC(12, 2) DEFAULT 0.00,
    retention_reason TEXT,
    received_date DATE,
    refunded_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('RECEITA', 'DESPESA')),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    status TEXT DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO', 'CANCELADO')),
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reservation_payments_res_id ON public.reservation_payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_financial_trans_chacara_id ON public.financial_transactions(chacara_id);

-- ---------------------------------------------------------------------------------
-- 7. RESERVA DE EMERGÊNCIA & FUNDO DE MANUTENÇÃO (20% AUTO-APORTE)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Reserva de Emergência',
    description TEXT NOT NULL DEFAULT 'Fundo destinado exclusivamente a despesas inesperadas, danos estruturais, manutenções emergenciais e reparos na infraestrutura das chácaras.',
    default_percentage NUMERIC(5, 2) NOT NULL DEFAULT 20.00 CHECK (default_percentage >= 0 AND default_percentage <= 100),
    current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'PAUSADO', 'BLOQUEADO')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.emergency_funds (id, name, description, default_percentage, current_balance, status)
SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Reserva de Emergência',
    'Fundo destinado exclusivamente a despesas inesperadas, danos estruturais e reparos.',
    20.00,
    0.00,
    'ATIVO'
WHERE NOT EXISTS (SELECT 1 FROM public.emergency_funds LIMIT 1);

CREATE TABLE IF NOT EXISTS public.emergency_fund_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID REFERENCES public.emergency_funds(id) ON DELETE CASCADE NOT NULL,
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.reservation_payments(id) ON DELETE SET NULL,
    refund_id UUID REFERENCES public.reservation_refunds(id) ON DELETE SET NULL,
    
    transaction_type TEXT NOT NULL CHECK (
        transaction_type IN (
            'APORTE_AUTOMATICO',
            'APORTE_MANUAL',
            'RETIRADA_DESPESA',
            'ESTORNO_REEMBOLSO',
            'AJUSTE_MANUAL'
        )
    ),
    
    amount NUMERIC(12, 2) NOT NULL,
    gross_amount NUMERIC(12, 2),
    percentage_applied NUMERIC(5, 2),
    balance_after NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    category TEXT DEFAULT 'INFRAESTRUTURA_EMERGENCIAL',
    description TEXT NOT NULL,
    performed_by TEXT DEFAULT 'Sistema / Administrador',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_emergency_trans_fund_id ON public.emergency_fund_transactions(fund_id);
CREATE INDEX IF NOT EXISTS idx_emergency_trans_created_at ON public.emergency_fund_transactions(created_at);

-- ---------------------------------------------------------------------------------
-- 8. EQUIPE OPERACIONAL & FUNÇÕES (CREW)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crew_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cor TEXT NOT NULL DEFAULT '#10B981',
    icone TEXT DEFAULT 'Sparkles',
    descricao TEXT,
    ativo BOOLEAN DEFAULT true NOT NULL,
    ordem_exibicao INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.crew_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    telefone TEXT,
    whatsapp TEXT,
    email TEXT,
    documento TEXT,
    chave_pix TEXT,
    foto_url TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true NOT NULL,
    data_admissao DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.crew_member_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.crew_members(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.crew_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.property_crew (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.crew_members(id) ON DELETE CASCADE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.crew_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.crew_members(id) ON DELETE SET NULL,
    role_id UUID REFERENCES public.crew_roles(id) ON DELETE SET NULL,
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
    operation TEXT,
    details TEXT,
    performed_by TEXT DEFAULT 'Administrador',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ---------------------------------------------------------------------------------
-- 9. BLOQUEIOS DE CALENDÁRIO (CHACARA BLOCKS)
-- ---------------------------------------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'block_reason') THEN
        CREATE TYPE block_reason AS ENUM ('MANUTENCAO', 'USO_PROPRIETARIO', 'RESERVA_EXTERNA_MANUAL', 'REFORMA', 'OUTRO');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.chacara_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    block_period TSTZRANGE,
    reason block_reason DEFAULT 'MANUTENCAO'::block_reason NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chacara_block_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID REFERENCES public.chacara_blocks(id) ON DELETE CASCADE NOT NULL,
    author TEXT NOT NULL DEFAULT 'Sistema',
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chacara_blocks_chacara_id ON public.chacara_blocks(chacara_id);

-- ---------------------------------------------------------------------------------
-- 10. CALENDÁRIO OPERACIONAL & EVENTOS (OPERATIONAL CALENDAR)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operational_event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(100),
    color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    icon VARCHAR(50) NOT NULL DEFAULT 'Calendar',
    priority INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.operational_event_types (code, name, title, color, icon, priority, description, is_system, settings)
VALUES
  ('reserva', 'Reserva', 'Reserva', '#10B981', 'CalendarCheck', 10, 'Reserva confirmada de hóspedes', true, '{"block_schedule": true}'::jsonb),
  ('pre_reserva', 'Pré-reserva', 'Pré-reserva', '#F59E0B', 'Clock', 9, 'Pré-reserva aguardando confirmação ou sinal', true, '{"block_schedule": true}'::jsonb),
  ('bloqueio', 'Bloqueio', 'Bloqueio', '#6B7280', 'Ban', 10, 'Bloqueio de calendário por manutenção ou uso proprietário', true, '{"block_schedule": true}'::jsonb),
  ('check_in', 'Check-in', 'Check-in', '#06B6D4', 'LogIn', 8, 'Recepção e entrada de hóspedes', true, '{}'::jsonb),
  ('check_out', 'Check-out', 'Check-out', '#8B5CF6', 'LogOut', 8, 'Saída e vistoria final com hóspedes', true, '{}'::jsonb),
  ('limpeza', 'Limpeza', 'Limpeza', '#3B82F6', 'Sparkles', 7, 'Limpeza geral pós/pré checkout ou rotina', true, '{"releases_reservation": true}'::jsonb),
  ('piscina', 'Piscina', 'Piscina', '#0EA5E9', 'Waves', 6, 'Tratamento físico e químico de piscina', true, '{"logs_maintenance": true}'::jsonb),
  ('jardinagem', 'Jardinagem', 'Jardinagem', '#84CC16', 'Trees', 5, 'Corte de grama e jardinagem', true, '{}'::jsonb),
  ('manutencao', 'Manutenção', 'Manutenção', '#EF4444', 'Wrench', 7, 'Manutenção preventiva ou corretiva', true, '{"logs_maintenance": true}'::jsonb),
  ('inspecao', 'Inspeção', 'Inspeção', '#D97706', 'ClipboardCheck', 6, 'Inspeção técnica e de inventário', true, '{}'::jsonb),
  ('prestador_recorrente', 'Prestador Recorrente', 'Prestador Recorrente', '#6366F1', 'UserCheck', 5, 'Serviço prestado por equipe fixa', true, '{}'::jsonb),
  ('prestador_eventual', 'Prestador Eventual', 'Prestador Eventual', '#EC4899', 'Briefcase', 5, 'Visita avulsa pontual', true, '{}'::jsonb),
  ('reuniao', 'Reunião', 'Reunião', '#A855F7', 'Users', 4, 'Alinhamento de equipe operacional', true, '{}'::jsonb),
  ('vistoria', 'Vistoria', 'Vistoria', '#14B8A6', 'ShieldCheck', 7, 'Vistoria de entrada/saída de hóspedes', true, '{}'::jsonb),
  ('outro', 'Outro', 'Outro', '#9CA3AF', 'MoreHorizontal', 1, 'Eventos operacionais diversos', true, '{}'::jsonb)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, title = EXCLUDED.title, color = EXCLUDED.color, icon = EXCLUDED.icon, priority = EXCLUDED.priority, description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.staff_unavailability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.crew_members(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operational_recurrence_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE,
    event_type_id UUID REFERENCES public.operational_event_types(id) ON DELETE RESTRICT,
    event_type_code VARCHAR(50),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    frequency VARCHAR(30) DEFAULT 'SEMANAL',
    recurrence_interval INTEGER DEFAULT 1,
    days_of_week INTEGER[] DEFAULT '{1}',
    start_date DATE NOT NULL,
    end_date DATE,
    has_no_end_date BOOLEAN DEFAULT true,
    default_time_start TIME DEFAULT '08:00',
    default_time_end TIME DEFAULT '10:00',
    staff_ids UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operational_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE,
    event_type_id UUID REFERENCES public.operational_event_types(id) ON DELETE SET NULL,
    event_type_code VARCHAR(50),
    recurrence_rule_id UUID REFERENCES public.operational_recurrence_rules(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME DEFAULT '08:00',
    end_time TIME DEFAULT '10:00',
    status VARCHAR(30) DEFAULT 'AGENDADO',
    staff_ids UUID[] DEFAULT '{}',
    completed_at TIMESTAMPTZ,
    completed_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operational_events_chacara_date ON public.operational_events(chacara_id, start_date);

-- ---------------------------------------------------------------------------------
-- 11. EVENTOS EXCEPCIONAIS, COMPRAS & PENDÊNCIAS
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exceptional_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    event_type TEXT DEFAULT 'OUTRO',
    urgency TEXT DEFAULT 'MEDIA',
    assigned_crew_ids UUID[] DEFAULT '{}',
    status TEXT DEFAULT 'PENDENTE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.house_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity NUMERIC(10, 2) DEFAULT 1.00,
    unit_price NUMERIC(12, 2) DEFAULT 0.00,
    total_price NUMERIC(12, 2) DEFAULT 0.00,
    urgency TEXT DEFAULT 'MEDIA',
    status TEXT DEFAULT 'PENDENTE',
    requested_by TEXT DEFAULT 'Equipe',
    purchase_url TEXT,
    notes TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pendencias_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pendencias_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.pendencias_groups(id) ON DELETE SET NULL,
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'MEDIA',
    status TEXT DEFAULT 'A_FAZER',
    assigned_to TEXT,
    due_date DATE,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fiscal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
    document_type TEXT NOT NULL DEFAULT 'COMPROVANTE',
    amount NUMERIC(12, 2) NOT NULL,
    document_date DATE DEFAULT CURRENT_DATE NOT NULL,
    file_url TEXT,
    competence_month VARCHAR(7),
    tax_category TEXT DEFAULT 'ALUGUEL_TEMPORADA',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------------
-- 12. TRIGGERS DE PROCESSAMENTO AUTOMÁTICO
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_reservation_booking_period()
RETURNS TRIGGER AS $$
BEGIN
    NEW.booking_period := tstzrange(
        (NEW.checkin_date || ' ' || NEW.checkin_time)::timestamp with time zone,
        (NEW.checkout_date || ' ' || NEW.checkout_time)::timestamp with time zone,
        '[)'
    );
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reservations_booking_period ON public.reservations;
CREATE TRIGGER trg_reservations_booking_period
    BEFORE INSERT OR UPDATE ON public.reservations
    FOR EACH ROW
    EXECUTE FUNCTION process_reservation_booking_period();

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

-- ---------------------------------------------------------------------------------
-- 13. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ---------------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chacaras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chacara_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chacara_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_fund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chacara_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chacara_block_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exceptional_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendencias_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendencias_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------------
-- 14. COMPATIBILIDADE RETROATIVA (ALTER TABLES PARA TABELAS JÁ EXISTENTES)
-- ---------------------------------------------------------------------------------
ALTER TABLE public.reservations 
    ADD COLUMN IF NOT EXISTS primary_staff_id UUID,
    ADD COLUMN IF NOT EXISTS staff_ids UUID[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS staff_names TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS custom_price NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS is_custom_price BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_by TEXT;

-- ---------------------------------------------------------------------------------
-- 15. POLÍTICAS DE ACESSO RLS
-- ---------------------------------------------------------------------------------
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'companies', 'owners', 'chacaras', 'chacara_photos', 'company_prices',
        'chacara_pricing_rules', 'clients', 'reservations', 'reservation_guests',
        'reservation_charges', 'reservation_payments', 'reservation_refunds',
        'reservation_deposits', 'financial_transactions', 'emergency_funds',
        'emergency_fund_transactions', 'crew_roles', 'crew_members',
        'crew_member_roles', 'property_crew', 'crew_audit_logs', 'chacara_blocks',
        'chacara_block_notes', 'operational_event_types', 'staff_unavailability',
        'operational_recurrence_rules', 'operational_events', 'exceptional_events',
        'house_purchases', 'pendencias_groups', 'pendencias_tasks', 'fiscal_documents'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public access to %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Public access to %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
    END LOOP;
END $$;


