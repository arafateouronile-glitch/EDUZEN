-- Migration pour créer le bucket de stockage pour les pièces jointes des messages

-- Créer le bucket 'messages' pour stocker les pièces jointes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'messages',
  'messages',
  false, -- Bucket privé (seuls les participants peuvent accéder)
  52428800, -- 50 MB max
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Note: Les politiques RLS pour storage.objects doivent être créées manuellement
-- via l'interface Supabase Dashboard (Storage > Policies > messages bucket)
-- car les permissions nécessaires peuvent varier selon l'environnement Supabase.
-- 
-- Politiques recommandées à créer via l'interface Dashboard :
-- 
-- 1. INSERT Policy: "Users can upload message attachments"
--    - Target roles: authenticated
--    - Policy definition: bucket_id = 'messages' AND auth.uid() IS NOT NULL
--
-- 2. SELECT Policy: "Users can view message attachments"
--    - Target roles: authenticated
--    - Policy definition: bucket_id = 'messages' AND auth.uid() IS NOT NULL
--
-- 3. DELETE Policy: "Users can delete their own message attachments"
--    - Target roles: authenticated
--    - Policy definition: bucket_id = 'messages' AND auth.uid() IS NOT NULL

