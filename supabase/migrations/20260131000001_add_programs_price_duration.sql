-- Ajouter les colonnes prix et durée (heures) à la table programs
-- pour que la photo, les prix et la durée s'enregistrent correctement depuis le dashboard

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS duration_hours INTEGER,
  ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS price_enterprise NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS price_individual NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS price_freelance NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';

COMMENT ON COLUMN public.programs.duration_hours IS 'Durée du programme en heures';
COMMENT ON COLUMN public.programs.price IS 'Prix par défaut';
COMMENT ON COLUMN public.programs.price_enterprise IS 'Prix entreprise';
COMMENT ON COLUMN public.programs.price_individual IS 'Prix particulier';
COMMENT ON COLUMN public.programs.price_freelance IS 'Prix indépendant';
COMMENT ON COLUMN public.programs.currency IS 'Devise (EUR, XOF, etc.)';

-- Bucket Storage pour les photos de programmes (affichage public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('program-images', 'program-images', true)
ON CONFLICT (id) DO UPDATE SET public = excluded.public;

DROP POLICY IF EXISTS "Public can view program images" ON storage.objects;
CREATE POLICY "Public can view program images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'program-images');

DROP POLICY IF EXISTS "Authenticated can upload program images" ON storage.objects;
CREATE POLICY "Authenticated can upload program images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'program-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can update program images" ON storage.objects;
CREATE POLICY "Authenticated can update program images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'program-images' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'program-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can delete program images" ON storage.objects;
CREATE POLICY "Authenticated can delete program images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'program-images' AND auth.role() = 'authenticated');
