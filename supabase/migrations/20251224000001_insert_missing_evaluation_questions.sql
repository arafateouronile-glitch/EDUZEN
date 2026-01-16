-- Migration pour insérer les questions manquantes dans les modèles d'évaluations système
-- Date: 2024-12-24
-- Description: Insère les questions pour les templates système qui n'en ont pas

DO $$
DECLARE
  v_template_id UUID;
  v_question_count INTEGER;
BEGIN
  -- ============================================
  -- 1. Évaluation de connaissances générales
  -- ============================================
  SELECT id INTO v_template_id FROM public.evaluation_templates 
  WHERE name = 'Évaluation de connaissances générales' AND organization_id IS NULL;
  
  IF v_template_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_question_count FROM public.evaluation_template_questions WHERE template_id = v_template_id;
    
    IF v_question_count = 0 THEN
      INSERT INTO public.evaluation_template_questions (
        template_id, question_text, question_type, options, correct_answer, points, order_index, explanation
      ) VALUES
        (v_template_id, 'Quelle est la capitale de la France ?', 'multiple_choice', 
         '[{"text": "Paris", "is_correct": true}, {"text": "Lyon", "is_correct": false}, {"text": "Marseille", "is_correct": false}, {"text": "Toulouse", "is_correct": false}]'::jsonb,
         NULL, 2, 1, 'Paris est la capitale et la plus grande ville de France.'),
        (v_template_id, 'La France fait partie de l''Union Européenne.', 'true_false', NULL, 'true', 1, 2, 
         'La France est un membre fondateur de l''Union Européenne depuis 1957.'),
        (v_template_id, 'Combien de départements composent la France métropolitaine ?', 'numeric', NULL, '96', 2, 3, 
         'La France métropolitaine compte 96 départements.'),
        (v_template_id, 'Quel est le nom du fleuve qui traverse Paris ?', 'short_answer', NULL, 'Seine', 2, 4, 
         'La Seine traverse Paris et se jette dans la Manche au Havre.'),
        (v_template_id, 'Quelle est la devise de la République française ?', 'multiple_choice',
         '[{"text": "Liberté, Égalité, Fraternité", "is_correct": true}, {"text": "Unité, Justice, Progrès", "is_correct": false}, {"text": "Paix, Amour, Harmonie", "is_correct": false}, {"text": "Force, Courage, Honneur", "is_correct": false}]'::jsonb,
         NULL, 3, 5, 'Liberté, Égalité, Fraternité est la devise de la République française.');
      RAISE NOTICE 'Questions insérées pour: Évaluation de connaissances générales';
    END IF;
  END IF;

  -- ============================================
  -- 2. Évaluation de compétences techniques
  -- ============================================
  SELECT id INTO v_template_id FROM public.evaluation_templates 
  WHERE name = 'Évaluation de compétences techniques' AND organization_id IS NULL;
  
  IF v_template_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_question_count FROM public.evaluation_template_questions WHERE template_id = v_template_id;
    
    IF v_question_count = 0 THEN
      INSERT INTO public.evaluation_template_questions (
        template_id, question_text, question_type, options, correct_answer, points, order_index, explanation
      ) VALUES
        (v_template_id, 'Quelle est la différence entre une variable locale et une variable globale ?', 'essay', NULL, NULL, 5, 1, 
         'Cette question nécessite une correction manuelle.'),
        (v_template_id, 'Le HTML est un langage de programmation.', 'true_false', NULL, 'false', 2, 2, 
         'Le HTML est un langage de balisage, pas un langage de programmation.'),
        (v_template_id, 'Quels sont les principes SOLID en programmation orientée objet ?', 'multiple_choice',
         '[{"text": "Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion", "is_correct": true}, {"text": "Simple, Optimized, Logical, Integrated, Dynamic", "is_correct": false}, {"text": "Secure, Organized, Linear, Independent, Distributed", "is_correct": false}]'::jsonb,
         NULL, 3, 3, 'Les principes SOLID sont cinq principes de conception orientée objet.');
      RAISE NOTICE 'Questions insérées pour: Évaluation de compétences techniques';
    END IF;
  END IF;

  -- ============================================
  -- 3. Quiz rapide
  -- ============================================
  SELECT id INTO v_template_id FROM public.evaluation_templates 
  WHERE name = 'Quiz rapide' AND organization_id IS NULL;
  
  IF v_template_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_question_count FROM public.evaluation_template_questions WHERE template_id = v_template_id;
    
    IF v_question_count = 0 THEN
      INSERT INTO public.evaluation_template_questions (
        template_id, question_text, question_type, options, correct_answer, points, order_index, explanation
      ) VALUES
        (v_template_id, '2 + 2 = ?', 'numeric', NULL, '4', 1, 1, '2 + 2 = 4'),
        (v_template_id, 'Le soleil tourne autour de la Terre.', 'true_false', NULL, 'false', 2, 2, 
         'C''est la Terre qui tourne autour du Soleil.'),
        (v_template_id, 'Quelle est la couleur du ciel par temps clair ?', 'short_answer', NULL, 'bleu', 2, 3, 
         'Le ciel apparaît bleu à cause de la diffusion de la lumière.'),
        (v_template_id, 'Combien de continents y a-t-il sur Terre ?', 'multiple_choice',
         '[{"text": "5", "is_correct": false}, {"text": "6", "is_correct": false}, {"text": "7", "is_correct": true}, {"text": "8", "is_correct": false}]'::jsonb,
         NULL, 2, 4, 'Il y a 7 continents.'),
        (v_template_id, 'L''eau bout à 100°C à pression normale.', 'true_false', NULL, 'true', 1, 5, 
         'À pression atmosphérique normale, l''eau bout à 100°C.');
      RAISE NOTICE 'Questions insérées pour: Quiz rapide';
    END IF;
  END IF;

  -- ============================================
  -- 4. Évaluation préformation pour les apprenants
  -- ============================================
  SELECT id INTO v_template_id FROM public.evaluation_templates 
  WHERE name = 'Évaluation préformation pour les apprenants' AND organization_id IS NULL;
  
  IF v_template_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_question_count FROM public.evaluation_template_questions WHERE template_id = v_template_id;
    
    IF v_question_count = 0 THEN
      INSERT INTO public.evaluation_template_questions (
        template_id, question_text, question_type, options, correct_answer, points, order_index, explanation
      ) VALUES
        (v_template_id, 'Quelles sont vos attentes principales concernant cette formation ?', 'essay', NULL, NULL, 5, 1, NULL),
        (v_template_id, 'Quel est votre niveau actuel de connaissance sur le sujet ?', 'multiple_choice',
         '[{"text": "Débutant", "is_correct": false}, {"text": "Intermédiaire", "is_correct": false}, {"text": "Avancé", "is_correct": false}, {"text": "Expert", "is_correct": false}]'::jsonb,
         NULL, 2, 2, NULL),
        (v_template_id, 'Quels sont vos objectifs professionnels à court terme ?', 'essay', NULL, NULL, 5, 3, NULL),
        (v_template_id, 'Avez-vous déjà suivi une formation similaire ?', 'true_false', NULL, NULL, 1, 4, NULL),
        (v_template_id, 'Quels sont les points que vous souhaitez particulièrement approfondir ?', 'essay', NULL, NULL, 5, 5, NULL),
        (v_template_id, 'Quelles sont vos contraintes ou difficultés actuelles dans votre travail ?', 'essay', NULL, NULL, 2, 6, NULL);
      RAISE NOTICE 'Questions insérées pour: Évaluation préformation pour les apprenants';
    END IF;
  END IF;

  -- ============================================
  -- 5. Évaluation à chaud pour les apprenants
  -- ============================================
  SELECT id INTO v_template_id FROM public.evaluation_templates 
  WHERE name = 'Évaluation à chaud pour les apprenants' AND organization_id IS NULL;
  
  IF v_template_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_question_count FROM public.evaluation_template_questions WHERE template_id = v_template_id;
    
    IF v_question_count = 0 THEN
      INSERT INTO public.evaluation_template_questions (
        template_id, question_text, question_type, options, correct_answer, points, order_index, explanation
      ) VALUES
        (v_template_id, 'Comment évaluez-vous globalement la qualité de la formation ?', 'multiple_choice',
         '[{"text": "Excellent", "is_correct": false}, {"text": "Très bon", "is_correct": false}, {"text": "Bon", "is_correct": false}, {"text": "Moyen", "is_correct": false}, {"text": "Insuffisant", "is_correct": false}]'::jsonb,
         NULL, 3, 1, NULL),
        (v_template_id, 'Le contenu de la formation correspondait-il à vos attentes ?', 'multiple_choice',
         '[{"text": "Totalement", "is_correct": false}, {"text": "Plutôt oui", "is_correct": false}, {"text": "Partiellement", "is_correct": false}, {"text": "Plutôt non", "is_correct": false}, {"text": "Pas du tout", "is_correct": false}]'::jsonb,
         NULL, 2, 2, NULL),
        (v_template_id, 'Comment évaluez-vous la pédagogie de l''intervenant ?', 'multiple_choice',
         '[{"text": "Excellent", "is_correct": false}, {"text": "Très bon", "is_correct": false}, {"text": "Bon", "is_correct": false}, {"text": "Moyen", "is_correct": false}, {"text": "Insuffisant", "is_correct": false}]'::jsonb,
         NULL, 3, 3, NULL),
        (v_template_id, 'Les supports pédagogiques étaient-ils adaptés ?', 'true_false', NULL, NULL, 1, 4, NULL),
        (v_template_id, 'La durée de la formation était-elle adaptée ?', 'multiple_choice',
         '[{"text": "Trop courte", "is_correct": false}, {"text": "Adaptée", "is_correct": false}, {"text": "Trop longue", "is_correct": false}]'::jsonb,
         NULL, 1, 5, NULL),
        (v_template_id, 'Quels sont les points forts de cette formation ?', 'essay', NULL, NULL, 3, 6, NULL),
        (v_template_id, 'Quels sont les points à améliorer ?', 'essay', NULL, NULL, 3, 7, NULL),
        (v_template_id, 'Recommanderez-vous cette formation à un collègue ?', 'true_false', NULL, NULL, 1, 8, NULL),
        (v_template_id, 'Commentaires supplémentaires', 'essay', NULL, NULL, 3, 9, NULL);
      RAISE NOTICE 'Questions insérées pour: Évaluation à chaud pour les apprenants';
    END IF;
  END IF;

  -- ============================================
  -- 6. Évaluation à froid pour les apprenants
  -- ============================================
  SELECT id INTO v_template_id FROM public.evaluation_templates 
  WHERE name = 'Évaluation à froid pour les apprenants' AND organization_id IS NULL;
  
  IF v_template_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_question_count FROM public.evaluation_template_questions WHERE template_id = v_template_id;
    
    IF v_question_count = 0 THEN
      INSERT INTO public.evaluation_template_questions (
        template_id, question_text, question_type, options, correct_answer, points, order_index, explanation
      ) VALUES
        (v_template_id, 'Avez-vous pu mettre en application les compétences acquises dans votre travail ?', 'multiple_choice',
         '[{"text": "Oui, régulièrement", "is_correct": false}, {"text": "Oui, occasionnellement", "is_correct": false}, {"text": "Non, pas encore", "is_correct": false}, {"text": "Non, pas applicable", "is_correct": false}]'::jsonb,
         NULL, 3, 1, NULL),
        (v_template_id, 'Quel impact la formation a-t-elle eu sur votre performance professionnelle ?', 'multiple_choice',
         '[{"text": "Impact très positif", "is_correct": false}, {"text": "Impact positif", "is_correct": false}, {"text": "Impact neutre", "is_correct": false}, {"text": "Impact négatif", "is_correct": false}, {"text": "Pas encore d''impact visible", "is_correct": false}]'::jsonb,
         NULL, 3, 2, NULL),
        (v_template_id, 'La formation a-t-elle contribué à votre évolution professionnelle ?', 'true_false', NULL, NULL, 2, 3, NULL),
        (v_template_id, 'Quelles compétences avez-vous le plus utilisées depuis la formation ?', 'essay', NULL, NULL, 4, 4, NULL),
        (v_template_id, 'Quels obstacles avez-vous rencontrés pour mettre en pratique les acquis ?', 'essay', NULL, NULL, 3, 5, NULL),
        (v_template_id, 'Souhaitez-vous suivre une formation complémentaire sur ce sujet ?', 'true_false', NULL, NULL, 1, 6, NULL),
        (v_template_id, 'Commentaires sur l''impact de la formation', 'essay', NULL, NULL, 4, 7, NULL);
      RAISE NOTICE 'Questions insérées pour: Évaluation à froid pour les apprenants';
    END IF;
  END IF;

  -- ============================================
  -- 7. Questionnaire pour les managers des apprenants
  -- ============================================
  SELECT id INTO v_template_id FROM public.evaluation_templates 
  WHERE name = 'Questionnaire pour les managers des apprenants' AND organization_id IS NULL;
  
  IF v_template_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_question_count FROM public.evaluation_template_questions WHERE template_id = v_template_id;
    
    IF v_question_count = 0 THEN
      INSERT INTO public.evaluation_template_questions (
        template_id, question_text, question_type, options, correct_answer, points, order_index, explanation
      ) VALUES
        (v_template_id, 'Comment évaluez-vous l''évolution de votre collaborateur depuis la formation ?', 'multiple_choice',
         '[{"text": "Évolution très positive", "is_correct": false}, {"text": "Évolution positive", "is_correct": false}, {"text": "Évolution neutre", "is_correct": false}, {"text": "Pas d''évolution visible", "is_correct": false}]'::jsonb,
         NULL, 3, 1, NULL),
        (v_template_id, 'Avez-vous constaté une amélioration des compétences de votre collaborateur ?', 'true_false', NULL, NULL, 2, 2, NULL),
        (v_template_id, 'Quels changements avez-vous observés dans le travail de votre collaborateur ?', 'essay', NULL, NULL, 5, 3, NULL),
        (v_template_id, 'La formation a-t-elle répondu aux besoins identifiés ?', 'multiple_choice',
         '[{"text": "Totalement", "is_correct": false}, {"text": "Plutôt oui", "is_correct": false}, {"text": "Partiellement", "is_correct": false}, {"text": "Plutôt non", "is_correct": false}, {"text": "Pas du tout", "is_correct": false}]'::jsonb,
         NULL, 3, 4, NULL),
        (v_template_id, 'Recommanderiez-vous cette formation à d''autres collaborateurs ?', 'true_false', NULL, NULL, 2, 5, NULL),
        (v_template_id, 'Quels sont les points forts de cette formation selon vous ?', 'essay', NULL, NULL, 3, 6, NULL),
        (v_template_id, 'Quels sont les points à améliorer ?', 'essay', NULL, NULL, 2, 7, NULL);
      RAISE NOTICE 'Questions insérées pour: Questionnaire pour les managers des apprenants';
    END IF;
  END IF;

  -- ============================================
  -- 8. Questionnaire pour les intervenants
  -- ============================================
  SELECT id INTO v_template_id FROM public.evaluation_templates 
  WHERE name = 'Questionnaire pour les intervenants' AND organization_id IS NULL;
  
  IF v_template_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_question_count FROM public.evaluation_template_questions WHERE template_id = v_template_id;
    
    IF v_question_count = 0 THEN
      INSERT INTO public.evaluation_template_questions (
        template_id, question_text, question_type, options, correct_answer, points, order_index, explanation
      ) VALUES
        (v_template_id, 'Comment évaluez-vous le niveau de participation des apprenants ?', 'multiple_choice',
         '[{"text": "Excellent", "is_correct": false}, {"text": "Très bon", "is_correct": false}, {"text": "Bon", "is_correct": false}, {"text": "Moyen", "is_correct": false}, {"text": "Insuffisant", "is_correct": false}]'::jsonb,
         NULL, 2, 1, NULL),
        (v_template_id, 'Le niveau des apprenants correspondait-il à vos attentes ?', 'true_false', NULL, NULL, 2, 2, NULL),
        (v_template_id, 'Les supports pédagogiques étaient-ils adaptés ?', 'multiple_choice',
         '[{"text": "Très adaptés", "is_correct": false}, {"text": "Adaptés", "is_correct": false}, {"text": "Peu adaptés", "is_correct": false}, {"text": "Pas adaptés", "is_correct": false}]'::jsonb,
         NULL, 2, 3, NULL),
        (v_template_id, 'La durée de la session était-elle suffisante ?', 'multiple_choice',
         '[{"text": "Trop courte", "is_correct": false}, {"text": "Adaptée", "is_correct": false}, {"text": "Trop longue", "is_correct": false}]'::jsonb,
         NULL, 2, 4, NULL),
        (v_template_id, 'Quels sont les points forts de cette session ?', 'essay', NULL, NULL, 4, 5, NULL),
        (v_template_id, 'Quelles difficultés avez-vous rencontrées ?', 'essay', NULL, NULL, 3, 6, NULL),
        (v_template_id, 'Quelles améliorations suggérez-vous pour les prochaines sessions ?', 'essay', NULL, NULL, 3, 7, NULL),
        (v_template_id, 'Commentaires supplémentaires', 'essay', NULL, NULL, 2, 8, NULL);
      RAISE NOTICE 'Questions insérées pour: Questionnaire pour les intervenants';
    END IF;
  END IF;

END $$;

-- Vérification finale
SELECT 
  et.name as template_name,
  et.assessment_type,
  et.max_score,
  COUNT(etq.id) as question_count
FROM public.evaluation_templates et
LEFT JOIN public.evaluation_template_questions etq ON etq.template_id = et.id
WHERE et.organization_id IS NULL
GROUP BY et.id, et.name, et.assessment_type, et.max_score
ORDER BY 
  CASE et.assessment_type
    WHEN 'pre_formation' THEN 1
    WHEN 'hot' THEN 2
    WHEN 'cold' THEN 3
    WHEN 'manager' THEN 4
    WHEN 'instructor' THEN 5
    WHEN 'quiz' THEN 6
    WHEN 'exam' THEN 7
    ELSE 8
  END;
