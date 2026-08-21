-- =========================================================================
-- MIGRATION: NÍVEIS DE URGÊNCIA (INFRAESTRUTURA, ESTRUTURA, SUPERESTRUTURA)
-- E LINKS EXTERNOS DE PRODUTOS (product_url) NO MÓDULO DE COMPRAS
-- Sistema de Gestão de Chácaras & Casas
-- =========================================================================

-- 1. Adicionar coluna product_url na tabela house_purchases se ainda não existir
ALTER TABLE IF EXISTS public.house_purchases 
ADD COLUMN IF NOT EXISTS product_url TEXT;

-- 2. Atualizar ou remover restrição antiga de priority caso exista
ALTER TABLE IF EXISTS public.house_purchases 
DROP CONSTRAINT IF EXISTS house_purchases_priority_check;

-- 3. Criar a nova restrição de prioridade / urgência aceitando:
--    'INFRAESTRUTURA' (Mais importante / Prioridade Máxima)
--    'ESTRUTURA'      (Intermediário / Prioridade Média)
--    'SUPERESTRUTURA' (Menos importante / Baixa Urgência)
--    + Suporte retrocompatível a valores legados
ALTER TABLE IF EXISTS public.house_purchases 
ADD CONSTRAINT house_purchases_priority_check 
CHECK (priority IN (
    'INFRAESTRUTURA', 
    'ESTRUTURA', 
    'SUPERESTRUTURA', 
    'URGENTE', 
    'ALTA', 
    'NORMAL', 
    'BAIXA'
));

-- 4. Definir novo padrão para inserções
ALTER TABLE IF EXISTS public.house_purchases 
ALTER COLUMN priority SET DEFAULT 'INFRAESTRUTURA';

-- 5. Atualizar registros legados existentes para o novo padrão de urgência
UPDATE public.house_purchases 
SET priority = 'INFRAESTRUTURA' 
WHERE priority = 'URGENTE';

UPDATE public.house_purchases 
SET priority = 'ESTRUTURA' 
WHERE priority = 'ALTA';

UPDATE public.house_purchases 
SET priority = 'SUPERESTRUTURA' 
WHERE priority IN ('NORMAL', 'BAIXA');

-- 6. Garantir índices de performance
CREATE INDEX IF NOT EXISTS idx_house_purchases_priority 
ON public.house_purchases(priority);

CREATE INDEX IF NOT EXISTS idx_house_purchases_status 
ON public.house_purchases(status);

-- 7. Comentários explicativos no schema do banco
COMMENT ON COLUMN public.house_purchases.priority IS 'Nível de urgência: INFRAESTRUTURA (mais importante), ESTRUTURA (médio), SUPERESTRUTURA (menos importante)';
COMMENT ON COLUMN public.house_purchases.product_url IS 'Link direto ou URL do produto/loja externa para cotação e compra';
