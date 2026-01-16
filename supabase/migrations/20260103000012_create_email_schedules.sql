-- =====================================================
-- EDUZEN - Planification et automatisation d'envoi d'emails
-- =====================================================
-- Description: Table pour planifier et automatiser l'envoi d'emails
-- Date: 2026-01-03
-- =====================================================

-- Table pour les règles de planification d'emails
CREATE TABLE IF NOT EXISTS public.email_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Configuration de la règle
  name TEXT NOT NULL,
  description TEXT,
  email_type TEXT NOT NULL, -- 'session_reminder', 'evaluation_reminder', 'session_cancellation', 'evaluation_available', etc.
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  
  -- Déclencheurs (triggers)
  trigger_type TEXT NOT NULL, -- 'before_session_start', 'after_session_end', 'before_evaluation_start', 'after_evaluation_end', 'fixed_date'
  trigger_days INTEGER, -- Nombre de jours avant/après l'événement (pour les triggers relatifs)
  trigger_time TIME, -- Heure d'envoi (HH:MM:SS)
  trigger_datetime TIMESTAMPTZ, -- Date/heure fixe (pour trigger_type = 'fixed_date')
  
  -- Filtres (critères de sélection)
  target_type TEXT NOT NULL, -- 'session', 'evaluation', 'student', 'teacher', 'all'
  session_status TEXT[], -- Statuts de session à cibler (pour target_type = 'session')
  formation_id UUID REFERENCES public.formations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  
  -- Configuration de l'envoi
  is_active BOOLEAN DEFAULT true,
  send_to_students BOOLEAN DEFAULT true,
  send_to_teachers BOOLEAN DEFAULT false,
  send_to_coordinators BOOLEAN DEFAULT false,
  
  -- Variables personnalisées pour le template
  custom_variables JSONB,
  
  -- Métadonnées
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT, -- 'success', 'failed', 'partial'
  last_run_error TEXT,
  total_sent INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_email_schedules_organization ON public.email_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_schedules_active ON public.email_schedules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_schedules_type ON public.email_schedules(email_type);
CREATE INDEX IF NOT EXISTS idx_email_schedules_trigger ON public.email_schedules(trigger_type, is_active);
CREATE INDEX IF NOT EXISTS idx_email_schedules_last_run ON public.email_schedules(last_run_at);

-- Table pour l'historique des envois planifiés
CREATE TABLE IF NOT EXISTS public.email_schedule_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.email_schedules(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Détails de l'exécution
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL, -- 'success', 'failed', 'partial'
  
  -- Résultats
  total_recipients INTEGER DEFAULT 0,
  successful_sends INTEGER DEFAULT 0,
  failed_sends INTEGER DEFAULT 0,
  
  -- Erreurs (si échec)
  error_message TEXT,
  error_details JSONB,
  
  -- Contexte de l'exécution
  trigger_context JSONB, -- Informations sur ce qui a déclenché l'envoi (session_id, evaluation_id, etc.)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour l'historique
CREATE INDEX IF NOT EXISTS idx_email_schedule_logs_schedule ON public.email_schedule_logs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_email_schedule_logs_organization ON public.email_schedule_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_schedule_logs_executed ON public.email_schedule_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_schedule_logs_status ON public.email_schedule_logs(status);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_email_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_schedules_updated_at ON public.email_schedules;
CREATE TRIGGER update_email_schedules_updated_at
  BEFORE UPDATE ON public.email_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_email_schedules_updated_at();

-- RLS Policies
ALTER TABLE public.email_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_schedule_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour email_schedules
DROP POLICY IF EXISTS "Users can view email schedules of their organization" ON public.email_schedules;
CREATE POLICY "Users can view email schedules of their organization"
  ON public.email_schedules
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage email schedules" ON public.email_schedules;
CREATE POLICY "Admins can manage email schedules"
  ON public.email_schedules
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Policies pour email_schedule_logs
DROP POLICY IF EXISTS "Users can view email schedule logs of their organization" ON public.email_schedule_logs;
CREATE POLICY "Users can view email schedule logs of their organization"
  ON public.email_schedule_logs
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Commentaires
COMMENT ON TABLE public.email_schedules IS 'Règles de planification pour l''envoi automatique d''emails';
COMMENT ON COLUMN public.email_schedules.trigger_type IS 'Type de déclencheur: before_session_start, after_session_end, before_evaluation_start, after_evaluation_end, fixed_date';
COMMENT ON COLUMN public.email_schedules.trigger_days IS 'Nombre de jours avant/après l''événement (négatif pour avant, positif pour après)';
COMMENT ON COLUMN public.email_schedules.target_type IS 'Type de cible: session, evaluation, student, teacher, all';
COMMENT ON COLUMN public.email_schedules.email_type IS 'Type d''email: session_reminder, evaluation_reminder, session_cancellation, evaluation_available, etc.';

COMMENT ON TABLE public.email_schedule_logs IS 'Historique des exécutions des emails planifiés';

