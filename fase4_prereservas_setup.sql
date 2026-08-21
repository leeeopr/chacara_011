-- ============================================================================
-- MIGRATION: FASE 4 - FLUXO COMPLETO DE PRÉ-RESERVAS E AUDITORIA
-- ============================================================================

-- 1. Adicionar colunas de rastreamento de criação, confirmação e cancelamento
ALTER TABLE public.reservations 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PRE_RESERVA',
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_by TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 2. Atualizar ou remover constraint de status para suportar PRE_RESERVA
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_status_check 
  CHECK (status IN (
    'PRE_RESERVA', 
    'AGUARDANDO_CONFIRMACAO', 
    'CONFIRMADA', 
    'CHECKIN_REALIZADO', 
    'HOSPEDADO', 
    'CHECKOUT_REALIZADO', 
    'FINALIZADA', 
    'CANCELADA', 
    'NO_SHOW'
  ));

-- Definir status padrão como PRE_RESERVA para novas reservas
ALTER TABLE public.reservations ALTER COLUMN status SET DEFAULT 'PRE_RESERVA';

-- 3. Tabela de Histórico e Auditoria de Reservas
CREATE TABLE IF NOT EXISTS public.reservation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'CRIACAO', 'CONFIRMACAO', 'CANCELAMENTO', 'MUDANCA_STATUS', 'EDICAO'
  previous_status TEXT,
  new_status TEXT,
  performed_by TEXT,
  performed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS e criar política de acesso total
ALTER TABLE public.reservation_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to reservation_history" ON public.reservation_history;
CREATE POLICY "Public full access to reservation_history" ON public.reservation_history FOR ALL USING (true) WITH CHECK (true);

-- Criar índices de busca para performance
CREATE INDEX IF NOT EXISTS idx_reservation_history_reservation_id ON public.reservation_history(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON public.reservations(created_at);
