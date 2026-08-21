-- ====================================================================
-- FASE 6: CALENDÁRIO OPERACIONAL COMPLETO DE CHÁCARAS E EQUIPE
-- (Reservas, Pré-reservas, Bloqueios, Limpezas, Manutenções, Piscinas,
-- Jardinagem, Prestadores Recorrentes/Eventuais, Reuniões, Vistorias)
-- ====================================================================

-- 1. Tabela de Tipos de Eventos Operacionais (Totalmente configuráveis pelo admin)
CREATE TABLE IF NOT EXISTS public.operational_event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#3B82F6', -- Hex color code
    icon VARCHAR(50) NOT NULL DEFAULT 'Calendar',  -- Lucide icon name
    priority INTEGER NOT NULL DEFAULT 1,            -- Priority level for display ordering / conflict resolution
    description TEXT,
    settings JSONB DEFAULT '{}'::jsonb,             -- Custom settings (e.g. auto_release_chacara, require_notes, etc)
    is_system BOOLEAN NOT NULL DEFAULT false,      -- Default system types vs custom created types
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas caso a tabela operational_event_types já existia
ALTER TABLE public.operational_event_types ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE public.operational_event_types ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE public.operational_event_types ADD COLUMN IF NOT EXISTS title VARCHAR(100);
ALTER TABLE public.operational_event_types ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.operational_event_types ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.operational_event_types ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#3B82F6';
ALTER TABLE public.operational_event_types ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'Calendar';
ALTER TABLE public.operational_event_types ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
ALTER TABLE public.operational_event_types ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.operational_event_types ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.operational_event_types ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Inserção dos 15 Tipos Iniciais
INSERT INTO public.operational_event_types (code, name, title, color, icon, priority, description, is_system, settings)
VALUES
  ('reserva', 'Reserva', 'Reserva', '#10B981', 'CalendarCheck', 10, 'Reserva confirmada de hóspedes', true, '{"block_schedule": true}'::jsonb),
  ('pre_reserva', 'Pré-reserva', 'Pré-reserva', '#F59E0B', 'Clock', 9, 'Pré-reserva aguardando confirmação ou sinal', true, '{"block_schedule": true}'::jsonb),
  ('bloqueio', 'Bloqueio', 'Bloqueio', '#6B7280', 'Ban', 10, 'Bloqueio de calendário por manutenção ou uso proprietário', true, '{"block_schedule": true}'::jsonb),
  ('check_in', 'Check-in', 'Check-in', '#06B6D4', 'LogIn', 8, 'Recepção e entrada de hóspedes', true, '{}'::jsonb),
  ('check_out', 'Check-out', 'Check-out', '#8B5CF6', 'LogOut', 8, 'Saída e vistoria final com hóspedes', true, '{}'::jsonb),
  ('limpeza', 'Limpeza', 'Limpeza', '#3B82F6', 'Sparkles', 7, 'Limpeza geral pós/pré checkout ou manutenção de rotina', true, '{"releases_reservation": true}'::jsonb),
  ('piscina', 'Piscina', 'Piscina', '#0EA5E9', 'Waves', 6, 'Tratamento físico e químico de piscina', true, '{"logs_maintenance": true}'::jsonb),
  ('jardinagem', 'Jardinagem', 'Jardinagem', '#84CC16', 'Trees', 5, 'Corte de grama, poda e jardinagem', true, '{}'::jsonb),
  ('manutencao', 'Manutenção', 'Manutenção', '#EF4444', 'Wrench', 7, 'Manutenção preventiva ou corretiva', true, '{"logs_maintenance": true}'::jsonb),
  ('inspecao', 'Inspeção', 'Inspeção', '#D97706', 'ClipboardCheck', 6, 'Inspeção técnica e de inventário', true, '{}'::jsonb),
  ('prestador_recorrente', 'Prestador Recorrente', 'Prestador Recorrente', '#6366F1', 'UserCheck', 5, 'Serviço prestado por equipe ou fornecedor fixo', true, '{}'::jsonb),
  ('prestador_eventual', 'Prestador Eventual', 'Prestador Eventual', '#EC4899', 'Briefcase', 5, 'Visita ou serviço avulso pontual', true, '{}'::jsonb),
  ('reuniao', 'Reunião', 'Reunião', '#A855F7', 'Users', 4, 'Reunião operacional ou alinhamento de equipe', true, '{}'::jsonb),
  ('vistoria', 'Vistoria', 'Vistoria', '#14B8A6', 'ShieldCheck', 7, 'Vistoria de entrada/saída ou verificação de danos', true, '{}'::jsonb),
  ('outro', 'Outro', 'Outro', '#9CA3AF', 'MoreHorizontal', 1, 'Eventos operacionais diversos', true, '{}'::jsonb)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, title = EXCLUDED.title, color = EXCLUDED.color, icon = EXCLUDED.icon, priority = EXCLUDED.priority, description = EXCLUDED.description;


-- 2. Tabela de Indisponibilidade/Férias de Funcionários (para detecção de conflitos)
CREATE TABLE IF NOT EXISTS public.staff_unavailability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID,                                 -- ID do funcionário/membro da equipe
    start_date DATE,
    end_date DATE,
    reason VARCHAR(100),                            -- Ex: Férias, Folga, Atestado, Treinamento
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.staff_unavailability ADD COLUMN IF NOT EXISTS member_id UUID;
ALTER TABLE public.staff_unavailability ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.staff_unavailability ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.staff_unavailability ADD COLUMN IF NOT EXISTS reason VARCHAR(100);
ALTER TABLE public.staff_unavailability ADD COLUMN IF NOT EXISTS notes TEXT;


-- 3. Tabela de Regras de Recorrência Operacional
CREATE TABLE IF NOT EXISTS public.operational_recurrence_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID,                                -- Pode ser específico de uma chácara ou geral
    event_type_id UUID REFERENCES public.operational_event_types(id) ON DELETE RESTRICT,
    event_type_code VARCHAR(50),
    title VARCHAR(150),
    description TEXT,
    frequency VARCHAR(30),                         -- DIARIA, SEMANAL, BISEMANAL, MENSAL, ANUAL, CUSTOMIZADO
    recurrence_interval INTEGER DEFAULT 1,          -- A cada N dias/semanas/meses
    days_of_week INTEGER[],                         -- 0=Dom, 1=Seg ... 6=Sáb
    day_of_month INTEGER,                           -- 1 a 31
    week_position VARCHAR(20),                      -- FIRST, SECOND, THIRD, FOURTH, LAST
    month_position INTEGER,                         -- Dia da semana na posição do mês
    start_date DATE,
    end_date DATE,
    has_no_end_date BOOLEAN DEFAULT true,
    max_occurrences INTEGER,
    default_time_start TIME DEFAULT '08:00',
    default_time_end TIME DEFAULT '10:00',
    staff_ids UUID[] DEFAULT '{}',                  -- Funcionários atribuídos
    automations JSONB DEFAULT '[]'::jsonb,          -- Regras de automação (WhatsApp, Lembrete, etc)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS chacara_id UUID;
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS event_type_id UUID REFERENCES public.operational_event_types(id) ON DELETE RESTRICT;
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS event_type_code VARCHAR(50);
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS title VARCHAR(150);
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS frequency VARCHAR(30);
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1;
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS days_of_week INTEGER[];
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS day_of_month INTEGER;
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS week_position VARCHAR(20);
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS month_position INTEGER;
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS has_no_end_date BOOLEAN DEFAULT true;
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS max_occurrences INTEGER;
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS default_time_start TIME DEFAULT '08:00';
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS default_time_end TIME DEFAULT '10:00';
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS staff_ids UUID[] DEFAULT '{}';
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS automations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.operational_recurrence_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;


-- 4. Tabela de Eventos Operacionais Individuais / Ocorrências Geradas
CREATE TABLE IF NOT EXISTS public.operational_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chacara_id UUID,                                -- Chácara vinculada (opcional para eventos gerais)
    chacara_name VARCHAR(150),
    recurrence_rule_id UUID REFERENCES public.operational_recurrence_rules(id) ON DELETE SET NULL,
    event_type_id UUID REFERENCES public.operational_event_types(id) ON DELETE RESTRICT,
    event_type_code VARCHAR(50),
    title VARCHAR(150),
    description TEXT,
    start_date DATE,
    start_time TIME DEFAULT '08:00',
    end_date DATE,
    end_time TIME DEFAULT '10:00',
    
    -- Status da presença e execução
    status VARCHAR(30) DEFAULT 'AGENDADO', -- AGENDADO, CONFIRMADO, EM_ANDAMENTO, CONCLUIDO, FALTOU, CANCELADO, REAGENDADO
    presence_confirmed_at TIMESTAMPTZ,
    presence_confirmed_by VARCHAR(100),
    
    -- Dados em caso de falta
    absence_reason VARCHAR(150),
    absence_notes TEXT,
    rescheduled_to_date DATE,
    
    -- Funcionários / Equipe responsável
    staff_ids UUID[] DEFAULT '{}',
    staff_names TEXT[] DEFAULT '{}',
    
    -- Metadados, links de automação e histórico de observações
    reservation_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    automations JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS chacara_id UUID;
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS chacara_name VARCHAR(150);
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS recurrence_rule_id UUID REFERENCES public.operational_recurrence_rules(id) ON DELETE SET NULL;
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS event_type_id UUID REFERENCES public.operational_event_types(id) ON DELETE RESTRICT;
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS event_type_code VARCHAR(50);
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS title VARCHAR(150);
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '08:00';
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT '10:00';
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'AGENDADO';
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS presence_confirmed_at TIMESTAMPTZ;
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS presence_confirmed_by VARCHAR(100);
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS absence_reason VARCHAR(150);
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS absence_notes TEXT;
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS rescheduled_to_date DATE;
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS staff_ids UUID[] DEFAULT '{}';
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS staff_names TEXT[] DEFAULT '{}';
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS reservation_id UUID;
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.operational_events ADD COLUMN IF NOT EXISTS automations JSONB DEFAULT '[]'::jsonb;


-- 5. Tabela de Log de Automações Executadas
CREATE TABLE IF NOT EXISTS public.operational_automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.operational_events(id) ON DELETE CASCADE,
    automation_type VARCHAR(50) NOT NULL,          -- WHATSAPP_24H, REMINDER_12H, NOTIFY_ADMIN, RELEASE_CHACARA, LOG_MAINTENANCE
    status VARCHAR(30) NOT NULL,                   -- SUCESSO, FALHA, PENDENTE
    execution_details TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);


-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_operational_events_date ON public.operational_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_operational_events_chacara ON public.operational_events(chacara_id);
CREATE INDEX IF NOT EXISTS idx_operational_events_type ON public.operational_events(event_type_code);
CREATE INDEX IF NOT EXISTS idx_operational_events_status ON public.operational_events(status);
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_active ON public.operational_recurrence_rules(is_active);


-- Habilitar RLS em todas as novas tabelas
ALTER TABLE public.operational_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_automation_logs ENABLE ROW LEVEL SECURITY;


-- Políticas de Acesso Permissivas para Usuários Autenticados
DROP POLICY IF EXISTS "Acesso total aos tipos de eventos" ON public.operational_event_types;
CREATE POLICY "Acesso total aos tipos de eventos" ON public.operational_event_types FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total indisponibilidade" ON public.staff_unavailability;
CREATE POLICY "Acesso total indisponibilidade" ON public.staff_unavailability FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total regras recorrência" ON public.operational_recurrence_rules;
CREATE POLICY "Acesso total regras recorrência" ON public.operational_recurrence_rules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total eventos operacionais" ON public.operational_events;
CREATE POLICY "Acesso total eventos operacionais" ON public.operational_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total automações" ON public.operational_automation_logs;
CREATE POLICY "Acesso total automações" ON public.operational_automation_logs FOR ALL USING (true) WITH CHECK (true);

