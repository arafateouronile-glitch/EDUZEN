-- Automatisations : mail propre à chaque règle (objet + message modifiables),
-- évaluation envoyée par lien direct, et modèle global « Recueil des besoins »
-- (organization_id nul = visible par tous les organismes).

ALTER TABLE public.email_schedules
  ADD COLUMN IF NOT EXISTS email_subject TEXT,
  ADD COLUMN IF NOT EXISTS email_body_html TEXT,
  ADD COLUMN IF NOT EXISTS evaluation_template_id UUID
    REFERENCES public.evaluation_templates(id) ON DELETE SET NULL;

-- ── Modèle global « Recueil des besoins » ───────────────────────────────────

INSERT INTO public.evaluation_templates (
  id, organization_id, name, description, assessment_type, subject,
  max_score, passing_score, shuffle_questions, show_correct_answers, is_active
)
VALUES (
  '7b5e3c1a-2d4f-4a8b-9c6e-1f0a3d5b7e21',
  NULL,
  'Recueil des besoins',
  'Questionnaire envoyé avant la formation pour identifier les attentes, le niveau et les besoins d''adaptation de chaque apprenant.',
  'pre_formation',
  'Recueil des besoins',
  20,
  0,
  false,
  false,
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.evaluation_template_questions (template_id, question_text, question_type, options, order_index, points)
SELECT '7b5e3c1a-2d4f-4a8b-9c6e-1f0a3d5b7e21'::uuid, q.question_text, q.question_type, q.options::jsonb, q.order_index, 0
FROM (VALUES
  ('Dans quel contexte suivez-vous cette formation ?', 'multiple_choice',
    '[{"text":"Évolution dans mon poste actuel","is_correct":false},{"text":"Reconversion professionnelle","is_correct":false},{"text":"Obligation réglementaire ou recyclage","is_correct":false},{"text":"Projet personnel","is_correct":false},{"text":"Demande de mon employeur","is_correct":false}]', 1),
  ('Quel est votre projet professionnel ?', 'essay', NULL, 2),
  ('Quels objectifs souhaitez-vous atteindre grâce à cette formation ?', 'essay', NULL, 3),
  ('Quelles compétences souhaitez-vous acquérir ou renforcer en priorité ?', 'essay', NULL, 4),
  ('Quel est votre niveau actuel sur le sujet de la formation ?', 'multiple_choice',
    '[{"text":"Débutant","is_correct":false},{"text":"Notions de base","is_correct":false},{"text":"Intermédiaire","is_correct":false},{"text":"Confirmé","is_correct":false}]', 5),
  ('Quelle est votre expérience en lien avec cette formation ?', 'essay', NULL, 6),
  ('Avez-vous des contraintes d''organisation à nous signaler (horaires, déplacements, matériel) ?', 'essay', NULL, 7),
  ('Avez-vous besoin d''une adaptation liée à une situation de handicap ou à un besoin particulier ?', 'true_false', NULL, 8),
  ('Si oui, précisez l''adaptation souhaitée.', 'essay', NULL, 9),
  ('Souhaitez-vous ajouter une remarque ou une question ?', 'essay', NULL, 10)
) AS q(question_text, question_type, options, order_index)
WHERE NOT EXISTS (
  SELECT 1 FROM public.evaluation_template_questions
  WHERE template_id = '7b5e3c1a-2d4f-4a8b-9c6e-1f0a3d5b7e21'::uuid
);

-- ── Règles existantes ───────────────────────────────────────────────────────

-- Évaluation post-formation et relance : lien direct vers l'évaluation à chaud globale
UPDATE public.email_schedules
SET evaluation_template_id = '251d190d-586e-4596-b19d-adcab6024aa4'
WHERE email_type IN ('evaluation_post_formation', 'relance_evaluation')
  AND evaluation_template_id IS NULL;

-- Convocation : le PDF nominatif est joint au mail
UPDATE public.email_schedules
SET send_document = true,
    document_type = 'convocation'
WHERE email_type = 'convocation_j14'
  AND COALESCE(send_document, false) = false;
