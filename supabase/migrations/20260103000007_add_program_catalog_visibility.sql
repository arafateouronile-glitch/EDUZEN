-- =====================================================
-- EDUZEN - Visibilité des programmes sur le catalogue public
-- =====================================================
-- Description: Ajouter le champ pour rendre les programmes visibles sur le catalogue public
-- Date: 2026-01-03
-- =====================================================

-- Ajouter le champ is_public aux programmes
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_description TEXT,
  ADD COLUMN IF NOT EXISTS public_image_url TEXT;

COMMENT ON COLUMN public.programs.is_public IS 'Si true, le programme est visible sur le catalogue public';
COMMENT ON COLUMN public.programs.public_description IS 'Description publique du programme (peut différer de la description interne)';
COMMENT ON COLUMN public.programs.public_image_url IS 'Image de couverture pour le catalogue public';

-- Index pour améliorer les performances des requêtes publiques
CREATE INDEX IF NOT EXISTS idx_programs_public ON public.programs(is_public) WHERE is_public = true;



