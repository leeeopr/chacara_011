-- SUPABASE MIGRATION SCRIPT FOR SCHEDULE BLOCKS
-- This script builds the schedule_blocks table and configures RBAC + RLS policies.

-- Create table public.schedule_blocks
CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fono_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  start_time TEXT NOT NULL, -- Stored as "HH:mm"
  end_time TEXT NOT NULL,   -- Stored as "HH:mm"
  reason TEXT,
  is_recurring BOOLEAN DEFAULT FALSE, -- is recurring daily?
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

-- Create indexes for quick retrieval
CREATE INDEX IF NOT EXISTS idx_sched_blocks_date_fono ON public.schedule_blocks(block_date, fono_id);
CREATE INDEX IF NOT EXISTS idx_sched_blocks_fono ON public.schedule_blocks(fono_id);

-- Register resource inside role_permissions
INSERT INTO public.role_permissions (role, resource, can_view, can_create, can_update, can_delete, scope)
VALUES 
  ('SECRETARIA', 'schedule_blocks', true, true, true, true, 'all'),
  ('PROFISSIONAL', 'schedule_blocks', true, true, true, true, 'own'),
  ('FONO', 'schedule_blocks', true, true, true, true, 'own')
ON CONFLICT (role, resource) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_update = EXCLUDED.can_update,
  can_delete = EXCLUDED.can_delete,
  scope = EXCLUDED.scope;

-- RLS Policies for schedule_blocks
DROP POLICY IF EXISTS "Has perms to view schedule blocks" ON public.schedule_blocks;
CREATE POLICY "Has perms to view schedule blocks" ON public.schedule_blocks
  FOR SELECT USING (
    has_permission('schedule_blocks', 'view')
  );

DROP POLICY IF EXISTS "Has perms to create schedule blocks" ON public.schedule_blocks;
CREATE POLICY "Has perms to create schedule blocks" ON public.schedule_blocks
  FOR INSERT WITH CHECK (
    has_permission('schedule_blocks', 'create') AND (
      (SELECT scope FROM role_permissions WHERE role = (SELECT role FROM profiles WHERE id = auth.uid()) AND resource = 'schedule_blocks') = 'all'
      OR fono_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Has perms to update schedule blocks" ON public.schedule_blocks;
CREATE POLICY "Has perms to update schedule blocks" ON public.schedule_blocks
  FOR UPDATE USING (
    has_permission('schedule_blocks', 'update') AND (
      (SELECT scope FROM role_permissions WHERE role = (SELECT role FROM profiles WHERE id = auth.uid()) AND resource = 'schedule_blocks') = 'all'
      OR fono_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Has perms to delete schedule blocks" ON public.schedule_blocks;
CREATE POLICY "Has perms to delete schedule blocks" ON public.schedule_blocks
  FOR DELETE USING (
    has_permission('schedule_blocks', 'delete') AND (
      (SELECT scope FROM role_permissions WHERE role = (SELECT role FROM profiles WHERE id = auth.uid()) AND resource = 'schedule_blocks') = 'all'
      OR fono_id = auth.uid()
    )
  );
