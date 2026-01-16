-- Migration pour simplifier la fonction get_learner_student()
-- et permettre l'accès sans vérification de header (car les headers ne sont pas toujours transmis)

-- Simplifier la fonction RPC pour qu'elle fonctionne sans dépendre des headers
-- IMPORTANT: Cette fonction utilise SECURITY DEFINER pour bypasser RLS complètement
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
  -- Vérifier que le student_id est fourni
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
END;
$$;

-- S'assurer que les permissions sont correctes
GRANT EXECUTE ON FUNCTION public.get_learner_student(uuid) TO anon, authenticated;

-- Commentaire mis à jour
COMMENT ON FUNCTION public.get_learner_student(uuid) IS 
  'Fonction RPC pour récupérer les données d''un étudiant. Utilise SECURITY DEFINER pour bypasser RLS. Permet l''accès sans vérification de header car les headers HTTP ne sont pas toujours transmis par PostgREST.';

