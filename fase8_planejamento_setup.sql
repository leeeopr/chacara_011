-- =================================================================================
-- FASE 8: MÓDULO DE PLANEJAMENTO & ANÁLISE ESTRATÉGICA DE DECISÕES
-- Estrutura Completa de Banco de Dados Supabase (PostgreSQL + RLS + Triggers)
-- =================================================================================

-- 1. Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela Principal de Decisões de Planejamento (planning_decisions)
CREATE TABLE IF NOT EXISTS public.planning_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(250) NOT NULL,
    description TEXT,
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
    decision_type VARCHAR(50) NOT NULL DEFAULT 'INVESTIMENTO', -- 'COMPRA', 'MANUTENCAO', 'REFORMA', 'INVESTIMENTO', 'OPERACIONAL', 'OUTRO'
    estimated_cost NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    target_date DATE,
    status VARCHAR(40) NOT NULL DEFAULT 'EM_ANALISE', -- 'EM_ANALISE', 'APROVADA', 'ADIADA', 'REJEITADA'
    priority VARCHAR(30) NOT NULL DEFAULT 'MEDIA', -- 'BAIXA', 'MEDIA', 'ALTA', 'ESTRATEGICA'
    impact_notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_by TEXT,
    created_by_name VARCHAR(150),
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir colunas essenciais caso a tabela já exista
ALTER TABLE public.planning_decisions ADD COLUMN IF NOT EXISTS title VARCHAR(250);
ALTER TABLE public.planning_decisions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.planning_decisions ADD COLUMN IF NOT EXISTS chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL;
ALTER TABLE public.planning_decisions ADD COLUMN IF NOT EXISTS decision_type VARCHAR(50) DEFAULT 'INVESTIMENTO';
ALTER TABLE public.planning_decisions ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.planning_decisions ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE public.planning_decisions ADD COLUMN IF NOT EXISTS status VARCHAR(40) DEFAULT 'EM_ANALISE';
ALTER TABLE public.planning_decisions ADD COLUMN IF NOT EXISTS priority VARCHAR(30) DEFAULT 'MEDIA';
ALTER TABLE public.planning_decisions ADD COLUMN IF NOT EXISTS impact_notes TEXT;
ALTER TABLE public.planning_decisions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.planning_decisions ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.planning_decisions ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(150);
ALTER TABLE public.planning_decisions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;


-- 3. Tabela de Histórico de Mudanças de Status (planning_decision_history)
CREATE TABLE IF NOT EXISTS public.planning_decision_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES public.planning_decisions(id) ON DELETE CASCADE,
    previous_status VARCHAR(40),
    new_status VARCHAR(40) NOT NULL,
    reason TEXT,
    changed_by VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 4. Tabela de Vínculos Estratégicos Futuros (planning_decision_links)
-- Permite conectar a decisão a compras, manutenções, reservas, despesas futuras ou reserva de emergência
CREATE TABLE IF NOT EXISTS public.planning_decision_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES public.planning_decisions(id) ON DELETE CASCADE,
    link_type VARCHAR(40) NOT NULL, -- 'COMPRA', 'MANUTENCAO', 'RESERVA', 'FINANCEIRO', 'EMERGENCIA', 'PROJETO'
    entity_id UUID,
    entity_label TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 5. Índices para Alto Desempenho e Filtros
CREATE INDEX IF NOT EXISTS idx_planning_decisions_chacara ON public.planning_decisions(chacara_id);
CREATE INDEX IF NOT EXISTS idx_planning_decisions_status ON public.planning_decisions(status);
CREATE INDEX IF NOT EXISTS idx_planning_decisions_type ON public.planning_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_planning_decisions_priority ON public.planning_decisions(priority);
CREATE INDEX IF NOT EXISTS idx_planning_decisions_target_date ON public.planning_decisions(target_date);
CREATE INDEX IF NOT EXISTS idx_planning_decisions_deleted ON public.planning_decisions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_planning_decisions_created_at ON public.planning_decisions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planning_decision_history_decision ON public.planning_decision_history(decision_id);
CREATE INDEX IF NOT EXISTS idx_planning_decision_links_decision ON public.planning_decision_links(decision_id);
CREATE INDEX IF NOT EXISTS idx_planning_decision_links_type ON public.planning_decision_links(link_type);


-- 6. Trigger para Atualização Automática de updated_at
CREATE OR REPLACE FUNCTION update_planning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_planning_decisions_updated_at ON public.planning_decisions;
CREATE TRIGGER trg_planning_decisions_updated_at
    BEFORE UPDATE ON public.planning_decisions
    FOR EACH ROW
    EXECUTE FUNCTION update_planning_updated_at();


-- 7. Trigger para Registrar Mudança de Status Automaticamente no Histórico
CREATE OR REPLACE FUNCTION log_planning_decision_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.planning_decision_history (
            decision_id,
            previous_status,
            new_status,
            reason,
            changed_by
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.impact_notes,
            COALESCE(NEW.created_by_name, 'Sistema / Administrador')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_planning_decision_status ON public.planning_decisions;
CREATE TRIGGER trg_log_planning_decision_status
    AFTER UPDATE ON public.planning_decisions
    FOR EACH ROW
    EXECUTE FUNCTION log_planning_decision_status_change();


-- 8. Habilitar RLS (Row Level Security)
ALTER TABLE public.planning_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_decision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_decision_links ENABLE ROW LEVEL SECURITY;


-- 9. Políticas de Acesso RLS
DROP POLICY IF EXISTS "Permissao total planning_decisions" ON public.planning_decisions;
CREATE POLICY "Permissao total planning_decisions" ON public.planning_decisions
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao total planning_decision_history" ON public.planning_decision_history;
CREATE POLICY "Permissao total planning_decision_history" ON public.planning_decision_history
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao total planning_decision_links" ON public.planning_decision_links;
CREATE POLICY "Permissao total planning_decision_links" ON public.planning_decision_links
FOR ALL USING (true) WITH CHECK (true);
