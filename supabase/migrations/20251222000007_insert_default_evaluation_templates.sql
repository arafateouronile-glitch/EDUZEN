-- Migration pour insérer des modèles d'évaluations par défaut
-- Date: 2024-12-22
-- Description: Insère des modèles d'évaluations système (organization_id = NULL) pour toutes les organisations

-- Modèles d'évaluations par défaut pour la formation professionnelle
DO $$
DECLARE
  template1_id UUID;
  template2_id UUID;
  template3_id UUID;
  template4_id UUID;
  template5_id UUID;
  template6_id UUID;
BEGIN
  -- Vérifier si les modèles existent déjà
  IF NOT EXISTS (SELECT 1 FROM public.evaluation_templates WHERE name = 'Évaluation de connaissances générales' AND organization_id IS NULL) THEN
    -- Modèle 1: Évaluation de connaissances générales
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
      NULL, -- Modèle système
      'Évaluation de connaissances générales',
      'Modèle d''évaluation standard avec questions à choix multiples et vrai/faux',
      'quiz',
      'Général',
      20,
      70,
      60,
      false,
      true,
      true
    ) RETURNING id INTO template1_id;

    -- Questions pour le modèle 1
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
        template1_id,
        'Quelle est la capitale de la France ?',
        'multiple_choice',
        '[
          {"text": "Paris", "is_correct": true},
          {"text": "Lyon", "is_correct": false},
          {"text": "Marseille", "is_correct": false},
          {"text": "Toulouse", "is_correct": false}
        ]'::jsonb,
        NULL,
        2,
        1,
        'Paris est la capitale et la plus grande ville de France.'
      ),
      (
        template1_id,
        'La France fait partie de l''Union Européenne.',
        'true_false',
        NULL,
        'true',
        1,
        2,
        'La France est un membre fondateur de l''Union Européenne depuis 1957.'
      ),
      (
        template1_id,
        'Combien de départements composent la France métropolitaine ?',
        'numeric',
        NULL,
        '96',
        2,
        3,
        'La France métropolitaine compte 96 départements (depuis 2015 avec la fusion de la Corse).'
      ),
      (
        template1_id,
        'Quel est le nom du fleuve qui traverse Paris ?',
        'short_answer',
        NULL,
        'Seine',
        2,
        4,
        'La Seine traverse Paris et se jette dans la Manche au Havre.'
      ),
      (
        template1_id,
        'Quelle est la devise de la République française ?',
        'multiple_choice',
        '[
          {"text": "Liberté, Égalité, Fraternité", "is_correct": true},
          {"text": "Unité, Justice, Progrès", "is_correct": false},
          {"text": "Paix, Amour, Harmonie", "is_correct": false},
          {"text": "Force, Courage, Honneur", "is_correct": false}
        ]'::jsonb,
        NULL,
        3,
        5,
        'Liberté, Égalité, Fraternité est la devise de la République française depuis la Révolution.'
      );
  END IF;

  -- Modèle 2: Évaluation de compétences techniques
  IF NOT EXISTS (SELECT 1 FROM public.evaluation_templates WHERE name = 'Évaluation de compétences techniques' AND organization_id IS NULL) THEN
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
      'Évaluation de compétences techniques',
      'Modèle pour évaluer les compétences techniques et pratiques',
      'exam',
      'Technique',
      20,
      75,
      90,
      true,
      true,
      true
    ) RETURNING id INTO template2_id;

    -- Questions pour le modèle 2
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
        template2_id,
        'Quelle est la différence entre une variable locale et une variable globale ?',
        'essay',
        NULL,
        NULL,
        5,
        1,
        'Cette question nécessite une correction manuelle par l''enseignant.'
      ),
      (
        template2_id,
        'Le HTML est un langage de programmation.',
        'true_false',
        NULL,
        'false',
        2,
        2,
        'Le HTML est un langage de balisage, pas un langage de programmation.'
      ),
      (
        template2_id,
        'Quels sont les principes SOLID en programmation orientée objet ?',
        'multiple_choice',
        '[
          {"text": "Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion", "is_correct": true},
          {"text": "Simple, Optimized, Logical, Integrated, Dynamic", "is_correct": false},
          {"text": "Secure, Organized, Linear, Independent, Distributed", "is_correct": false},
          {"text": "Structured, Object-oriented, Layered, Iterative, Defined", "is_correct": false}
        ]'::jsonb,
        NULL,
        3,
        3,
        'Les principes SOLID sont cinq principes de conception orientée objet.'
      );
  END IF;

  -- Modèle 3: Quiz rapide
  IF NOT EXISTS (SELECT 1 FROM public.evaluation_templates WHERE name = 'Quiz rapide' AND organization_id IS NULL) THEN
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
      'Quiz rapide',
      'Modèle de quiz court pour évaluation rapide des connaissances',
      'quiz',
      'Général',
      10,
      60,
      15,
      true,
      true,
      true
    ) RETURNING id INTO template3_id;

    -- Questions pour le modèle 3
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
        template3_id,
        '2 + 2 = ?',
        'numeric',
        NULL,
        '4',
        1,
        1,
        '2 + 2 = 4'
      ),
      (
        template3_id,
        'Le soleil tourne autour de la Terre.',
        'true_false',
        NULL,
        'false',
        2,
        2,
        'C''est la Terre qui tourne autour du Soleil.'
      ),
      (
        template3_id,
        'Quelle est la couleur du ciel par temps clair ?',
        'short_answer',
        NULL,
        'bleu',
        2,
        3,
        'Le ciel apparaît bleu à cause de la diffusion de la lumière par l''atmosphère.'
      ),
      (
        template3_id,
        'Combien de continents y a-t-il sur Terre ?',
        'multiple_choice',
        '[
          {"text": "5", "is_correct": false},
          {"text": "6", "is_correct": false},
          {"text": "7", "is_correct": true},
          {"text": "8", "is_correct": false}
        ]'::jsonb,
        NULL,
        2,
        4,
        'Il y a 7 continents : Afrique, Antarctique, Asie, Europe, Amérique du Nord, Océanie, Amérique du Sud.'
      ),
      (
        template3_id,
        'L''eau bout à 100°C à pression normale.',
        'true_false',
        NULL,
        'true',
        1,
        5,
        'À pression atmosphérique normale (1 atm), l''eau bout à 100°C.'
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
ORDER BY created_at;

