-- Fix: scorm_sessions.student_id référençait public.students(id)
-- ce qui exclut les instructeurs (présents dans auth.users mais pas students)
-- et causait un 500 quand un instructeur prévisualisait un contenu SCORM.
-- On supprime la FK restrictive et on laisse la contrainte RLS gérer l'accès.

ALTER TABLE public.scorm_sessions
  DROP CONSTRAINT IF EXISTS scorm_sessions_student_id_fkey;
