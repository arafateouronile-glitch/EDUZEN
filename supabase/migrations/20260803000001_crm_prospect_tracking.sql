-- Suivi commercial manuel des prospects CRM (contacté / prochaine relance / note)
-- + extension du RPC get_crm_pipeline (type entreprise/particulier, catégorie de programme, suivi)

CREATE TABLE IF NOT EXISTS public.crm_prospect_tracking (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contacted           BOOLEAN NOT NULL DEFAULT false,
  contacted_at        DATE,
  next_follow_up_date DATE,
  notes               TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by          UUID REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_crm_prospect_tracking_org ON public.crm_prospect_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_prospect_tracking_next_follow_up ON public.crm_prospect_tracking(next_follow_up_date);

ALTER TABLE public.crm_prospect_tracking ENABLE ROW LEVEL SECURITY;

-- Lecture org-scopée uniquement. Les écritures passent exclusivement par une Server Action
-- avec le client service role (voir addLearnerNote / updateProspectTracking dans
-- lib/actions/learner-crm-actions.ts) — pas de policy INSERT/UPDATE côté client.
DROP POLICY IF EXISTS "Users can view their organization's prospect tracking" ON public.crm_prospect_tracking;
CREATE POLICY "Users can view their organization's prospect tracking"
  ON public.crm_prospect_tracking FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id_uuid());

-- ============================================================================
-- Extension du RPC get_crm_pipeline : type entreprise/particulier, catégorie
-- de programme, et champs de suivi commercial manuel
-- ============================================================================

-- Postgres n'autorise pas CREATE OR REPLACE quand les colonnes de retour changent
-- (RETURNS TABLE modifié) — il faut d'abord supprimer l'ancienne définition.
DROP FUNCTION IF EXISTS public.get_crm_pipeline(UUID);

CREATE OR REPLACE FUNCTION public.get_crm_pipeline(p_org_id UUID)
RETURNS TABLE (
  id                  UUID,
  first_name          TEXT,
  last_name           TEXT,
  email               TEXT,
  photo_url           TEXT,
  created_at          TIMESTAMPTZ,
  crm_status          TEXT,
  session_id          UUID,
  session_name        TEXT,
  session_start       DATE,
  session_end         DATE,
  formation_id        UUID,
  formation_name      TEXT,
  program_name        TEXT,
  program_category    TEXT,
  company_name        TEXT,
  is_company          BOOLEAN,
  enrollment_id       UUID,
  has_convocation     BOOLEAN,
  has_contract        BOOLEAN,
  has_attendance      BOOLEAN,
  has_evaluation      BOOLEAN,
  contacted           BOOLEAN,
  contacted_at        DATE,
  next_follow_up_date DATE,
  notes               TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    s.id,
    s.first_name,
    s.last_name,
    s.email::TEXT,
    s.photo_url::TEXT,
    s.created_at,

    -- Statut CRM calculé en SQL
    CASE
      WHEN e.id IS NULL                                                     THEN 'prospect'
      WHEN e.status = 'completed'                                           THEN 'termine'
      WHEN sess.end_date IS NOT NULL AND sess.end_date < CURRENT_DATE       THEN 'termine'
      WHEN sess.start_date IS NOT NULL AND sess.start_date <= CURRENT_DATE  THEN 'en_cours'
      ELSE 'inscrit'
    END AS crm_status,

    sess.id           AS session_id,
    sess.name         AS session_name,
    sess.start_date   AS session_start,
    sess.end_date     AS session_end,
    f.id              AS formation_id,
    f.name            AS formation_name,
    p.name            AS program_name,
    COALESCE(p.category, f.category) AS program_category,
    comp.name         AS company_name,
    (comp.name IS NOT NULL) AS is_company,
    e.id              AS enrollment_id,

    -- Flags Qualiopi (subqueries EXISTS, rapides avec les index)
    EXISTS(
      SELECT 1 FROM email_logs el
      WHERE el.recipient = s.email
        AND el.template_type = 'convocation'
        AND el.organization_id = p_org_id
    ) AS has_convocation,

    EXISTS(
      SELECT 1 FROM learner_documents ld
      WHERE ld.student_id = s.id
        AND (ld.type ILIKE '%contrat%' OR ld.type ILIKE '%convention%')
    ) AS has_contract,

    EXISTS(
      SELECT 1 FROM attendance a
      WHERE a.student_id = s.id
        AND a.organization_id = p_org_id
        AND a.status IN ('present', 'present_late')
    ) AS has_attendance,

    EXISTS(
      SELECT 1 FROM evaluation_responses er
      WHERE er.student_id = s.id
    ) AS has_evaluation,

    t.contacted,
    t.contacted_at,
    t.next_follow_up_date,
    t.notes

  FROM students s

  -- Inscription active la plus récente (LATERAL = correlated subquery optimisée)
  LEFT JOIN LATERAL (
    SELECT e2.id, e2.status, e2.session_id
    FROM enrollments e2
    WHERE e2.student_id = s.id
      AND e2.status NOT IN ('cancelled', 'dropped')
    ORDER BY e2.created_at DESC
    LIMIT 1
  ) e ON true

  LEFT JOIN sessions     sess ON sess.id = e.session_id
  LEFT JOIN formations   f    ON f.id    = sess.formation_id
  LEFT JOIN programs     p    ON p.id    = f.program_id

  -- Entreprise active
  LEFT JOIN LATERAL (
    SELECT co.name
    FROM company_employees ce
    JOIN companies co ON co.id = ce.company_id
    WHERE ce.student_id = s.id AND ce.is_active = true
    LIMIT 1
  ) comp ON true

  -- Suivi commercial manuel
  LEFT JOIN crm_prospect_tracking t ON t.student_id = s.id

  WHERE s.organization_id = p_org_id
  ORDER BY s.created_at DESC, s.id DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_crm_pipeline(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_crm_pipeline(UUID) TO authenticated;
