-- =============================================================================
-- MIGRATION: VALOR MANUAL / PERSONALIZADO POR RESERVA (custom_price)
-- =============================================================================
-- Permite definir um valor negociado/personalizado para uma reserva específica
-- sem alterar o valor padrão da chácara nem das demais reservas.
--
-- Regra de precedência no sistema:
--   IF (custom_price IS NOT NULL) THEN
--       utilizar custom_price como preço efetivo da reserva
--   ELSE
--       utilizar o preço calculado padrão (diárias + taxas - descontos)
--   END IF;
-- =============================================================================

-- 1. Adicionar coluna custom_price e is_custom_price na tabela public.reservations
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS custom_price NUMERIC(12, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_custom_price BOOLEAN DEFAULT false;

-- 2. Atualizar comentários no schema do Supabase
COMMENT ON COLUMN public.reservations.custom_price IS 'Valor total personalizado definido manualmente para esta reserva (sobrescreve o preço padrão calculado quando preenchido)';
COMMENT ON COLUMN public.reservations.is_custom_price IS 'Flag indicando se o valor desta reserva foi configurado manualmente pelo operador';

-- 3. Índice para otimização de consultas financeiras e relatórios
CREATE INDEX IF NOT EXISTS idx_reservations_custom_price ON public.reservations(custom_price) WHERE custom_price IS NOT NULL;
