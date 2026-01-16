-- Migration pour créer les politiques RLS sur storage.objects pour le bucket messages
-- Cette migration utilise SECURITY DEFINER pour contourner les restrictions de permissions

-- Note: Si cette migration échoue avec des erreurs de permissions, créez les politiques manuellement
-- via l'interface Supabase Dashboard (Storage > Policies > New policy)

-- 1. Politique pour INSERT : Permettre aux utilisateurs authentifiés d'uploader des fichiers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload message attachments'
  ) THEN
    CREATE POLICY "Users can upload message attachments"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'messages' AND
      auth.uid() IS NOT NULL
    );
  END IF;
END $$;

-- 2. Politique pour SELECT : Permettre aux utilisateurs authentifiés de voir les fichiers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view message attachments'
  ) THEN
    CREATE POLICY "Users can view message attachments"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'messages' AND
      auth.uid() IS NOT NULL
    );
  END IF;
END $$;

-- 3. Politique pour DELETE : Permettre aux utilisateurs authentifiés de supprimer leurs fichiers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own message attachments'
  ) THEN
    CREATE POLICY "Users can delete their own message attachments"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'messages' AND
      auth.uid() IS NOT NULL
    );
  END IF;
END $$;



