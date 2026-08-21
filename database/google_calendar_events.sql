-- Migration: Google Calendar Event Mapping for Idempotent Sync
CREATE TABLE IF NOT EXISTS public.google_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'default',
    source_type TEXT NOT NULL, -- 'RESERVA', 'OPERACIONAL', 'BLOQUEIO', 'RECORRENTE'
    source_id TEXT NOT NULL, -- Unique ID of internal entity (e.g. res_123, op_456, block_789)
    google_calendar_id TEXT NOT NULL DEFAULT 'primary',
    google_event_id TEXT NOT NULL,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_status TEXT NOT NULL DEFAULT 'SYNCED', -- 'SYNCED', 'ERROR', 'PENDING', 'CANCELLED'
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_google_calendar_source UNIQUE (source_type, source_id, google_calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_events_source ON public.google_calendar_events (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_google_id ON public.google_calendar_events (google_event_id);
