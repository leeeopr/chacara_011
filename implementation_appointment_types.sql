-- Final Implementation for Appointment Types (Tipos de Consulta)
-- This script ensures full alignment with the requested architecture

-- 1. Ensure appointment_types table exists with all required fields
CREATE TABLE IF NOT EXISTS public.appointment_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    color TEXT DEFAULT '#3b82f6', -- Default Hex color
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Soft delete strategy: ensure is_active exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointment_types' AND COLUMN_NAME = 'is_active') THEN
        ALTER TABLE public.appointment_types ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 3. Ensure appointment_type_id exists in appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE SET NULL;

-- 4. RBAC & RLS Configuration
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.appointment_types;
DROP POLICY IF EXISTS "View appointment types" ON public.appointment_types;
DROP POLICY IF EXISTS "Manage appointment types" ON public.appointment_types;

-- POLICY: View - Admin, Owner (Dona), Secretaria, and Fono can view active types
-- Note: Admin/Owner/Secretaria can view even inactive types in some contexts, 
-- but for simplicity in RLS, we allow select for all authenticated users 
-- and handle visibility in the frontend queries.
CREATE POLICY "View appointment types" 
    ON public.appointment_types FOR SELECT 
    TO authenticated 
    USING (true);

-- POLICY: Manage - Only Admin and Owner (DONA) can insert, update, delete (soft delete)
CREATE POLICY "Manage appointment types" 
    ON public.appointment_types FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('DONA', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('DONA', 'admin')
        )
    );

-- 5. Trigger for end_time calculation (Permanent Reliability Fix)
CREATE OR REPLACE FUNCTION public.calculate_appointment_end_time()
RETURNS TRIGGER AS $$
DECLARE
    v_duration INTEGER;
    v_end_time_ts TIMESTAMP;
BEGIN
    -- Recalculate if:
    -- - It's a new record
    -- - appointment_type_id changed
    -- - start_time changed
    -- - end_time is NULL
    IF (TG_OP = 'INSERT') OR 
       (NEW.appointment_type_id IS DISTINCT FROM OLD.appointment_type_id) OR 
       (NEW.start_time IS DISTINCT FROM OLD.start_time) OR
       (NEW.end_time IS NULL)
    THEN
        IF NEW.appointment_type_id IS NOT NULL AND NEW.start_time IS NOT NULL THEN
            SELECT duration_minutes INTO v_duration FROM public.appointment_types WHERE id = NEW.appointment_type_id;
            
            IF v_duration IS NOT NULL THEN
                -- Use a dummy date to calculate the end time reliably
                v_end_time_ts := ('2000-01-01 ' || NEW.start_time)::TIMESTAMP + (v_duration || ' minutes')::INTERVAL;
                -- Format back to "HH:MI"
                NEW.end_time := to_char(v_end_time_ts, 'HH24:MI');
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_end_time ON public.appointments;
CREATE TRIGGER trigger_calculate_end_time
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.calculate_appointment_end_time();

-- 6. Initial Seed Data (Optional if already exists, but ensures consistency)
-- Using ON CONFLICT is tricky without a unique constraint, but we'll insert if empty
INSERT INTO public.appointment_types (name, duration_minutes, color)
SELECT * FROM (VALUES 
    ('Terapia', 50, '#FFD600'),
    ('Avaliação', 60, '#3b82f6'),
    ('Sessão Curta', 30, '#10b981'),
    ('Sessão Longa', 90, '#f59e0b'),
    ('Audio SUS', 30, '#ef4444')
) AS v(name, duration_minutes, color)
WHERE NOT EXISTS (SELECT 1 FROM public.appointment_types LIMIT 1);
