-- Migration pour créer le bucket de stockage pour les documents des enseignants

-- 1. Créer le bucket teacher-documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'teacher-documents',
  'teacher-documents',
  false, -- Privé, accessible uniquement via RLS
  10485760, -- 10MB
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Teachers can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins and secretaries can view all teacher documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins and secretaries can delete all teacher documents" ON storage.objects;

-- 3. Politique RLS : Les enseignants peuvent uploader leurs propres documents
CREATE POLICY "Teachers can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'teacher-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Politique RLS : Les enseignants peuvent voir leurs propres documents
CREATE POLICY "Teachers can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'teacher-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Politique RLS : Les enseignants peuvent supprimer leurs propres documents
CREATE POLICY "Teachers can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'teacher-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. Politique RLS : Les administrateurs et secrétaires peuvent voir tous les documents
CREATE POLICY "Admins and secretaries can view all teacher documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'teacher-documents'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'secretary')
    AND organization_id IN (
      SELECT organization_id FROM public.teacher_documents
      WHERE file_url = storage.objects.name
    )
  )
);

-- 7. Politique RLS : Les administrateurs et secrétaires peuvent supprimer tous les documents
CREATE POLICY "Admins and secretaries can delete all teacher documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'teacher-documents'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'secretary')
    AND organization_id IN (
      SELECT organization_id FROM public.teacher_documents
      WHERE file_url = storage.objects.name
    )
  )
);
