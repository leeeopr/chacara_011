-- Migration: Add birthday template column to settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS birthday_template TEXT;

-- Update with default birthday template
UPDATE public.settings
SET birthday_template = COALESCE(
  birthday_template,
  'Olá {primeiro_nome}! 🎉\n\nToda a equipe da clínica deseja um feliz aniversário!\n\nQue seu novo ciclo seja repleto de saúde, felicidade e realizações.\n\nParabéns pelo seu dia! 🎂'
);
