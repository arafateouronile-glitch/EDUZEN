-- Bucket Supabase Storage pour les signatures d'émargement des enseignants
-- Chemin : attendance-signatures/class/{classId}/{date}/{teacherId}.png

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attendance-signatures',
  'attendance-signatures',
  true,                          -- public pour affichage dans le PDF et le portail
  204800,                        -- 200 KB max par signature
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Les membres de l'organisation peuvent uploader des signatures
DROP POLICY IF EXISTS "org_members_upload_signatures" ON storage.objects;
CREATE POLICY "org_members_upload_signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attendance-signatures'
  AND (storage.foldername(name))[1] = 'class'
);

-- Lecture publique (pour les PDFs générés côté serveur et le portail auditeur)
DROP POLICY IF EXISTS "public_read_signatures" ON storage.objects;
CREATE POLICY "public_read_signatures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'attendance-signatures');

-- Mise à jour : enseignant peut écraser sa propre signature
DROP POLICY IF EXISTS "org_members_update_signatures" ON storage.objects;
CREATE POLICY "org_members_update_signatures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'attendance-signatures')
WITH CHECK (bucket_id = 'attendance-signatures');
