-- Migration: Add Patient Appointment Makeup Tracking to Appointments Table
-- To apply: Run this SQL script in the Supabase SQL Editor.

-- 1. Add makeup status column (PENDENTE, REPOSTA, DISPENSADA or NULL)
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS makeup_status TEXT DEFAULT NULL;

-- 2. Add linked_to_absence_id column referencing the original missed appointment
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS linked_to_absence_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

-- 3. Create indices for performance tuning
CREATE INDEX IF NOT EXISTS idx_appointments_makeup_status 
ON public.appointments (makeup_status) 
WHERE makeup_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_linked_to_absence_id 
ON public.appointments (linked_to_absence_id) 
WHERE linked_to_absence_id IS NOT NULL;

COMMENT ON COLUMN public.appointments.makeup_status IS 'Status da reposição de falta: PENDENTE, REPOSTA, DISPENSADA';
COMMENT ON COLUMN public.appointments.linked_to_absence_id IS 'ID da consulta original de falta que originou esta reposição';
