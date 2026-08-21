-- ==============================================================================
-- FASE 7: MÓDULO DE PENDÊNCIAS E COMUNICAÇÃO OPERACIONAL ENTRE EQUIPE
-- Sistema: Gestão de Chácaras & Reservas (Airbnb Operation)
-- Arquivo: fase7_pendencias_modulo_setup.sql
-- ==============================================================================

-- 1. TABELA DE GRUPOS DE PENDÊNCIAS (CRUD DE GRUPOS)
CREATE TABLE IF NOT EXISTS public.pendencia_grupos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    cor VARCHAR(30) NOT NULL DEFAULT '#3B82F6',
    ativo BOOLEAN NOT NULL DEFAULT true,
    ordem_exibicao INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Suporte a atualizações de colunas caso a tabela já exista
ALTER TABLE public.pendencia_grupos ADD COLUMN IF NOT EXISTS nome VARCHAR(100);
ALTER TABLE public.pendencia_grupos ADD COLUMN IF NOT EXISTS cor VARCHAR(30) DEFAULT '#3B82F6';
ALTER TABLE public.pendencia_grupos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE public.pendencia_grupos ADD COLUMN IF NOT EXISTS ordem_exibicao INTEGER DEFAULT 0;

-- Semente de Grupos Iniciais Padrão (Limpeza, Reservas, Financeiro, Piscina, Manutenção, Documentação, Marketing, Outros)
INSERT INTO public.pendencia_grupos (nome, cor, ativo, ordem_exibicao)
VALUES 
  ('Limpeza', '#06B6D4', true, 1),
  ('Reservas', '#10B981', true, 2),
  ('Financeiro', '#F59E0B', true, 3),
  ('Piscina', '#0EA5E9', true, 4),
  ('Manutenção', '#EF4444', true, 5),
  ('Documentação', '#8B5CF6', true, 6),
  ('Marketing', '#EC4899', true, 7),
  ('Outros', '#6B7280', true, 8)
ON CONFLICT DO NOTHING;


-- 2. TABELA PRINCIPAL DE PENDÊNCIAS
CREATE TABLE IF NOT EXISTS public.pendencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID REFERENCES public.pendencia_grupos(id) ON DELETE RESTRICT,
    chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
    titulo VARCHAR(250) NOT NULL,
    descricao TEXT,
    prazo DATE,
    prazo_hora TIME DEFAULT '18:00',
    prioridade VARCHAR(20) NOT NULL DEFAULT 'Média', -- Baixa, Média, Alta, Urgente
    status VARCHAR(30) NOT NULL DEFAULT 'Aberta', -- Aberta, Em andamento, Aguardando devolução, Devolvida, Concluída, Cancelada
    
    criado_por UUID,
    criado_por_nome VARCHAR(150),
    criado_por_email VARCHAR(150),
    
    responsavel_atual UUID,
    responsavel_atual_nome VARCHAR(150),
    responsavel_atual_email VARCHAR(150),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES public.pendencia_grupos(id) ON DELETE RESTRICT;
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL;
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS titulo VARCHAR(250);
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS prazo DATE;
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS prazo_hora TIME DEFAULT '18:00';
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS prioridade VARCHAR(20) DEFAULT 'Média';
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Aberta';
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS criado_por UUID;
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS criado_por_nome VARCHAR(150);
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS criado_por_email VARCHAR(150);
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS responsavel_atual UUID;
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS responsavel_atual_nome VARCHAR(150);
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS responsavel_atual_email VARCHAR(150);


-- 3. TABELA DE SUBITENS (CHECKLIST)
CREATE TABLE IF NOT EXISTS public.pendencia_subitens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pendencia_id UUID REFERENCES public.pendencias(id) ON DELETE CASCADE NOT NULL,
    descricao TEXT NOT NULL,
    concluido BOOLEAN NOT NULL DEFAULT false,
    concluido_por UUID,
    concluido_por_nome VARCHAR(150),
    concluido_em TIMESTAMPTZ,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pendencia_subitens ADD COLUMN IF NOT EXISTS pendencia_id UUID REFERENCES public.pendencias(id) ON DELETE CASCADE;
ALTER TABLE public.pendencia_subitens ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.pendencia_subitens ADD COLUMN IF NOT EXISTS concluido BOOLEAN DEFAULT false;
ALTER TABLE public.pendencia_subitens ADD COLUMN IF NOT EXISTS concluido_por UUID;
ALTER TABLE public.pendencia_subitens ADD COLUMN IF NOT EXISTS concluido_por_nome VARCHAR(150);
ALTER TABLE public.pendencia_subitens ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ;
ALTER TABLE public.pendencia_subitens ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;


-- 4. TABELA DE HISTÓRICO E TIMELINE (DEVOLUÇÕES, TRAMITES E COMENTÁRIOS)
CREATE TABLE IF NOT EXISTS public.pendencia_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pendencia_id UUID REFERENCES public.pendencias(id) ON DELETE CASCADE NOT NULL,
    de_usuario_id UUID,
    de_usuario_nome VARCHAR(150),
    para_usuario_id UUID,
    para_usuario_nome VARCHAR(150),
    tipo_acao VARCHAR(50) NOT NULL, -- CRIACAO, TRAMITE, DEVOLUCAO, ATUALIZACAO_CHECKLIST, COMENTARIO, CONCLUSAO, CANCELAMENTO
    observacoes TEXT,
    status_anterior VARCHAR(30),
    status_novo VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pendencia_historico ADD COLUMN IF NOT EXISTS pendencia_id UUID REFERENCES public.pendencias(id) ON DELETE CASCADE;
ALTER TABLE public.pendencia_historico ADD COLUMN IF NOT EXISTS de_usuario_id UUID;
ALTER TABLE public.pendencia_historico ADD COLUMN IF NOT EXISTS de_usuario_nome VARCHAR(150);
ALTER TABLE public.pendencia_historico ADD COLUMN IF NOT EXISTS para_usuario_id UUID;
ALTER TABLE public.pendencia_historico ADD COLUMN IF NOT EXISTS para_usuario_nome VARCHAR(150);
ALTER TABLE public.pendencia_historico ADD COLUMN IF NOT EXISTS tipo_acao VARCHAR(50);
ALTER TABLE public.pendencia_historico ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE public.pendencia_historico ADD COLUMN IF NOT EXISTS status_anterior VARCHAR(30);
ALTER TABLE public.pendencia_historico ADD COLUMN IF NOT EXISTS status_novo VARCHAR(30);


-- 5. TABELA DE NOTIFICAÇÕES INTERNAS OPERACIONAIS
CREATE TABLE IF NOT EXISTS public.pendencia_notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pendencia_id UUID REFERENCES public.pendencias(id) ON DELETE CASCADE NOT NULL,
    destinatario_id UUID NOT NULL,
    destinatario_email VARCHAR(150),
    remetente_id UUID,
    remetente_nome VARCHAR(150),
    titulo VARCHAR(200) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pendencia_notificacoes ADD COLUMN IF NOT EXISTS pendencia_id UUID REFERENCES public.pendencias(id) ON DELETE CASCADE;
ALTER TABLE public.pendencia_notificacoes ADD COLUMN IF NOT EXISTS destinatario_id UUID;
ALTER TABLE public.pendencia_notificacoes ADD COLUMN IF NOT EXISTS destinatario_email VARCHAR(150);
ALTER TABLE public.pendencia_notificacoes ADD COLUMN IF NOT EXISTS remetente_id UUID;
ALTER TABLE public.pendencia_notificacoes ADD COLUMN IF NOT EXISTS remetente_nome VARCHAR(150);
ALTER TABLE public.pendencia_notificacoes ADD COLUMN IF NOT EXISTS titulo VARCHAR(200);
ALTER TABLE public.pendencia_notificacoes ADD COLUMN IF NOT EXISTS mensagem TEXT;
ALTER TABLE public.pendencia_notificacoes ADD COLUMN IF NOT EXISTS lida BOOLEAN DEFAULT false;


-- 6. ÍNDICES DE DESEMPENHO E CONSULTA
CREATE INDEX IF NOT EXISTS idx_pendencias_grupo ON public.pendencias(grupo_id);
CREATE INDEX IF NOT EXISTS idx_pendencias_responsavel ON public.pendencias(responsavel_atual);
CREATE INDEX IF NOT EXISTS idx_pendencias_criador ON public.pendencias(criado_por);
CREATE INDEX IF NOT EXISTS idx_pendencias_status ON public.pendencias(status);
CREATE INDEX IF NOT EXISTS idx_pendencia_subitens_pendencia ON public.pendencia_subitens(pendencia_id);
CREATE INDEX IF NOT EXISTS idx_pendencia_historico_pendencia ON public.pendencia_historico(pendencia_id);
CREATE INDEX IF NOT EXISTS idx_pendencia_notif_destinatario ON public.pendencia_notificacoes(destinatario_id);


-- 7. TRIGGER AUTOMÁTICO DE ATUALIZAÇÃO DO CAMPO updated_at
CREATE OR REPLACE FUNCTION public.update_pendencia_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pendencias_updated_at ON public.pendencias;
CREATE TRIGGER trg_pendencias_updated_at
BEFORE UPDATE ON public.pendencias
FOR EACH ROW EXECUTE FUNCTION public.update_pendencia_updated_at();

DROP TRIGGER IF EXISTS trg_pendencia_grupos_updated_at ON public.pendencia_grupos;
CREATE TRIGGER trg_pendencia_grupos_updated_at
BEFORE UPDATE ON public.pendencia_grupos
FOR EACH ROW EXECUTE FUNCTION public.update_pendencia_updated_at();


-- 8. POLÍTICAS DE SEGURANÇA POR LINHA (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.pendencia_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendencia_subitens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendencia_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendencia_notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full access to pendencia_grupos" ON public.pendencia_grupos;
CREATE POLICY "Full access to pendencia_grupos" ON public.pendencia_grupos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access to pendencias" ON public.pendencias;
CREATE POLICY "Full access to pendencias" ON public.pendencias FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access to pendencia_subitens" ON public.pendencia_subitens;
CREATE POLICY "Full access to pendencia_subitens" ON public.pendencia_subitens FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access to pendencia_historico" ON public.pendencia_historico;
CREATE POLICY "Full access to pendencia_historico" ON public.pendencia_historico FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access to pendencia_notificacoes" ON public.pendencia_notificacoes;
CREATE POLICY "Full access to pendencia_notificacoes" ON public.pendencia_notificacoes FOR ALL USING (true) WITH CHECK (true);

-- Alias View for pendencias_historico (ensures compatibility whether queried with singular or plural table name)
CREATE OR REPLACE VIEW public.pendencias_historico AS SELECT * FROM public.pendencia_historico;

-- FIM DO ARQUIVO SQL DE IMPLEMENTAÇÃO DA FASE 7
