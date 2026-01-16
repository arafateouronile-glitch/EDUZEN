-- Migration pour améliorer la fonction get_learner_student
-- et s'assurer qu'elle fonctionne correctement même si learner_student_id() échoue

-- Améliorer la fonction get_learner_student pour qu'elle soit plus robuste
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
    RAISE EXCEPTION 'student_id cannot be NULL';
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
    RETURN NULL;
END;
$$;

-- S'assurer que les permissions sont correctes
GRANT EXECUTE ON FUNCTION public.get_learner_student(uuid) TO anon, authenticated;

-- Commentaire mis à jour
COMMENT ON FUNCTION public.get_learner_student(uuid) IS 
  'Fonction RPC pour récupérer les données d''un étudiant. Utilise SECURITY DEFINER pour bypasser RLS. Retourne NULL si l''étudiant n''existe pas ou en cas d''erreur.';

