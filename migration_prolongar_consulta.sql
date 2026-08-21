-- Migration to add columns for Prolongar Consulta (Continuation of appointment)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS parent_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_continuation BOOLEAN DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS continuation_notes TEXT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_prolonged BOOLEAN DEFAULT FALSE;
