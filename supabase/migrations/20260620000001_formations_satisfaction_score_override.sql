-- Ajoute un score de satisfaction manuel sur la formation
-- Le score auto est calculé depuis les évaluations (grades hot/cold)
-- L'override permet une correction manuelle (ex: correction d'erreur, biais de réponse)
ALTER TABLE formations
  ADD COLUMN IF NOT EXISTS satisfaction_score_override NUMERIC(3, 1) CHECK (satisfaction_score_override >= 0 AND satisfaction_score_override <= 5);

COMMENT ON COLUMN formations.satisfaction_score_override IS
  'Score de satisfaction corrigé manuellement (0-5). Prioritaire sur le score calculé automatiquement depuis les évaluations.';
