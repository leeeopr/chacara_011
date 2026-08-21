-- Migration: Add status column to patients table for inative/active patients
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ATIVO' 
CONSTRAINT check_patient_status CHECK (status IN ('ATIVO', 'INATIVO'));

-- Update any existing records to have 'ATIVO' status if they are null
UPDATE public.patients SET status = 'ATIVO' WHERE status IS NULL;
