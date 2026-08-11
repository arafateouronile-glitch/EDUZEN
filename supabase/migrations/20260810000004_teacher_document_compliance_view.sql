-- Vue de conformité formateurs : croise chaque formateur actif avec les documents
-- requis pour son statut (indépendant/salarié/both), et calcule le statut de
-- conformité du document le plus récent correspondant. Même patron que
-- v_employee_diploma_compliance (20260308000001_compliance_diplomas.sql).
--
-- status :
--   missing        — aucun document déposé pour ce type requis
--   expired        — date d'expiration (explicite ou calculée par renouvellement) dépassée
--   expiring_soon  — expire dans les 90 jours
--   ok             — à jour

CREATE OR REPLACE VIEW v_teacher_document_compliance AS
SELECT
  t.id                          AS teacher_id,
  t.user_id                     AS teacher_user_id,
  t.organization_id,
  t.statut,
  rdt.id                        AS required_document_type_id,
  rdt.code,
  rdt.label,
  rdt.required_for,
  rdt.renewal_months,
  doc.id                        AS teacher_document_id,
  doc.title                     AS document_title,
  doc.file_url,
  doc.uploaded_at,
  doc.expiry_date               AS explicit_expiry_date,
  COALESCE(
    doc.expiry_date,
    CASE
      WHEN doc.id IS NOT NULL AND rdt.renewal_months IS NOT NULL
        THEN (doc.uploaded_at::date + (rdt.renewal_months || ' months')::interval)::date
      ELSE NULL
    END
  )                              AS effective_expiry_date,
  CASE
    WHEN doc.id IS NULL THEN 'missing'
    WHEN COALESCE(
           doc.expiry_date,
           CASE
             WHEN rdt.renewal_months IS NOT NULL
               THEN (doc.uploaded_at::date + (rdt.renewal_months || ' months')::interval)::date
             ELSE NULL
           END
         ) IS NULL THEN 'ok'
    WHEN COALESCE(
           doc.expiry_date,
           (doc.uploaded_at::date + (rdt.renewal_months || ' months')::interval)::date
         ) < CURRENT_DATE THEN 'expired'
    WHEN COALESCE(
           doc.expiry_date,
           (doc.uploaded_at::date + (rdt.renewal_months || ' months')::interval)::date
         ) <= CURRENT_DATE + INTERVAL '90 days' THEN 'expiring_soon'
    ELSE 'ok'
  END                             AS status
FROM public.teachers t
JOIN public.teacher_required_document_types rdt
  ON rdt.organization_id = t.organization_id
 AND rdt.is_active = true
 AND (rdt.required_for = t.statut OR rdt.required_for = 'both')
LEFT JOIN LATERAL (
  SELECT td.*
  FROM public.teacher_documents td
  WHERE td.teacher_id = t.user_id
    AND td.organization_id = t.organization_id
    AND td.required_document_type_id = rdt.id
  ORDER BY td.uploaded_at DESC
  LIMIT 1
) doc ON true
WHERE t.is_active = true;

COMMENT ON VIEW v_teacher_document_compliance IS 'Statut de conformité (missing/expired/expiring_soon/ok) de chaque document requis, pour chaque formateur actif, selon son statut indépendant/salarié';
