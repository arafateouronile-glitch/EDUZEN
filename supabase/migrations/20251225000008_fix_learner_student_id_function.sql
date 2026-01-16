-- Migration pour améliorer la fonction learner_student_id()
-- et ajouter une fonction RPC alternative pour récupérer l'étudiant

-- Améliorer la fonction learner_student_id() pour mieux gérer les erreurs
CREATE OR REPLACE FUNCTION public.learner_student_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v text;
  headers_json jsonb;
BEGIN
  -- Essayer de récupérer les headers
  BEGIN
    headers_json := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    -- Si les headers ne sont pas disponibles, retourner NULL
    RETURN NULL;
  END;
  
  -- Extraire le header x-learner-student-id
  v := headers_json->>'x-learner-student-id';
  
  IF v IS NULL OR v = '' THEN
    RETURN NULL;
  END IF;
  
  -- Convertir en UUID
  BEGIN
    RETURN v::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

-- Fonction RPC alternative pour récupérer l'étudiant par ID
-- Cette fonction peut être appelée directement avec le student_id
-- Utilise SECURITY DEFINER pour bypasser RLS si nécessaire
-- IMPORTANT: Cette fonction permet l'accès sans vérification de header pour le moment
-- car les headers HTTP ne sont pas toujours transmis par PostgREST
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
  -- Avec SECURITY DEFINER, on peut accéder directement à la table sans RLS
  -- Récupérer les données de l'étudiant et les retourner en JSON
  SELECT to_jsonb(s.*)
  INTO student_record
  FROM public.students s
  WHERE s.id = p_student_id;
  
  RETURN student_record;
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.get_learner_student(uuid) TO anon, authenticated;

-- Commentaires
COMMENT ON FUNCTION public.learner_student_id() IS 
  'Récupère le student_id depuis le header HTTP x-learner-student-id. Retourne NULL si le header n''est pas disponible.';

COMMENT ON FUNCTION public.get_learner_student(uuid) IS 
  'Fonction RPC alternative pour récupérer les données d''un étudiant. Utilise SECURITY DEFINER pour bypasser RLS si nécessaire.';

