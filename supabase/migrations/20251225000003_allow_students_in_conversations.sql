-- Migration pour permettre aux étudiants (sans compte auth.users) de participer aux conversations
-- Ajoute une colonne student_id optionnelle à conversation_participants

-- 1. Ajouter la colonne student_id (optionnelle)
ALTER TABLE public.conversation_participants
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;

-- 2. Rendre user_id optionnel (au lieu de NOT NULL)
-- D'abord, supprimer la contrainte NOT NULL si elle existe
ALTER TABLE public.conversation_participants
ALTER COLUMN user_id DROP NOT NULL;

-- 3. Supprimer l'ancienne contrainte UNIQUE qui ne fonctionne qu'avec user_id
ALTER TABLE public.conversation_participants
DROP CONSTRAINT IF EXISTS conversation_participants_conversation_id_user_id_key;

-- 4. Ajouter une contrainte CHECK pour s'assurer qu'au moins user_id OU student_id est présent
ALTER TABLE public.conversation_participants
DROP CONSTRAINT IF EXISTS conversation_participants_user_or_student_check;

ALTER TABLE public.conversation_participants
ADD CONSTRAINT conversation_participants_user_or_student_check
CHECK (
  (user_id IS NOT NULL AND student_id IS NULL) OR
  (user_id IS NULL AND student_id IS NOT NULL)
);

-- 5. Ajouter une contrainte UNIQUE pour (conversation_id, user_id) quand user_id est présent
CREATE UNIQUE INDEX IF NOT EXISTS conversation_participants_conv_user_unique 
ON public.conversation_participants(conversation_id, user_id) 
WHERE user_id IS NOT NULL;

-- 6. Ajouter une contrainte UNIQUE pour (conversation_id, student_id) quand student_id est présent
CREATE UNIQUE INDEX IF NOT EXISTS conversation_participants_conv_student_unique 
ON public.conversation_participants(conversation_id, student_id) 
WHERE student_id IS NOT NULL;

-- 7. Créer un index pour student_id
CREATE INDEX IF NOT EXISTS idx_conversation_participants_student 
ON public.conversation_participants(student_id);

-- 8. Mettre à jour les RLS policies pour permettre l'accès aux conversations pour les étudiants
-- (Les politiques existantes pour user_id continueront de fonctionner)

-- Commentaire
COMMENT ON COLUMN public.conversation_participants.student_id IS 
  'ID de l''étudiant (si l''utilisateur n''a pas de compte auth.users). Soit user_id soit student_id doit être présent.';

