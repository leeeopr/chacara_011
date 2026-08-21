-- SQL Audit & Fix for Appointment Validation
-- This script fixes the stale end_time issue and improves the trigger reliability

-- 1. Correct the trigger function to ALWAYS recalculate end_time on relevant changes
CREATE OR REPLACE FUNCTION public.calculate_appointment_end_time()
RETURNS TRIGGER AS $$
DECLARE
    v_duration INTEGER;
    v_end_time_ts TIMESTAMP;
BEGIN
    -- Recalculate if:
    -- - It's a new record (INSERT)
    -- - appointment_type_id changed (UPDATE)
    -- - start_time changed (UPDATE)
    -- - end_time is NULL (recovery)
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
                -- Format back to "HH24:MI"
                NEW.end_time := to_char(v_end_time_ts, 'HH24:MI');
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Ensure trigger is attached (DROP first to be clean)
DROP TRIGGER IF EXISTS trigger_calculate_end_time ON public.appointments;
CREATE TRIGGER trigger_calculate_end_time
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.calculate_appointment_end_time();

-- 3. Data Integrity Fix: Update all existing records that might have stale end_time
-- This fixes existing "false positives" in the database
UPDATE public.appointments a
SET end_time = to_char(('2000-01-01 ' || a.start_time)::TIMESTAMP + (at.duration_minutes || ' minutes')::INTERVAL, 'HH24:MI')
FROM public.appointment_types at
WHERE a.appointment_type_id = at.id
AND a.end_time IS DISTINCT FROM to_char(('2000-01-01 ' || a.start_time)::TIMESTAMP + (at.duration_minutes || ' minutes')::INTERVAL, 'HH24:MI');

-- 4. Audit: Verify if there are any remaining null end_times
-- SELECT count(*) FROM public.appointments WHERE end_time IS NULL;
