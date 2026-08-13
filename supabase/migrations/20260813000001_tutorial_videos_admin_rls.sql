-- Autorise les super-admins à créer/modifier/supprimer des modules et vidéos
-- tutoriels (contenu global de la plateforme, sans organization_id). Jusqu'ici
-- seul GRANT SELECT + policy SELECT publique existaient : personne ne pouvait
-- écrire, même un admin.

GRANT INSERT, UPDATE, DELETE ON public.tutorial_modules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tutorial_videos TO authenticated;

-- Policies additives : les policies SELECT existantes restent inchangées,
-- Postgres combine toutes les policies RLS d'une même table en OR.
DROP POLICY IF EXISTS "Super admins can manage tutorial modules" ON public.tutorial_modules;
CREATE POLICY "Super admins can manage tutorial modules"
  ON public.tutorial_modules
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage tutorial videos" ON public.tutorial_videos;
CREATE POLICY "Super admins can manage tutorial videos"
  ON public.tutorial_videos
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));
