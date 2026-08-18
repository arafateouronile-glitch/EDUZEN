-- Le pipeline CRM (get_crm_pipeline) détectait l'entreprise d'un apprenant
-- uniquement via company_employees (7 lignes en base, table quasi inutilisée
-- liée au Portail Entreprise) — jamais via external_entities/student_entities
-- (165 lignes), le vrai registre "entreprises et organismes" utilisé partout
-- ailleurs dans l'app (page /dashboard/entities, conventions, réservations
-- de session). Résultat : la quasi-totalité des apprenants rattachés à une
-- entreprise n'apparaissaient jamais comme "entreprise" dans le CRM.
--
-- On combine désormais les deux sources (external_entities en priorité,
-- company_employees en repli) sans rien retirer.

DROP FUNCTION IF EXISTS public.get_crm_pipeline(uuid);

CREATE FUNCTION public.get_crm_pipeline(p_org_id uuid)
RETURNS TABLE(
  id uuid, first_name text, last_name text, email text, photo_url text,
  created_at timestamptz, crm_status text, session_id uuid, session_name text,
  session_start date, session_end date, formation_id uuid, formation_name text,
  program_name text, program_category text, company_name text, is_company boolean,
  enrollment_id uuid, has_convocation boolean, has_contract boolean,
  has_attendance boolean, has_evaluation boolean, contacted boolean,
  contacted_at date, next_follow_up_date date, notes text, commercial_status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
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
    COALESCE(ent.name, comp.name)        AS company_name,
    (COALESCE(ent.name, comp.name) IS NOT NULL) AS is_company,
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
    t.notes,
    t.commercial_status

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

  -- Entreprise/organisme (registre principal external_entities via student_entities)
  LEFT JOIN LATERAL (
    SELECT ee.name
    FROM student_entities se
    JOIN external_entities ee ON ee.id = se.entity_id
    WHERE se.student_id = s.id
      AND se.is_current = true
      AND ee.organization_id = p_org_id
    ORDER BY se.created_at DESC
    LIMIT 1
  ) ent ON true

  -- Entreprise active (repli : Portail Entreprise, table historique moins utilisée)
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
$function$;
