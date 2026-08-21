-- Fix for Birth Date persistence in Manual Appointments
-- 1. Add the missing column to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. Update existing appointments if possible (not applicable for existing data loss, but ensures schema integrity)
COMMENT ON COLUMN public.appointments.birth_date IS 'Birth date for manual entries where patient_id is null';
