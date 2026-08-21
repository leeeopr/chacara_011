-- ==============================================================================
-- SCRIPT DE RECONCILIAÇÃO E VINCULAÇÃO AUTOMÁTICA DE FUNCIONÁRIOS ÀS RESERVAS
-- ==============================================================================
-- Este script corrige os erros de tipo (UUID vs TEXT e comparação com string vazia '').

-- 1. Vincular automaticamente a partir dos Eventos Operacionais (operational_events)
-- onde reservation_id NÃO é nulo e possui staff_ids preenchidos.

DO $$
DECLARE
    rec RECORD;
    v_staff_names TEXT[];
BEGIN
    FOR rec IN 
        SELECT 
            oe.reservation_id,
            ARRAY_AGG(DISTINCT s_id) AS aggregated_staff_ids
        FROM public.operational_events oe,
             UNNEST(oe.staff_ids) AS s_id
        WHERE oe.reservation_id IS NOT NULL
        GROUP BY oe.reservation_id
    LOOP
        -- Buscar nomes dos colaboradores correspondentes aos IDs
        SELECT ARRAY_AGG(COALESCE(cm.nome, cm.name, 'Funcionário'))
        INTO v_staff_names
        FROM UNNEST(rec.aggregated_staff_ids) AS sid
        LEFT JOIN public.crew_members cm ON cm.id::text = sid::text;

        -- Atualizar a reserva com os IDs e Nomes encontrados
        UPDATE public.reservations
        SET 
            staff_ids = rec.aggregated_staff_ids,
            staff_names = COALESCE(v_staff_names, '{}'::text[]),
            primary_staff_id = rec.aggregated_staff_ids[1]
        WHERE id = rec.reservation_id
          AND (staff_ids IS NULL OR CARDINALITY(staff_ids) = 0);
    END LOOP;
END $$;

-- 2. Vincular automaticamente a partir da Equipe Fixo da Chácara (property_crew)
-- para chácaras que possuem EXATAMENTE 1 funcionário responsável atribuído.

DO $$
DECLARE
    res_rec RECORD;
    v_member_id UUID;
    v_member_name TEXT;
BEGIN
    FOR res_rec IN 
        SELECT r.id AS res_id, r.chacara_id
        FROM public.reservations r
        WHERE (r.staff_ids IS NULL OR CARDINALITY(r.staff_ids) = 0)
          AND r.is_deleted = false
    LOOP
        -- Verificar se a chácara possui apenas 1 funcionário cadastrado
        IF (SELECT COUNT(*) FROM public.property_crew WHERE (chacara_id = res_rec.chacara_id OR property_id = res_rec.chacara_id)) = 1 THEN
            
            SELECT COALESCE(pc.member_id, pc.crew_member_id) INTO v_member_id
            FROM public.property_crew pc
            WHERE (pc.chacara_id = res_rec.chacara_id OR pc.property_id = res_rec.chacara_id)
            LIMIT 1;

            IF v_member_id IS NOT NULL THEN
                SELECT COALESCE(nome, name, 'Funcionário') INTO v_member_name
                FROM public.crew_members
                WHERE id = v_member_id;

                UPDATE public.reservations
                SET 
                    staff_ids = ARRAY[v_member_id],
                    staff_names = ARRAY[COALESCE(v_member_name, 'Funcionário')],
                    primary_staff_id = v_member_id
                WHERE id = res_rec.res_id;
            END IF;
        END IF;
    END LOOP;
END $$;

-- Consulta de verificação do resultado da reconciliação
SELECT 
    r.id AS reservation_id,
    r.code AS reservation_code,
    c.name AS chacara_name,
    r.checkin_date,
    r.checkout_date,
    r.staff_ids,
    r.staff_names,
    CASE 
        WHEN r.staff_ids IS NOT NULL AND CARDINALITY(r.staff_ids) > 0 THEN 'VINCULADO'
        ELSE 'SEM_FUNCIONARIO_DEFINIDO'
    END AS status_vinculo
FROM public.reservations r
LEFT JOIN public.chacaras c ON c.id = r.chacara_id
WHERE r.is_deleted = false
ORDER BY r.checkin_date DESC;
