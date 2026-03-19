-- Migration : ajout de soft deletes sur les tables sensibles
--
-- Pourquoi : les suppressions hard delete rendent impossible l'audit trail et
-- posent des problèmes de conformité RGPD (droit à l'oubli != suppression immédiate).
-- Le soft delete permet de marquer les enregistrements comme supprimés tout en
-- conservant la traçabilité, puis de purger après la période de rétention légale.

-- ─── employee_diplomas ───────────────────────────────────────────────────────

ALTER TABLE employee_diplomas ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE employee_diplomas ADD COLUMN IF NOT EXISTS deleted_by  uuid        DEFAULT NULL REFERENCES auth.users(id);

-- Index pour filtrer efficacement les non-supprimés
CREATE INDEX IF NOT EXISTS idx_employee_diplomas_deleted_at
  ON employee_diplomas (deleted_at)
  WHERE deleted_at IS NULL;

-- ─── generated_documents ─────────────────────────────────────────────────────

ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS deleted_by  uuid        DEFAULT NULL REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_generated_documents_deleted_at
  ON generated_documents (deleted_at)
  WHERE deleted_at IS NULL;

-- ─── educational_resources ───────────────────────────────────────────────────

ALTER TABLE educational_resources ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE educational_resources ADD COLUMN IF NOT EXISTS deleted_by  uuid        DEFAULT NULL REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_educational_resources_deleted_at
  ON educational_resources (deleted_at)
  WHERE deleted_at IS NULL;

-- ─── companies ───────────────────────────────────────────────────────────────

ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_by  uuid        DEFAULT NULL REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_companies_deleted_at
  ON companies (deleted_at)
  WHERE deleted_at IS NULL;

-- ─── Fonction utilitaire de soft delete ──────────────────────────────────────
-- Usage : SELECT soft_delete('employee_diplomas', 'uuid-here', auth.uid())

CREATE OR REPLACE FUNCTION soft_delete(
  p_table  text,
  p_id     uuid,
  p_actor  uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = now(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL',
    p_table
  ) USING p_actor, p_id;
END;
$$;

COMMENT ON FUNCTION soft_delete IS
  'Marque un enregistrement comme supprimé (soft delete). Utiliser uniquement via service_role.';
