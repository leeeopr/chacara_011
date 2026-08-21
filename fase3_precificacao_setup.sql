-- =================================================================================
-- FASE 3: PRECIFICAÇÃO E VALORES DAS RESERVAS - SCRIPT SQL SUPABASE
-- Infraestrutura para Precificação Dinâmica, Regras de Preço, Taxas e Auditoria
-- =================================================================================

-- 1. ATUALIZAR TABELA PUBLIC.CHACARAS COM NOVOS CAMPOS DE VALORES BASE E CAPACIDADE
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS daily_rate_standard NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS daily_rate_weekend NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS daily_rate_holiday NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS cleaning_fee NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS extra_guest_fee NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS included_guests INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS allow_pets BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS pet_fee NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS energy_fee NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS event_fee NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.chacaras ADD COLUMN IF NOT EXISTS financial_notes TEXT;

-- 2. TABELA DE REGRAS DE PRECIFICAÇÃO DINÂMICA (CHACARA_PRICING_RULES)
CREATE TABLE IF NOT EXISTS public.chacara_pricing_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chacara_id UUID NOT NULL REFERENCES public.chacaras(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rule_type TEXT DEFAULT 'SPECIFIC_PERIOD' NOT NULL, -- 'SPECIFIC_PERIOD', 'HIGH_SEASON', 'LOW_SEASON', 'HOLIDAY_PACKAGE', 'PROMOTION', 'SURCHARGE', 'WEEKDAY_SPECIAL'
    start_date DATE,
    end_date DATE,
    days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}'::integer[], -- 0=Domingo, 1=Segunda ... 6=Sábado
    price_override NUMERIC(10, 2), -- Valor fixo da diária quando ativa
    discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    surcharge_percentage NUMERIC(5, 2) DEFAULT 0.00,
    surcharge_amount NUMERIC(10, 2) DEFAULT 0.00,
    min_stay_nights INTEGER DEFAULT 1 NOT NULL,
    min_reservation_value NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    priority INTEGER DEFAULT 10 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Criar índices para busca rápida de regras por chácara e intervalo de datas
CREATE INDEX IF NOT EXISTS idx_chacara_pricing_rules_chacara_id ON public.chacara_pricing_rules(chacara_id);
CREATE INDEX IF NOT EXISTS idx_chacara_pricing_rules_dates ON public.chacara_pricing_rules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_chacara_pricing_rules_active ON public.chacara_pricing_rules(is_active);

-- 3. TABELA DE LOGS DE AUDITORIA DE PREÇOS E AJUSTES MANUAIS (PRICING_AUDIT_LOGS)
CREATE TABLE IF NOT EXISTS public.pricing_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'BASE_PRICING_UPDATE', 'RULE_CREATE', 'RULE_UPDATE', 'RULE_DELETE', 'MANUAL_RESERVATION_ADJUSTMENT'
    old_value JSONB DEFAULT '{}'::jsonb,
    new_value JSONB DEFAULT '{}'::jsonb,
    reason TEXT,
    performed_by_name TEXT,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pricing_audit_logs_chacara ON public.pricing_audit_logs(chacara_id);
CREATE INDEX IF NOT EXISTS idx_pricing_audit_logs_reservation ON public.pricing_audit_logs(reservation_id);
CREATE INDEX IF NOT EXISTS idx_pricing_audit_logs_created_at ON public.pricing_audit_logs(created_at DESC);

-- 4. DESATIVAR OU AJUSTAR RLS PARA ACESSO DIRETO SEM BLOQUEIOS
ALTER TABLE public.chacara_pricing_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_audit_logs DISABLE ROW LEVEL SECURITY;

-- Politicas permissivas caso RLS seja reativado no futuro
DROP POLICY IF EXISTS "Permitir tudo em chacara_pricing_rules" ON public.chacara_pricing_rules;
CREATE POLICY "Permitir tudo em chacara_pricing_rules" ON public.chacara_pricing_rules FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em pricing_audit_logs" ON public.pricing_audit_logs;
CREATE POLICY "Permitir tudo em pricing_audit_logs" ON public.pricing_audit_logs FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. TRIGGER DE ATUALIZAÇÃO AUTOMÁTICA DE UPDATED_AT
CREATE OR REPLACE FUNCTION update_fase3_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_chacara_pricing_rules_updated_at ON public.chacara_pricing_rules;
CREATE TRIGGER trigger_chacara_pricing_rules_updated_at
BEFORE UPDATE ON public.chacara_pricing_rules
FOR EACH ROW EXECUTE FUNCTION update_fase3_timestamp();
