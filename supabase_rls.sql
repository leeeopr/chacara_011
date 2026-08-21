-- =================================================================================
-- SUPABASE RLS POLICIES FOR CLÍNICAFLOW
-- Execute this script in your Supabase SQL Editor to enforce Role-Based Access Control
-- =================================================================================

-- 1. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 2. Create helper functions to get the current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE((SELECT role::text FROM public.users WHERE id = auth.uid()), 'GUEST');
$$;

-- =================================================================================
-- USERS TABLE POLICIES
-- =================================================================================

-- READ: All authenticated users can read the users table (needed for dropdowns)
CREATE POLICY "Users can view all users" 
ON users FOR SELECT 
TO authenticated 
USING (true);

-- INSERT: 
-- 1. Only DONA can create new users
-- 2. Users can create their own profile if it doesn't exist
CREATE POLICY "Only DONA can insert users" 
ON users FOR INSERT 
TO authenticated 
WITH CHECK (get_user_role() = 'DONA');

CREATE POLICY "Users can insert their own profile" 
ON users FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- UPDATE: 
-- DONA can update anyone.
-- SECRETARIA can update FONO or their own profile, but cannot change roles to DONA.
-- FONO can update their own profile, but cannot change their role.
CREATE POLICY "Role-based user updates" 
ON users FOR UPDATE 
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

-- DELETE: Only DONA can delete users
CREATE POLICY "Only DONA can delete users" 
ON users FOR DELETE 
TO authenticated 
USING (get_user_role() = 'DONA');

-- =================================================================================
-- PATIENTS TABLE POLICIES
-- =================================================================================

-- READ: DONA and SECRETARIA can view all. FONO can view only their own.
CREATE POLICY "Role-based patient select" 
ON patients FOR SELECT 
TO authenticated 
USING (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
);

-- INSERT: DONA and SECRETARIA can insert any. FONO can insert their own.
CREATE POLICY "Role-based patient insert" 
ON patients FOR INSERT 
TO authenticated 
WITH CHECK (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
);

-- UPDATE: DONA and SECRETARIA can update any. FONO can update their own.
CREATE POLICY "Role-based patient update" 
ON patients FOR UPDATE 
TO authenticated 
USING (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
)
WITH CHECK (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
);

-- DELETE: Only DONA and SECRETARIA can delete patients.
CREATE POLICY "Role-based patient delete" 
ON patients FOR DELETE 
TO authenticated 
USING (
  get_user_role() IN ('DONA', 'SECRETARIA')
);

-- =================================================================================
-- APPOINTMENTS TABLE POLICIES
-- =================================================================================

-- READ: DONA and SECRETARIA can view all. FONO can view only their own.
CREATE POLICY "Role-based appointment select" 
ON appointments FOR SELECT 
TO authenticated 
USING (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
);

-- INSERT: DONA and SECRETARIA can insert any. FONO can insert their own.
CREATE POLICY "Role-based appointment insert" 
ON appointments FOR INSERT 
TO authenticated 
WITH CHECK (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
);

-- UPDATE: DONA and SECRETARIA can update any. FONO can update their own.
CREATE POLICY "Role-based appointment update" 
ON appointments FOR UPDATE 
TO authenticated 
USING (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
)
WITH CHECK (
  get_user_role() IN ('DONA', 'SECRETARIA') OR 
  (get_user_role() = 'FONO' AND fono_id = auth.uid())
);

-- DELETE: Only DONA and SECRETARIA can delete appointments.
CREATE POLICY "Role-based appointment delete" 
ON appointments FOR DELETE 
TO authenticated 
USING (
  get_user_role() IN ('DONA', 'SECRETARIA')
);

-- =================================================================================
-- SETTINGS TABLE POLICIES
-- =================================================================================

-- READ: All authenticated users can read settings
CREATE POLICY "All authenticated users can view settings" 
ON settings FOR SELECT 
TO authenticated 
USING (true);

-- UPDATE: Only DONA can update settings
CREATE POLICY "Only DONA can update settings" 
ON settings FOR UPDATE 
TO authenticated 
USING (get_user_role() = 'DONA');

-- INSERT/DELETE: Only DONA can insert/delete settings
CREATE POLICY "Only DONA can insert settings" 
ON settings FOR INSERT 
TO authenticated 
WITH CHECK (get_user_role() = 'DONA');

CREATE POLICY "Only DONA can delete settings" 
ON settings FOR DELETE 
TO authenticated 
USING (get_user_role() = 'DONA');
