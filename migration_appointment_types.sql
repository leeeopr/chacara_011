-- Migration: Add Appointment Types and Patient Categories
-- Date: 2026-04-03

-- 1. Create appointment_types table
CREATE TABLE IF NOT EXISTS public.appointment_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insert initial data
INSERT INTO public.appointment_types (name, duration_minutes, color) VALUES
('Terapia', 50, '#FFD600'),
('Anamnese Fonoaudiológica', 50, '#FFD600'),
('Treino em cabine', 50, '#FFD600'),
('Audio SUS', 30, '#ef4444'),
('Audio Unimed', 30, '#10b981'),
('Unimed 30 minutos', 30, '#10b981'),
('Audio Particular', 30, '#3b82f6'),
('PAC', 90, '#FFD600'),
('Audio e PAC', 120, '#FFD600'),
('Teste de aparelho', 60, '#FFD600'),
('Programação de aparelho', 30, '#FFD600'),
('Devolutiva com os pais', 15, '#FFD600');

-- 3. Update appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS end_time TEXT;

-- 4. Update patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('SUS', 'CONVENIO', 'PARTICULAR'));

-- 5. Enable RLS for appointment_types
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.appointment_types;
CREATE POLICY "Enable all access for authenticated users" ON public.appointment_types
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Create Trigger to automatically calculate end_time based on duration
CREATE OR REPLACE FUNCTION calculate_appointment_end_time()
RETURNS TRIGGER AS $$
DECLARE
    v_duration INTEGER;
    v_start_time INTERVAL;
    v_end_time INTERVAL;
BEGIN
    -- Only calculate if appointment_type_id is provided and end_time is not manually set
    IF NEW.appointment_type_id IS NOT NULL AND NEW.start_time IS NOT NULL AND NEW.end_time IS NULL THEN
        SELECT duration_minutes INTO v_duration FROM public.appointment_types WHERE id = NEW.appointment_type_id;
        
        IF v_duration IS NOT NULL THEN
            -- Convert "HH:mm" to interval for calculation
            v_start_time := (NEW.start_time || ':00')::INTERVAL;
            v_end_time := v_start_time + (v_duration || ' minutes')::INTERVAL;
            -- Format back to "HH:mm"
            NEW.end_time := to_char(v_end_time, 'HH24:MI');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_end_time ON public.appointments;
CREATE TRIGGER trigger_calculate_end_time
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION calculate_appointment_end_time();
