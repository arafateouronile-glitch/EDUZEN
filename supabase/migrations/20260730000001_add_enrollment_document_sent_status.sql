-- Migration: Trace la date d'envoi par email des convocations/contrats-conventions
-- Date: 2026-07-30
--
-- Aucun mécanisme n'existait pour savoir, apprenant par apprenant, si sa
-- convocation ou son contrat/convention avait déjà été envoyé par email
-- (le suivi "Signé/En attente" existant sur documents ne concerne que le
-- flux de demande de signature électronique, pas le simple envoi par mail).

ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS convocation_sent_at timestamptz;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS contract_sent_at timestamptz;

COMMENT ON COLUMN enrollments.convocation_sent_at IS
  'Date du dernier envoi par email de la convocation à cet apprenant (mis à jour par use-document-generation.ts).';
COMMENT ON COLUMN enrollments.contract_sent_at IS
  'Date du dernier envoi par email du contrat/convention de formation à cet apprenant (mis à jour par use-document-generation.ts).';
