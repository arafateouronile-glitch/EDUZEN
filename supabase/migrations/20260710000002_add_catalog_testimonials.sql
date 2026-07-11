-- =====================================================
-- EDUZEN - Témoignages/avis apprenants pour le catalogue public
-- =====================================================
-- Description: Ajoute une colonne JSONB pour stocker des témoignages curés
-- par l'organisme (nom, rôle, note, citation), affichés dans un carrousel
-- de preuve sociale sur le catalogue public. Volontairement séparé des
-- données internes d'évaluation (table grades) qui contiennent des
-- informations d'apprenants réels non destinées à publication automatique
-- : seul l'organisme choisit ce qui est publié ici.
-- La table public_catalog_settings a déjà une policy RLS de lecture
-- publique ("Public catalog settings are readable by everyone"), donc
-- aucune policy supplémentaire n'est nécessaire pour cette colonne.
-- Date: 2026-07-10
-- =====================================================

ALTER TABLE public.public_catalog_settings
  ADD COLUMN IF NOT EXISTS testimonials JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.public_catalog_settings.testimonials IS
  'Témoignages curés affichés sur le catalogue public. Tableau d''objets {author_name, author_role, quote, rating (1-5)}';
