-- =========================================================================
-- SCRIPT DE CRIAÇÃO DA TABELA DE COMPRAS (house_purchases)
-- Sistema de Gestão de Chácaras & Casas
-- =========================================================================

-- 1. Criar extensão para UUID se ainda não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela Principal de Compras (house_purchases)
CREATE TABLE IF NOT EXISTS public.house_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.pendencias(id) ON DELETE SET NULL,
    transaction_id TEXT,
    depends_on_purchase_id UUID REFERENCES public.house_purchases(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    description TEXT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'un',
    estimated_price NUMERIC NOT NULL DEFAULT 0,
    paid_price NUMERIC DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'INFRAESTRUTURA', -- 'INFRAESTRUTURA' (1), 'ESTRUTURA' (2), 'SUPERESTRUTURA' (3), 'URGENTE', 'ALTA', 'NORMAL', 'BAIXA'
    status TEXT NOT NULL DEFAULT 'A_COMPRAR', -- 'A_COMPRAR', 'EM_COTACAO', 'AGUARDANDO_DEPENDENCIA', 'COMPRADO', 'CANCELADO'
    responsible_id TEXT,
    responsible_name TEXT,
    due_date DATE,
    category TEXT DEFAULT 'Outros', -- 'Manutenção', 'Limpeza', 'Cozinha', 'Banheiro', 'Jardim', 'Piscina', 'Eletrônicos', 'Mobiliário', 'Segurança', 'Consumíveis', 'Outros'
    supplier TEXT,
    product_url TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices para Alto Desempenho
CREATE INDEX IF NOT EXISTS idx_house_purchases_chacara_id ON public.house_purchases(chacara_id);
CREATE INDEX IF NOT EXISTS idx_house_purchases_priority ON public.house_purchases(priority);
CREATE INDEX IF NOT EXISTS idx_house_purchases_status ON public.house_purchases(status);
CREATE INDEX IF NOT EXISTS idx_house_purchases_depends ON public.house_purchases(depends_on_purchase_id);
CREATE INDEX IF NOT EXISTS idx_house_purchases_task_id ON public.house_purchases(task_id);

-- 4. Trigger de Atualização Automática do campo updated_at
CREATE OR REPLACE FUNCTION update_house_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_house_purchases_updated_at ON public.house_purchases;
CREATE TRIGGER trigger_house_purchases_updated_at
BEFORE UPDATE ON public.house_purchases
FOR EACH ROW
EXECUTE FUNCTION update_house_purchases_updated_at();

-- 5. Trigger de Desbloqueio de Dependências ao marcar como COMPRADO
CREATE OR REPLACE FUNCTION unlock_dependent_purchases()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPRADO' AND (OLD.status IS NULL OR OLD.status != 'COMPRADO') THEN
        UPDATE public.house_purchases
        SET status = 'A_COMPRAR', updated_at = NOW()
        WHERE depends_on_purchase_id = NEW.id
          AND status = 'AGUARDANDO_DEPENDENCIA';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_unlock_dependent_purchases ON public.house_purchases;
CREATE TRIGGER trigger_unlock_dependent_purchases
AFTER UPDATE ON public.house_purchases
FOR EACH ROW
EXECUTE FUNCTION unlock_dependent_purchases();

-- 6. Habilitar RLS (Row Level Security)
ALTER TABLE public.house_purchases ENABLE ROW LEVEL SECURITY;

-- Politica permissiva para usuários autenticados e serviço
DROP POLICY IF EXISTS "Acesso total a compras para usuarios autenticados" ON public.house_purchases;
CREATE POLICY "Acesso total a compras para usuarios autenticados"
ON public.house_purchases
FOR ALL
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR true)
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR true);
