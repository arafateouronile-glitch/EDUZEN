-- Supprimer la contrainte FK qui lie of_generated_documents.template_id à of_document_templates
-- Les documents générés via l'API publique utilisent document_templates (pas of_document_templates)
-- template_id devient nullable pour supporter les deux cas d'usage

ALTER TABLE of_generated_documents
  DROP CONSTRAINT IF EXISTS of_generated_documents_template_id_fkey;

ALTER TABLE of_generated_documents
  ALTER COLUMN template_id DROP NOT NULL;
