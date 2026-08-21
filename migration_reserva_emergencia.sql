-- =================================================================================
-- MIGRATION: RESERVA DE EMERGÊNCIA (FUNDO DE INFRAESTRUTURA E MANUTENÇÃO)
-- Sistema de Gestão Financeira de Chácaras
-- =================================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela Principal da Reserva de Emergência (Configuração e Saldo Consolidado)
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

-- Inserir registro singleton padrão se não existir
INSERT INTO public.emergency_funds (id, name, description, default_percentage, current_balance, status)
SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Reserva de Emergência',
    'Fundo destinado exclusivamente a despesas inesperadas, danos estruturais, manutenções emergenciais e reparos na infraestrutura das chácaras.',
    20.00,
    0.00,
    'ATIVO'
WHERE NOT EXISTS (SELECT 1 FROM public.emergency_funds LIMIT 1);


-- 3. Tabela de Transações e Movimentações da Reserva de Emergência (Ledger Imutável e Rastreável)
CREATE TABLE IF NOT EXISTS public.emergency_fund_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID REFERENCES public.emergency_funds(id) ON DELETE CASCADE NOT NULL,
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.reservation_payments(id) ON DELETE SET NULL,
    refund_id UUID REFERENCES public.reservation_refunds(id) ON DELETE SET NULL,
    
    transaction_type TEXT NOT NULL CHECK (
        transaction_type IN (
            'APORTE_AUTOMATICO',   -- 20% automático gerado no recebimento de aluguel
            'APORTE_MANUAL',       -- Aporte extraordinário manual
            'RETIRADA_DESPESA',    -- Despesa emergencial paga pelo fundo
            'ESTORNO_REEMBOLSO',   -- Estorno de 20% proporcional a cancelamento/reembolso
            'AJUSTE_MANUAL'        -- Ajuste manual de conciliação
        )
    ),
    
    amount NUMERIC(12, 2) NOT NULL, -- Valor efetivo (+ entrada, - saída)
    gross_amount NUMERIC(12, 2),    -- Valor base bruto de origem (ex: valor total do pagamento recebido)
    percentage_applied NUMERIC(5, 2), -- Percentual aplicado (ex: 20.00)
    balance_after NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    category TEXT DEFAULT 'INFRAESTRUTURA_EMERGENCIAL',
    description TEXT NOT NULL,
    performed_by TEXT DEFAULT 'Sistema / Administrador',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir colunas caso a tabela já exista
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS fund_id UUID REFERENCES public.emergency_funds(id) ON DELETE CASCADE;
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL;
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL;
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.reservation_payments(id) ON DELETE SET NULL;
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS refund_id UUID REFERENCES public.reservation_refunds(id) ON DELETE SET NULL;
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL;
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) NOT NULL;
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12, 2);
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS percentage_applied NUMERIC(5, 2);
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'INFRAESTRUTURA_EMERGENCIAL';
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS description TEXT NOT NULL;
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS performed_by TEXT DEFAULT 'Sistema / Administrador';
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.emergency_fund_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 4. ÍNDICES E CONSTRAINTS DE IDEMPOTÊNCIA (EVITAR DUPLICIDADE EM BANCO)
CREATE INDEX IF NOT EXISTS idx_emergency_trans_fund_id ON public.emergency_fund_transactions(fund_id);
CREATE INDEX IF NOT EXISTS idx_emergency_trans_chacara_id ON public.emergency_fund_transactions(chacara_id);
CREATE INDEX IF NOT EXISTS idx_emergency_trans_res_id ON public.emergency_fund_transactions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_emergency_trans_payment_id ON public.emergency_fund_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_emergency_trans_refund_id ON public.emergency_fund_transactions(refund_id);
CREATE INDEX IF NOT EXISTS idx_emergency_trans_created_at ON public.emergency_fund_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_emergency_trans_type ON public.emergency_fund_transactions(transaction_type);

-- Constraint parcial de unicidade: 1 pagamento gera apenas 1 aporte automático
CREATE UNIQUE INDEX IF NOT EXISTS uq_emergency_payment_automatic 
ON public.emergency_fund_transactions (payment_id) 
WHERE (payment_id IS NOT NULL AND transaction_type = 'APORTE_AUTOMATICO');

-- Constraint parcial de unicidade: 1 reembolso gera apenas 1 estorno automático
CREATE UNIQUE INDEX IF NOT EXISTS uq_emergency_refund_reversal 
ON public.emergency_fund_transactions (refund_id) 
WHERE (refund_id IS NOT NULL AND transaction_type = 'ESTORNO_REEMBOLSO');


-- 5. FUNCTION & TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DO SALDO DO FUNDO
CREATE OR REPLACE FUNCTION update_emergency_fund_balance_trg()
RETURNS TRIGGER AS $$
DECLARE
    v_total_balance NUMERIC(12, 2);
BEGIN
    -- Recalcula o saldo total somando todas as transações do fundo
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total_balance
    FROM public.emergency_fund_transactions
    WHERE fund_id = COALESCE(NEW.fund_id, OLD.fund_id);

    -- Atualiza na tabela principal
    UPDATE public.emergency_funds
    SET current_balance = v_total_balance,
        updated_at = timezone('utc'::text, now())
    WHERE id = COALESCE(NEW.fund_id, OLD.fund_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_emergency_trans_balance ON public.emergency_fund_transactions;
CREATE TRIGGER trg_emergency_trans_balance
AFTER INSERT OR UPDATE OR DELETE ON public.emergency_fund_transactions
FOR EACH ROW
EXECUTE FUNCTION update_emergency_fund_balance_trg();


-- 6. POLÍTICAS DE SEGURANÇA RLS (ROW LEVEL SECURITY)
ALTER TABLE public.emergency_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_fund_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to emergency_funds" ON public.emergency_funds;
CREATE POLICY "Public full access to emergency_funds" 
ON public.emergency_funds FOR ALL 
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access to emergency_fund_transactions" ON public.emergency_fund_transactions;
CREATE POLICY "Public full access to emergency_fund_transactions" 
ON public.emergency_fund_transactions FOR ALL 
USING (true) WITH CHECK (true);

-- =================================================================================
-- FIM DO SCRIPT DE RESERVA DE EMERGÊNCIA
-- =================================================================================
