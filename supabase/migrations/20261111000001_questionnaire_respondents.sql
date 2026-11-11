-- Questionnaires envoyés à d'autres publics que les apprenants : intervenants
-- (formateurs), entreprises (managers) et financeurs, depuis l'onglet
-- Évaluations d'une session.
--
-- Un lien de questionnaire (et les réponses) peut désormais ne pas être
-- rattaché à un apprenant : le destinataire est alors décrit par
-- respondent_type, student_name / student_email (nom et email du destinataire)
-- et, s'il est connu, respondent_user_id ou respondent_entity_id.
--
-- À appliquer AVANT de déployer le code qui envoie ces questionnaires.

ALTER TABLE public.questionnaire_links
  ALTER COLUMN student_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS respondent_type TEXT NOT NULL DEFAULT 'student'
    CHECK (respondent_type IN ('student', 'instructor', 'manager', 'funder')),
  ADD COLUMN IF NOT EXISTS respondent_user_id UUID
    REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS respondent_entity_id UUID
    REFERENCES public.external_entities(id) ON DELETE SET NULL;

-- Un seul lien par destinataire (email en minuscules) et par modèle dans une session
CREATE UNIQUE INDEX IF NOT EXISTS questionnaire_links_respondent_unique
  ON public.questionnaire_links (session_id, template_id, lower(student_email))
  WHERE respondent_type <> 'student';

-- Les réponses d'un intervenant, d'une entreprise ou d'un financeur n'ont pas d'apprenant
ALTER TABLE public.evaluation_responses
  ALTER COLUMN student_id DROP NOT NULL;

-- Déjà nullable d'après les types générés ; la création de la table n'est pas
-- dans les migrations, on le garantit ici (sans effet si c'est déjà le cas).
ALTER TABLE public.grades
  ALTER COLUMN student_id DROP NOT NULL;
