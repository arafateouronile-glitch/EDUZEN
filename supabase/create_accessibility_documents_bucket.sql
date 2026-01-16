-- =====================================================
-- EDUZEN - Bucket Supabase Storage pour documents accessibilité
-- =====================================================
-- Description: Création du bucket pour stocker les documents justificatifs
--              (certificats MDPH, RQTH, certificats médicaux, etc.)
-- Date: 2026-01-03
-- =====================================================

-- Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'accessibility-documents',
  'accessibility-documents',
  FALSE, -- Privé
  10485760, -- 10 MB max
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS POLICIES - Sécurité du bucket
-- =====================================================

-- Politique pour l'upload (INSERT)
-- Seuls les utilisateurs authentifiés de l'organisation peuvent uploader
DROP POLICY IF EXISTS "Users can upload accessibility documents for their org" ON storage.objects;
CREATE POLICY "Users can upload accessibility documents for their org"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'accessibility-documents'
    AND auth.uid() IS NOT NULL
    AND (
      -- L'utilisateur doit être dans l'organisation
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND is_active = TRUE
      )
    )
  );

-- Politique pour la lecture (SELECT)
-- Les utilisateurs de l'organisation + référent handicap peuvent lire
DROP POLICY IF EXISTS "Users can view accessibility documents from their org" ON storage.objects;
CREATE POLICY "Users can view accessibility documents from their org"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'accessibility-documents'
    AND (
      auth.uid() IS NOT NULL
      AND (
        -- Utilisateurs de l'organisation
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid()
          AND is_active = TRUE
        )
        OR
        -- Référent handicap peut tout voir
        EXISTS (
          SELECT 1 FROM public.accessibility_configurations ac
          JOIN public.users u ON u.organization_id = ac.organization_id
          WHERE ac.referent_user_id = auth.uid()
          AND u.id = auth.uid()
        )
      )
    )
  );

-- Politique pour la suppression (DELETE)
-- Seuls les admins et le référent handicap peuvent supprimer
DROP POLICY IF EXISTS "Admins and referent can delete accessibility documents" ON storage.objects;
CREATE POLICY "Admins and referent can delete accessibility documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'accessibility-documents'
    AND auth.uid() IS NOT NULL
    AND (
      -- Admins
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'super_admin')
      )
      OR
      -- Référent handicap
      EXISTS (
        SELECT 1 FROM public.accessibility_configurations
        WHERE referent_user_id = auth.uid()
      )
    )
  );

-- Politique pour la mise à jour (UPDATE)
-- Seuls les admins et le référent handicap peuvent modifier les métadonnées
DROP POLICY IF EXISTS "Admins and referent can update accessibility documents" ON storage.objects;
CREATE POLICY "Admins and referent can update accessibility documents"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'accessibility-documents'
    AND auth.uid() IS NOT NULL
    AND (
      -- Admins
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'super_admin')
      )
      OR
      -- Référent handicap
      EXISTS (
        SELECT 1 FROM public.accessibility_configurations
        WHERE referent_user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON POLICY "Users can upload accessibility documents for their org" ON storage.objects IS
  'Permet aux utilisateurs authentifiés d''uploader des documents d''accessibilité';

COMMENT ON POLICY "Users can view accessibility documents from their org" ON storage.objects IS
  'Permet aux utilisateurs de l''organisation et au référent handicap de consulter les documents';

COMMENT ON POLICY "Admins and referent can delete accessibility documents" ON storage.objects IS
  'Seuls les admins et le référent handicap peuvent supprimer les documents';

COMMENT ON POLICY "Admins and referent can update accessibility documents" ON storage.objects IS
  'Seuls les admins et le référent handicap peuvent modifier les métadonnées des documents';
