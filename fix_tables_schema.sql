-- Fix Tables Schema to match the application code

-- 1. Fix Patients Table
DO $$ 
BEGIN
    -- Rename columns if they exist with old names
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'name') THEN
        ALTER TABLE public.patients RENAME COLUMN name TO full_name;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'phone') THEN
        ALTER TABLE public.patients RENAME COLUMN phone TO whatsapp;
    END IF;

    -- Ensure fono_id references profiles
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'patients_fono_id_fkey') THEN
        ALTER TABLE public.patients DROP CONSTRAINT patients_fono_id_fkey;
    END IF;
    ALTER TABLE public.patients ADD CONSTRAINT patients_fono_id_fkey FOREIGN KEY (fono_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
END $$;

-- 2. Fix Appointments Table
-- It's often easier to recreate this table if the schema is very different
DROP TABLE IF EXISTS public.appointments;

CREATE TABLE public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name TEXT, -- For manual entry or cache
    whatsapp TEXT,     -- For manual entry or cache
    fono_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    start_time TEXT NOT NULL, -- Stored as "HH:mm"
    status TEXT DEFAULT 'PENDENTE',
    cancel_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 4. Re-apply RLS Policies (Simplified for now, matching the app's needs)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.patients;
CREATE POLICY "Enable all access for authenticated users" ON public.patients
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.appointments;
CREATE POLICY "Enable all access for authenticated users" ON public.appointments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Ensure settings table exists and has default row
CREATE TABLE IF NOT EXISTS public.settings (
    id INTEGER PRIMARY KEY,
    whatsapp_template TEXT,
    whatsapp_confirmed_template TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.settings (id, whatsapp_template, whatsapp_confirmed_template)
VALUES (1, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
