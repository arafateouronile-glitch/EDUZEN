-- Fix learner progress writes:
-- In the initial e-learning migration, lesson_progress.student_id references auth.users(id),
-- but EDUZEN uses public.students(id) for learners. This causes POST /lesson_progress to fail (409) for learners.

DO $$
BEGIN
  -- Drop the default FK if it exists (created by REFERENCES auth.users)
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lesson_progress_student_id_fkey'
      AND conrelid = 'public.lesson_progress'::regclass
  ) THEN
    ALTER TABLE public.lesson_progress
      DROP CONSTRAINT lesson_progress_student_id_fkey;
  END IF;

  -- Add FK to public.students if missing
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lesson_progress_student_id_fkey'
      AND conrelid = 'public.lesson_progress'::regclass
  ) THEN
    ALTER TABLE public.lesson_progress
      ADD CONSTRAINT lesson_progress_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
END $$;






