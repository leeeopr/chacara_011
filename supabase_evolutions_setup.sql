-- Robust Setup for Evolutions with Case-Insensitive Policy Check and DROP IF EXISTS
-- This script ensures DONA, admin, and owner can manage everything.

-- 1. Create evolutions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.evolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('planned', 'in_progress', 'completed')) DEFAULT 'planned',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.evolutions ENABLE ROW LEVEL SECURITY;

-- 3. DROP ALL POSSIBLE EXISTING POLICIES to avoid "already exists" errors
-- We use a DO block to be extremely safe
DO $$ 
BEGIN
    -- View policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view evolutions') THEN
        DROP POLICY "Anyone can view evolutions" ON public.evolutions;
    END IF;
    
    -- Manage/All policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can manage evolutions') THEN
        DROP POLICY "Admin can manage evolutions" ON public.evolutions;
    END IF;
    
    -- Delete policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can delete evolutions') THEN
        DROP POLICY "Admin can delete evolutions" ON public.evolutions;
    END IF;
END $$;

-- 4. Create NEW Policies with expanded roles (DONA, admin, owner)

-- SELECT Policy: View (DONA, admin, owner, SECRETARIA)
CREATE POLICY "Anyone can view evolutions" 
ON public.evolutions FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('DONA', 'admin', 'owner', 'SECRETARIA')
  )
);

-- ALL Policy: INSERT/UPDATE (DONA, admin, owner)
CREATE POLICY "Admin can manage evolutions" 
ON public.evolutions FOR ALL
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('DONA', 'admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('DONA', 'admin', 'owner')
  )
);

-- Explicit DELETE Policy: (DONA, admin, owner)
CREATE POLICY "Admin can delete evolutions" 
ON public.evolutions FOR DELETE
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('DONA', 'admin', 'owner')
  )
);
