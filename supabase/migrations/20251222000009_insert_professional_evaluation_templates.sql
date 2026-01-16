-- Migration pour insérer les modèles d'évaluations professionnelles par défaut
-- Date: 2024-12-22
-- Description: Insère les modèles d'évaluations pour la formation professionnelle (préformation, à chaud, à froid, managers, intervenants)

DO $$
DECLARE
  template_preformation_id UUID;
  template_hot_id UUID;
  template_cold_id UUID;
  template_manager_id UUID;
  template_instructor_id UUID;
BEGIN
  -- ============================================
  -- 1. Évaluation préformation pour les apprenants
  -- ============================================
  IF NOT EXISTS (SELECT 1 FROM public.evaluation_templates WHERE name = 'Évaluation préformation pour les apprenants' AND organization_id IS NULL) THEN
    INSERT INTO public.evaluation_templates (
      organization_id,
      name,
      description,
      assessment_type,
      subject,
      max_score,
      passing_score,
      time_limit_minutes,
      shuffle_questions,
      show_correct_answers,
      is_active
    ) VALUES (
      NULL,
      'Évaluation préformation pour les apprenants',
      'Sondez les attentes et diagnostiquez le besoin avant la session',
      'pre_formation',
      'Préformation',
      20,
      NULL,
      NULL,
      false,
      false,
      true
    ) RETURNING id INTO template_preformation_id;

    INSERT INTO public.evaluation_template_questions (
      template_id,
      question_text,
      question_type,
      options,
      correct_answer,
      points,
      order_index,
      explanation
    ) VALUES
      (
        template_preformation_id,
        'Quelles sont vos attentes principales concernant cette formation ?',
        'essay',
        NULL,
        NULL,
        5,
        1,
        NULL
      ),
      (
        template_preformation_id,
        'Quel est votre niveau actuel de connaissance sur le sujet ?',
        'multiple_choice',
        '[
          {"text": "Débutant", "is_correct": false},
          {"text": "Intermédiaire", "is_correct": false},
          {"text": "Avancé", "is_correct": false},
          {"text": "Expert", "is_correct": false}
        ]'::jsonb,
        NULL,
        2,
        2,
        NULL
      ),
      (
        template_preformation_id,
        'Quels sont vos objectifs professionnels à court terme ?',
        'essay',
        NULL,
        NULL,
        5,
        3,
        NULL
      ),
      (
        template_preformation_id,
        'Avez-vous déjà suivi une formation similaire ?',
        'true_false',
        NULL,
        NULL,
        1,
        4,
        NULL
      ),
      (
        template_preformation_id,
        'Quels sont les points que vous souhaitez particulièrement approfondir ?',
        'essay',
        NULL,
        NULL,
        5,
        5,
        NULL
      ),
      (
        template_preformation_id,
        'Quelles sont vos contraintes ou difficultés actuelles dans votre travail ?',
        'essay',
        NULL,
        NULL,
        2,
        6,
        NULL
      );
  END IF;

  -- ============================================
  -- 2. Évaluation à chaud pour les apprenants
  -- ============================================
  IF NOT EXISTS (SELECT 1 FROM public.evaluation_templates WHERE name = 'Évaluation à chaud pour les apprenants' AND organization_id IS NULL) THEN
    INSERT INTO public.evaluation_templates (
      organization_id,
      name,
      description,
      assessment_type,
      subject,
      max_score,
      passing_score,
      time_limit_minutes,
      shuffle_questions,
      show_correct_answers,
      is_active
    ) VALUES (
      NULL,
      'Évaluation à chaud pour les apprenants',
      'Envoyez une évaluation dématérialisée à l''apprenant pour qu''il note à chaud la formation',
      'hot',
      'Évaluation à chaud',
      20,
      NULL,
      NULL,
      false,
      true,
      true
    ) RETURNING id INTO template_hot_id;

    INSERT INTO public.evaluation_template_questions (
      template_id,
      question_text,
      question_type,
      options,
      correct_answer,
      points,
      order_index,
      explanation
    ) VALUES
      (
        template_hot_id,
        'Comment évaluez-vous globalement la qualité de la formation ?',
        'multiple_choice',
        '[
          {"text": "Excellent", "is_correct": false},
          {"text": "Très bon", "is_correct": false},
          {"text": "Bon", "is_correct": false},
          {"text": "Moyen", "is_correct": false},
          {"text": "Insuffisant", "is_correct": false}
        ]'::jsonb,
        NULL,
        3,
        1,
        NULL
      ),
      (
        template_hot_id,
        'Le contenu de la formation correspondait-il à vos attentes ?',
        'multiple_choice',
        '[
          {"text": "Totalement", "is_correct": false},
          {"text": "Plutôt oui", "is_correct": false},
          {"text": "Partiellement", "is_correct": false},
          {"text": "Plutôt non", "is_correct": false},
          {"text": "Pas du tout", "is_correct": false}
        ]'::jsonb,
        NULL,
        2,
        2,
        NULL
      ),
      (
        template_hot_id,
        'Comment évaluez-vous la pédagogie de l''intervenant ?',
        'multiple_choice',
        '[
          {"text": "Excellent", "is_correct": false},
          {"text": "Très bon", "is_correct": false},
          {"text": "Bon", "is_correct": false},
          {"text": "Moyen", "is_correct": false},
          {"text": "Insuffisant", "is_correct": false}
        ]'::jsonb,
        NULL,
        3,
        3,
        NULL
      ),
      (
        template_hot_id,
        'Les supports pédagogiques étaient-ils adaptés ?',
        'true_false',
        NULL,
        NULL,
        1,
        4,
        NULL
      ),
      (
        template_hot_id,
        'La durée de la formation était-elle adaptée ?',
        'multiple_choice',
        '[
          {"text": "Trop courte", "is_correct": false},
          {"text": "Adaptée", "is_correct": false},
          {"text": "Trop longue", "is_correct": false}
        ]'::jsonb,
        NULL,
        1,
        5,
        NULL
      ),
      (
        template_hot_id,
        'Quels sont les points forts de cette formation ?',
        'essay',
        NULL,
        NULL,
        3,
        6,
        NULL
      ),
      (
        template_hot_id,
        'Quels sont les points à améliorer ?',
        'essay',
        NULL,
        NULL,
        3,
        7,
        NULL
      ),
      (
        template_hot_id,
        'Recommanderez-vous cette formation à un collègue ?',
        'true_false',
        NULL,
        NULL,
        1,
        8,
        NULL
      ),
      (
        template_hot_id,
        'Commentaires supplémentaires',
        'essay',
        NULL,
        NULL,
        3,
        9,
        NULL
      );
  END IF;

  -- ============================================
  -- 3. Évaluation à froid pour les apprenants
  -- ============================================
  IF NOT EXISTS (SELECT 1 FROM public.evaluation_templates WHERE name = 'Évaluation à froid pour les apprenants' AND organization_id IS NULL) THEN
    INSERT INTO public.evaluation_templates (
      organization_id,
      name,
      description,
      assessment_type,
      subject,
      max_score,
      passing_score,
      time_limit_minutes,
      shuffle_questions,
      show_correct_answers,
      is_active
    ) VALUES (
      NULL,
      'Évaluation à froid pour les apprenants',
      'Mesurez l''impact professionnel de la formation pour entrer dans une démarche qualité quantitative',
      'cold',
      'Évaluation à froid',
      20,
      NULL,
      NULL,
      false,
      false,
      true
    ) RETURNING id INTO template_cold_id;

    INSERT INTO public.evaluation_template_questions (
      template_id,
      question_text,
      question_type,
      options,
      correct_answer,
      points,
      order_index,
      explanation
    ) VALUES
      (
        template_cold_id,
        'Avez-vous pu mettre en application les compétences acquises dans votre travail ?',
        'multiple_choice',
        '[
          {"text": "Oui, régulièrement", "is_correct": false},
          {"text": "Oui, occasionnellement", "is_correct": false},
          {"text": "Non, pas encore", "is_correct": false},
          {"text": "Non, pas applicable", "is_correct": false}
        ]'::jsonb,
        NULL,
        3,
        1,
        NULL
      ),
      (
        template_cold_id,
        'Quel impact la formation a-t-elle eu sur votre performance professionnelle ?',
        'multiple_choice',
        '[
          {"text": "Impact très positif", "is_correct": false},
          {"text": "Impact positif", "is_correct": false},
          {"text": "Impact neutre", "is_correct": false},
          {"text": "Impact négatif", "is_correct": false},
          {"text": "Pas encore d''impact visible", "is_correct": false}
        ]'::jsonb,
        NULL,
        3,
        2,
        NULL
      ),
      (
        template_cold_id,
        'La formation a-t-elle contribué à votre évolution professionnelle ?',
        'true_false',
        NULL,
        NULL,
        2,
        3,
        NULL
      ),
      (
        template_cold_id,
        'Quelles compétences avez-vous le plus utilisées depuis la formation ?',
        'essay',
        NULL,
        NULL,
        4,
        4,
        NULL
      ),
      (
        template_cold_id,
        'Quels obstacles avez-vous rencontrés pour mettre en pratique les acquis ?',
        'essay',
        NULL,
        NULL,
        3,
        5,
        NULL
      ),
      (
        template_cold_id,
        'Souhaitez-vous suivre une formation complémentaire sur ce sujet ?',
        'true_false',
        NULL,
        NULL,
        1,
        6,
        NULL
      ),
      (
        template_cold_id,
        'Commentaires sur l''impact de la formation',
        'essay',
        NULL,
        NULL,
        4,
        7,
        NULL
      );
  END IF;

  -- ============================================
  -- 4. Questionnaire pour les managers des apprenants
  -- ============================================
  IF NOT EXISTS (SELECT 1 FROM public.evaluation_templates WHERE name = 'Questionnaire pour les managers des apprenants' AND organization_id IS NULL) THEN
    INSERT INTO public.evaluation_templates (
      organization_id,
      name,
      description,
      assessment_type,
      subject,
      max_score,
      passing_score,
      time_limit_minutes,
      shuffle_questions,
      show_correct_answers,
      is_active
    ) VALUES (
      NULL,
      'Questionnaire pour les managers des apprenants',
      'Impliquez les prescripteurs de la formation dans votre démarche qualité',
      'manager',
      'Questionnaire Manager',
      20,
      NULL,
      NULL,
      false,
      false,
      true
    ) RETURNING id INTO template_manager_id;

    INSERT INTO public.evaluation_template_questions (
      template_id,
      question_text,
      question_type,
      options,
      correct_answer,
      points,
      order_index,
      explanation
    ) VALUES
      (
        template_manager_id,
        'Comment évaluez-vous l''évolution de votre collaborateur depuis la formation ?',
        'multiple_choice',
        '[
          {"text": "Évolution très positive", "is_correct": false},
          {"text": "Évolution positive", "is_correct": false},
          {"text": "Évolution neutre", "is_correct": false},
          {"text": "Pas d''évolution visible", "is_correct": false}
        ]'::jsonb,
        NULL,
        3,
        1,
        NULL
      ),
      (
        template_manager_id,
        'Avez-vous constaté une amélioration des compétences de votre collaborateur ?',
        'true_false',
        NULL,
        NULL,
        2,
        2,
        NULL
      ),
      (
        template_manager_id,
        'Quels changements avez-vous observés dans le travail de votre collaborateur ?',
        'essay',
        NULL,
        NULL,
        5,
        3,
        NULL
      ),
      (
        template_manager_id,
        'La formation a-t-elle répondu aux besoins identifiés ?',
        'multiple_choice',
        '[
          {"text": "Totalement", "is_correct": false},
          {"text": "Plutôt oui", "is_correct": false},
          {"text": "Partiellement", "is_correct": false},
          {"text": "Plutôt non", "is_correct": false},
          {"text": "Pas du tout", "is_correct": false}
        ]'::jsonb,
        NULL,
        3,
        4,
        NULL
      ),
      (
        template_manager_id,
        'Recommanderiez-vous cette formation à d''autres collaborateurs ?',
        'true_false',
        NULL,
        NULL,
        2,
        5,
        NULL
      ),
      (
        template_manager_id,
        'Quels sont les points forts de cette formation selon vous ?',
        'essay',
        NULL,
        NULL,
        3,
        6,
        NULL
      ),
      (
        template_manager_id,
        'Quels sont les points à améliorer ?',
        'essay',
        NULL,
        NULL,
        2,
        7,
        NULL
      );
  END IF;

  -- ============================================
  -- 5. Questionnaire pour les intervenants
  -- ============================================
  IF NOT EXISTS (SELECT 1 FROM public.evaluation_templates WHERE name = 'Questionnaire pour les intervenants' AND organization_id IS NULL) THEN
    INSERT INTO public.evaluation_templates (
      organization_id,
      name,
      description,
      assessment_type,
      subject,
      max_score,
      passing_score,
      time_limit_minutes,
      shuffle_questions,
      show_correct_answers,
      is_active
    ) VALUES (
      NULL,
      'Questionnaire pour les intervenants',
      'Demandez aux intervenants d''évaluer la session',
      'instructor',
      'Questionnaire Intervenant',
      20,
      NULL,
      NULL,
      false,
      false,
      true
    ) RETURNING id INTO template_instructor_id;

    INSERT INTO public.evaluation_template_questions (
      template_id,
      question_text,
      question_type,
      options,
      correct_answer,
      points,
      order_index,
      explanation
    ) VALUES
      (
        template_instructor_id,
        'Comment évaluez-vous le niveau de participation des apprenants ?',
        'multiple_choice',
        '[
          {"text": "Excellent", "is_correct": false},
          {"text": "Très bon", "is_correct": false},
          {"text": "Bon", "is_correct": false},
          {"text": "Moyen", "is_correct": false},
          {"text": "Insuffisant", "is_correct": false}
        ]'::jsonb,
        NULL,
        2,
        1,
        NULL
      ),
      (
        template_instructor_id,
        'Le niveau des apprenants correspondait-il à vos attentes ?',
        'true_false',
        NULL,
        NULL,
        2,
        2,
        NULL
      ),
      (
        template_instructor_id,
        'Les supports pédagogiques étaient-ils adaptés ?',
        'multiple_choice',
        '[
          {"text": "Très adaptés", "is_correct": false},
          {"text": "Adaptés", "is_correct": false},
          {"text": "Peu adaptés", "is_correct": false},
          {"text": "Pas adaptés", "is_correct": false}
        ]'::jsonb,
        NULL,
        2,
        3,
        NULL
      ),
      (
        template_instructor_id,
        'La durée de la session était-elle suffisante ?',
        'multiple_choice',
        '[
          {"text": "Trop courte", "is_correct": false},
          {"text": "Adaptée", "is_correct": false},
          {"text": "Trop longue", "is_correct": false}
        ]'::jsonb,
        NULL,
        2,
        4,
        NULL
      ),
      (
        template_instructor_id,
        'Quels sont les points forts de cette session ?',
        'essay',
        NULL,
        NULL,
        4,
        5,
        NULL
      ),
      (
        template_instructor_id,
        'Quelles difficultés avez-vous rencontrées ?',
        'essay',
        NULL,
        NULL,
        3,
        6,
        NULL
      ),
      (
        template_instructor_id,
        'Quelles améliorations suggérez-vous pour les prochaines sessions ?',
        'essay',
        NULL,
        NULL,
        3,
        7,
        NULL
      ),
      (
        template_instructor_id,
        'Commentaires supplémentaires',
        'essay',
        NULL,
        NULL,
        2,
        8,
        NULL
      );
  END IF;

END $$;

-- Vérification
SELECT 
  name,
  assessment_type,
  max_score,
  (SELECT COUNT(*) FROM public.evaluation_template_questions WHERE template_id = evaluation_templates.id) as question_count
FROM public.evaluation_templates
WHERE organization_id IS NULL
ORDER BY 
  CASE assessment_type
    WHEN 'pre_formation' THEN 1
    WHEN 'hot' THEN 2
    WHEN 'cold' THEN 3
    WHEN 'manager' THEN 4
    WHEN 'instructor' THEN 5
    ELSE 6
  END,
  created_at;



