-- Migration pour corriger la politique RLS pour students afin d'utiliser learner_student_id()
-- au lieu d'accéder directement aux headers

-- Note: La fonction learner_student_id() existe déjà dans la migration 20251217000009
-- Elle gère mieux les erreurs et est plus robuste que l'accès direct aux headers

-- Mettre à jour la politique RLS pour students
DROP POLICY IF EXISTS "Learners can view their student profile via header" ON public.students;

CREATE POLICY "Learners can view their student profile via header"
  ON public.students
  FOR SELECT
  USING (
    -- Utiliser la fonction learner_student_id() qui gère mieux les erreurs
    id = public.learner_student_id()
  );

-- Commentaire
COMMENT ON POLICY "Learners can view their student profile via header" ON public.students IS 
  'Permet aux étudiants d''accéder à leurs propres données via le header x-learner-student-id. Utilise la fonction learner_student_id() pour une meilleure gestion des erreurs.';



