-- =====================================================
-- FIX: Politique RLS et GRANTS pour accessibility_configurations
-- =====================================================
-- Problème: La politique RLS bloque les INSERT car elle vérifie referent_user_id
--           lors de l'INSERT initial où le référent n'est pas encore défini.
--           De plus, les GRANTS INSERT/UPDATE sont manquants.
-- Date: 2026-01-02
-- =====================================================

-- 1. Supprimer les anciennes politiques qui pourraient exister
DROP POLICY IF EXISTS "Admins and referent can manage configuration" ON public.accessibility_configurations;
DROP POLICY IF EXISTS "Admins can manage configuration" ON public.accessibility_configurations;
DROP POLICY IF EXISTS "Referent can update configuration" ON public.accessibility_configurations;

-- 2. Créer une nouvelle politique qui permet aux admins de créer/mettre à jour
--    et aux référents de mettre à jour (mais pas de créer)
CREATE POLICY "Admins can manage configuration"
  ON public.accessibility_configurations
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- 3. Créer une politique séparée pour permettre aux référents de mettre à jour
--    (mais pas de créer, car le référent doit être défini par un admin d'abord)
CREATE POLICY "Referent can update configuration"
  ON public.accessibility_configurations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND referent_user_id = auth.uid()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND referent_user_id = auth.uid()
  );

-- 4. Ajouter les GRANTS manquants (INSERT et UPDATE)
GRANT INSERT, UPDATE ON public.accessibility_configurations TO authenticated;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
