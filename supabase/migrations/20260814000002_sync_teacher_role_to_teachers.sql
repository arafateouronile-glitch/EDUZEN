-- Un utilisateur créé/modifié avec role='teacher' via /dashboard/settings/users
-- ne créait jamais de ligne dans public.teachers (seule la table users.role était
-- écrite). Or /dashboard/formateurs lit exclusivement public.teachers : ces
-- enseignants existaient donc bien (visibles dans Settings > Utilisateurs) mais
-- n'apparaissaient jamais sur la page Formateurs.
--
-- 1) Backfill : crée les lignes teachers manquantes pour les users role='teacher'
--    existants (sans toucher aux lignes déjà présentes).
-- 2) Trigger : synchronise automatiquement pour toute création/modification future.

INSERT INTO public.teachers (user_id, organization_id, is_active)
SELECT u.id, u.organization_id, u.is_active
FROM public.users u
WHERE u.role = 'teacher' AND u.organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_teacher_from_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'teacher' AND NEW.organization_id IS NOT NULL THEN
    INSERT INTO public.teachers (user_id, organization_id, is_active)
    VALUES (NEW.id, NEW.organization_id, NEW.is_active)
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = NOW();
  ELSIF TG_OP = 'UPDATE' AND OLD.role = 'teacher' AND NEW.role <> 'teacher' THEN
    -- Le rôle a changé : on désactive la fiche formateur plutôt que de la
    -- supprimer, pour ne pas perdre l'historique de documents/conformité.
    UPDATE public.teachers
    SET is_active = false, updated_at = NOW()
    WHERE user_id = NEW.id AND organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_teacher_from_user ON public.users;
CREATE TRIGGER trigger_sync_teacher_from_user
  AFTER INSERT OR UPDATE OF role, is_active, organization_id ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_teacher_from_user();

COMMENT ON FUNCTION public.sync_teacher_from_user() IS 'Crée/désactive automatiquement la fiche public.teachers en fonction de users.role (=teacher) et users.is_active';
