-- Migration: Créer les buckets Storage pour les ressources pédagogiques
-- Corrige l'erreur 400 Bad Request lors de l'upload (bucket inexistant)

-- 1. Bucket pour les fichiers des ressources (PDF, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'educational-resources',
  'educational-resources',
  true,
  52428800, -- 50 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Bucket pour les miniatures des ressources
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resource-thumbnails',
  'resource-thumbnails',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Politiques RLS pour educational-resources (chemin: {organization_id}/resources/...)
DROP POLICY IF EXISTS "educational-resources select by org" ON storage.objects;
CREATE POLICY "educational-resources select by org"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'educational-resources'
  AND (string_to_array(name, '/'))[1] IN (
    SELECT organization_id::text FROM public.users WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "educational-resources insert by org" ON storage.objects;
CREATE POLICY "educational-resources insert by org"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'educational-resources'
  AND (string_to_array(name, '/'))[1] IN (
    SELECT organization_id::text FROM public.users WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "educational-resources update by org" ON storage.objects;
CREATE POLICY "educational-resources update by org"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'educational-resources'
  AND (string_to_array(name, '/'))[1] IN (
    SELECT organization_id::text FROM public.users WHERE id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'educational-resources'
  AND (string_to_array(name, '/'))[1] IN (
    SELECT organization_id::text FROM public.users WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "educational-resources delete by org" ON storage.objects;
CREATE POLICY "educational-resources delete by org"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'educational-resources'
  AND (string_to_array(name, '/'))[1] IN (
    SELECT organization_id::text FROM public.users WHERE id = auth.uid()
  )
);

-- 4. Politiques RLS pour resource-thumbnails (chemin: {organization_id}/thumbnails/...)
DROP POLICY IF EXISTS "resource-thumbnails select by org" ON storage.objects;
CREATE POLICY "resource-thumbnails select by org"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'resource-thumbnails'
  AND (string_to_array(name, '/'))[1] IN (
    SELECT organization_id::text FROM public.users WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "resource-thumbnails insert by org" ON storage.objects;
CREATE POLICY "resource-thumbnails insert by org"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resource-thumbnails'
  AND (string_to_array(name, '/'))[1] IN (
    SELECT organization_id::text FROM public.users WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "resource-thumbnails update by org" ON storage.objects;
CREATE POLICY "resource-thumbnails update by org"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'resource-thumbnails'
  AND (string_to_array(name, '/'))[1] IN (
    SELECT organization_id::text FROM public.users WHERE id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'resource-thumbnails'
  AND (string_to_array(name, '/'))[1] IN (
    SELECT organization_id::text FROM public.users WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "resource-thumbnails delete by org" ON storage.objects;
CREATE POLICY "resource-thumbnails delete by org"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resource-thumbnails'
  AND (string_to_array(name, '/'))[1] IN (
    SELECT organization_id::text FROM public.users WHERE id = auth.uid()
  )
);
