-- Migration pour la détection automatique d'anomalies

-- 1. Table pour les types d'anomalies
CREATE TABLE IF NOT EXISTS public.anomaly_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- 'unusual_grade', 'attendance_spike', 'payment_anomaly', etc.
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'academic', 'financial', 'attendance', 'behavioral', 'system'
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  detection_method TEXT, -- 'statistical', 'ml', 'rule_based', 'threshold'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les anomalies détectées
CREATE TABLE IF NOT EXISTS public.anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  anomaly_type_id UUID NOT NULL REFERENCES public.anomaly_types(id) ON DELETE CASCADE,
  -- Cible de l'anomalie
  entity_type TEXT NOT NULL, -- 'student', 'payment', 'session', 'grade', 'attendance', 'system'
  entity_id UUID, -- ID de l'entité concernée
  -- Détails de l'anomalie
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  -- Métriques
  anomaly_score DECIMAL(5, 2) NOT NULL, -- Score d'anomalie (0-100)
  confidence_level DECIMAL(5, 2) NOT NULL, -- Niveau de confiance (0-100)
  deviation_from_normal DECIMAL(10, 2), -- Écart par rapport à la normale
  -- Données sources
  detected_values JSONB, -- Valeurs détectées
  expected_values JSONB, -- Valeurs attendues/normales
  context_data JSONB, -- Données contextuelles
  -- Statut
  status TEXT DEFAULT 'detected', -- 'detected', 'investigating', 'confirmed', 'false_positive', 'resolved'
  -- Assignation
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Dates
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  investigated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ -- Date d'expiration de l'anomalie
);

-- 3. Table pour les règles de détection
CREATE TABLE IF NOT EXISTS public.anomaly_detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  anomaly_type_id UUID NOT NULL REFERENCES public.anomaly_types(id) ON DELETE CASCADE,
  -- Configuration de la règle
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  rule_config JSONB NOT NULL, -- Configuration spécifique de la règle
  -- Seuils
  threshold_value DECIMAL(10, 2), -- Seuil de déclenchement
  min_confidence DECIMAL(5, 2) DEFAULT 70, -- Confiance minimale requise
  -- Statut
  is_active BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les actions prises sur les anomalies
CREATE TABLE IF NOT EXISTS public.anomaly_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_id UUID NOT NULL REFERENCES public.anomalies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Action
  action_type TEXT NOT NULL, -- 'investigate', 'confirm', 'dismiss', 'resolve', 'escalate'
  action_details JSONB, -- Détails de l'action
  notes TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les modèles de détection d'anomalies
CREATE TABLE IF NOT EXISTS public.anomaly_detection_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations du modèle
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'isolation_forest', 'lof', 'autoencoder', 'svm', 'statistical'
  model_version TEXT NOT NULL,
  -- Configuration
  configuration JSONB,
  training_data_summary JSONB,
  -- Performance
  precision_score DECIMAL(5, 2),
  recall_score DECIMAL(5, 2),
  f1_score DECIMAL(5, 2),
  false_positive_rate DECIMAL(5, 2),
  -- Statut
  status TEXT DEFAULT 'training', -- 'training', 'active', 'deprecated'
  is_production BOOLEAN DEFAULT false,
  -- Dates
  trained_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Table pour les patterns normaux (baseline)
CREATE TABLE IF NOT EXISTS public.normal_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Type de pattern
  pattern_type TEXT NOT NULL, -- 'student_behavior', 'grade_distribution', 'attendance_pattern', etc.
  -- Données du pattern
  pattern_data JSONB NOT NULL, -- Données statistiques du pattern normal
  -- Période de référence
  reference_period_start TIMESTAMPTZ NOT NULL,
  reference_period_end TIMESTAMPTZ NOT NULL,
  -- Métadonnées
  sample_size INTEGER,
  confidence_level DECIMAL(5, 2),
  -- Dates
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 7. Table pour les alertes d'anomalies
CREATE TABLE IF NOT EXISTS public.anomaly_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  anomaly_id UUID NOT NULL REFERENCES public.anomalies(id) ON DELETE CASCADE,
  -- Destinataire
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Type d'alerte
  alert_type TEXT DEFAULT 'notification', -- 'notification', 'email', 'sms', 'system'
  -- Statut
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_anomaly_types_code ON public.anomaly_types(code);
CREATE INDEX IF NOT EXISTS idx_anomalies_org ON public.anomalies(organization_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_type ON public.anomalies(anomaly_type_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_entity ON public.anomalies(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON public.anomalies(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_anomalies_assigned ON public.anomalies(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_rules_type ON public.anomaly_detection_rules(anomaly_type_id, is_active);
CREATE INDEX IF NOT EXISTS idx_anomaly_actions_anomaly ON public.anomaly_actions(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_actions_user ON public.anomaly_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_models_org ON public.anomaly_detection_models(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_normal_patterns_org ON public.normal_patterns(organization_id, pattern_type);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_anomaly ON public.anomaly_alerts(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_user ON public.anomaly_alerts(user_id, is_sent);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_anomaly_detection_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_anomaly_types_timestamp ON public.anomaly_types;
CREATE TRIGGER update_anomaly_types_timestamp
  BEFORE UPDATE ON public.anomaly_types
  FOR EACH ROW
  EXECUTE FUNCTION update_anomaly_detection_updated_at();

DROP TRIGGER IF EXISTS update_anomaly_detection_rules_timestamp ON public.anomaly_detection_rules;
CREATE TRIGGER update_anomaly_detection_rules_timestamp
  BEFORE UPDATE ON public.anomaly_detection_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_anomaly_detection_updated_at();

DROP TRIGGER IF EXISTS update_anomaly_detection_models_timestamp ON public.anomaly_detection_models;
CREATE TRIGGER update_anomaly_detection_models_timestamp
  BEFORE UPDATE ON public.anomaly_detection_models
  FOR EACH ROW
  EXECUTE FUNCTION update_anomaly_detection_updated_at();

-- 11. Fonction pour créer automatiquement une alerte lors de la détection d'une anomalie critique
CREATE OR REPLACE FUNCTION create_anomaly_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  anomaly_type_record RECORD;
BEGIN
  -- Récupérer le type d'anomalie
  SELECT * INTO anomaly_type_record
  FROM public.anomaly_types
  WHERE id = NEW.anomaly_type_id;
  
  -- Créer une alerte si l'anomalie est critique ou haute sévérité
  IF anomaly_type_record.severity IN ('high', 'critical') OR NEW.anomaly_score >= 80 THEN
    INSERT INTO public.anomaly_alerts (
      organization_id,
      anomaly_id,
      user_id,
      alert_type
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      NEW.assigned_to,
      'notification'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_anomaly_alert ON public.anomalies;
CREATE TRIGGER trigger_create_anomaly_alert
  AFTER INSERT ON public.anomalies
  FOR EACH ROW
  EXECUTE FUNCTION create_anomaly_alert();

-- 12. RLS Policies pour anomaly_types
ALTER TABLE public.anomaly_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active anomaly types" ON public.anomaly_types;
CREATE POLICY "Users can view active anomaly types"
  ON public.anomaly_types
  FOR SELECT
  USING (is_active = true);

-- 13. RLS Policies pour anomalies
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view anomalies in their organization" ON public.anomalies;
CREATE POLICY "Users can view anomalies in their organization"
  ON public.anomalies
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (expires_at IS NULL OR expires_at > NOW())
  );

DROP POLICY IF EXISTS "System can create anomalies" ON public.anomalies;
CREATE POLICY "System can create anomalies"
  ON public.anomalies
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update anomalies in their organization" ON public.anomalies;
CREATE POLICY "Users can update anomalies in their organization"
  ON public.anomalies
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 14. RLS Policies pour anomaly_actions
ALTER TABLE public.anomaly_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view actions on anomalies in their organization" ON public.anomaly_actions;
CREATE POLICY "Users can view actions on anomalies in their organization"
  ON public.anomaly_actions
  FOR SELECT
  USING (
    anomaly_id IN (
      SELECT id FROM public.anomalies
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create actions on anomalies" ON public.anomaly_actions;
CREATE POLICY "Users can create actions on anomalies"
  ON public.anomaly_actions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND anomaly_id IN (
      SELECT id FROM public.anomalies
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- 15. RLS Policies pour normal_patterns
ALTER TABLE public.normal_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view patterns in their organization" ON public.normal_patterns;
CREATE POLICY "Users can view patterns in their organization"
  ON public.normal_patterns
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 16. RLS Policies pour anomaly_alerts
ALTER TABLE public.anomaly_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their anomaly alerts" ON public.anomaly_alerts;
CREATE POLICY "Users can view their anomaly alerts"
  ON public.anomaly_alerts
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 17. Grant permissions
GRANT SELECT ON public.anomaly_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.anomalies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.anomaly_detection_rules TO authenticated;
GRANT SELECT, INSERT ON public.anomaly_actions TO authenticated;
GRANT SELECT ON public.anomaly_detection_models TO authenticated;
GRANT SELECT ON public.normal_patterns TO authenticated;
GRANT SELECT, UPDATE ON public.anomaly_alerts TO authenticated;

-- 18. Insertion des types d'anomalies par défaut
INSERT INTO public.anomaly_types (code, name, description, category, severity, detection_method) VALUES
  ('unusual_grade', 'Note inhabituelle', 'Note significativement différente de la moyenne de l''étudiant', 'academic', 'medium', 'statistical'),
  ('grade_spike', 'Pic de note', 'Augmentation soudaine et importante des notes', 'academic', 'high', 'statistical'),
  ('attendance_drop', 'Chute de présence', 'Baisse significative du taux de présence', 'attendance', 'high', 'threshold'),
  ('attendance_spike', 'Pic de présence', 'Augmentation soudaine de la présence', 'attendance', 'medium', 'statistical'),
  ('payment_anomaly', 'Anomalie de paiement', 'Paiement inhabituel (montant, fréquence, etc.)', 'financial', 'high', 'rule_based'),
  ('multiple_failed_payments', 'Paiements échoués multiples', 'Plusieurs tentatives de paiement échouées', 'financial', 'critical', 'rule_based'),
  ('unusual_login_pattern', 'Pattern de connexion inhabituel', 'Connexions à des heures ou lieux inhabituels', 'behavioral', 'medium', 'ml'),
  ('rapid_grade_change', 'Changement rapide de notes', 'Variation rapide des notes sur une courte période', 'academic', 'medium', 'statistical'),
  ('low_engagement', 'Faible engagement', 'Engagement significativement en dessous de la normale', 'behavioral', 'medium', 'statistical'),
  ('system_performance_anomaly', 'Anomalie de performance système', 'Performance système inhabituelle', 'system', 'high', 'threshold'),
  ('data_integrity_issue', 'Problème d''intégrité des données', 'Données incohérentes ou manquantes', 'system', 'critical', 'rule_based'),
  ('unusual_student_behavior', 'Comportement étudiant inhabituel', 'Comportement qui s''écarte significativement de la norme', 'behavioral', 'medium', 'ml')
ON CONFLICT (code) DO NOTHING;



-- 1. Table pour les types d'anomalies
CREATE TABLE IF NOT EXISTS public.anomaly_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- 'unusual_grade', 'attendance_spike', 'payment_anomaly', etc.
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'academic', 'financial', 'attendance', 'behavioral', 'system'
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  detection_method TEXT, -- 'statistical', 'ml', 'rule_based', 'threshold'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les anomalies détectées
CREATE TABLE IF NOT EXISTS public.anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  anomaly_type_id UUID NOT NULL REFERENCES public.anomaly_types(id) ON DELETE CASCADE,
  -- Cible de l'anomalie
  entity_type TEXT NOT NULL, -- 'student', 'payment', 'session', 'grade', 'attendance', 'system'
  entity_id UUID, -- ID de l'entité concernée
  -- Détails de l'anomalie
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  -- Métriques
  anomaly_score DECIMAL(5, 2) NOT NULL, -- Score d'anomalie (0-100)
  confidence_level DECIMAL(5, 2) NOT NULL, -- Niveau de confiance (0-100)
  deviation_from_normal DECIMAL(10, 2), -- Écart par rapport à la normale
  -- Données sources
  detected_values JSONB, -- Valeurs détectées
  expected_values JSONB, -- Valeurs attendues/normales
  context_data JSONB, -- Données contextuelles
  -- Statut
  status TEXT DEFAULT 'detected', -- 'detected', 'investigating', 'confirmed', 'false_positive', 'resolved'
  -- Assignation
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Dates
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  investigated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ -- Date d'expiration de l'anomalie
);

-- 3. Table pour les règles de détection
CREATE TABLE IF NOT EXISTS public.anomaly_detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  anomaly_type_id UUID NOT NULL REFERENCES public.anomaly_types(id) ON DELETE CASCADE,
  -- Configuration de la règle
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  rule_config JSONB NOT NULL, -- Configuration spécifique de la règle
  -- Seuils
  threshold_value DECIMAL(10, 2), -- Seuil de déclenchement
  min_confidence DECIMAL(5, 2) DEFAULT 70, -- Confiance minimale requise
  -- Statut
  is_active BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les actions prises sur les anomalies
CREATE TABLE IF NOT EXISTS public.anomaly_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_id UUID NOT NULL REFERENCES public.anomalies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Action
  action_type TEXT NOT NULL, -- 'investigate', 'confirm', 'dismiss', 'resolve', 'escalate'
  action_details JSONB, -- Détails de l'action
  notes TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les modèles de détection d'anomalies
CREATE TABLE IF NOT EXISTS public.anomaly_detection_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations du modèle
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'isolation_forest', 'lof', 'autoencoder', 'svm', 'statistical'
  model_version TEXT NOT NULL,
  -- Configuration
  configuration JSONB,
  training_data_summary JSONB,
  -- Performance
  precision_score DECIMAL(5, 2),
  recall_score DECIMAL(5, 2),
  f1_score DECIMAL(5, 2),
  false_positive_rate DECIMAL(5, 2),
  -- Statut
  status TEXT DEFAULT 'training', -- 'training', 'active', 'deprecated'
  is_production BOOLEAN DEFAULT false,
  -- Dates
  trained_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Table pour les patterns normaux (baseline)
CREATE TABLE IF NOT EXISTS public.normal_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Type de pattern
  pattern_type TEXT NOT NULL, -- 'student_behavior', 'grade_distribution', 'attendance_pattern', etc.
  -- Données du pattern
  pattern_data JSONB NOT NULL, -- Données statistiques du pattern normal
  -- Période de référence
  reference_period_start TIMESTAMPTZ NOT NULL,
  reference_period_end TIMESTAMPTZ NOT NULL,
  -- Métadonnées
  sample_size INTEGER,
  confidence_level DECIMAL(5, 2),
  -- Dates
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 7. Table pour les alertes d'anomalies
CREATE TABLE IF NOT EXISTS public.anomaly_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  anomaly_id UUID NOT NULL REFERENCES public.anomalies(id) ON DELETE CASCADE,
  -- Destinataire
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Type d'alerte
  alert_type TEXT DEFAULT 'notification', -- 'notification', 'email', 'sms', 'system'
  -- Statut
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_anomaly_types_code ON public.anomaly_types(code);
CREATE INDEX IF NOT EXISTS idx_anomalies_org ON public.anomalies(organization_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_type ON public.anomalies(anomaly_type_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_entity ON public.anomalies(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON public.anomalies(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_anomalies_assigned ON public.anomalies(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_rules_type ON public.anomaly_detection_rules(anomaly_type_id, is_active);
CREATE INDEX IF NOT EXISTS idx_anomaly_actions_anomaly ON public.anomaly_actions(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_actions_user ON public.anomaly_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_models_org ON public.anomaly_detection_models(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_normal_patterns_org ON public.normal_patterns(organization_id, pattern_type);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_anomaly ON public.anomaly_alerts(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_user ON public.anomaly_alerts(user_id, is_sent);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_anomaly_detection_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_anomaly_types_timestamp ON public.anomaly_types;
CREATE TRIGGER update_anomaly_types_timestamp
  BEFORE UPDATE ON public.anomaly_types
  FOR EACH ROW
  EXECUTE FUNCTION update_anomaly_detection_updated_at();

DROP TRIGGER IF EXISTS update_anomaly_detection_rules_timestamp ON public.anomaly_detection_rules;
CREATE TRIGGER update_anomaly_detection_rules_timestamp
  BEFORE UPDATE ON public.anomaly_detection_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_anomaly_detection_updated_at();

DROP TRIGGER IF EXISTS update_anomaly_detection_models_timestamp ON public.anomaly_detection_models;
CREATE TRIGGER update_anomaly_detection_models_timestamp
  BEFORE UPDATE ON public.anomaly_detection_models
  FOR EACH ROW
  EXECUTE FUNCTION update_anomaly_detection_updated_at();

-- 11. Fonction pour créer automatiquement une alerte lors de la détection d'une anomalie critique
CREATE OR REPLACE FUNCTION create_anomaly_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  anomaly_type_record RECORD;
BEGIN
  -- Récupérer le type d'anomalie
  SELECT * INTO anomaly_type_record
  FROM public.anomaly_types
  WHERE id = NEW.anomaly_type_id;
  
  -- Créer une alerte si l'anomalie est critique ou haute sévérité
  IF anomaly_type_record.severity IN ('high', 'critical') OR NEW.anomaly_score >= 80 THEN
    INSERT INTO public.anomaly_alerts (
      organization_id,
      anomaly_id,
      user_id,
      alert_type
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      NEW.assigned_to,
      'notification'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_anomaly_alert ON public.anomalies;
CREATE TRIGGER trigger_create_anomaly_alert
  AFTER INSERT ON public.anomalies
  FOR EACH ROW
  EXECUTE FUNCTION create_anomaly_alert();

-- 12. RLS Policies pour anomaly_types
ALTER TABLE public.anomaly_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active anomaly types" ON public.anomaly_types;
CREATE POLICY "Users can view active anomaly types"
  ON public.anomaly_types
  FOR SELECT
  USING (is_active = true);

-- 13. RLS Policies pour anomalies
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view anomalies in their organization" ON public.anomalies;
CREATE POLICY "Users can view anomalies in their organization"
  ON public.anomalies
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (expires_at IS NULL OR expires_at > NOW())
  );

DROP POLICY IF EXISTS "System can create anomalies" ON public.anomalies;
CREATE POLICY "System can create anomalies"
  ON public.anomalies
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update anomalies in their organization" ON public.anomalies;
CREATE POLICY "Users can update anomalies in their organization"
  ON public.anomalies
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 14. RLS Policies pour anomaly_actions
ALTER TABLE public.anomaly_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view actions on anomalies in their organization" ON public.anomaly_actions;
CREATE POLICY "Users can view actions on anomalies in their organization"
  ON public.anomaly_actions
  FOR SELECT
  USING (
    anomaly_id IN (
      SELECT id FROM public.anomalies
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create actions on anomalies" ON public.anomaly_actions;
CREATE POLICY "Users can create actions on anomalies"
  ON public.anomaly_actions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND anomaly_id IN (
      SELECT id FROM public.anomalies
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- 15. RLS Policies pour normal_patterns
ALTER TABLE public.normal_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view patterns in their organization" ON public.normal_patterns;
CREATE POLICY "Users can view patterns in their organization"
  ON public.normal_patterns
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 16. RLS Policies pour anomaly_alerts
ALTER TABLE public.anomaly_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their anomaly alerts" ON public.anomaly_alerts;
CREATE POLICY "Users can view their anomaly alerts"
  ON public.anomaly_alerts
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 17. Grant permissions
GRANT SELECT ON public.anomaly_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.anomalies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.anomaly_detection_rules TO authenticated;
GRANT SELECT, INSERT ON public.anomaly_actions TO authenticated;
GRANT SELECT ON public.anomaly_detection_models TO authenticated;
GRANT SELECT ON public.normal_patterns TO authenticated;
GRANT SELECT, UPDATE ON public.anomaly_alerts TO authenticated;

-- 18. Insertion des types d'anomalies par défaut
INSERT INTO public.anomaly_types (code, name, description, category, severity, detection_method) VALUES
  ('unusual_grade', 'Note inhabituelle', 'Note significativement différente de la moyenne de l''étudiant', 'academic', 'medium', 'statistical'),
  ('grade_spike', 'Pic de note', 'Augmentation soudaine et importante des notes', 'academic', 'high', 'statistical'),
  ('attendance_drop', 'Chute de présence', 'Baisse significative du taux de présence', 'attendance', 'high', 'threshold'),
  ('attendance_spike', 'Pic de présence', 'Augmentation soudaine de la présence', 'attendance', 'medium', 'statistical'),
  ('payment_anomaly', 'Anomalie de paiement', 'Paiement inhabituel (montant, fréquence, etc.)', 'financial', 'high', 'rule_based'),
  ('multiple_failed_payments', 'Paiements échoués multiples', 'Plusieurs tentatives de paiement échouées', 'financial', 'critical', 'rule_based'),
  ('unusual_login_pattern', 'Pattern de connexion inhabituel', 'Connexions à des heures ou lieux inhabituels', 'behavioral', 'medium', 'ml'),
  ('rapid_grade_change', 'Changement rapide de notes', 'Variation rapide des notes sur une courte période', 'academic', 'medium', 'statistical'),
  ('low_engagement', 'Faible engagement', 'Engagement significativement en dessous de la normale', 'behavioral', 'medium', 'statistical'),
  ('system_performance_anomaly', 'Anomalie de performance système', 'Performance système inhabituelle', 'system', 'high', 'threshold'),
  ('data_integrity_issue', 'Problème d''intégrité des données', 'Données incohérentes ou manquantes', 'system', 'critical', 'rule_based'),
  ('unusual_student_behavior', 'Comportement étudiant inhabituel', 'Comportement qui s''écarte significativement de la norme', 'behavioral', 'medium', 'ml')
ON CONFLICT (code) DO NOTHING;



-- 1. Table pour les types d'anomalies
CREATE TABLE IF NOT EXISTS public.anomaly_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- 'unusual_grade', 'attendance_spike', 'payment_anomaly', etc.
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'academic', 'financial', 'attendance', 'behavioral', 'system'
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  detection_method TEXT, -- 'statistical', 'ml', 'rule_based', 'threshold'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les anomalies détectées
CREATE TABLE IF NOT EXISTS public.anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  anomaly_type_id UUID NOT NULL REFERENCES public.anomaly_types(id) ON DELETE CASCADE,
  -- Cible de l'anomalie
  entity_type TEXT NOT NULL, -- 'student', 'payment', 'session', 'grade', 'attendance', 'system'
  entity_id UUID, -- ID de l'entité concernée
  -- Détails de l'anomalie
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  -- Métriques
  anomaly_score DECIMAL(5, 2) NOT NULL, -- Score d'anomalie (0-100)
  confidence_level DECIMAL(5, 2) NOT NULL, -- Niveau de confiance (0-100)
  deviation_from_normal DECIMAL(10, 2), -- Écart par rapport à la normale
  -- Données sources
  detected_values JSONB, -- Valeurs détectées
  expected_values JSONB, -- Valeurs attendues/normales
  context_data JSONB, -- Données contextuelles
  -- Statut
  status TEXT DEFAULT 'detected', -- 'detected', 'investigating', 'confirmed', 'false_positive', 'resolved'
  -- Assignation
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Dates
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  investigated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ -- Date d'expiration de l'anomalie
);

-- 3. Table pour les règles de détection
CREATE TABLE IF NOT EXISTS public.anomaly_detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  anomaly_type_id UUID NOT NULL REFERENCES public.anomaly_types(id) ON DELETE CASCADE,
  -- Configuration de la règle
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  rule_config JSONB NOT NULL, -- Configuration spécifique de la règle
  -- Seuils
  threshold_value DECIMAL(10, 2), -- Seuil de déclenchement
  min_confidence DECIMAL(5, 2) DEFAULT 70, -- Confiance minimale requise
  -- Statut
  is_active BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les actions prises sur les anomalies
CREATE TABLE IF NOT EXISTS public.anomaly_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_id UUID NOT NULL REFERENCES public.anomalies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Action
  action_type TEXT NOT NULL, -- 'investigate', 'confirm', 'dismiss', 'resolve', 'escalate'
  action_details JSONB, -- Détails de l'action
  notes TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les modèles de détection d'anomalies
CREATE TABLE IF NOT EXISTS public.anomaly_detection_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations du modèle
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'isolation_forest', 'lof', 'autoencoder', 'svm', 'statistical'
  model_version TEXT NOT NULL,
  -- Configuration
  configuration JSONB,
  training_data_summary JSONB,
  -- Performance
  precision_score DECIMAL(5, 2),
  recall_score DECIMAL(5, 2),
  f1_score DECIMAL(5, 2),
  false_positive_rate DECIMAL(5, 2),
  -- Statut
  status TEXT DEFAULT 'training', -- 'training', 'active', 'deprecated'
  is_production BOOLEAN DEFAULT false,
  -- Dates
  trained_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Table pour les patterns normaux (baseline)
CREATE TABLE IF NOT EXISTS public.normal_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Type de pattern
  pattern_type TEXT NOT NULL, -- 'student_behavior', 'grade_distribution', 'attendance_pattern', etc.
  -- Données du pattern
  pattern_data JSONB NOT NULL, -- Données statistiques du pattern normal
  -- Période de référence
  reference_period_start TIMESTAMPTZ NOT NULL,
  reference_period_end TIMESTAMPTZ NOT NULL,
  -- Métadonnées
  sample_size INTEGER,
  confidence_level DECIMAL(5, 2),
  -- Dates
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 7. Table pour les alertes d'anomalies
CREATE TABLE IF NOT EXISTS public.anomaly_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  anomaly_id UUID NOT NULL REFERENCES public.anomalies(id) ON DELETE CASCADE,
  -- Destinataire
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Type d'alerte
  alert_type TEXT DEFAULT 'notification', -- 'notification', 'email', 'sms', 'system'
  -- Statut
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_anomaly_types_code ON public.anomaly_types(code);
CREATE INDEX IF NOT EXISTS idx_anomalies_org ON public.anomalies(organization_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_type ON public.anomalies(anomaly_type_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_entity ON public.anomalies(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON public.anomalies(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_anomalies_assigned ON public.anomalies(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_rules_type ON public.anomaly_detection_rules(anomaly_type_id, is_active);
CREATE INDEX IF NOT EXISTS idx_anomaly_actions_anomaly ON public.anomaly_actions(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_actions_user ON public.anomaly_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_models_org ON public.anomaly_detection_models(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_normal_patterns_org ON public.normal_patterns(organization_id, pattern_type);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_anomaly ON public.anomaly_alerts(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_user ON public.anomaly_alerts(user_id, is_sent);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_anomaly_detection_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_anomaly_types_timestamp ON public.anomaly_types;
CREATE TRIGGER update_anomaly_types_timestamp
  BEFORE UPDATE ON public.anomaly_types
  FOR EACH ROW
  EXECUTE FUNCTION update_anomaly_detection_updated_at();

DROP TRIGGER IF EXISTS update_anomaly_detection_rules_timestamp ON public.anomaly_detection_rules;
CREATE TRIGGER update_anomaly_detection_rules_timestamp
  BEFORE UPDATE ON public.anomaly_detection_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_anomaly_detection_updated_at();

DROP TRIGGER IF EXISTS update_anomaly_detection_models_timestamp ON public.anomaly_detection_models;
CREATE TRIGGER update_anomaly_detection_models_timestamp
  BEFORE UPDATE ON public.anomaly_detection_models
  FOR EACH ROW
  EXECUTE FUNCTION update_anomaly_detection_updated_at();

-- 11. Fonction pour créer automatiquement une alerte lors de la détection d'une anomalie critique
CREATE OR REPLACE FUNCTION create_anomaly_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  anomaly_type_record RECORD;
BEGIN
  -- Récupérer le type d'anomalie
  SELECT * INTO anomaly_type_record
  FROM public.anomaly_types
  WHERE id = NEW.anomaly_type_id;
  
  -- Créer une alerte si l'anomalie est critique ou haute sévérité
  IF anomaly_type_record.severity IN ('high', 'critical') OR NEW.anomaly_score >= 80 THEN
    INSERT INTO public.anomaly_alerts (
      organization_id,
      anomaly_id,
      user_id,
      alert_type
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      NEW.assigned_to,
      'notification'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_anomaly_alert ON public.anomalies;
CREATE TRIGGER trigger_create_anomaly_alert
  AFTER INSERT ON public.anomalies
  FOR EACH ROW
  EXECUTE FUNCTION create_anomaly_alert();

-- 12. RLS Policies pour anomaly_types
ALTER TABLE public.anomaly_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active anomaly types" ON public.anomaly_types;
CREATE POLICY "Users can view active anomaly types"
  ON public.anomaly_types
  FOR SELECT
  USING (is_active = true);

-- 13. RLS Policies pour anomalies
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view anomalies in their organization" ON public.anomalies;
CREATE POLICY "Users can view anomalies in their organization"
  ON public.anomalies
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (expires_at IS NULL OR expires_at > NOW())
  );

DROP POLICY IF EXISTS "System can create anomalies" ON public.anomalies;
CREATE POLICY "System can create anomalies"
  ON public.anomalies
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update anomalies in their organization" ON public.anomalies;
CREATE POLICY "Users can update anomalies in their organization"
  ON public.anomalies
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 14. RLS Policies pour anomaly_actions
ALTER TABLE public.anomaly_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view actions on anomalies in their organization" ON public.anomaly_actions;
CREATE POLICY "Users can view actions on anomalies in their organization"
  ON public.anomaly_actions
  FOR SELECT
  USING (
    anomaly_id IN (
      SELECT id FROM public.anomalies
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create actions on anomalies" ON public.anomaly_actions;
CREATE POLICY "Users can create actions on anomalies"
  ON public.anomaly_actions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND anomaly_id IN (
      SELECT id FROM public.anomalies
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- 15. RLS Policies pour normal_patterns
ALTER TABLE public.normal_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view patterns in their organization" ON public.normal_patterns;
CREATE POLICY "Users can view patterns in their organization"
  ON public.normal_patterns
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 16. RLS Policies pour anomaly_alerts
ALTER TABLE public.anomaly_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their anomaly alerts" ON public.anomaly_alerts;
CREATE POLICY "Users can view their anomaly alerts"
  ON public.anomaly_alerts
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 17. Grant permissions
GRANT SELECT ON public.anomaly_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.anomalies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.anomaly_detection_rules TO authenticated;
GRANT SELECT, INSERT ON public.anomaly_actions TO authenticated;
GRANT SELECT ON public.anomaly_detection_models TO authenticated;
GRANT SELECT ON public.normal_patterns TO authenticated;
GRANT SELECT, UPDATE ON public.anomaly_alerts TO authenticated;

-- 18. Insertion des types d'anomalies par défaut
INSERT INTO public.anomaly_types (code, name, description, category, severity, detection_method) VALUES
  ('unusual_grade', 'Note inhabituelle', 'Note significativement différente de la moyenne de l''étudiant', 'academic', 'medium', 'statistical'),
  ('grade_spike', 'Pic de note', 'Augmentation soudaine et importante des notes', 'academic', 'high', 'statistical'),
  ('attendance_drop', 'Chute de présence', 'Baisse significative du taux de présence', 'attendance', 'high', 'threshold'),
  ('attendance_spike', 'Pic de présence', 'Augmentation soudaine de la présence', 'attendance', 'medium', 'statistical'),
  ('payment_anomaly', 'Anomalie de paiement', 'Paiement inhabituel (montant, fréquence, etc.)', 'financial', 'high', 'rule_based'),
  ('multiple_failed_payments', 'Paiements échoués multiples', 'Plusieurs tentatives de paiement échouées', 'financial', 'critical', 'rule_based'),
  ('unusual_login_pattern', 'Pattern de connexion inhabituel', 'Connexions à des heures ou lieux inhabituels', 'behavioral', 'medium', 'ml'),
  ('rapid_grade_change', 'Changement rapide de notes', 'Variation rapide des notes sur une courte période', 'academic', 'medium', 'statistical'),
  ('low_engagement', 'Faible engagement', 'Engagement significativement en dessous de la normale', 'behavioral', 'medium', 'statistical'),
  ('system_performance_anomaly', 'Anomalie de performance système', 'Performance système inhabituelle', 'system', 'high', 'threshold'),
  ('data_integrity_issue', 'Problème d''intégrité des données', 'Données incohérentes ou manquantes', 'system', 'critical', 'rule_based'),
  ('unusual_student_behavior', 'Comportement étudiant inhabituel', 'Comportement qui s''écarte significativement de la norme', 'behavioral', 'medium', 'ml')
ON CONFLICT (code) DO NOTHING;


