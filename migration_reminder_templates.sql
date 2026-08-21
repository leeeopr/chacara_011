-- Migration: Add detailed reminder templates to settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tomorrow_confirmation_request_template TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tomorrow_confirmation_success_template TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS today_reminder_template TEXT;

-- Seed defaults for new columns based on existing columns if available
UPDATE public.settings 
SET 
  tomorrow_confirmation_request_template = COALESCE(tomorrow_confirmation_request_template, tomorrow_message_template, 'Olá {name}, você tem uma consulta amanhã às {time}. Confirma presença?'),
  today_reminder_template = COALESCE(today_reminder_template, today_message_template, 'Olá {name}, lembrando da sua consulta hoje às {time} com {professional_name}.')
WHERE id = 1;
