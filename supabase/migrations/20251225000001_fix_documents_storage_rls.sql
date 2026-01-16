-- Migration pour corriger les politiques RLS du bucket Storage 'documents'
-- Permet aux utilisateurs authentifiés d'uploader des documents dans leur dossier d'organisation

-- 1. S'assurer que le bucket 'documents' existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Bucket privé
  52428800, -- 50 MB max
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Supprimer les politiques existantes sur le bucket 'documents'
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their organization folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents in their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents in their organization" ON storage.objects;

-- 3. Politique pour SELECT : Les utilisateurs peuvent voir les documents de leur organisation
CREATE POLICY "Users can view documents in their organization"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (
    -- Permettre si le chemin commence par documents/{organization_id}/
    (string_to_array(name, '/'))[1] = 'documents'
    AND (string_to_array(name, '/'))[2] IN (
      SELECT organization_id::text 
      FROM public.users 
      WHERE id = auth.uid()
    )
  )
  OR (
    -- Permettre aux admins de voir tous les documents
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
);

-- 4. Politique pour INSERT : Les utilisateurs peuvent uploader dans leur dossier d'organisation
CREATE POLICY "Users can upload to their organization folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (
    -- Le chemin doit commencer par documents/{organization_id}/
    (string_to_array(name, '/'))[1] = 'documents'
    AND (string_to_array(name, '/'))[2] IN (
      SELECT organization_id::text 
      FROM public.users 
      WHERE id = auth.uid()
    )
  )
  OR (
    -- Permettre aux admins d'uploader partout
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
);

-- 5. Politique pour UPDATE : Les utilisateurs peuvent mettre à jour les documents de leur organisation
CREATE POLICY "Users can update documents in their organization"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    (string_to_array(name, '/'))[1] = 'documents'
    AND (string_to_array(name, '/'))[2] IN (
      SELECT organization_id::text 
      FROM public.users 
      WHERE id = auth.uid()
    )
  )
  OR (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (
    (string_to_array(name, '/'))[1] = 'documents'
    AND (string_to_array(name, '/'))[2] IN (
      SELECT organization_id::text 
      FROM public.users 
      WHERE id = auth.uid()
    )
  )
  OR (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
);

-- 6. Politique pour DELETE : Les utilisateurs peuvent supprimer les documents de leur organisation
CREATE POLICY "Users can delete documents in their organization"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    (string_to_array(name, '/'))[1] = 'documents'
    AND (string_to_array(name, '/'))[2] IN (
      SELECT organization_id::text 
      FROM public.users 
      WHERE id = auth.uid()
    )
  )
  OR (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
);

