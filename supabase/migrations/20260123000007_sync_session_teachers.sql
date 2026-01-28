-- Migration pour synchroniser session_teachers avec le champ teacher_id des sessions
-- Cette migration crée les entrées manquantes dans session_teachers pour les sessions
-- qui ont un teacher_id mais pas d'entrée correspondante dans session_teachers

-- S'assurer que la contrainte UNIQUE existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'session_teachers_session_id_teacher_id_key'
    ) THEN
        ALTER TABLE public.session_teachers 
        ADD CONSTRAINT session_teachers_session_id_teacher_id_key 
        UNIQUE(session_id, teacher_id);
    END IF;
END $$;

-- Fonction pour synchroniser les assignations existantes
CREATE OR REPLACE FUNCTION sync_session_teachers_from_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_session RECORD;
BEGIN
    -- Parcourir toutes les sessions qui ont un teacher_id mais pas d'entrée dans session_teachers
    FOR v_session IN
        SELECT s.id, s.teacher_id
        FROM public.sessions s
        WHERE s.teacher_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1
            FROM public.session_teachers st
            WHERE st.session_id = s.id
            AND st.teacher_id = s.teacher_id
        )
    LOOP
        -- Créer l'entrée dans session_teachers
        -- Utiliser une approche avec vérification explicite pour éviter les conflits
        BEGIN
            INSERT INTO public.session_teachers (
                session_id,
                teacher_id,
                role,
                is_primary
            )
            VALUES (
                v_session.id,
                v_session.teacher_id,
                'instructor',
                true
            );
            v_count := v_count + 1;
        EXCEPTION
            WHEN unique_violation THEN
                -- L'entrée existe déjà, ignorer
                NULL;
        END;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- Exécuter la synchronisation
SELECT sync_session_teachers_from_sessions() AS sessions_synchronized;

-- Créer un trigger pour synchroniser automatiquement lors des insertions/updates
CREATE OR REPLACE FUNCTION sync_session_teachers_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Pour INSERT : créer l'entrée si teacher_id est défini
    IF TG_OP = 'INSERT' AND NEW.teacher_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.session_teachers (
                session_id,
                teacher_id,
                role,
                is_primary
            )
            VALUES (
                NEW.id,
                NEW.teacher_id,
                'instructor',
                true
            );
        EXCEPTION
            WHEN unique_violation THEN
                -- L'entrée existe déjà, mettre à jour si nécessaire
                UPDATE public.session_teachers
                SET role = 'instructor',
                    is_primary = true,
                    updated_at = NOW()
                WHERE session_id = NEW.id
                AND teacher_id = NEW.teacher_id;
        END;
    END IF;
    
    -- Pour UPDATE : gérer le changement de teacher_id
    IF TG_OP = 'UPDATE' AND (OLD.teacher_id IS DISTINCT FROM NEW.teacher_id) THEN
        -- Supprimer l'ancienne assignation si elle existe
        IF OLD.teacher_id IS NOT NULL THEN
            DELETE FROM public.session_teachers
            WHERE session_id = NEW.id
            AND teacher_id = OLD.teacher_id;
        END IF;
        
        -- Créer la nouvelle assignation si teacher_id est défini
        IF NEW.teacher_id IS NOT NULL THEN
            BEGIN
                INSERT INTO public.session_teachers (
                    session_id,
                    teacher_id,
                    role,
                    is_primary
                )
                VALUES (
                    NEW.id,
                    NEW.teacher_id,
                    'instructor',
                    true
                );
            EXCEPTION
                WHEN unique_violation THEN
                    -- L'entrée existe déjà, mettre à jour
                    UPDATE public.session_teachers
                    SET role = 'instructor',
                        is_primary = true,
                        updated_at = NOW()
                    WHERE session_id = NEW.id
                    AND teacher_id = NEW.teacher_id;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Créer le trigger sur la table sessions
-- Le trigger se déclenche sur INSERT et UPDATE (même si teacher_id n'est pas explicitement dans UPDATE OF)
-- car on vérifie dans la fonction si teacher_id a changé
DROP TRIGGER IF EXISTS trigger_sync_session_teachers ON public.sessions;
CREATE TRIGGER trigger_sync_session_teachers
    AFTER INSERT OR UPDATE ON public.sessions
    FOR EACH ROW
    WHEN (NEW.teacher_id IS DISTINCT FROM COALESCE(OLD.teacher_id, NULL))
    EXECUTE FUNCTION sync_session_teachers_trigger();

-- Commentaire pour documenter
COMMENT ON FUNCTION sync_session_teachers_from_sessions() IS 'Synchronise les sessions existantes avec teacher_id vers la table session_teachers';
COMMENT ON FUNCTION sync_session_teachers_trigger() IS 'Trigger automatique pour synchroniser session_teachers lors des insertions/updates de sessions';
