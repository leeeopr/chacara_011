-- =================================================================================
-- SCRIPT OPCIONAL DE SEED DE DESENVOLVIMENTO (OPCIONAL - SEPARADO DA MODELAGEM)
-- Executar este script apenas se desejar inicializar o banco com dados iniciais de teste
-- =================================================================================

-- Garantir colunas essenciais antes de inserir
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';

-- 1. SEED DE FUNÇÕES PADRÃO DE EQUIPE
INSERT INTO public.crew_roles (nome, cor, icone, descricao, ativo, ordem_exibicao)
VALUES 
    ('Limpeza e Higienização', '#10B981', 'Sparkles', 'Limpeza de ambientes, troca de roupas de cama e higienização geral', true, 1),
    ('Manutenção de Piscina', '#06B6D4', 'Waves', 'Tratamento químico, aspiração e conservação da piscina', true, 2),
    ('Manutenção Elétrica e Hidráulica', '#F59E0B', 'Zap', 'Reparos em rede elétrica, bombas de água, disjuntores e encanamentos', true, 3),
    ('Corte de Grama e Roçadeira', '#84CC16', 'Scissors', 'Corte de gramado, roçada de terrenos e limpeza de cercas', true, 4),
    ('Jardinagem e Paisagismo', '#22C55E', 'Flower2', 'Poda de árvores, cuidado de canteiros e irrigação de plantas', true, 5),
    ('Caseiro Residente', '#8B5CF6', 'Home', 'Cuidados diários, recepção de insumos e vigilância local', true, 6),
    ('Recepção e Check-in', '#EC4899', 'KeyRound', 'Entrega de chaves, orientação aos hóspedes e vistoria de saída', true, 7),
    ('Segurança e Portaria', '#6366F1', 'ShieldCheck', 'Controle de acesso, rondas noturnas e segurança patrimonial', true, 8)
ON CONFLICT DO NOTHING;

-- 2. SEED OPCIONAL DE EMPRESAS DE EXEMPLO
INSERT INTO public.companies (name, status, limit_value, limit_type, block_on_limit, notes)
VALUES 
    ('Empresa Particular (Direto)', 'ACTIVE', 0.00, 'NONE', false, 'Atendimentos e reservas diretas'),
    ('Convênio Bradesco Saúde', 'ACTIVE', 5000.00, 'MONTHLY', true, 'Tabela especial de convênio'),
    ('Unimed Regional', 'ACTIVE', 10000.00, 'TOTAL', true, 'Faturamento mensal')
ON CONFLICT DO NOTHING;
