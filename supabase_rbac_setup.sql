-- 1. Create UserRole Enum
CREATE TYPE user_role AS ENUM ('SECRETARIA', 'FONO', 'DONA');

-- 2. Create Users Table
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'SECRETARIA',
  full_name TEXT
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Update Patients Table
-- Assuming patients table already exists, we alter it to use UUID for fono_id
-- If it doesn't exist, this will fail, so we should create it if not exists or alter.
-- For the sake of the prompt, let's assume we are modifying the existing table.
-- First, drop the old fono_id constraint if it exists
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_fono_id_fkey;

-- Change the column type to UUID (this might require a USING clause if there's data, but assuming fresh or we cast)
-- If there's existing data, this might fail without a proper USING clause. 
-- Since we are replacing professionals with users, we just alter the type.
ALTER TABLE public.patients 
  ALTER COLUMN fono_id TYPE UUID USING fono_id::text::uuid;

-- Add the new foreign key
ALTER TABLE public.patients 
  ADD CONSTRAINT patients_fono_id_fkey FOREIGN KEY (fono_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Enable RLS on patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- 4. Update Appointments Table
-- Drop old constraint
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_fono_id_fkey;

-- Change column type
ALTER TABLE public.appointments 
  ALTER COLUMN fono_id TYPE UUID USING fono_id::text::uuid;

-- Add new foreign key
ALTER TABLE public.appointments 
  ADD CONSTRAINT appointments_fono_id_fkey FOREIGN KEY (fono_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Enable RLS on appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Users Table
-- SECRETARIA -> cannot update other secretarias
-- DONA -> full access
-- FONO -> no access (except reading their own profile)

CREATE POLICY "Users can view their own profile" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.users FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "DONA can view all users" 
  ON public.users FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'DONA'
    )
  );

CREATE POLICY "SECRETARIA can view all users" 
  ON public.users FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SECRETARIA'
    )
  );

CREATE POLICY "DONA can update all users" 
  ON public.users FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'DONA'
    )
  );

CREATE POLICY "SECRETARIA can update FONO users" 
  ON public.users FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SECRETARIA'
    )
    AND role = 'FONO'
  );

-- 6. RLS Policies for Patients Table
-- SECRETARIA & DONA -> full access
-- FONO -> can select/update only patients assigned to them

CREATE POLICY "DONA and SECRETARIA have full access to patients" 
  ON public.patients FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('DONA', 'SECRETARIA')
    )
  );

CREATE POLICY "FONO can view their assigned patients" 
  ON public.patients FOR SELECT 
  USING (
    fono_id = auth.uid()
  );

CREATE POLICY "FONO can update their assigned patients" 
  ON public.patients FOR UPDATE 
  USING (
    fono_id = auth.uid()
  );

-- 7. RLS Policies for Appointments Table
-- SECRETARIA & DONA -> full access
-- FONO -> can select/update only where fono_id = auth.uid()

CREATE POLICY "DONA and SECRETARIA have full access to appointments" 
  ON public.appointments FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('DONA', 'SECRETARIA')
    )
  );

CREATE POLICY "FONO can view their own appointments" 
  ON public.appointments FOR SELECT 
  USING (
    fono_id = auth.uid()
  );

CREATE POLICY "FONO can update their own appointments" 
  ON public.appointments FOR UPDATE 
  USING (
    fono_id = auth.uid()
  );

-- 8. Trigger for new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'SECRETARIA');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
