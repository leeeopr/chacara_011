-- ====================================================================
-- TABELA DE EVENTOS EXCEPCIONAIS
-- Entidade própria para registrar lembretes, avisos e eventos que
-- fogem do funcionamento padrão do sistema (ex: Dedetização, Vistorias,
-- Visita do proprietário, Entrega de equipamento, Manutenção extraordinária).
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.exceptional_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME DEFAULT '08:00',
    end_time TIME DEFAULT '09:00',
    all_day BOOLEAN DEFAULT false,
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
    responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    responsible_name VARCHAR(150),
    priority VARCHAR(20) DEFAULT 'NORMAL', -- BAIXA, NORMAL, ALTA, URGENTE
    status VARCHAR(30) DEFAULT 'PENDENTE', -- PENDENTE, EM_ANDAMENTO, CONCLUIDO, CANCELADO
    reminder_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Garantir colunas caso a tabela já tenha sido criada anteriormente
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS title VARCHAR(200);
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '08:00';
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT '09:00';
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT false;
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS chacara_id UUID;
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS responsible_id UUID;
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS responsible_name VARCHAR(150);
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL';
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'PENDENTE';
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMPTZ;
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.exceptional_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Índices de performance para busca em calendário e dashboard
CREATE INDEX IF NOT EXISTS idx_exceptional_events_date ON public.exceptional_events(event_date);
CREATE INDEX IF NOT EXISTS idx_exceptional_events_chacara ON public.exceptional_events(chacara_id);
CREATE INDEX IF NOT EXISTS idx_exceptional_events_status ON public.exceptional_events(status);
CREATE INDEX IF NOT EXISTS idx_exceptional_events_responsible ON public.exceptional_events(responsible_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.exceptional_events ENABLE ROW LEVEL SECURITY;

-- Política RLS permissiva para usuários autenticados
DROP POLICY IF EXISTS "Acesso total eventos excepcionais" ON public.exceptional_events;
CREATE POLICY "Acesso total eventos excepcionais" ON public.exceptional_events FOR ALL USING (true) WITH CHECK (true);
