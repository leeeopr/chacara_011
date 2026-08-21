-- MIGRATION: REFORMA DA AGENDA E FECHAMENTO SEMANAL
-- Esta migração cria as tabelas agenda_blocks, agenda_block_tasks e weekly_closings, além de índices, constraints e políticas de RLS.

-- ==========================================
-- 1. TABELA DE BLOCOS RECORRENTES DA AGENDA
-- ==========================================
CREATE TABLE IF NOT EXISTS public.agenda_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    weekday INTEGER NOT NULL CONSTRAINT weekday_range CHECK (weekday >= 0 AND weekday <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    color TEXT,
    category TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para otimização de busca rápida de blocos por profissional e dia
CREATE INDEX IF NOT EXISTS idx_agenda_blocks_profile ON public.agenda_blocks(profile_id);
CREATE INDEX IF NOT EXISTS idx_agenda_blocks_weekday ON public.agenda_blocks(weekday);
CREATE INDEX IF NOT EXISTS idx_agenda_blocks_active ON public.agenda_blocks(is_active);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.agenda_blocks ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para agenda_blocks
DROP POLICY IF EXISTS "Select agenda_blocks" ON public.agenda_blocks;
CREATE POLICY "Select agenda_blocks" ON public.agenda_blocks
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
    OR profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "Insert agenda_blocks" ON public.agenda_blocks;
CREATE POLICY "Insert agenda_blocks" ON public.agenda_blocks
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
    OR profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "Update agenda_blocks" ON public.agenda_blocks;
CREATE POLICY "Update agenda_blocks" ON public.agenda_blocks
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
    OR profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "Delete agenda_blocks" ON public.agenda_blocks;
CREATE POLICY "Delete agenda_blocks" ON public.agenda_blocks
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
    OR profile_id = auth.uid()
  );


-- ==========================================
-- 2. TABELA DE PENDÊNCIAS DOS BLOCOS DA AGENDA
-- ==========================================
CREATE TABLE IF NOT EXISTS public.agenda_block_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES public.agenda_blocks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice por block_id para carregamento rápido de tarefas vinculadas
CREATE INDEX IF NOT EXISTS idx_agenda_block_tasks_block ON public.agenda_block_tasks(block_id);
CREATE INDEX IF NOT EXISTS idx_agenda_block_tasks_completed ON public.agenda_block_tasks(completed);

-- Habilitar RLS
ALTER TABLE public.agenda_block_tasks ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para agenda_block_tasks
DROP POLICY IF EXISTS "Select agenda_block_tasks" ON public.agenda_block_tasks;
CREATE POLICY "Select agenda_block_tasks" ON public.agenda_block_tasks
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.agenda_blocks b 
      WHERE b.id = block_id AND b.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Insert agenda_block_tasks" ON public.agenda_block_tasks;
CREATE POLICY "Insert agenda_block_tasks" ON public.agenda_block_tasks
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.agenda_blocks b 
      WHERE b.id = block_id AND b.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Update agenda_block_tasks" ON public.agenda_block_tasks;
CREATE POLICY "Update agenda_block_tasks" ON public.agenda_block_tasks
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.agenda_blocks b 
      WHERE b.id = block_id AND b.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Delete agenda_block_tasks" ON public.agenda_block_tasks;
CREATE POLICY "Delete agenda_block_tasks" ON public.agenda_block_tasks
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.agenda_blocks b 
      WHERE b.id = block_id AND b.profile_id = auth.uid()
    )
  );


-- ==========================================
-- 3. TABELA DE FECHAMENTO SEMANAL
-- ==========================================
CREATE TABLE IF NOT EXISTS public.weekly_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_payout NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    company_revenue NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'DRAFT' CONSTRAINT weekly_closing_status_check CHECK (status IN ('DRAFT', 'FINAL', 'REOPENED')),
    data_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para busca por períodos histórico de fechamento semanal
CREATE INDEX IF NOT EXISTS idx_weekly_closings_period ON public.weekly_closings(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_weekly_closings_closed_by ON public.weekly_closings(closed_by);

-- Habilitar RLS
ALTER TABLE public.weekly_closings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para weekly_closings (acesso restrito à equipe diretiva/financeira)
DROP POLICY IF EXISTS "Select weekly_closings" ON public.weekly_closings;
CREATE POLICY "Select weekly_closings" ON public.weekly_closings
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
  );

DROP POLICY IF EXISTS "Insert weekly_closings" ON public.weekly_closings;
CREATE POLICY "Insert weekly_closings" ON public.weekly_closings
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
  );

DROP POLICY IF EXISTS "Update weekly_closings" ON public.weekly_closings;
CREATE POLICY "Update weekly_closings" ON public.weekly_closings
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'SECRETARIA', 'admin')
  );

DROP POLICY IF EXISTS "Delete weekly_closings" ON public.weekly_closings;
CREATE POLICY "Delete weekly_closings" ON public.weekly_closings
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('OWNER', 'DONA', 'admin')
  );
