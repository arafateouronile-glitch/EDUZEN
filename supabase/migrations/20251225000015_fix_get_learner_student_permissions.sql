-- Migration pour s'assurer que la fonction get_learner_student a les bonnes permissions
-- et qu'elle fonctionne correctement

-- 1. Recréer la fonction avec les bonnes permissions
CREATE OR REPLACE FUNCTION public.get_learner_student(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  student_record jsonb;
BEGIN
  -- Vérifier que p_student_id n'est pas NULL
  IF p_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Avec SECURITY DEFINER, on peut accéder directement à la table sans RLS
  -- Récupérer les données de l'étudiant et les retourner en JSON
  SELECT to_jsonb(s.*)
  INTO student_record
  FROM public.students s
  WHERE s.id = p_student_id;
  
  -- Si aucun étudiant trouvé, retourner NULL
  IF student_record IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN student_record;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner NULL au lieu de lever une exception
    -- Cela permet au client de gérer l'erreur gracieusement
    -- Log l'erreur pour le débogage (visible dans les logs Supabase)
    RAISE WARNING 'Erreur dans get_learner_student: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- 2. S'assurer que les permissions sont correctes
GRANT EXECUTE ON FUNCTION public.get_learner_student(uuid) TO anon, authenticated;

-- 3. Vérifier que la fonction existe et a les bonnes permissions
DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_anon_can_execute BOOLEAN;
  v_authenticated_can_execute BOOLEAN;
BEGIN
  -- Vérifier que la fonction existe
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_learner_student' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO v_function_exists;
  
  IF NOT v_function_exists THEN
    RAISE EXCEPTION 'La fonction get_learner_student n''existe pas';
  END IF;
  
  -- Vérifier les permissions
  SELECT has_function_privilege('anon', 'public.get_learner_student(uuid)', 'EXECUTE') INTO v_anon_can_execute;
  SELECT has_function_privilege('authenticated', 'public.get_learner_student(uuid)', 'EXECUTE') INTO v_authenticated_can_execute;
  
  IF NOT v_anon_can_execute THEN
    RAISE WARNING 'Le rôle anon ne peut pas exécuter get_learner_student';
  END IF;
  
  IF NOT v_authenticated_can_execute THEN
    RAISE WARNING 'Le rôle authenticated ne peut pas exécuter get_learner_student';
  END IF;
  
  RAISE NOTICE 'Fonction get_learner_student créée avec succès. Permissions: anon=%, authenticated=%', v_anon_can_execute, v_authenticated_can_execute;
END $$;

-- Commentaire mis à jour
COMMENT ON FUNCTION public.get_learner_student(uuid) IS 
  'Fonction RPC pour récupérer les données d''un étudiant. Utilise SECURITY DEFINER pour bypasser RLS. Retourne NULL si l''étudiant n''existe pas ou en cas d''erreur.';



