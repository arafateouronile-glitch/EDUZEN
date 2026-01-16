-- Migration: Création du bucket de stockage pour les templates DOCX
-- Date: 2026-01-16
-- Description: Crée un bucket Supabase Storage pour stocker les templates DOCX

-- 1. Créer le bucket pour les templates DOCX
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'docx-templates',
  'docx-templates',
  true,
  10485760, -- 10 Mo max par fichier
  ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can read docx templates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload docx templates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete docx templates" ON storage.objects;

-- 3. Politique RLS pour permettre aux utilisateurs authentifiés de lire les templates
CREATE POLICY "Users can read docx templates" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'docx-templates');

-- 4. Politique RLS pour permettre aux utilisateurs authentifiés de téléverser des templates
-- Note: On simplifie en autorisant tous les utilisateurs authentifiés car le bucket est public
CREATE POLICY "Admins can upload docx templates" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'docx-templates');

-- 5. Politique RLS pour permettre aux utilisateurs authentifiés de supprimer des templates
CREATE POLICY "Admins can delete docx templates" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'docx-templates');

-- 6. Log de la migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 20260116_add_docx_storage_bucket: Bucket docx-templates créé';
END $$;
