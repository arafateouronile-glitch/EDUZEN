-- Ensure lesson_progress supports upsert via PostgREST on_conflict=lesson_id,student_id
-- Fixes 409 Conflict "no unique constraint matching ON CONFLICT" on lesson_progress upsert.

-- Create the unique index used by ON CONFLICT inference (safe if it already exists).
CREATE UNIQUE INDEX IF NOT EXISTS lesson_progress_lesson_id_student_id_uniq
  ON public.lesson_progress (lesson_id, student_id);






