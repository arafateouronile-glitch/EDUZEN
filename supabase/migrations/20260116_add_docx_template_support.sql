-- Migration: Ajout du support des templates DOCX pour la génération de documents Word
-- Date: 2026-01-16
-- Description: Ajoute une colonne pour stocker l'URL du template DOCX dans la table document_templates

-- 1. Ajouter la colonne pour l'URL du template DOCX
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS docx_template_url TEXT;

-- 2. Ajouter un commentaire explicatif
COMMENT ON COLUMN document_templates.docx_template_url IS 
  'URL du fichier template DOCX (.docx) pour la génération de documents Word avec docxtemplater. Le template doit contenir des balises {variable} correspondant aux variables du système.';

-- 3. Créer un index pour les templates qui ont un fichier DOCX
CREATE INDEX IF NOT EXISTS idx_document_templates_has_docx 
ON document_templates ((docx_template_url IS NOT NULL));

-- 4. Log de la migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 20260116_add_docx_template_support: Support des templates DOCX ajouté';
END $$;
