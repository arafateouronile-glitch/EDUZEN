-- RPC : search_evidence_by_sample
-- Recherche cross-table des preuves Qualiopi liées à un échantillon
-- (apprenant, session, formateur) en un seul aller-retour serveur.
--
-- Remplace les 5-6 requêtes séquentielles client-side du mode Échantillonnage.

DROP FUNCTION IF EXISTS search_evidence_by_sample(uuid, text);

CREATE OR REPLACE FUNCTION search_evidence_by_sample(
  org_id     uuid,
  search_term text
)
RETURNS SETOF compliance_evidence_automated
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT cea.*
  FROM compliance_evidence_automated cea
  WHERE cea.organization_id = org_id
    AND cea.status = 'valid'
    AND (

      -- 1. Match direct sur les champs texte
      cea.entity_name  ILIKE '%' || search_term || '%'
      OR cea.title       ILIKE '%' || search_term || '%'
      OR cea.description ILIKE '%' || search_term || '%'

      -- 2. Apprenant trouvé par prénom/nom → preuve entity_id = student_uuid
      OR cea.entity_id::text IN (
        SELECT s.id::text
        FROM students s
        WHERE s.organization_id = org_id
          AND (
            s.first_name ILIKE '%' || search_term || '%'
            OR s.last_name  ILIKE '%' || search_term || '%'
          )
      )

      -- 3. Session trouvée par nom → preuve entity_id = session_uuid
      OR cea.entity_id::text IN (
        SELECT s.id::text
        FROM sessions s
        WHERE s.organization_id = org_id
          AND s.name ILIKE '%' || search_term || '%'
      )

      -- 4. Programme lié aux sessions de l'apprenant
      --    apprenant → enrollments → sessions → formations → programme
      OR cea.entity_id::text IN (
        SELECT f.program_id::text
        FROM formations f
        WHERE f.program_id IS NOT NULL
          AND f.id IN (
            SELECT ses.formation_id
            FROM sessions ses
            WHERE ses.formation_id IS NOT NULL
              AND ses.id IN (
                SELECT e.session_id
                FROM enrollments e
                WHERE e.session_id IS NOT NULL
                  AND e.student_id IN (
                    SELECT s.id
                    FROM students s
                    WHERE s.organization_id = org_id
                      AND (
                        s.first_name ILIKE '%' || search_term || '%'
                        OR s.last_name  ILIKE '%' || search_term || '%'
                      )
                  )
              )
          )
      )

      -- 5. Session de l'apprenant → preuves liées (ex: questionnaire_analysis)
      OR cea.entity_id::text IN (
        SELECT e.session_id::text
        FROM enrollments e
        WHERE e.session_id IS NOT NULL
          AND e.student_id IN (
            SELECT s.id
            FROM students s
            WHERE s.organization_id = org_id
              AND (
                s.first_name ILIKE '%' || search_term || '%'
                OR s.last_name  ILIKE '%' || search_term || '%'
              )
          )
      )

    )
  ORDER BY cea.event_date DESC
  LIMIT 200;
$$;

-- Permissions : accessible aux utilisateurs authentifiés et anon (portail auditeur)
GRANT EXECUTE ON FUNCTION search_evidence_by_sample(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_evidence_by_sample(uuid, text) TO anon;
