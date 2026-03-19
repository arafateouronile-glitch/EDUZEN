-- Migration : table d'audit logs pour les opérations sensibles
--
-- Capture qui a fait quoi, quand, sur quoi — requis pour la conformité RGPD
-- et pour l'investigation en cas d'incident de sécurité.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL    DEFAULT now(),

  -- Acteur
  actor_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid        REFERENCES organizations(id) ON DELETE SET NULL,

  -- Action
  action          text        NOT NULL, -- 'create' | 'update' | 'delete' | 'read_sensitive' | 'export'
  table_name      text        NOT NULL,
  record_id       uuid,                 -- ID de l'enregistrement ciblé

  -- Contexte
  ip_address      inet,
  user_agent      text,
  metadata        jsonb       DEFAULT '{}'::jsonb, -- champs modifiés, valeurs avant/après (anonymisées si RGPD)

  -- Résultat
  success         boolean     NOT NULL DEFAULT true,
  error_message   text
);

-- RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Seul le service_role peut insérer (les apps n'écrivent jamais directement)
CREATE POLICY "service_role_insert_audit_logs"
  ON public.audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Les admins de l'organisation peuvent lire leurs propres logs
CREATE POLICY "org_admins_read_audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin')
    )
  );

-- Index pour les requêtes courantes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor       ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org         ON public.audit_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table       ON public.audit_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON public.audit_logs (created_at DESC);

-- Fonction helper pour insérer un log depuis les routes API (via service_role)
CREATE OR REPLACE FUNCTION log_audit_event(
  p_actor_id        uuid,
  p_organization_id uuid,
  p_action          text,
  p_table_name      text,
  p_record_id       uuid        DEFAULT NULL,
  p_ip_address      inet        DEFAULT NULL,
  p_user_agent      text        DEFAULT NULL,
  p_metadata        jsonb       DEFAULT '{}'::jsonb,
  p_success         boolean     DEFAULT true,
  p_error_message   text        DEFAULT NULL
) RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.audit_logs (
    actor_id, organization_id, action, table_name, record_id,
    ip_address, user_agent, metadata, success, error_message
  ) VALUES (
    p_actor_id, p_organization_id, p_action, p_table_name, p_record_id,
    p_ip_address, p_user_agent, p_metadata, p_success, p_error_message
  )
  RETURNING id;
$$;

COMMENT ON TABLE  public.audit_logs IS 'Trace de toutes les opérations sensibles (conformité RGPD, sécurité).';
COMMENT ON COLUMN public.audit_logs.action IS 'create | update | delete | read_sensitive | export | login | logout';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Contexte JSON — ne pas stocker de données personnelles en clair.';
