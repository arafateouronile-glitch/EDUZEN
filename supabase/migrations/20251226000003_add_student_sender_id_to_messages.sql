-- Migration pour ajouter la colonne student_sender_id à la table messages
-- Cela permet aux étudiants d'envoyer des messages sans avoir besoin d'un compte utilisateur

-- 1. Rendre sender_id nullable (pour permettre les messages envoyés par des étudiants)
ALTER TABLE public.messages
ALTER COLUMN sender_id DROP NOT NULL;

-- 2. Ajouter la colonne student_sender_id
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS student_sender_id UUID REFERENCES public.students(id) ON DELETE CASCADE;

-- 3. Ajouter une contrainte CHECK pour s'assurer qu'au moins sender_id ou student_sender_id est présent
-- Note: On permet les deux pour les cas où un étudiant a aussi un compte utilisateur
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_sender_check'
  ) THEN
    ALTER TABLE public.messages
    ADD CONSTRAINT messages_sender_check 
    CHECK (
      (sender_id IS NOT NULL) OR 
      (student_sender_id IS NOT NULL)
    );
  END IF;
END $$;

-- 4. Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_messages_student_sender_id 
ON public.messages(student_sender_id) 
WHERE student_sender_id IS NOT NULL;

-- Commentaire
COMMENT ON COLUMN public.messages.student_sender_id IS 
  'ID de l''étudiant qui a envoyé le message. Utilisé pour les messages envoyés par des étudiants sans compte utilisateur.';

