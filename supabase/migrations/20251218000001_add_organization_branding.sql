-- Migration: Ajouter les champs de branding pour les organisations
-- Description: Ajoute logo_url, qualiopi_certificate_url et brand_color à la table organizations

-- 0. Créer le bucket 'organizations' dans Supabase Storage s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organizations',
  'organizations',
  true,
  10485760, -- 10MB max file size
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 1. Ajouter logo_url pour le logo de l'organisation
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN public.organizations.logo_url IS 'URL du logo de l''organisation (stocké dans Supabase Storage)';

-- 2. Ajouter qualiopi_certificate_url pour l'attestation Qualiopi
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS qualiopi_certificate_url TEXT;

COMMENT ON COLUMN public.organizations.qualiopi_certificate_url IS 'URL de l''attestation Qualiopi (stockée dans Supabase Storage)';

-- 3. Ajouter brand_color pour la couleur de personnalisation des documents
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#335ACF';

COMMENT ON COLUMN public.organizations.brand_color IS 'Couleur de personnalisation des documents (format hexadécimal, ex: #335ACF)';

-- 4. Fonction helper pour obtenir l'organization_id de l'utilisateur actuel (version TEXT)
-- Cette fonction utilise SECURITY DEFINER pour contourner les politiques RLS

-- Supprimer toutes les versions possibles de la fonction en utilisant pg_proc
-- pour trouver toutes les signatures existantes
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Trouver toutes les fonctions get_user_organization_id dans le schéma public
  FOR func_record IN
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args,
      pg_get_function_result(p.oid)::regtype as return_type
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'get_user_organization_id'
  LOOP
    -- Construire et exécuter le DROP FUNCTION avec la signature exacte
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
        func_record.proname, 
        func_record.args);
    EXCEPTION
      WHEN OTHERS THEN
        -- Ignorer les erreurs
        NULL;
    END;
  END LOOP;
END $$;

-- Créer la fonction avec le type de retour TEXT (pour compatibilité avec string_to_array)
CREATE FUNCTION public.get_user_organization_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id::text 
  FROM public.users 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_organization_id() IS 'Retourne l''organization_id de l''utilisateur actuel (utilisé dans les politiques RLS Storage)';

-- 5. Politiques RLS pour le bucket organizations
-- Les utilisateurs authentifiés peuvent lire et écrire dans leur dossier organisation

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can read their organization files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their organization files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their organization files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their organization files" ON storage.objects;

-- Politique de lecture: les utilisateurs peuvent lire les fichiers de leur organisation
CREATE POLICY "Users can read their organization files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'organizations' AND
    (string_to_array(name, '/'))[1] = public.get_user_organization_id()
  );

-- Politique d'upload: les utilisateurs peuvent uploader dans leur dossier organisation
CREATE POLICY "Users can upload their organization files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'organizations' AND
    (string_to_array(name, '/'))[1] = public.get_user_organization_id()
  );

-- Politique de mise à jour: les utilisateurs peuvent mettre à jour les fichiers de leur organisation
CREATE POLICY "Users can update their organization files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'organizations' AND
    (string_to_array(name, '/'))[1] = public.get_user_organization_id()
  )
  WITH CHECK (
    bucket_id = 'organizations' AND
    (string_to_array(name, '/'))[1] = public.get_user_organization_id()
  );

-- Politique de suppression: les utilisateurs peuvent supprimer les fichiers de leur organisation
CREATE POLICY "Users can delete their organization files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'organizations' AND
    (string_to_array(name, '/'))[1] = public.get_user_organization_id()
  );

