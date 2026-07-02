-- Supprime la FK lesson_progress.student_id → public.students
-- Les instructeurs (admins) ne sont pas dans public.students mais doivent
-- pouvoir écrire dans lesson_progress quand ils testent les leçons.
-- Sans FK, student_id reste libre (auth.uid()).
ALTER TABLE public.lesson_progress
  DROP CONSTRAINT IF EXISTS lesson_progress_student_id_fkey;
