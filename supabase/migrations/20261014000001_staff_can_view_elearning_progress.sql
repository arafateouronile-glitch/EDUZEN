-- Permet au staff (admin/formateur/secrétaire/comptable/super_admin) de voir
-- la progression e-learning et les résultats de quiz des apprenants de SA
-- propre organisation — utilisé par l'onglet "Espace apprenant" > suivi
-- e-learning d'une session (components/session-elearning-section.tsx).
--
-- Jusqu'ici, les seules policies SELECT sur lesson_progress/quiz_attempts
-- étaient : l'apprenant lisant sa propre ligne (mécanisme anon + header
-- x-learner-student-id), et "l'instructeur propriétaire du cours"
-- (courses.instructor_id = auth.uid(), jamais renseigné en pratique). Un
-- admin/formateur authentifié consultant la progression d'un AUTRE
-- apprenant recevait donc 0 ligne — d'où 0% / 0 leçon affiché partout côté
-- dashboard, alors que les données existent réellement (vérifié en direct
-- sur la base le 14/10/2026).

CREATE OR REPLACE FUNCTION public.is_staff_for_student(p_student_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.users u ON u.organization_id = s.organization_id
    WHERE s.id = p_student_id
      AND u.id = p_user_id
      AND u.role IN ('super_admin', 'admin', 'teacher', 'secretary', 'accountant')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_staff_for_student(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.is_staff_for_student(uuid, uuid) IS
  'Vrai si p_user_id est un membre staff (admin/formateur/secrétaire/comptable/super_admin) de la même organisation que l''apprenant p_student_id.';

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view lesson progress of their organization students" ON public.lesson_progress;
CREATE POLICY "Staff can view lesson progress of their organization students"
  ON public.lesson_progress FOR SELECT
  TO authenticated
  USING (public.is_staff_for_student(lesson_progress.student_id, auth.uid()));

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view quiz attempts of their organization students" ON public.quiz_attempts;
CREATE POLICY "Staff can view quiz attempts of their organization students"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (public.is_staff_for_student(quiz_attempts.student_id, auth.uid()));
