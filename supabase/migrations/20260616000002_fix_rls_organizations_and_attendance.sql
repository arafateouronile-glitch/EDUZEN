-- Migration: Correction RLS sur organizations et electronic_attendance_requests
-- Date: 2026-06-16
-- Problèmes:
--   1. organizations: USING (true) expose toutes les orgs à tout le monde (y. anonymes)
--   2. electronic_attendance_requests UPDATE: USING (true) sans aucune condition DB

-- ============================================================
-- 1. ORGANIZATIONS — politique SELECT plus restrictive
-- ============================================================

-- Supprimer la policy actuelle trop permissive
DROP POLICY IF EXISTS "Public can read organizations by code" ON public.organizations;

-- Policy 1 : Utilisateurs authentifiés → uniquement leur propre organisation
CREATE POLICY "Authenticated users can read their own organization"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id = (
      SELECT organization_id
      FROM public.users
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

-- Policy 2 : Catalogue public → uniquement les orgs ayant activé leur catalogue public
-- (nécessaire pour /catalogue-public/[slug] et les pages publiques)
CREATE POLICY "Public can read organizations with active catalog"
  ON public.organizations
  FOR SELECT
  TO anon, authenticated
  USING (
    id IN (
      SELECT organization_id
      FROM public.public_catalog_settings
      WHERE is_enabled = true
    )
  );

-- ============================================================
-- 2. ELECTRONIC_ATTENDANCE_REQUESTS — UPDATE avec garde minimale
-- ============================================================

-- Supprimer la policy USING (true) sur UPDATE
DROP POLICY IF EXISTS "Public can update attendance request with token" ON public.electronic_attendance_requests;

-- Nouvelle policy : seules les demandes en attente peuvent être modifiées
-- La validation du token reste côté application, mais au moins on empêche
-- la mise à jour de demandes déjà signées ou expirées
CREATE POLICY "Public can update pending attendance request with token"
  ON public.electronic_attendance_requests
  FOR UPDATE
  TO anon, authenticated
  USING (
    status = 'pending'
    AND (
      token_expires_at IS NULL
      OR token_expires_at > now()
    )
  )
  WITH CHECK (
    status IN ('signed', 'refused')
  );

-- ============================================================
-- 3. SUBSCRIPTIONS — protéger les écritures (INSERT/UPDATE/DELETE)
-- seul service_role peut écrire (via routes API avec createServiceRoleClient)
-- ============================================================

-- Vérifier qu'il n'existe pas de policy d'écriture trop permissive
DROP POLICY IF EXISTS "Users can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update subscriptions" ON public.subscriptions;

-- Pas de policy INSERT/UPDATE/DELETE pour les utilisateurs normaux = RLS bloque par défaut
-- (service_role bypass RLS automatiquement)
