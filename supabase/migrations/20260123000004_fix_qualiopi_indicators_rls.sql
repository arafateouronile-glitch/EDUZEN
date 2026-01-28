-- Migration pour corriger les politiques RLS de qualiopi_indicators
-- Permet aux utilisateurs authentifiés d'insérer/mettre à jour les indicateurs de leur organisation

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Admins can manage indicators" ON public.qualiopi_indicators;
DROP POLICY IF EXISTS "Users can view indicators of their organization" ON public.qualiopi_indicators;
DROP POLICY IF EXISTS "Users can view Qualiopi indicators of their organization" ON public.qualiopi_indicators;

-- Politique pour SELECT : les utilisateurs peuvent voir les indicateurs de leur organisation
CREATE POLICY "Users can view Qualiopi indicators of their organization"
  ON public.qualiopi_indicators FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Politique pour INSERT : les utilisateurs authentifiés peuvent insérer des indicateurs pour leur organisation
CREATE POLICY "Users can insert Qualiopi indicators for their organization"
  ON public.qualiopi_indicators FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Politique pour UPDATE : les utilisateurs authentifiés peuvent mettre à jour les indicateurs de leur organisation
CREATE POLICY "Users can update Qualiopi indicators of their organization"
  ON public.qualiopi_indicators FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Politique pour DELETE : seuls les admins peuvent supprimer (optionnel, pour sécurité)
CREATE POLICY "Admins can delete Qualiopi indicators"
  ON public.qualiopi_indicators FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

COMMENT ON POLICY "Users can view Qualiopi indicators of their organization" ON public.qualiopi_indicators IS 'Permet aux utilisateurs de voir les indicateurs Qualiopi de leur organisation';
COMMENT ON POLICY "Users can insert Qualiopi indicators for their organization" ON public.qualiopi_indicators IS 'Permet aux utilisateurs authentifiés d''insérer des indicateurs Qualiopi pour leur organisation';
COMMENT ON POLICY "Users can update Qualiopi indicators of their organization" ON public.qualiopi_indicators IS 'Permet aux utilisateurs authentifiés de mettre à jour les indicateurs Qualiopi de leur organisation';
COMMENT ON POLICY "Admins can delete Qualiopi indicators" ON public.qualiopi_indicators IS 'Permet uniquement aux admins de supprimer les indicateurs Qualiopi';
