CREATE TABLE IF NOT EXISTS public.demo_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_leads ENABLE ROW LEVEL SECURITY;

-- Seuls les super admins peuvent lire les leads
CREATE POLICY "Super admins can view demo leads"
  ON public.demo_leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Tout le monde (anon inclus) peut soumettre un lead
CREATE POLICY "Anyone can insert demo lead"
  ON public.demo_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
