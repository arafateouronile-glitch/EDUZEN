-- Corrige l'accès RLS des formateurs à leurs propres affectations (session_teachers).
--
-- Constaté en production : un formateur authentifié ne voit AUCUNE ligne dans
-- session_teachers, même pour ses propres sessions (teacher_id = auth.uid()),
-- alors que l'admin de son organisation les voit toutes. Les politiques historiques
-- (20241206_add_missing_tables.sql, remplacées par 20241206_optimize_tables.sql)
-- semblent ne pas être toutes présentes sur cette base — on les réaffirme ici de
-- façon idempotente, quel que soit leur état actuel.

ALTER TABLE public.session_teachers ENABLE ROW LEVEL SECURITY;

-- Nettoie tous les noms de policies historiques connus pour repartir d'un état propre
DROP POLICY IF EXISTS "session_teachers_all" ON public.session_teachers;
DROP POLICY IF EXISTS "session_teachers_select_own" ON public.session_teachers;
DROP POLICY IF EXISTS "session_teachers_select_admin" ON public.session_teachers;
DROP POLICY IF EXISTS "session_teachers_manage" ON public.session_teachers;
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir les affectations de leur organisation" ON public.session_teachers;
DROP POLICY IF EXISTS "Les enseignants peuvent voir leurs propres affectations" ON public.session_teachers;
DROP POLICY IF EXISTS "Les admins peuvent gérer les affectations" ON public.session_teachers;

-- Un formateur voit ses propres affectations
CREATE POLICY "session_teachers_select_own"
  ON public.session_teachers FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

-- Tout membre de l'organisation voit les affectations des sessions de son organisation
CREATE POLICY "session_teachers_select_org"
  ON public.session_teachers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_teachers.session_id
      AND f.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- Admin/secrétaire/super_admin gèrent les affectations de leur organisation
CREATE POLICY "session_teachers_manage"
  ON public.session_teachers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin', 'secretary')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin', 'secretary')
    )
  );
