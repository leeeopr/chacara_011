-- MIGRATION SCRIPT FOR SCHEDULE BLOCKS RECURRENCE (V2)
-- Esse script atualiza a tabela schedule_blocks para suportar os 3 modos de recorrência + 1 modo pontual.

-- 1. Criar novas colunas na tabela schedule_blocks
ALTER TABLE public.schedule_blocks ADD COLUMN IF NOT EXISTS block_mode TEXT DEFAULT 'single_day';
ALTER TABLE public.schedule_blocks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.schedule_blocks ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.schedule_blocks ADD COLUMN IF NOT EXISTS weekdays INTEGER[]; -- Array de inteiros (0=domingo, 1=segunda... 6=sábado)

-- 2. Migrar dados existentes de forma segura
-- Se havia um bloqueio pontual (is_recurring=false), migramos block_date para start_date e definimos block_mode como 'single_day'.
-- Se havia um bloqueio recorrente diário (is_recurring=true), definimos block_mode como 'weekly_recurring' sobre os dias úteis (1 a 5).
UPDATE public.schedule_blocks
SET
  block_mode = CASE 
    WHEN is_recurring = true THEN 'weekly_recurring' 
    ELSE 'single_day' 
  END,
  start_date = CASE 
    WHEN is_recurring = true THEN NULL 
    ELSE block_date 
  END,
  weekdays = CASE 
    WHEN is_recurring = true THEN ARRAY[1, 2, 3, 4, 5] 
    ELSE NULL 
  END
WHERE start_date IS NULL;

-- 3. Adicionar restrição CHECK para os modos suportados
ALTER TABLE public.schedule_blocks DROP CONSTRAINT IF EXISTS chk_block_mode;
ALTER TABLE public.schedule_blocks ADD CONSTRAINT chk_block_mode 
  CHECK (block_mode IN ('single_day', 'continuous_period', 'weekly_recurring', 'weekly_within_period'));

-- 4. Dropar coluna legada is_recurring temporariamente ou mantê-la como deprecatada para não quebrar queries muito antigas.
-- Mantemos a coluna block_date por compatibilidade, mas as novas colunas são as fontes da verdade.
