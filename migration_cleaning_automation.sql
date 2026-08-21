-- =========================================================
-- MIGRATION: AUTOMAÇÃO DE SERVIÇOS DE LIMPEZA PRÉ CHECK-IN
-- =========================================================

-- 1. ÍNDICE DE DESEMPENHO PARA BUSCA DE EVENTOS POR RESERVA
CREATE INDEX IF NOT EXISTS idx_operational_events_reservation_id 
ON public.operational_events(reservation_id);

CREATE INDEX IF NOT EXISTS idx_operational_events_event_type_code 
ON public.operational_events(event_type_code);

-- 2. GARANTIR TIPO DE EVENTO 'LIMPEZA' EM operational_event_types
INSERT INTO public.operational_event_types (id, code, name, color, icon, priority, is_system, description)
VALUES (
  'e62b8a21-74f1-4b72-9a08-46f9f3152062'::uuid,
  'limpeza',
  'Limpeza',
  '#3B82F6',
  'Sparkles',
  10,
  true,
  'Higienização e faxina pré e pós check-in'
)
ON CONFLICT (code) DO NOTHING;

-- 3. FUNÇÃO TRIGGER NO BANCO DE DADOS (OPCIONAL SERVERSIDE SYNC)
CREATE OR REPLACE FUNCTION public.trg_auto_schedule_cleaning_on_reservation()
RETURNS TRIGGER AS $$
DECLARE
  v_cleaning_date DATE;
  v_chacara_name VARCHAR(150);
  v_event_type_id UUID;
  v_cleaning_event_id UUID;
  v_is_manual_override BOOLEAN := FALSE;
  v_staff_ids UUID[] := '{}';
  v_staff_names TEXT[] := '{}';
BEGIN
  -- Apenas processar para reservas confirmadas ou em andamento
  IF (NEW.status IN ('CONFIRMADA', 'CHECKIN_REALIZADO', 'HOSPEDADO', 'CHECKOUT_REALIZADO', 'FINALIZADA')) 
     AND (NEW.is_deleted IS NOT TRUE) THEN
     
    -- Data da limpeza = 1 dia antes do Check-in
    v_cleaning_date := (NEW.checkin_date - INTERVAL '1 day')::DATE;

    -- Obter nome da chácara
    SELECT name INTO v_chacara_name FROM public.chacaras WHERE id = NEW.chacara_id;
    IF v_chacara_name IS NULL THEN
      v_chacara_name := 'Chácara';
    END IF;

    -- Obter tipo de evento de limpeza
    SELECT id INTO v_event_type_id FROM public.operational_event_types WHERE code = 'limpeza' LIMIT 1;

    -- Obter funcionários de limpeza vinculados a esta chácara
    SELECT 
      COALESCE(array_agg(cm.id), '{}'),
      COALESCE(array_agg(cm.nome), '{}')
    INTO v_staff_ids, v_staff_names
    FROM public.crew_members cm
    JOIN public.property_crew pc ON pc.member_id = cm.id
    JOIN public.crew_member_roles cmr ON cmr.member_id = cm.id
    JOIN public.crew_roles cr ON cr.id = cmr.role_id
    WHERE pc.chacara_id = NEW.chacara_id
      AND cm.ativo IS NOT FALSE
      AND (
        LOWER(cr.nome) LIKE '%limpeza%' OR 
        LOWER(cr.nome) LIKE '%faxina%' OR 
        LOWER(cr.nome) LIKE '%camareira%'
      );

    -- Verificar se já existe agendamento automático para esta reserva
    SELECT id, COALESCE((metadata->>'is_manual_override')::BOOLEAN, FALSE)
    INTO v_cleaning_event_id, v_is_manual_override
    FROM public.operational_events
    WHERE reservation_id = NEW.id
      AND (event_type_code = 'limpeza' OR metadata->>'type' = 'LIMPEZA_PRE_CHECKIN')
    LIMIT 1;

    -- Se existis e for alteração manual, respeita o usuário
    IF v_cleaning_event_id IS NOT NULL THEN
      IF NOT v_is_manual_override THEN
        UPDATE public.operational_events
        SET 
          chacara_id = NEW.chacara_id,
          chacara_name = v_chacara_name,
          start_date = v_cleaning_date,
          end_date = v_cleaning_date,
          title = 'Limpeza Pré Check-in - ' || v_chacara_name || ' (Reserva #' || NEW.code || ')',
          status = CASE WHEN status = 'CANCELADO' THEN 'AGENDADO' ELSE status END,
          staff_ids = CASE WHEN array_length(v_staff_ids, 1) > 0 THEN v_staff_ids ELSE staff_ids END,
          staff_names = CASE WHEN array_length(v_staff_names, 1) > 0 THEN v_staff_names ELSE staff_names END,
          metadata = jsonb_build_object(
            'origin', 'AUTOMATICA',
            'type', 'LIMPEZA_PRE_CHECKIN',
            'is_manual_override', false,
            'reservation_code', NEW.code,
            'checkin_date', NEW.checkin_date,
            'updated_at', NOW()
          ),
          updated_at = NOW()
        WHERE id = v_cleaning_event_id;
      END IF;
    ELSIF array_length(v_staff_ids, 1) > 0 THEN
      -- Se não existe e tem equipe de limpeza, cria evento
      INSERT INTO public.operational_events (
        chacara_id,
        chacara_name,
        event_type_code,
        event_type_id,
        title,
        description,
        start_date,
        start_time,
        end_date,
        end_time,
        status,
        staff_ids,
        staff_names,
        reservation_id,
        metadata
      ) VALUES (
        NEW.chacara_id,
        v_chacara_name,
        'limpeza',
        v_event_type_id,
        'Limpeza Pré Check-in - ' || v_chacara_name || ' (Reserva #' || NEW.code || ')',
        'Agendamento automático de limpeza 1 dia antes do check-in da reserva #' || NEW.code,
        v_cleaning_date,
        '08:00',
        v_cleaning_date,
        '12:00',
        'AGENDADO',
        v_staff_ids,
        v_staff_names,
        NEW.id,
        jsonb_build_object(
          'origin', 'AUTOMATICA',
          'type', 'LIMPEZA_PRE_CHECKIN',
          'is_manual_override', false,
          'reservation_code', NEW.code,
          'checkin_date', NEW.checkin_date,
          'created_at', NOW()
        )
      );
    END IF;

  ELSIF (NEW.status IN ('CANCELADA', 'NO_SHOW') OR NEW.is_deleted IS TRUE) THEN
    -- Se a reserva for cancelada ou excluída, cancela o serviço automático
    UPDATE public.operational_events
    SET 
      status = 'CANCELADO',
      updated_at = NOW()
    WHERE reservation_id = NEW.id
      AND metadata->>'type' = 'LIMPEZA_PRE_CHECKIN';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. VINCULAR TRIGGER À TABELA DE RESERVAS
DROP TRIGGER IF EXISTS trg_reservation_cleaning_automation ON public.reservations;

CREATE TRIGGER trg_reservation_cleaning_automation
AFTER INSERT OR UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_schedule_cleaning_on_reservation();
