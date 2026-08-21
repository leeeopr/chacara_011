-- Refactor Appointment Types to Clean Domain Model
-- Date: 2026-04-04

-- 1. Ensure the appointment_types table exists (in case it was dropped or not created)
CREATE TABLE IF NOT EXISTS public.appointment_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Clear existing mixed data
DELETE FROM public.appointment_types;

-- 3. Insert clean domain model data (Medical procedures only)
INSERT INTO public.appointment_types (name, duration_minutes, color) VALUES
('Audiometria', 30, '#3b82f6'),
('Unimed 30 minutos', 30, '#10b981'),
('Unimed 1 hora', 60, '#10b981'),
('Terapia', 50, '#FFD600'),
('Anamnese Fonoaudiológica', 50, '#FFD600'),
('Treino em cabine', 50, '#FFD600'),
('PAC', 90, '#FFD600'),
('Audio e PAC', 120, '#FFD600'),
('Teste de aparelho', 60, '#FFD600'),
('Programação de aparelho', 30, '#FFD600'),
('Devolutiva com os pais', 15, '#FFD600');

-- 4. Ensure appointments table has the correct columns
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS end_time TEXT;

-- 5. Ensure patients table has the category column
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('SUS', 'CONVENIO', 'PARTICULAR'));

-- 6. Re-apply RLS for appointment_types to ensure it's accessible
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.appointment_types;
CREATE POLICY "Enable all access for authenticated users" ON public.appointment_types
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Ensure the trigger for calculating end_time exists and is correct
CREATE OR REPLACE FUNCTION calculate_appointment_end_time()
RETURNS TRIGGER AS $$
DECLARE
    v_duration INTEGER;
    v_end_time_ts TIMESTAMP;
BEGIN
    -- Only calculate if appointment_type_id is provided and start_time is provided, and end_time is not manually set
    IF NEW.appointment_type_id IS NOT NULL AND NEW.start_time IS NOT NULL AND NEW.end_time IS NULL THEN
        SELECT duration_minutes INTO v_duration FROM public.appointment_types WHERE id = NEW.appointment_type_id;
        
        IF v_duration IS NOT NULL THEN
            -- Use a dummy date to calculate the end time
            v_end_time_ts := ('2000-01-01 ' || NEW.start_time)::TIMESTAMP + (v_duration || ' minutes')::INTERVAL;
            -- Format back to "HH:mm"
            NEW.end_time := to_char(v_end_time_ts, 'HH24:MI');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_end_time ON public.appointments;
CREATE TRIGGER trigger_calculate_end_time
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION calculate_appointment_end_time();
