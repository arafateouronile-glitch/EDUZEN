-- Migration pour ajouter la politique RLS manquante pour opco_configurations
-- Cette politique permet aux utilisateurs de voir les configurations OPCO de leur organisation

DO $$
BEGIN
  -- Policy pour opco_configurations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'opco_configurations'
    AND policyname = 'Users can view OPCO configurations of their organization'
  ) THEN
    CREATE POLICY "Users can view OPCO configurations of their organization"
      ON public.opco_configurations FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- Commentaire sur la politique
COMMENT ON POLICY "Users can view OPCO configurations of their organization" ON public.opco_configurations IS
'Permet aux utilisateurs authentifiés de voir les configurations OPCO de leur organisation';













