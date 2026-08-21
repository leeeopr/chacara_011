-- MIGRATION: EVOLUÇÕES v2 (PACKS & WEIGHTS)
-- Implementa a arquitetura de Roadmap Estratégico com Rollover Automático

-- 1. DROP OLD TABLE IF EXISTS (Cleaning for new architecture)
DROP TABLE IF EXISTS public.evolutions CASCADE;

-- 2. CREATE ENUMS
DO $$ BEGIN
    CREATE TYPE public.pack_status AS ENUM ('OPEN', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.evolution_status_v2 AS ENUM ('BACKLOG', 'EM DESENVOLVIMENTO', 'CONCLUÍDA', 'CANCELADA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLES
CREATE TABLE public.evolution_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number INTEGER NOT NULL,
    max_weight INTEGER DEFAULT 10,
    status public.pack_status DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE public.evolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID REFERENCES public.evolution_packs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    weight INTEGER DEFAULT 1,
    status public.evolution_status_v2 DEFAULT 'BACKLOG',
    category TEXT,
    implementation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. INDICES
CREATE INDEX idx_evolutions_pack_id ON public.evolutions(pack_id);
CREATE INDEX idx_evolutions_created_at ON public.evolutions(created_at DESC);
CREATE INDEX idx_evolution_packs_number ON public.evolution_packs(number DESC);

-- 5. RBAC INITIAL SEED
INSERT INTO public.role_permissions (role, resource, can_view, can_create, can_update, can_delete, scope)
VALUES 
  ('admin', 'evolucoes', true, true, true, true, 'all'),
  ('OWNER', 'evolucoes', true, true, true, true, 'all'),
  ('DONA', 'evolucoes', true, true, true, true, 'all'),
  ('SECRETARIA', 'evolucoes', false, false, false, false, 'all'),
  ('PROFISSIONAL', 'evolucoes', false, false, false, false, 'all')
ON CONFLICT (role, resource) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_update = EXCLUDED.can_update,
  can_delete = EXCLUDED.can_delete;

-- 6. RLS POLICIES
ALTER TABLE public.evolution_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Has perms to view packs" ON public.evolution_packs
    FOR SELECT USING (has_permission('evolucoes', 'view'));

CREATE POLICY "Has perms to manage packs" ON public.evolution_packs
    FOR ALL USING (has_permission('evolucoes', 'update'));

CREATE POLICY "Has perms to view evolutions" ON public.evolutions
    FOR SELECT USING (has_permission('evolucoes', 'view'));

CREATE POLICY "Has perms to manage evolutions" ON public.evolutions
    FOR ALL USING (has_permission('evolucoes', 'update'));

-- 7. STORED PROCEDURE FOR ROLLOVER
-- Ensures atomic rollover of packs when weight is exceeded
CREATE OR REPLACE FUNCTION public.create_evolution_with_rollover(
    p_title TEXT,
    p_description TEXT,
    p_weight INTEGER,
    p_category TEXT,
    p_status TEXT DEFAULT 'BACKLOG'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_open_pack_id UUID;
    v_open_pack_number INTEGER;
    v_open_pack_max_weight INTEGER;
    v_current_weight INTEGER;
    v_new_pack_id UUID;
    v_result JSONB;
BEGIN
    -- Validate weight
    IF p_weight < 1 THEN p_weight := 1; END IF;

    -- 1. Find the current OPEN pack
    SELECT id, number, max_weight INTO v_open_pack_id, v_open_pack_number, v_open_pack_max_weight
    FROM public.evolution_packs
    WHERE status = 'OPEN'
    ORDER BY number DESC
    LIMIT 1;

    -- 2. If no pack exists, create Pack #1
    IF v_open_pack_id IS NULL THEN
        INSERT INTO public.evolution_packs (number, status)
        VALUES (1, 'OPEN')
        RETURNING id, number, max_weight INTO v_open_pack_id, v_open_pack_number, v_open_pack_max_weight;
    END IF;

    -- 3. Calculate current weight of the pack
    SELECT COALESCE(SUM(weight), 0) INTO v_current_weight
    FROM public.evolutions
    WHERE pack_id = v_open_pack_id;

    -- 4. Check if new evolution exceeds max weight
    IF (v_current_weight + p_weight) > v_open_pack_max_weight THEN
        -- Close current pack
        UPDATE public.evolution_packs
        SET status = 'CLOSED', completed_at = now()
        WHERE id = v_open_pack_id;

        -- Create NEW pack
        INSERT INTO public.evolution_packs (number, status)
        VALUES (v_open_pack_number + 1, 'OPEN')
        RETURNING id INTO v_new_pack_id;

        v_open_pack_id := v_new_pack_id;
    END IF;

    -- 5. Insert the evolution
    INSERT INTO public.evolutions (pack_id, title, description, weight, category, status)
    VALUES (v_open_pack_id, p_title, p_description, p_weight, p_category, p_status::public.evolution_status_v2)
    RETURNING jsonb_build_object('id', id, 'title', title, 'pack_id', pack_id) INTO v_result;

    RETURN v_result;
END;
$$;
