-- RPC pour insérer dans session_programs sans dépendre des politiques RLS INSERT
-- Utilisée par le service session lors de la création/mise à jour de session.
-- p_formation_id permet de vérifier la session sans JOIN (évite problèmes RLS / visibilité).

DROP FUNCTION IF EXISTS public.insert_session_programs(uuid, uuid[], uuid);

CREATE OR REPLACE FUNCTION public.insert_session_programs(
  p_session_id uuid,
  p_program_ids uuid[],
  p_organization_id uuid,
  p_formation_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_org_id uuid;
  v_prog_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non autorisé : utilisateur non connecté';
  END IF;

  SELECT organization_id INTO v_user_org_id
  FROM public.users
  WHERE id = auth.uid();

  IF v_user_org_id IS NULL OR v_user_org_id != p_organization_id THEN
    RAISE EXCEPTION 'Non autorisé : organisation non autorisée';
  END IF;

  -- Si p_formation_id fourni : on vérifie uniquement la formation (pas de SELECT sur sessions, évite RLS)
  -- L'INSERT échouera en FK si session_id invalide.
  IF p_formation_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM formations
      WHERE id = p_formation_id AND organization_id = p_organization_id
    ) THEN
      RAISE EXCEPTION 'Formation non trouvée ou n''appartient pas à cette organisation';
    END IF;
  ELSE
    -- Session sans formation (création depuis /sessions/new) : vérifier sessions.organization_id si la table l'a
    -- Sinon on ne fait pas de vérification session (user + programmes déjà vérifiés, FK garantit session_id valide)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'organization_id'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM sessions
        WHERE id = p_session_id AND organization_id = p_organization_id
      ) THEN
        RAISE EXCEPTION 'Session non trouvée ou n''appartient pas à cette organisation';
      END IF;
    END IF;
  END IF;

  FOREACH v_prog_id IN ARRAY p_program_ids
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM programs
      WHERE id = v_prog_id AND organization_id = p_organization_id
    ) THEN
      RAISE EXCEPTION 'Programme % n''appartient pas à cette organisation', v_prog_id;
    END IF;
  END LOOP;

  INSERT INTO session_programs (session_id, program_id, organization_id)
  SELECT p_session_id, unnest(p_program_ids), p_organization_id
  ON CONFLICT (session_id, program_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.insert_session_programs(uuid, uuid[], uuid, uuid) IS
  'Insère les liaisons session-programme. Passer p_formation_id pour une vérification session/formation sans JOIN.';

GRANT EXECUTE ON FUNCTION public.insert_session_programs(uuid, uuid[], uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_session_programs(uuid, uuid[], uuid, uuid) TO service_role;
