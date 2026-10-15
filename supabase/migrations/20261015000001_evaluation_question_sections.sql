-- Rubriques de questions d'évaluation (ex. « Organisation de la formation »,
-- « Déroulement de la formation ») : permettent au tableau analytique
-- « Suivi qualité » d'afficher une note /10 par rubrique, comme Digiforma.
-- NULL = question sans rubrique (affichée individuellement dans l'analyse).

ALTER TABLE public.evaluation_template_questions
  ADD COLUMN IF NOT EXISTS section text;

-- Rubriques par défaut pour les modèles système (organization_id IS NULL).
-- Uniquement là où aucune rubrique n'a encore été saisie.
UPDATE public.evaluation_template_questions q
SET section = v.section
FROM public.evaluation_templates t,
  (VALUES
    ('hot',  'Comment évaluez-vous globalement la qualité de la formation ?', 'Note générale de la formation'),
    ('hot',  'Le contenu de la formation correspondait-il à vos attentes ?',  'Contenu de la formation'),
    ('hot',  'Comment évaluez-vous la pédagogie de l''intervenant ?',         'Déroulement de la formation'),
    ('hot',  'Les supports pédagogiques étaient-ils adaptés ?',              'Déroulement de la formation'),
    ('hot',  'La durée de la formation était-elle adaptée ?',                'Organisation de la formation'),
    ('hot',  'Recommanderez-vous cette formation à un collègue ?',           'Note générale de la formation'),
    ('hot',  'Quels sont les points forts de cette formation ?',             'Commentaires libres'),
    ('hot',  'Quels sont les points à améliorer ?',                          'Commentaires libres'),
    ('hot',  'Commentaires supplémentaires',                                 'Commentaires libres'),
    ('cold', 'Avez-vous pu mettre en application les compétences acquises dans votre travail ?', 'Impact de la formation'),
    ('cold', 'Quel impact la formation a-t-elle eu sur votre performance professionnelle ?',     'Impact de la formation'),
    ('cold', 'La formation a-t-elle contribué à votre évolution professionnelle ?',              'Impact de la formation'),
    ('cold', 'Quelles compétences avez-vous le plus utilisées depuis la formation ?',            'Commentaires libres'),
    ('cold', 'Quels obstacles avez-vous rencontrés pour mettre en pratique les acquis ?',        'Commentaires libres')
  ) AS v(assessment_type, question_text, section)
WHERE q.template_id = t.id
  AND t.organization_id IS NULL
  AND t.assessment_type = v.assessment_type
  AND q.question_text = v.question_text
  AND q.section IS NULL;
