-- SQL SCRIPT TO DISABLE ROW LEVEL SECURITY (RLS) ON SCHEDULE_BLOCKS
-- Esse script remove as restrições de RLS da tabela schedule_blocks, permitindo leitura e escrita direta.

-- Opção 1: Desativar completamente o RLS para esta tabela (Recomendado para testes / desenvolvimento rápido)
ALTER TABLE public.schedule_blocks DISABLE ROW LEVEL SECURITY;

-- Opção 2 (Alternativa mais segura): Caso queira manter o RLS ativo mas permitir qualquer operação para usuários autenticados/públicos:
-- ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Permitir tudo em schedule_blocks" ON public.schedule_blocks;
-- CREATE POLICY "Permitir tudo em schedule_blocks" ON public.schedule_blocks FOR ALL TO public USING (true) WITH CHECK (true);
