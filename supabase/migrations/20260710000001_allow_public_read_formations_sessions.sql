-- =====================================================
-- EDUZEN - Autoriser la lecture publique des formations/sessions
-- =====================================================
-- Description: Le catalogue public (/cataloguepublic/[slug] et /embed/[slug])
-- affiche pour chaque programme public le nombre de modules (formations),
-- le nombre de sessions et la prochaine session à venir. La politique
-- "Public can view public programs" (20260103000011) autorise déjà la
-- lecture anonyme des programmes publics, mais aucune politique équivalente
-- n'existe sur les tables formations/sessions : les visiteurs anonymes du
-- catalogue reçoivent donc toujours des tableaux formations/sessions vides.
-- Date: 2026-07-10
-- =====================================================

ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view formations of public programs" ON public.formations;

CREATE POLICY "Public can view formations of public programs"
  ON public.formations
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = formations.program_id
        AND p.is_public = true
        AND p.is_active = true
    )
  );

COMMENT ON POLICY "Public can view formations of public programs" ON public.formations IS
  'Permet aux utilisateurs anonymes et authentifiés de voir les formations actives rattachées à un programme public et actif (catalogue public)';

DROP POLICY IF EXISTS "Public can view sessions of public programs" ON public.sessions;

CREATE POLICY "Public can view sessions of public programs"
  ON public.sessions
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.formations f
      JOIN public.programs p ON p.id = f.program_id
      WHERE f.id = sessions.formation_id
        AND f.is_active = true
        AND p.is_public = true
        AND p.is_active = true
    )
  );

COMMENT ON POLICY "Public can view sessions of public programs" ON public.sessions IS
  'Permet aux utilisateurs anonymes et authentifiés de voir les sessions rattachées à une formation active d''un programme public et actif (catalogue public)';
