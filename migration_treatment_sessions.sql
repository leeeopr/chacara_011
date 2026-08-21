-- Migration: Add Patient Treatment Tracking to Appointments Table
-- To apply: Run this SQL script in the Supabase SQL Editor.

-- 1. Add treatment tracking columns to public.appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS treatment_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS treatment_total_sessions INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS treatment_session_number INTEGER DEFAULT NULL;

-- 2. Add validation constraint to guarantee mathematical integrity
-- Ensura that if treatment is active:
-- * Both session counts are integers >= 1
-- * The current session number <= total sessions count.
-- If treatment is disabled, these values can be NULL.
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS check_treatment_sessions_integrity;

ALTER TABLE public.appointments
ADD CONSTRAINT check_treatment_sessions_integrity 
CHECK (
  (treatment_enabled = FALSE) OR 
  (
    treatment_total_sessions IS NOT NULL AND 
    treatment_session_number IS NOT NULL AND 
    treatment_total_sessions >= 1 AND 
    treatment_session_number >= 1 AND 
    treatment_session_number <= treatment_total_sessions
  )
);

-- 3. Create indices for future queries and performance tuning
CREATE INDEX IF NOT EXISTS idx_appointments_treatment_enabled 
ON public.appointments (treatment_enabled) 
WHERE treatment_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_appointments_treatment_total_sessions 
ON public.appointments (treatment_total_sessions);

CREATE INDEX IF NOT EXISTS idx_appointments_treatment_session_number 
ON public.appointments (treatment_session_number);

COMMENT ON COLUMN public.appointments.treatment_enabled IS 'Indica se esta consulta opcionalmente pertence a um tratamento contínuo';
COMMENT ON COLUMN public.appointments.treatment_total_sessions IS 'Quantidade total de sessões planejadas para o tratamento';
COMMENT ON COLUMN public.appointments.treatment_session_number IS 'Número da sessão em andamento correspondente a esta consulta';
