-- 1. Create Recurring Schedules Table
CREATE TABLE IF NOT EXISTS public.recurring_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- references profiles(id)
    clinic_id UUID DEFAULT NULL, -- Nullable, used if clinics are implemented
    frequency_type TEXT NOT NULL CHECK (frequency_type IN ('WEEKLY', 'BIWEEKLY', 'CUSTOM_INTERVAL')),
    interval_value INTEGER DEFAULT 1,
    weekdays INTEGER[] NOT NULL, -- 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 0=Sunday
    start_time TEXT NOT NULL, -- "HH:mm"
    duration INTEGER NOT NULL, -- duration in minutes
    starts_at DATE NOT NULL,
    ends_at DATE DEFAULT NULL,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ENDED')),
    parent_schedule_id UUID REFERENCES public.recurring_schedules(id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1,
    appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 2. Create Schedule Occurrences Table
CREATE TABLE IF NOT EXISTS public.schedule_occurrences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recurring_schedule_id UUID REFERENCES public.recurring_schedules(id) ON DELETE CASCADE NOT NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    occurrence_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'GENERATED', 'CANCELLED')),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    superseded_by UUID REFERENCES public.schedule_occurrences(id) ON DELETE SET NULL
);

-- 3. Create Schedule Exceptions Table
CREATE TABLE IF NOT EXISTS public.schedule_exceptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    occurrence_id UUID REFERENCES public.schedule_occurrences(id) ON DELETE CASCADE NOT NULL,
    original_date DATE NOT NULL,
    new_date DATE DEFAULT NULL,
    reason TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'CANCELLED' CHECK (status IN ('CANCELLED', 'RESCHEDULED', 'BLOCKED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Alter existing appointments table to link recurring schedule
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS recurring_schedule_id UUID REFERENCES public.recurring_schedules(id) ON DELETE SET NULL;

-- 5. Create Indices for Performance
CREATE INDEX IF NOT EXISTS idx_rec_sched_patient ON public.recurring_schedules(patient_id);
CREATE INDEX IF NOT EXISTS idx_rec_sched_prof ON public.recurring_schedules(professional_id);
CREATE INDEX IF NOT EXISTS idx_rec_sched_dates ON public.recurring_schedules(starts_at, ends_at, effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_sched_occur_schedule ON public.schedule_occurrences(recurring_schedule_id);
CREATE INDEX IF NOT EXISTS idx_sched_occur_date ON public.schedule_occurrences(occurrence_date);
CREATE INDEX IF NOT EXISTS idx_sched_occur_appt ON public.schedule_occurrences(appointment_id);
CREATE INDEX IF NOT EXISTS idx_sched_exceptions_occur ON public.schedule_exceptions(occurrence_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies (Grants access to authenticated users matching app pattern)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.recurring_schedules;
CREATE POLICY "Enable all access for authenticated users" ON public.recurring_schedules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.schedule_occurrences;
CREATE POLICY "Enable all access for authenticated users" ON public.schedule_occurrences
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.schedule_exceptions;
CREATE POLICY "Enable all access for authenticated users" ON public.schedule_exceptions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
