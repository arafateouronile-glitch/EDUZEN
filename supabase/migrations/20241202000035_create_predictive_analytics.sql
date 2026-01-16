-- Migration pour les analytics prédictifs (taux de réussite, abandon)

-- 1. Table pour les modèles prédictifs
CREATE TABLE IF NOT EXISTS public.predictive_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations du modèle
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'success_rate', 'dropout', 'performance', 'engagement'
  model_version TEXT NOT NULL,
  -- Configuration
  algorithm TEXT NOT NULL, -- 'linear_regression', 'random_forest', 'neural_network', 'gradient_boosting'
  hyperparameters JSONB,
  feature_importance JSONB, -- Importance des features
  -- Performance
  accuracy DECIMAL(5, 2),
  precision_score DECIMAL(5, 2),
  recall_score DECIMAL(5, 2),
  f1_score DECIMAL(5, 2),
  r2_score DECIMAL(5, 2), -- Pour la régression
  mse DECIMAL(10, 2), -- Mean Squared Error
  mae DECIMAL(10, 2), -- Mean Absolute Error
  -- Données d'entraînement
  training_samples INTEGER,
  validation_samples INTEGER,
  test_samples INTEGER,
  training_date_range_start TIMESTAMPTZ,
  training_date_range_end TIMESTAMPTZ,
  -- Statut
  status TEXT DEFAULT 'training', -- 'training', 'active', 'deprecated', 'archived'
  is_production BOOLEAN DEFAULT false,
  -- Dates
  trained_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les prédictions de taux de réussite
CREATE TABLE IF NOT EXISTS public.success_rate_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.predictive_models(id) ON DELETE SET NULL,
  -- Cible de la prédiction
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
  -- Prédiction
  predicted_success_rate DECIMAL(5, 2) NOT NULL, -- Probabilité de réussite (0-100)
  predicted_grade DECIMAL(5, 2), -- Note prédite
  confidence_level DECIMAL(5, 2), -- Niveau de confiance (0-100)
  -- Catégorie de risque
  risk_category TEXT, -- 'low', 'medium', 'high', 'critical'
  -- Features utilisées
  input_features JSONB, -- Features utilisées pour la prédiction
  -- Facteurs de risque identifiés
  risk_factors JSONB, -- Liste des facteurs de risque identifiés
  -- Dates
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Date d'expiration de la prédiction
  -- Validation (après la fin de la session)
  actual_success_rate DECIMAL(5, 2), -- Taux de réussite réel
  actual_grade DECIMAL(5, 2), -- Note réelle
  was_accurate BOOLEAN, -- Prédiction correcte ou non
  validated_at TIMESTAMPTZ
);

-- 3. Table pour les prédictions d'abandon
CREATE TABLE IF NOT EXISTS public.dropout_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.predictive_models(id) ON DELETE SET NULL,
  -- Cible de la prédiction
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
  -- Prédiction
  dropout_probability DECIMAL(5, 2) NOT NULL, -- Probabilité d'abandon (0-100)
  predicted_dropout_date TIMESTAMPTZ, -- Date prédite d'abandon
  confidence_level DECIMAL(5, 2), -- Niveau de confiance (0-100)
  -- Catégorie de risque
  risk_category TEXT, -- 'low', 'medium', 'high', 'critical'
  -- Features utilisées
  input_features JSONB,
  -- Facteurs de risque identifiés
  risk_factors JSONB,
  -- Dates
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  -- Validation
  did_dropout BOOLEAN, -- A-t-il vraiment abandonné ?
  actual_dropout_date TIMESTAMPTZ,
  was_accurate BOOLEAN,
  validated_at TIMESTAMPTZ
);

-- 4. Table pour les features/indicateurs utilisés dans les modèles
CREATE TABLE IF NOT EXISTS public.prediction_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT NOT NULL UNIQUE,
  feature_type TEXT NOT NULL, -- 'academic', 'attendance', 'financial', 'behavioral', 'demographic'
  description TEXT,
  data_source TEXT, -- Table ou source de données
  calculation_method TEXT, -- Comment la feature est calculée
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les valeurs de features par étudiant
CREATE TABLE IF NOT EXISTS public.student_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.prediction_features(id) ON DELETE CASCADE,
  -- Valeur
  feature_value DECIMAL(10, 2),
  feature_value_text TEXT, -- Pour les valeurs textuelles
  -- Contexte
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
  -- Dates
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  UNIQUE(student_id, feature_id, session_id, formation_id)
);

-- 6. Table pour les alertes basées sur les prédictions
CREATE TABLE IF NOT EXISTS public.prediction_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Type d'alerte
  alert_type TEXT NOT NULL, -- 'low_success_rate', 'high_dropout_risk', 'performance_decline'
  -- Cible
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  -- Prédiction associée
  success_prediction_id UUID REFERENCES public.success_rate_predictions(id) ON DELETE SET NULL,
  dropout_prediction_id UUID REFERENCES public.dropout_predictions(id) ON DELETE SET NULL,
  -- Détails
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  message TEXT NOT NULL,
  recommended_actions JSONB, -- Actions recommandées
  -- Statut
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'dismissed'
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- 7. Table pour les rapports d'analytics prédictifs
CREATE TABLE IF NOT EXISTS public.predictive_analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Type de rapport
  report_type TEXT NOT NULL, -- 'success_rate', 'dropout', 'performance_trend', 'cohort_analysis'
  -- Période
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  -- Filtres
  filters JSONB, -- Filtres appliqués (formation, session, etc.)
  -- Résultats
  summary_stats JSONB, -- Statistiques résumées
  detailed_data JSONB, -- Données détaillées
  visualizations JSONB, -- Configurations de visualisations
  -- Métadonnées
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_predictive_models_org ON public.predictive_models(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_success_rate_predictions_student ON public.success_rate_predictions(student_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_success_rate_predictions_session ON public.success_rate_predictions(session_id);
CREATE INDEX IF NOT EXISTS idx_success_rate_predictions_org ON public.success_rate_predictions(organization_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_dropout_predictions_student ON public.dropout_predictions(student_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_dropout_predictions_session ON public.dropout_predictions(session_id);
CREATE INDEX IF NOT EXISTS idx_dropout_predictions_org ON public.dropout_predictions(organization_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_features_student ON public.student_features(student_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_features_feature ON public.student_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_prediction_alerts_student ON public.prediction_alerts(student_id, status);
CREATE INDEX IF NOT EXISTS idx_prediction_alerts_org ON public.prediction_alerts(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_org ON public.predictive_analytics_reports(organization_id, generated_at DESC);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_predictive_analytics_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_predictive_models_timestamp ON public.predictive_models;
CREATE TRIGGER update_predictive_models_timestamp
  BEFORE UPDATE ON public.predictive_models
  FOR EACH ROW
  EXECUTE FUNCTION update_predictive_analytics_updated_at();

DROP TRIGGER IF EXISTS update_prediction_features_timestamp ON public.prediction_features;
CREATE TRIGGER update_prediction_features_timestamp
  BEFORE UPDATE ON public.prediction_features
  FOR EACH ROW
  EXECUTE FUNCTION update_predictive_analytics_updated_at();

-- 11. Fonction pour calculer automatiquement les catégories de risque
CREATE OR REPLACE FUNCTION calculate_risk_category(
  p_score DECIMAL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_score >= 80 THEN
    RETURN 'critical';
  ELSIF p_score >= 60 THEN
    RETURN 'high';
  ELSIF p_score >= 40 THEN
    RETURN 'medium';
  ELSE
    RETURN 'low';
  END IF;
END;
$$;

-- 12. RLS Policies pour predictive_models
ALTER TABLE public.predictive_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view models in their organization" ON public.predictive_models;
CREATE POLICY "Users can view models in their organization"
  ON public.predictive_models
  FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 13. RLS Policies pour success_rate_predictions
ALTER TABLE public.success_rate_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view predictions in their organization" ON public.success_rate_predictions;
CREATE POLICY "Users can view predictions in their organization"
  ON public.success_rate_predictions
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 14. RLS Policies pour dropout_predictions
ALTER TABLE public.dropout_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view predictions in their organization" ON public.dropout_predictions;
CREATE POLICY "Users can view predictions in their organization"
  ON public.dropout_predictions
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 15. RLS Policies pour student_features
ALTER TABLE public.student_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view features in their organization" ON public.student_features;
CREATE POLICY "Users can view features in their organization"
  ON public.student_features
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.users
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- 16. RLS Policies pour prediction_alerts
ALTER TABLE public.prediction_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view alerts in their organization" ON public.prediction_alerts;
CREATE POLICY "Users can view alerts in their organization"
  ON public.prediction_alerts
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update alerts in their organization" ON public.prediction_alerts;
CREATE POLICY "Users can update alerts in their organization"
  ON public.prediction_alerts
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 17. RLS Policies pour predictive_analytics_reports
ALTER TABLE public.predictive_analytics_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reports in their organization" ON public.predictive_analytics_reports;
CREATE POLICY "Users can view reports in their organization"
  ON public.predictive_analytics_reports
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 18. Grant permissions
GRANT SELECT ON public.predictive_models TO authenticated;
GRANT SELECT ON public.success_rate_predictions TO authenticated;
GRANT SELECT ON public.dropout_predictions TO authenticated;
GRANT SELECT ON public.prediction_features TO authenticated;
GRANT SELECT ON public.student_features TO authenticated;
GRANT SELECT, UPDATE ON public.prediction_alerts TO authenticated;
GRANT SELECT, INSERT ON public.predictive_analytics_reports TO authenticated;

-- 19. Insertion des features par défaut
INSERT INTO public.prediction_features (feature_name, feature_type, description, data_source, calculation_method) VALUES
  ('average_grade', 'academic', 'Moyenne générale de l''étudiant', 'grades', 'AVG(grade)'),
  ('attendance_rate', 'attendance', 'Taux de présence', 'attendance', 'COUNT(present) / COUNT(total)'),
  ('late_payments_count', 'financial', 'Nombre de paiements en retard', 'payments', 'COUNT(*) WHERE status = overdue'),
  ('assignments_completed', 'academic', 'Nombre de devoirs complétés', 'assignments', 'COUNT(*) WHERE status = completed'),
  ('session_progress', 'academic', 'Progression dans la session', 'enrollments', 'progress_percentage'),
  ('days_since_last_activity', 'behavioral', 'Jours depuis la dernière activité', 'activity_logs', 'DATEDIFF(NOW(), last_activity)'),
  ('previous_success_rate', 'academic', 'Taux de réussite dans les sessions précédentes', 'sessions', 'AVG(success_rate)'),
  ('engagement_score', 'behavioral', 'Score d''engagement', 'activity_logs', 'Calculé à partir de diverses métriques'),
  ('time_to_complete_assignments', 'academic', 'Temps moyen pour compléter les devoirs', 'assignments', 'AVG(completion_time)'),
  ('interaction_frequency', 'behavioral', 'Fréquence d''interaction avec la plateforme', 'activity_logs', 'COUNT(*) / days_active')
ON CONFLICT (feature_name) DO NOTHING;


-- 1. Table pour les modèles prédictifs
CREATE TABLE IF NOT EXISTS public.predictive_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations du modèle
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'success_rate', 'dropout', 'performance', 'engagement'
  model_version TEXT NOT NULL,
  -- Configuration
  algorithm TEXT NOT NULL, -- 'linear_regression', 'random_forest', 'neural_network', 'gradient_boosting'
  hyperparameters JSONB,
  feature_importance JSONB, -- Importance des features
  -- Performance
  accuracy DECIMAL(5, 2),
  precision_score DECIMAL(5, 2),
  recall_score DECIMAL(5, 2),
  f1_score DECIMAL(5, 2),
  r2_score DECIMAL(5, 2), -- Pour la régression
  mse DECIMAL(10, 2), -- Mean Squared Error
  mae DECIMAL(10, 2), -- Mean Absolute Error
  -- Données d'entraînement
  training_samples INTEGER,
  validation_samples INTEGER,
  test_samples INTEGER,
  training_date_range_start TIMESTAMPTZ,
  training_date_range_end TIMESTAMPTZ,
  -- Statut
  status TEXT DEFAULT 'training', -- 'training', 'active', 'deprecated', 'archived'
  is_production BOOLEAN DEFAULT false,
  -- Dates
  trained_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les prédictions de taux de réussite
CREATE TABLE IF NOT EXISTS public.success_rate_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.predictive_models(id) ON DELETE SET NULL,
  -- Cible de la prédiction
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
  -- Prédiction
  predicted_success_rate DECIMAL(5, 2) NOT NULL, -- Probabilité de réussite (0-100)
  predicted_grade DECIMAL(5, 2), -- Note prédite
  confidence_level DECIMAL(5, 2), -- Niveau de confiance (0-100)
  -- Catégorie de risque
  risk_category TEXT, -- 'low', 'medium', 'high', 'critical'
  -- Features utilisées
  input_features JSONB, -- Features utilisées pour la prédiction
  -- Facteurs de risque identifiés
  risk_factors JSONB, -- Liste des facteurs de risque identifiés
  -- Dates
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Date d'expiration de la prédiction
  -- Validation (après la fin de la session)
  actual_success_rate DECIMAL(5, 2), -- Taux de réussite réel
  actual_grade DECIMAL(5, 2), -- Note réelle
  was_accurate BOOLEAN, -- Prédiction correcte ou non
  validated_at TIMESTAMPTZ
);

-- 3. Table pour les prédictions d'abandon
CREATE TABLE IF NOT EXISTS public.dropout_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.predictive_models(id) ON DELETE SET NULL,
  -- Cible de la prédiction
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
  -- Prédiction
  dropout_probability DECIMAL(5, 2) NOT NULL, -- Probabilité d'abandon (0-100)
  predicted_dropout_date TIMESTAMPTZ, -- Date prédite d'abandon
  confidence_level DECIMAL(5, 2), -- Niveau de confiance (0-100)
  -- Catégorie de risque
  risk_category TEXT, -- 'low', 'medium', 'high', 'critical'
  -- Features utilisées
  input_features JSONB,
  -- Facteurs de risque identifiés
  risk_factors JSONB,
  -- Dates
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  -- Validation
  did_dropout BOOLEAN, -- A-t-il vraiment abandonné ?
  actual_dropout_date TIMESTAMPTZ,
  was_accurate BOOLEAN,
  validated_at TIMESTAMPTZ
);

-- 4. Table pour les features/indicateurs utilisés dans les modèles
CREATE TABLE IF NOT EXISTS public.prediction_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT NOT NULL UNIQUE,
  feature_type TEXT NOT NULL, -- 'academic', 'attendance', 'financial', 'behavioral', 'demographic'
  description TEXT,
  data_source TEXT, -- Table ou source de données
  calculation_method TEXT, -- Comment la feature est calculée
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les valeurs de features par étudiant
CREATE TABLE IF NOT EXISTS public.student_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.prediction_features(id) ON DELETE CASCADE,
  -- Valeur
  feature_value DECIMAL(10, 2),
  feature_value_text TEXT, -- Pour les valeurs textuelles
  -- Contexte
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
  -- Dates
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  UNIQUE(student_id, feature_id, session_id, formation_id)
);

-- 6. Table pour les alertes basées sur les prédictions
CREATE TABLE IF NOT EXISTS public.prediction_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Type d'alerte
  alert_type TEXT NOT NULL, -- 'low_success_rate', 'high_dropout_risk', 'performance_decline'
  -- Cible
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  -- Prédiction associée
  success_prediction_id UUID REFERENCES public.success_rate_predictions(id) ON DELETE SET NULL,
  dropout_prediction_id UUID REFERENCES public.dropout_predictions(id) ON DELETE SET NULL,
  -- Détails
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  message TEXT NOT NULL,
  recommended_actions JSONB, -- Actions recommandées
  -- Statut
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'dismissed'
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- 7. Table pour les rapports d'analytics prédictifs
CREATE TABLE IF NOT EXISTS public.predictive_analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Type de rapport
  report_type TEXT NOT NULL, -- 'success_rate', 'dropout', 'performance_trend', 'cohort_analysis'
  -- Période
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  -- Filtres
  filters JSONB, -- Filtres appliqués (formation, session, etc.)
  -- Résultats
  summary_stats JSONB, -- Statistiques résumées
  detailed_data JSONB, -- Données détaillées
  visualizations JSONB, -- Configurations de visualisations
  -- Métadonnées
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_predictive_models_org ON public.predictive_models(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_success_rate_predictions_student ON public.success_rate_predictions(student_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_success_rate_predictions_session ON public.success_rate_predictions(session_id);
CREATE INDEX IF NOT EXISTS idx_success_rate_predictions_org ON public.success_rate_predictions(organization_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_dropout_predictions_student ON public.dropout_predictions(student_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_dropout_predictions_session ON public.dropout_predictions(session_id);
CREATE INDEX IF NOT EXISTS idx_dropout_predictions_org ON public.dropout_predictions(organization_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_features_student ON public.student_features(student_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_features_feature ON public.student_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_prediction_alerts_student ON public.prediction_alerts(student_id, status);
CREATE INDEX IF NOT EXISTS idx_prediction_alerts_org ON public.prediction_alerts(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_org ON public.predictive_analytics_reports(organization_id, generated_at DESC);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_predictive_analytics_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_predictive_models_timestamp ON public.predictive_models;
CREATE TRIGGER update_predictive_models_timestamp
  BEFORE UPDATE ON public.predictive_models
  FOR EACH ROW
  EXECUTE FUNCTION update_predictive_analytics_updated_at();

DROP TRIGGER IF EXISTS update_prediction_features_timestamp ON public.prediction_features;
CREATE TRIGGER update_prediction_features_timestamp
  BEFORE UPDATE ON public.prediction_features
  FOR EACH ROW
  EXECUTE FUNCTION update_predictive_analytics_updated_at();

-- 11. Fonction pour calculer automatiquement les catégories de risque
CREATE OR REPLACE FUNCTION calculate_risk_category(
  p_score DECIMAL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_score >= 80 THEN
    RETURN 'critical';
  ELSIF p_score >= 60 THEN
    RETURN 'high';
  ELSIF p_score >= 40 THEN
    RETURN 'medium';
  ELSE
    RETURN 'low';
  END IF;
END;
$$;

-- 12. RLS Policies pour predictive_models
ALTER TABLE public.predictive_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view models in their organization" ON public.predictive_models;
CREATE POLICY "Users can view models in their organization"
  ON public.predictive_models
  FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 13. RLS Policies pour success_rate_predictions
ALTER TABLE public.success_rate_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view predictions in their organization" ON public.success_rate_predictions;
CREATE POLICY "Users can view predictions in their organization"
  ON public.success_rate_predictions
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 14. RLS Policies pour dropout_predictions
ALTER TABLE public.dropout_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view predictions in their organization" ON public.dropout_predictions;
CREATE POLICY "Users can view predictions in their organization"
  ON public.dropout_predictions
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 15. RLS Policies pour student_features
ALTER TABLE public.student_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view features in their organization" ON public.student_features;
CREATE POLICY "Users can view features in their organization"
  ON public.student_features
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.users
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- 16. RLS Policies pour prediction_alerts
ALTER TABLE public.prediction_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view alerts in their organization" ON public.prediction_alerts;
CREATE POLICY "Users can view alerts in their organization"
  ON public.prediction_alerts
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update alerts in their organization" ON public.prediction_alerts;
CREATE POLICY "Users can update alerts in their organization"
  ON public.prediction_alerts
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 17. RLS Policies pour predictive_analytics_reports
ALTER TABLE public.predictive_analytics_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reports in their organization" ON public.predictive_analytics_reports;
CREATE POLICY "Users can view reports in their organization"
  ON public.predictive_analytics_reports
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 18. Grant permissions
GRANT SELECT ON public.predictive_models TO authenticated;
GRANT SELECT ON public.success_rate_predictions TO authenticated;
GRANT SELECT ON public.dropout_predictions TO authenticated;
GRANT SELECT ON public.prediction_features TO authenticated;
GRANT SELECT ON public.student_features TO authenticated;
GRANT SELECT, UPDATE ON public.prediction_alerts TO authenticated;
GRANT SELECT, INSERT ON public.predictive_analytics_reports TO authenticated;

-- 19. Insertion des features par défaut
INSERT INTO public.prediction_features (feature_name, feature_type, description, data_source, calculation_method) VALUES
  ('average_grade', 'academic', 'Moyenne générale de l''étudiant', 'grades', 'AVG(grade)'),
  ('attendance_rate', 'attendance', 'Taux de présence', 'attendance', 'COUNT(present) / COUNT(total)'),
  ('late_payments_count', 'financial', 'Nombre de paiements en retard', 'payments', 'COUNT(*) WHERE status = overdue'),
  ('assignments_completed', 'academic', 'Nombre de devoirs complétés', 'assignments', 'COUNT(*) WHERE status = completed'),
  ('session_progress', 'academic', 'Progression dans la session', 'enrollments', 'progress_percentage'),
  ('days_since_last_activity', 'behavioral', 'Jours depuis la dernière activité', 'activity_logs', 'DATEDIFF(NOW(), last_activity)'),
  ('previous_success_rate', 'academic', 'Taux de réussite dans les sessions précédentes', 'sessions', 'AVG(success_rate)'),
  ('engagement_score', 'behavioral', 'Score d''engagement', 'activity_logs', 'Calculé à partir de diverses métriques'),
  ('time_to_complete_assignments', 'academic', 'Temps moyen pour compléter les devoirs', 'assignments', 'AVG(completion_time)'),
  ('interaction_frequency', 'behavioral', 'Fréquence d''interaction avec la plateforme', 'activity_logs', 'COUNT(*) / days_active')
ON CONFLICT (feature_name) DO NOTHING;


-- 1. Table pour les modèles prédictifs
CREATE TABLE IF NOT EXISTS public.predictive_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations du modèle
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'success_rate', 'dropout', 'performance', 'engagement'
  model_version TEXT NOT NULL,
  -- Configuration
  algorithm TEXT NOT NULL, -- 'linear_regression', 'random_forest', 'neural_network', 'gradient_boosting'
  hyperparameters JSONB,
  feature_importance JSONB, -- Importance des features
  -- Performance
  accuracy DECIMAL(5, 2),
  precision_score DECIMAL(5, 2),
  recall_score DECIMAL(5, 2),
  f1_score DECIMAL(5, 2),
  r2_score DECIMAL(5, 2), -- Pour la régression
  mse DECIMAL(10, 2), -- Mean Squared Error
  mae DECIMAL(10, 2), -- Mean Absolute Error
  -- Données d'entraînement
  training_samples INTEGER,
  validation_samples INTEGER,
  test_samples INTEGER,
  training_date_range_start TIMESTAMPTZ,
  training_date_range_end TIMESTAMPTZ,
  -- Statut
  status TEXT DEFAULT 'training', -- 'training', 'active', 'deprecated', 'archived'
  is_production BOOLEAN DEFAULT false,
  -- Dates
  trained_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les prédictions de taux de réussite
CREATE TABLE IF NOT EXISTS public.success_rate_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.predictive_models(id) ON DELETE SET NULL,
  -- Cible de la prédiction
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
  -- Prédiction
  predicted_success_rate DECIMAL(5, 2) NOT NULL, -- Probabilité de réussite (0-100)
  predicted_grade DECIMAL(5, 2), -- Note prédite
  confidence_level DECIMAL(5, 2), -- Niveau de confiance (0-100)
  -- Catégorie de risque
  risk_category TEXT, -- 'low', 'medium', 'high', 'critical'
  -- Features utilisées
  input_features JSONB, -- Features utilisées pour la prédiction
  -- Facteurs de risque identifiés
  risk_factors JSONB, -- Liste des facteurs de risque identifiés
  -- Dates
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Date d'expiration de la prédiction
  -- Validation (après la fin de la session)
  actual_success_rate DECIMAL(5, 2), -- Taux de réussite réel
  actual_grade DECIMAL(5, 2), -- Note réelle
  was_accurate BOOLEAN, -- Prédiction correcte ou non
  validated_at TIMESTAMPTZ
);

-- 3. Table pour les prédictions d'abandon
CREATE TABLE IF NOT EXISTS public.dropout_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.predictive_models(id) ON DELETE SET NULL,
  -- Cible de la prédiction
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
  -- Prédiction
  dropout_probability DECIMAL(5, 2) NOT NULL, -- Probabilité d'abandon (0-100)
  predicted_dropout_date TIMESTAMPTZ, -- Date prédite d'abandon
  confidence_level DECIMAL(5, 2), -- Niveau de confiance (0-100)
  -- Catégorie de risque
  risk_category TEXT, -- 'low', 'medium', 'high', 'critical'
  -- Features utilisées
  input_features JSONB,
  -- Facteurs de risque identifiés
  risk_factors JSONB,
  -- Dates
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  -- Validation
  did_dropout BOOLEAN, -- A-t-il vraiment abandonné ?
  actual_dropout_date TIMESTAMPTZ,
  was_accurate BOOLEAN,
  validated_at TIMESTAMPTZ
);

-- 4. Table pour les features/indicateurs utilisés dans les modèles
CREATE TABLE IF NOT EXISTS public.prediction_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT NOT NULL UNIQUE,
  feature_type TEXT NOT NULL, -- 'academic', 'attendance', 'financial', 'behavioral', 'demographic'
  description TEXT,
  data_source TEXT, -- Table ou source de données
  calculation_method TEXT, -- Comment la feature est calculée
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les valeurs de features par étudiant
CREATE TABLE IF NOT EXISTS public.student_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.prediction_features(id) ON DELETE CASCADE,
  -- Valeur
  feature_value DECIMAL(10, 2),
  feature_value_text TEXT, -- Pour les valeurs textuelles
  -- Contexte
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
  -- Dates
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  UNIQUE(student_id, feature_id, session_id, formation_id)
);

-- 6. Table pour les alertes basées sur les prédictions
CREATE TABLE IF NOT EXISTS public.prediction_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Type d'alerte
  alert_type TEXT NOT NULL, -- 'low_success_rate', 'high_dropout_risk', 'performance_decline'
  -- Cible
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  -- Prédiction associée
  success_prediction_id UUID REFERENCES public.success_rate_predictions(id) ON DELETE SET NULL,
  dropout_prediction_id UUID REFERENCES public.dropout_predictions(id) ON DELETE SET NULL,
  -- Détails
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  message TEXT NOT NULL,
  recommended_actions JSONB, -- Actions recommandées
  -- Statut
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'dismissed'
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- 7. Table pour les rapports d'analytics prédictifs
CREATE TABLE IF NOT EXISTS public.predictive_analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Type de rapport
  report_type TEXT NOT NULL, -- 'success_rate', 'dropout', 'performance_trend', 'cohort_analysis'
  -- Période
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  -- Filtres
  filters JSONB, -- Filtres appliqués (formation, session, etc.)
  -- Résultats
  summary_stats JSONB, -- Statistiques résumées
  detailed_data JSONB, -- Données détaillées
  visualizations JSONB, -- Configurations de visualisations
  -- Métadonnées
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_predictive_models_org ON public.predictive_models(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_success_rate_predictions_student ON public.success_rate_predictions(student_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_success_rate_predictions_session ON public.success_rate_predictions(session_id);
CREATE INDEX IF NOT EXISTS idx_success_rate_predictions_org ON public.success_rate_predictions(organization_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_dropout_predictions_student ON public.dropout_predictions(student_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_dropout_predictions_session ON public.dropout_predictions(session_id);
CREATE INDEX IF NOT EXISTS idx_dropout_predictions_org ON public.dropout_predictions(organization_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_features_student ON public.student_features(student_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_features_feature ON public.student_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_prediction_alerts_student ON public.prediction_alerts(student_id, status);
CREATE INDEX IF NOT EXISTS idx_prediction_alerts_org ON public.prediction_alerts(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_org ON public.predictive_analytics_reports(organization_id, generated_at DESC);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_predictive_analytics_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_predictive_models_timestamp ON public.predictive_models;
CREATE TRIGGER update_predictive_models_timestamp
  BEFORE UPDATE ON public.predictive_models
  FOR EACH ROW
  EXECUTE FUNCTION update_predictive_analytics_updated_at();

DROP TRIGGER IF EXISTS update_prediction_features_timestamp ON public.prediction_features;
CREATE TRIGGER update_prediction_features_timestamp
  BEFORE UPDATE ON public.prediction_features
  FOR EACH ROW
  EXECUTE FUNCTION update_predictive_analytics_updated_at();

-- 11. Fonction pour calculer automatiquement les catégories de risque
CREATE OR REPLACE FUNCTION calculate_risk_category(
  p_score DECIMAL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_score >= 80 THEN
    RETURN 'critical';
  ELSIF p_score >= 60 THEN
    RETURN 'high';
  ELSIF p_score >= 40 THEN
    RETURN 'medium';
  ELSE
    RETURN 'low';
  END IF;
END;
$$;

-- 12. RLS Policies pour predictive_models
ALTER TABLE public.predictive_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view models in their organization" ON public.predictive_models;
CREATE POLICY "Users can view models in their organization"
  ON public.predictive_models
  FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 13. RLS Policies pour success_rate_predictions
ALTER TABLE public.success_rate_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view predictions in their organization" ON public.success_rate_predictions;
CREATE POLICY "Users can view predictions in their organization"
  ON public.success_rate_predictions
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 14. RLS Policies pour dropout_predictions
ALTER TABLE public.dropout_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view predictions in their organization" ON public.dropout_predictions;
CREATE POLICY "Users can view predictions in their organization"
  ON public.dropout_predictions
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 15. RLS Policies pour student_features
ALTER TABLE public.student_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view features in their organization" ON public.student_features;
CREATE POLICY "Users can view features in their organization"
  ON public.student_features
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.users
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- 16. RLS Policies pour prediction_alerts
ALTER TABLE public.prediction_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view alerts in their organization" ON public.prediction_alerts;
CREATE POLICY "Users can view alerts in their organization"
  ON public.prediction_alerts
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update alerts in their organization" ON public.prediction_alerts;
CREATE POLICY "Users can update alerts in their organization"
  ON public.prediction_alerts
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 17. RLS Policies pour predictive_analytics_reports
ALTER TABLE public.predictive_analytics_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reports in their organization" ON public.predictive_analytics_reports;
CREATE POLICY "Users can view reports in their organization"
  ON public.predictive_analytics_reports
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 18. Grant permissions
GRANT SELECT ON public.predictive_models TO authenticated;
GRANT SELECT ON public.success_rate_predictions TO authenticated;
GRANT SELECT ON public.dropout_predictions TO authenticated;
GRANT SELECT ON public.prediction_features TO authenticated;
GRANT SELECT ON public.student_features TO authenticated;
GRANT SELECT, UPDATE ON public.prediction_alerts TO authenticated;
GRANT SELECT, INSERT ON public.predictive_analytics_reports TO authenticated;

-- 19. Insertion des features par défaut
INSERT INTO public.prediction_features (feature_name, feature_type, description, data_source, calculation_method) VALUES
  ('average_grade', 'academic', 'Moyenne générale de l''étudiant', 'grades', 'AVG(grade)'),
  ('attendance_rate', 'attendance', 'Taux de présence', 'attendance', 'COUNT(present) / COUNT(total)'),
  ('late_payments_count', 'financial', 'Nombre de paiements en retard', 'payments', 'COUNT(*) WHERE status = overdue'),
  ('assignments_completed', 'academic', 'Nombre de devoirs complétés', 'assignments', 'COUNT(*) WHERE status = completed'),
  ('session_progress', 'academic', 'Progression dans la session', 'enrollments', 'progress_percentage'),
  ('days_since_last_activity', 'behavioral', 'Jours depuis la dernière activité', 'activity_logs', 'DATEDIFF(NOW(), last_activity)'),
  ('previous_success_rate', 'academic', 'Taux de réussite dans les sessions précédentes', 'sessions', 'AVG(success_rate)'),
  ('engagement_score', 'behavioral', 'Score d''engagement', 'activity_logs', 'Calculé à partir de diverses métriques'),
  ('time_to_complete_assignments', 'academic', 'Temps moyen pour compléter les devoirs', 'assignments', 'AVG(completion_time)'),
  ('interaction_frequency', 'behavioral', 'Fréquence d''interaction avec la plateforme', 'activity_logs', 'COUNT(*) / days_active')
ON CONFLICT (feature_name) DO NOTHING;

