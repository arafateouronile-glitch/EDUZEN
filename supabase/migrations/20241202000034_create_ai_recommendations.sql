-- Migration pour le système de recommandations intelligentes basées sur données

-- 1. Table pour les types de recommandations
CREATE TABLE IF NOT EXISTS public.recommendation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- 'student_at_risk', 'payment_overdue', 'low_attendance', etc.
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'academic', 'financial', 'attendance', 'engagement', 'general'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  icon TEXT, -- Nom de l'icône
  color TEXT, -- Couleur de la recommandation
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les recommandations
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recommendation_type_id UUID NOT NULL REFERENCES public.recommendation_types(id) ON DELETE CASCADE,
  -- Cible de la recommandation
  target_type TEXT NOT NULL, -- 'student', 'session', 'payment', 'course', 'formation', 'general'
  target_id UUID, -- ID de l'entité ciblée
  -- Contenu
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_action TEXT, -- Action suggérée
  -- Métriques et scores
  confidence_score DECIMAL(5, 2) DEFAULT 0, -- Score de confiance (0-100)
  impact_score DECIMAL(5, 2) DEFAULT 0, -- Score d'impact potentiel (0-100)
  urgency_score DECIMAL(5, 2) DEFAULT 0, -- Score d'urgence (0-100)
  -- Données sources
  source_data JSONB, -- Données qui ont généré la recommandation
  -- Statut
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'dismissed', 'resolved'
  -- Utilisateur concerné
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Utilisateur à qui s'adresse la recommandation
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ -- Date d'expiration de la recommandation
);

-- 3. Table pour les actions prises sur les recommandations
CREATE TABLE IF NOT EXISTS public.recommendation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Action
  action_type TEXT NOT NULL, -- 'acknowledge', 'dismiss', 'resolve', 'follow_suggestion'
  action_details JSONB, -- Détails de l'action
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les modèles d'IA et leurs performances
CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations du modèle
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'recommendation', 'prediction', 'classification', 'clustering'
  -- Configuration
  configuration JSONB, -- Configuration du modèle
  training_data_summary JSONB, -- Résumé des données d'entraînement
  -- Performance
  accuracy_score DECIMAL(5, 2),
  precision_score DECIMAL(5, 2),
  recall_score DECIMAL(5, 2),
  f1_score DECIMAL(5, 2),
  -- Statut
  status TEXT DEFAULT 'active', -- 'training', 'active', 'deprecated', 'archived'
  -- Dates
  trained_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les prédictions générées par les modèles
CREATE TABLE IF NOT EXISTS public.ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL,
  -- Type de prédiction
  prediction_type TEXT NOT NULL, -- 'student_success', 'payment_default', 'attendance_drop', etc.
  -- Cible
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  -- Prédiction
  predicted_value DECIMAL(10, 2), -- Valeur prédite (ex: probabilité, score)
  predicted_label TEXT, -- Label prédit (ex: 'at_risk', 'will_succeed')
  confidence DECIMAL(5, 2), -- Confiance de la prédiction (0-100)
  -- Données d'entrée
  input_features JSONB, -- Features utilisées pour la prédiction
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Date d'expiration de la prédiction
);

-- 6. Table pour le feedback sur les recommandations
CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Feedback
  was_helpful BOOLEAN,
  was_accurate BOOLEAN,
  was_actionable BOOLEAN,
  feedback_text TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(recommendation_id, user_id)
);

-- 7. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_recommendations_org ON public.recommendations(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON public.recommendations(recommendation_type_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_target ON public.recommendations(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON public.recommendations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON public.recommendations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_recommendation ON public.recommendation_actions(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_user ON public.recommendation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_org ON public.ai_models(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_org ON public.ai_predictions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_model ON public.ai_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_target ON public.ai_predictions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_recommendation ON public.recommendation_feedback(recommendation_id);

-- 8. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_recommendations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_recommendation_types_timestamp ON public.recommendation_types;
CREATE TRIGGER update_recommendation_types_timestamp
  BEFORE UPDATE ON public.recommendation_types
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendations_updated_at();

DROP TRIGGER IF EXISTS update_ai_models_timestamp ON public.ai_models;
CREATE TRIGGER update_ai_models_timestamp
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendations_updated_at();

-- 10. Fonction pour calculer le score de priorité d'une recommandation
CREATE OR REPLACE FUNCTION calculate_recommendation_priority(
  p_confidence DECIMAL,
  p_impact DECIMAL,
  p_urgency DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
BEGIN
  -- Formule: (confidence * 0.3) + (impact * 0.4) + (urgency * 0.3)
  RETURN (p_confidence * 0.3) + (p_impact * 0.4) + (p_urgency * 0.3);
END;
$$;

-- 11. RLS Policies pour recommendation_types
ALTER TABLE public.recommendation_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active recommendation types" ON public.recommendation_types;
CREATE POLICY "Users can view active recommendation types"
  ON public.recommendation_types
  FOR SELECT
  USING (is_active = true);

-- 12. RLS Policies pour recommendations
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view recommendations in their organization" ON public.recommendations;
CREATE POLICY "Users can view recommendations in their organization"
  ON public.recommendations
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
    AND status != 'dismissed'
    AND (expires_at IS NULL OR expires_at > NOW())
  );

DROP POLICY IF EXISTS "System can create recommendations" ON public.recommendations;
CREATE POLICY "System can create recommendations"
  ON public.recommendations
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their recommendations" ON public.recommendations;
CREATE POLICY "Users can update their recommendations"
  ON public.recommendations
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- 13. RLS Policies pour recommendation_actions
ALTER TABLE public.recommendation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view actions on their recommendations" ON public.recommendation_actions;
CREATE POLICY "Users can view actions on their recommendations"
  ON public.recommendation_actions
  FOR SELECT
  USING (
    recommendation_id IN (
      SELECT id FROM public.recommendations
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create actions on recommendations" ON public.recommendation_actions;
CREATE POLICY "Users can create actions on recommendations"
  ON public.recommendation_actions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND recommendation_id IN (
      SELECT id FROM public.recommendations
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- 14. RLS Policies pour ai_models
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view models in their organization" ON public.ai_models;
CREATE POLICY "Users can view models in their organization"
  ON public.ai_models
  FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 15. RLS Policies pour ai_predictions
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view predictions in their organization" ON public.ai_predictions;
CREATE POLICY "Users can view predictions in their organization"
  ON public.ai_predictions
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 16. RLS Policies pour recommendation_feedback
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own feedback" ON public.recommendation_feedback;
CREATE POLICY "Users can manage their own feedback"
  ON public.recommendation_feedback
  FOR ALL
  USING (user_id = auth.uid());

-- 17. Grant permissions
GRANT SELECT ON public.recommendation_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recommendations TO authenticated;
GRANT SELECT, INSERT ON public.recommendation_actions TO authenticated;
GRANT SELECT ON public.ai_models TO authenticated;
GRANT SELECT ON public.ai_predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recommendation_feedback TO authenticated;

-- 18. Insertion des types de recommandations par défaut
INSERT INTO public.recommendation_types (code, name, description, category, priority, icon, color) VALUES
  ('student_at_risk', 'Élève à risque', 'Élève présentant des signes de difficultés académiques', 'academic', 'high', 'AlertTriangle', '#EF4444'),
  ('low_attendance', 'Faible présence', 'Taux de présence en dessous du seuil recommandé', 'attendance', 'medium', 'UserX', '#F59E0B'),
  ('payment_overdue', 'Paiement en retard', 'Paiement en retard nécessitant un suivi', 'financial', 'high', 'CreditCard', '#EF4444'),
  ('course_recommendation', 'Recommandation de cours', 'Cours recommandé basé sur le profil', 'academic', 'low', 'BookOpen', '#3B82F6'),
  ('session_optimization', 'Optimisation de session', 'Suggestion pour améliorer une session', 'academic', 'medium', 'TrendingUp', '#10B981'),
  ('engagement_boost', 'Amélioration de l''engagement', 'Stratégies pour augmenter l''engagement', 'engagement', 'medium', 'Zap', '#8B5CF6'),
  ('resource_suggestion', 'Suggestion de ressource', 'Ressource pédagogique recommandée', 'academic', 'low', 'FileText', '#06B6D4'),
  ('deadline_approaching', 'Échéance approchant', 'Échéance importante dans les prochains jours', 'general', 'medium', 'Clock', '#F59E0B'),
  ('performance_trend', 'Tendance de performance', 'Analyse de la tendance de performance', 'academic', 'low', 'BarChart', '#6366F1'),
  ('capacity_optimization', 'Optimisation de capacité', 'Suggestion pour optimiser la capacité des sessions', 'academic', 'medium', 'Users', '#10B981')
ON CONFLICT (code) DO NOTHING;



-- 1. Table pour les types de recommandations
CREATE TABLE IF NOT EXISTS public.recommendation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- 'student_at_risk', 'payment_overdue', 'low_attendance', etc.
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'academic', 'financial', 'attendance', 'engagement', 'general'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  icon TEXT, -- Nom de l'icône
  color TEXT, -- Couleur de la recommandation
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les recommandations
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recommendation_type_id UUID NOT NULL REFERENCES public.recommendation_types(id) ON DELETE CASCADE,
  -- Cible de la recommandation
  target_type TEXT NOT NULL, -- 'student', 'session', 'payment', 'course', 'formation', 'general'
  target_id UUID, -- ID de l'entité ciblée
  -- Contenu
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_action TEXT, -- Action suggérée
  -- Métriques et scores
  confidence_score DECIMAL(5, 2) DEFAULT 0, -- Score de confiance (0-100)
  impact_score DECIMAL(5, 2) DEFAULT 0, -- Score d'impact potentiel (0-100)
  urgency_score DECIMAL(5, 2) DEFAULT 0, -- Score d'urgence (0-100)
  -- Données sources
  source_data JSONB, -- Données qui ont généré la recommandation
  -- Statut
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'dismissed', 'resolved'
  -- Utilisateur concerné
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Utilisateur à qui s'adresse la recommandation
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ -- Date d'expiration de la recommandation
);

-- 3. Table pour les actions prises sur les recommandations
CREATE TABLE IF NOT EXISTS public.recommendation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Action
  action_type TEXT NOT NULL, -- 'acknowledge', 'dismiss', 'resolve', 'follow_suggestion'
  action_details JSONB, -- Détails de l'action
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les modèles d'IA et leurs performances
CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations du modèle
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'recommendation', 'prediction', 'classification', 'clustering'
  -- Configuration
  configuration JSONB, -- Configuration du modèle
  training_data_summary JSONB, -- Résumé des données d'entraînement
  -- Performance
  accuracy_score DECIMAL(5, 2),
  precision_score DECIMAL(5, 2),
  recall_score DECIMAL(5, 2),
  f1_score DECIMAL(5, 2),
  -- Statut
  status TEXT DEFAULT 'active', -- 'training', 'active', 'deprecated', 'archived'
  -- Dates
  trained_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les prédictions générées par les modèles
CREATE TABLE IF NOT EXISTS public.ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL,
  -- Type de prédiction
  prediction_type TEXT NOT NULL, -- 'student_success', 'payment_default', 'attendance_drop', etc.
  -- Cible
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  -- Prédiction
  predicted_value DECIMAL(10, 2), -- Valeur prédite (ex: probabilité, score)
  predicted_label TEXT, -- Label prédit (ex: 'at_risk', 'will_succeed')
  confidence DECIMAL(5, 2), -- Confiance de la prédiction (0-100)
  -- Données d'entrée
  input_features JSONB, -- Features utilisées pour la prédiction
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Date d'expiration de la prédiction
);

-- 6. Table pour le feedback sur les recommandations
CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Feedback
  was_helpful BOOLEAN,
  was_accurate BOOLEAN,
  was_actionable BOOLEAN,
  feedback_text TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(recommendation_id, user_id)
);

-- 7. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_recommendations_org ON public.recommendations(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON public.recommendations(recommendation_type_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_target ON public.recommendations(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON public.recommendations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON public.recommendations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_recommendation ON public.recommendation_actions(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_user ON public.recommendation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_org ON public.ai_models(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_org ON public.ai_predictions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_model ON public.ai_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_target ON public.ai_predictions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_recommendation ON public.recommendation_feedback(recommendation_id);

-- 8. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_recommendations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_recommendation_types_timestamp ON public.recommendation_types;
CREATE TRIGGER update_recommendation_types_timestamp
  BEFORE UPDATE ON public.recommendation_types
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendations_updated_at();

DROP TRIGGER IF EXISTS update_ai_models_timestamp ON public.ai_models;
CREATE TRIGGER update_ai_models_timestamp
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendations_updated_at();

-- 10. Fonction pour calculer le score de priorité d'une recommandation
CREATE OR REPLACE FUNCTION calculate_recommendation_priority(
  p_confidence DECIMAL,
  p_impact DECIMAL,
  p_urgency DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
BEGIN
  -- Formule: (confidence * 0.3) + (impact * 0.4) + (urgency * 0.3)
  RETURN (p_confidence * 0.3) + (p_impact * 0.4) + (p_urgency * 0.3);
END;
$$;

-- 11. RLS Policies pour recommendation_types
ALTER TABLE public.recommendation_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active recommendation types" ON public.recommendation_types;
CREATE POLICY "Users can view active recommendation types"
  ON public.recommendation_types
  FOR SELECT
  USING (is_active = true);

-- 12. RLS Policies pour recommendations
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view recommendations in their organization" ON public.recommendations;
CREATE POLICY "Users can view recommendations in their organization"
  ON public.recommendations
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
    AND status != 'dismissed'
    AND (expires_at IS NULL OR expires_at > NOW())
  );

DROP POLICY IF EXISTS "System can create recommendations" ON public.recommendations;
CREATE POLICY "System can create recommendations"
  ON public.recommendations
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their recommendations" ON public.recommendations;
CREATE POLICY "Users can update their recommendations"
  ON public.recommendations
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- 13. RLS Policies pour recommendation_actions
ALTER TABLE public.recommendation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view actions on their recommendations" ON public.recommendation_actions;
CREATE POLICY "Users can view actions on their recommendations"
  ON public.recommendation_actions
  FOR SELECT
  USING (
    recommendation_id IN (
      SELECT id FROM public.recommendations
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create actions on recommendations" ON public.recommendation_actions;
CREATE POLICY "Users can create actions on recommendations"
  ON public.recommendation_actions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND recommendation_id IN (
      SELECT id FROM public.recommendations
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- 14. RLS Policies pour ai_models
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view models in their organization" ON public.ai_models;
CREATE POLICY "Users can view models in their organization"
  ON public.ai_models
  FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 15. RLS Policies pour ai_predictions
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view predictions in their organization" ON public.ai_predictions;
CREATE POLICY "Users can view predictions in their organization"
  ON public.ai_predictions
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 16. RLS Policies pour recommendation_feedback
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own feedback" ON public.recommendation_feedback;
CREATE POLICY "Users can manage their own feedback"
  ON public.recommendation_feedback
  FOR ALL
  USING (user_id = auth.uid());

-- 17. Grant permissions
GRANT SELECT ON public.recommendation_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recommendations TO authenticated;
GRANT SELECT, INSERT ON public.recommendation_actions TO authenticated;
GRANT SELECT ON public.ai_models TO authenticated;
GRANT SELECT ON public.ai_predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recommendation_feedback TO authenticated;

-- 18. Insertion des types de recommandations par défaut
INSERT INTO public.recommendation_types (code, name, description, category, priority, icon, color) VALUES
  ('student_at_risk', 'Élève à risque', 'Élève présentant des signes de difficultés académiques', 'academic', 'high', 'AlertTriangle', '#EF4444'),
  ('low_attendance', 'Faible présence', 'Taux de présence en dessous du seuil recommandé', 'attendance', 'medium', 'UserX', '#F59E0B'),
  ('payment_overdue', 'Paiement en retard', 'Paiement en retard nécessitant un suivi', 'financial', 'high', 'CreditCard', '#EF4444'),
  ('course_recommendation', 'Recommandation de cours', 'Cours recommandé basé sur le profil', 'academic', 'low', 'BookOpen', '#3B82F6'),
  ('session_optimization', 'Optimisation de session', 'Suggestion pour améliorer une session', 'academic', 'medium', 'TrendingUp', '#10B981'),
  ('engagement_boost', 'Amélioration de l''engagement', 'Stratégies pour augmenter l''engagement', 'engagement', 'medium', 'Zap', '#8B5CF6'),
  ('resource_suggestion', 'Suggestion de ressource', 'Ressource pédagogique recommandée', 'academic', 'low', 'FileText', '#06B6D4'),
  ('deadline_approaching', 'Échéance approchant', 'Échéance importante dans les prochains jours', 'general', 'medium', 'Clock', '#F59E0B'),
  ('performance_trend', 'Tendance de performance', 'Analyse de la tendance de performance', 'academic', 'low', 'BarChart', '#6366F1'),
  ('capacity_optimization', 'Optimisation de capacité', 'Suggestion pour optimiser la capacité des sessions', 'academic', 'medium', 'Users', '#10B981')
ON CONFLICT (code) DO NOTHING;



-- 1. Table pour les types de recommandations
CREATE TABLE IF NOT EXISTS public.recommendation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- 'student_at_risk', 'payment_overdue', 'low_attendance', etc.
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'academic', 'financial', 'attendance', 'engagement', 'general'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  icon TEXT, -- Nom de l'icône
  color TEXT, -- Couleur de la recommandation
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les recommandations
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recommendation_type_id UUID NOT NULL REFERENCES public.recommendation_types(id) ON DELETE CASCADE,
  -- Cible de la recommandation
  target_type TEXT NOT NULL, -- 'student', 'session', 'payment', 'course', 'formation', 'general'
  target_id UUID, -- ID de l'entité ciblée
  -- Contenu
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_action TEXT, -- Action suggérée
  -- Métriques et scores
  confidence_score DECIMAL(5, 2) DEFAULT 0, -- Score de confiance (0-100)
  impact_score DECIMAL(5, 2) DEFAULT 0, -- Score d'impact potentiel (0-100)
  urgency_score DECIMAL(5, 2) DEFAULT 0, -- Score d'urgence (0-100)
  -- Données sources
  source_data JSONB, -- Données qui ont généré la recommandation
  -- Statut
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'dismissed', 'resolved'
  -- Utilisateur concerné
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Utilisateur à qui s'adresse la recommandation
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ -- Date d'expiration de la recommandation
);

-- 3. Table pour les actions prises sur les recommandations
CREATE TABLE IF NOT EXISTS public.recommendation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Action
  action_type TEXT NOT NULL, -- 'acknowledge', 'dismiss', 'resolve', 'follow_suggestion'
  action_details JSONB, -- Détails de l'action
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les modèles d'IA et leurs performances
CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations du modèle
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'recommendation', 'prediction', 'classification', 'clustering'
  -- Configuration
  configuration JSONB, -- Configuration du modèle
  training_data_summary JSONB, -- Résumé des données d'entraînement
  -- Performance
  accuracy_score DECIMAL(5, 2),
  precision_score DECIMAL(5, 2),
  recall_score DECIMAL(5, 2),
  f1_score DECIMAL(5, 2),
  -- Statut
  status TEXT DEFAULT 'active', -- 'training', 'active', 'deprecated', 'archived'
  -- Dates
  trained_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les prédictions générées par les modèles
CREATE TABLE IF NOT EXISTS public.ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL,
  -- Type de prédiction
  prediction_type TEXT NOT NULL, -- 'student_success', 'payment_default', 'attendance_drop', etc.
  -- Cible
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  -- Prédiction
  predicted_value DECIMAL(10, 2), -- Valeur prédite (ex: probabilité, score)
  predicted_label TEXT, -- Label prédit (ex: 'at_risk', 'will_succeed')
  confidence DECIMAL(5, 2), -- Confiance de la prédiction (0-100)
  -- Données d'entrée
  input_features JSONB, -- Features utilisées pour la prédiction
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Date d'expiration de la prédiction
);

-- 6. Table pour le feedback sur les recommandations
CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Feedback
  was_helpful BOOLEAN,
  was_accurate BOOLEAN,
  was_actionable BOOLEAN,
  feedback_text TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(recommendation_id, user_id)
);

-- 7. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_recommendations_org ON public.recommendations(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON public.recommendations(recommendation_type_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_target ON public.recommendations(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON public.recommendations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON public.recommendations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_recommendation ON public.recommendation_actions(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_user ON public.recommendation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_org ON public.ai_models(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_org ON public.ai_predictions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_model ON public.ai_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_target ON public.ai_predictions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_recommendation ON public.recommendation_feedback(recommendation_id);

-- 8. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_recommendations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_recommendation_types_timestamp ON public.recommendation_types;
CREATE TRIGGER update_recommendation_types_timestamp
  BEFORE UPDATE ON public.recommendation_types
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendations_updated_at();

DROP TRIGGER IF EXISTS update_ai_models_timestamp ON public.ai_models;
CREATE TRIGGER update_ai_models_timestamp
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendations_updated_at();

-- 10. Fonction pour calculer le score de priorité d'une recommandation
CREATE OR REPLACE FUNCTION calculate_recommendation_priority(
  p_confidence DECIMAL,
  p_impact DECIMAL,
  p_urgency DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
BEGIN
  -- Formule: (confidence * 0.3) + (impact * 0.4) + (urgency * 0.3)
  RETURN (p_confidence * 0.3) + (p_impact * 0.4) + (p_urgency * 0.3);
END;
$$;

-- 11. RLS Policies pour recommendation_types
ALTER TABLE public.recommendation_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active recommendation types" ON public.recommendation_types;
CREATE POLICY "Users can view active recommendation types"
  ON public.recommendation_types
  FOR SELECT
  USING (is_active = true);

-- 12. RLS Policies pour recommendations
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view recommendations in their organization" ON public.recommendations;
CREATE POLICY "Users can view recommendations in their organization"
  ON public.recommendations
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
    AND status != 'dismissed'
    AND (expires_at IS NULL OR expires_at > NOW())
  );

DROP POLICY IF EXISTS "System can create recommendations" ON public.recommendations;
CREATE POLICY "System can create recommendations"
  ON public.recommendations
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their recommendations" ON public.recommendations;
CREATE POLICY "Users can update their recommendations"
  ON public.recommendations
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- 13. RLS Policies pour recommendation_actions
ALTER TABLE public.recommendation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view actions on their recommendations" ON public.recommendation_actions;
CREATE POLICY "Users can view actions on their recommendations"
  ON public.recommendation_actions
  FOR SELECT
  USING (
    recommendation_id IN (
      SELECT id FROM public.recommendations
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create actions on recommendations" ON public.recommendation_actions;
CREATE POLICY "Users can create actions on recommendations"
  ON public.recommendation_actions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND recommendation_id IN (
      SELECT id FROM public.recommendations
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- 14. RLS Policies pour ai_models
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view models in their organization" ON public.ai_models;
CREATE POLICY "Users can view models in their organization"
  ON public.ai_models
  FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 15. RLS Policies pour ai_predictions
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view predictions in their organization" ON public.ai_predictions;
CREATE POLICY "Users can view predictions in their organization"
  ON public.ai_predictions
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 16. RLS Policies pour recommendation_feedback
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own feedback" ON public.recommendation_feedback;
CREATE POLICY "Users can manage their own feedback"
  ON public.recommendation_feedback
  FOR ALL
  USING (user_id = auth.uid());

-- 17. Grant permissions
GRANT SELECT ON public.recommendation_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recommendations TO authenticated;
GRANT SELECT, INSERT ON public.recommendation_actions TO authenticated;
GRANT SELECT ON public.ai_models TO authenticated;
GRANT SELECT ON public.ai_predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recommendation_feedback TO authenticated;

-- 18. Insertion des types de recommandations par défaut
INSERT INTO public.recommendation_types (code, name, description, category, priority, icon, color) VALUES
  ('student_at_risk', 'Élève à risque', 'Élève présentant des signes de difficultés académiques', 'academic', 'high', 'AlertTriangle', '#EF4444'),
  ('low_attendance', 'Faible présence', 'Taux de présence en dessous du seuil recommandé', 'attendance', 'medium', 'UserX', '#F59E0B'),
  ('payment_overdue', 'Paiement en retard', 'Paiement en retard nécessitant un suivi', 'financial', 'high', 'CreditCard', '#EF4444'),
  ('course_recommendation', 'Recommandation de cours', 'Cours recommandé basé sur le profil', 'academic', 'low', 'BookOpen', '#3B82F6'),
  ('session_optimization', 'Optimisation de session', 'Suggestion pour améliorer une session', 'academic', 'medium', 'TrendingUp', '#10B981'),
  ('engagement_boost', 'Amélioration de l''engagement', 'Stratégies pour augmenter l''engagement', 'engagement', 'medium', 'Zap', '#8B5CF6'),
  ('resource_suggestion', 'Suggestion de ressource', 'Ressource pédagogique recommandée', 'academic', 'low', 'FileText', '#06B6D4'),
  ('deadline_approaching', 'Échéance approchant', 'Échéance importante dans les prochains jours', 'general', 'medium', 'Clock', '#F59E0B'),
  ('performance_trend', 'Tendance de performance', 'Analyse de la tendance de performance', 'academic', 'low', 'BarChart', '#6366F1'),
  ('capacity_optimization', 'Optimisation de capacité', 'Suggestion pour optimiser la capacité des sessions', 'academic', 'medium', 'Users', '#10B981')
ON CONFLICT (code) DO NOTHING;


