-- Migration pour corriger les relations courses ↔ users
-- Problème : instructor_id référence auth.users au lieu de public.users
-- Solution : Corriger la foreign key pour utiliser public.users

-- 1. Supprimer l'ancienne contrainte si elle existe
ALTER TABLE IF EXISTS public.courses 
  DROP CONSTRAINT IF EXISTS courses_instructor_id_fkey;

-- 2. Ajouter la nouvelle contrainte vers public.users
ALTER TABLE public.courses
  ADD CONSTRAINT courses_instructor_id_fkey 
  FOREIGN KEY (instructor_id) 
  REFERENCES public.users(id) 
  ON DELETE SET NULL;

-- 3. Vérifier que la relation fonctionne
-- Cette requête devrait fonctionner maintenant :
-- SELECT * FROM courses c JOIN users u ON c.instructor_id = u.id;

-- 4. Mettre à jour les RLS policies pour utiliser public.users
-- (Les policies existantes devraient déjà fonctionner, mais on les vérifie)

-- Note : Les autres tables (course_enrollments, quiz_attempts, etc.) 
-- qui référencent auth.users(id) pour student_id sont correctes
-- car student_id correspond à l'ID de l'utilisateur authentifié (auth.uid())





