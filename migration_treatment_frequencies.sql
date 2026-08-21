-- Migration: Add Treatment Tracking to Recurring Schedules Table
-- To apply: Run this SQL script in the Supabase SQL Editor.

-- 1. Add treatment tracking columns to public.recurring_schedules table
ALTER TABLE public.recurring_schedules 
ADD COLUMN IF NOT EXISTS treatment_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS treatment_total_sessions INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS next_session_number INTEGER DEFAULT NULL;

-- 2. Add validation constraint to guarantee mathematical integrity
ALTER TABLE public.recurring_schedules
DROP CONSTRAINT IF EXISTS check_recurring_treatment_sessions_integrity;

ALTER TABLE public.recurring_schedules
ADD CONSTRAINT check_recurring_treatment_sessions_integrity 
CHECK (
  (treatment_enabled = FALSE) OR 
  (
    treatment_total_sessions IS NOT NULL AND 
    next_session_number IS NOT NULL AND 
    treatment_total_sessions >= 1 AND 
    next_session_number >= 1 AND 
    next_session_number <= treatment_total_sessions + 1
  )
);

-- 3. Create indices for faster queries of active treatments
CREATE INDEX IF NOT EXISTS idx_rec_sched_treatment_enabled 
ON public.recurring_schedules (treatment_enabled) 
WHERE treatment_enabled = TRUE;

COMMENT ON COLUMN public.recurring_schedules.treatment_enabled IS 'Indica se esta recorrência de consultas faz parte de um tratamento contínuo';
COMMENT ON COLUMN public.recurring_schedules.treatment_total_sessions IS 'Quantidade total de sessões planejadas para este tratamento';
COMMENT ON COLUMN public.recurring_schedules.next_session_number IS 'Número da próxima consulta (sessão) que o motor de recorrência deve gerar';
