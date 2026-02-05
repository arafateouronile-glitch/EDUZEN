-- Correction RLS session_programs : violation policy lors de la création de session (403 Forbidden)
-- 1. Utiliser public.users (comme le reste du projet) au lieu de users (ambigu avec auth.users)
-- 2. INSERT : sous-requêtes basées uniquement sur auth.uid() et public.users (pas de ref à la table)
--
-- À appliquer sur le projet Supabase : soit via "supabase db push" / migrations, soit en copiant
-- ce fichier dans le SQL Editor du dashboard Supabase et en exécutant le script.

DROP POLICY IF EXISTS "Users can view session_programs of their organization" ON session_programs;
CREATE POLICY "Users can view session_programs of their organization"
  ON session_programs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create session_programs for their organization" ON session_programs;
CREATE POLICY "Users can create session_programs for their organization"
  ON session_programs
  FOR INSERT
  WITH CHECK (
    -- L'organisation insérée doit être celle de l'utilisateur connecté
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    -- La session doit appartenir à une formation de cette organisation
    AND session_id IN (
      SELECT s.id FROM sessions s
      INNER JOIN formations f ON s.formation_id = f.id
      WHERE f.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    -- Le programme doit appartenir à cette organisation
    AND program_id IN (
      SELECT id FROM programs
      WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update session_programs of their organization" ON session_programs;
CREATE POLICY "Users can update session_programs of their organization"
  ON session_programs
  FOR UPDATE
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

DROP POLICY IF EXISTS "Users can delete session_programs of their organization" ON session_programs;
CREATE POLICY "Users can delete session_programs of their organization"
  ON session_programs
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );
