-- =================================================================================
-- FULL DATABASE SETUP FOR CLÍNICAFLOW
-- Execute this script in your Supabase SQL Editor (SQL Tools > New Query)
-- =================================================================================

-- 1. Create Enums (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('SECRETARIA', 'FONO', 'DONA');
    END IF;
END $$;

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'SECRETARIA',
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  responsible_name TEXT,
  responsible_phone TEXT,
  address TEXT,
  observations TEXT,
  fono_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  fono_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'Agendado',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id INTEGER PRIMARY KEY,
  whatsapp_template TEXT,
  whatsapp_confirmed_template TEXT,
  today_message_template TEXT,
  tomorrow_message_template TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed initial settings
INSERT INTO public.settings (id, today_message_template, tomorrow_message_template)
VALUES (1, 'Olá {NOME}, você tem uma consulta hoje às {HORA}. Confirma presença?', 'Olá {NOME}, você tem uma consulta amanhã às {HORA}.')
ON CONFLICT (id) DO NOTHING;

-- 6. Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 7. Create helper function to get the current user's role
-- We use a function to make policies cleaner
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE((SELECT role::text FROM public.users WHERE id = auth.uid()), 'GUEST');
$$;

-- 8. RLS Policies for Users Table
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
CREATE POLICY "Users can view all users" 
ON public.users FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" 
ON public.users FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Role-based user updates" ON public.users;
CREATE POLICY "Role-based user updates" 
ON public.users FOR UPDATE 
TO authenticated 
USING (
  get_user_role() = 'DONA' OR 
  (get_user_role() = 'SECRETARIA' AND (role = 'FONO' OR id = auth.uid())) OR
  (get_user_role() = 'FONO' AND id = auth.uid())
)
WITH CHECK (
  get_user_role() = 'DONA' OR 
  (get_user_role() = 'SECRETARIA' AND ((role = 'FONO' AND id != auth.uid()) OR (id = auth.uid() AND role = 'SECRETARIA'))) OR
  (get_user_role() = 'FONO' AND id = auth.uid() AND role = 'FONO')
);

-- 9. RLS Policies for Patients Table
DROP POLICY IF EXISTS "Role-based patient select" ON public.patients;
CREATE POLICY "Role-based patient select" 
ON public.patients FOR SELECT 
TO authenticated 
USING (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
);

DROP POLICY IF EXISTS "Role-based patient insert" ON public.patients;
CREATE POLICY "Role-based patient insert" 
ON public.patients FOR INSERT 
TO authenticated 
WITH CHECK (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
);

DROP POLICY IF EXISTS "Role-based patient update" ON public.patients;
CREATE POLICY "Role-based patient update" 
ON public.patients FOR UPDATE 
TO authenticated 
USING (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
)
WITH CHECK (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
);

DROP POLICY IF EXISTS "Role-based patient delete" ON public.patients;
CREATE POLICY "Role-based patient delete" 
ON public.patients FOR DELETE 
TO authenticated 
USING (get_user_role() IN ('DONA', 'SECRETARIA'));

-- 10. RLS Policies for Appointments Table
DROP POLICY IF EXISTS "Role-based appointment select" ON public.appointments;
CREATE POLICY "Role-based appointment select" 
ON public.appointments FOR SELECT 
TO authenticated 
USING (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
);

DROP POLICY IF EXISTS "Role-based appointment insert" ON public.appointments;
CREATE POLICY "Role-based appointment insert" 
ON public.appointments FOR INSERT 
TO authenticated 
WITH CHECK (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
);

DROP POLICY IF EXISTS "Role-based appointment update" ON public.appointments;
CREATE POLICY "Role-based appointment update" 
ON public.appointments FOR UPDATE 
TO authenticated 
USING (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
)
WITH CHECK (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
);

DROP POLICY IF EXISTS "Role-based appointment delete" ON public.appointments;
CREATE POLICY "Role-based appointment delete" 
ON public.appointments FOR DELETE 
TO authenticated 
USING (get_user_role() IN ('DONA', 'SECRETARIA'));

-- 11. Trigger for automatic user creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (
    new.id, 
    new.email, 
    'SECRETARIA', 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 12. Seed initial data (optional)
-- Insert current user as DONA if table is empty
INSERT INTO public.users (id, email, role, full_name)
SELECT id, email, 'DONA', 'Administrador'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;
