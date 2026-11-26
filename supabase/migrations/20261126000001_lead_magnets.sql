-- Outils gratuits en libre-service (/outils) : générateurs de documents et
-- simulateur Qualiopi. Chaque visiteur laisse son email pour recevoir le
-- document ; il devient un lead qui reçoit ensuite la séquence d'emails
-- marketing (cron /api/cron/lead-nurture), avec désabonnement en un clic.
--
-- Écriture uniquement par le client admin (routes serveur) ; lecture des leads par les super-admins.
-- À appliquer AVANT de déployer le code des outils.

CREATE TABLE IF NOT EXISTS public.lead_magnet_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  organization_name TEXT,
  phone TEXT,
  first_tool TEXT NOT NULL,
  tools TEXT[] NOT NULL DEFAULT '{}',
  qualiopi_score INTEGER,
  nurture_step INTEGER NOT NULL DEFAULT 0,
  next_email_at TIMESTAMPTZ,
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  unsubscribed_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lead_magnet_leads_email_unique
  ON public.lead_magnet_leads (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS lead_magnet_leads_unsubscribe_token
  ON public.lead_magnet_leads (unsubscribe_token);
-- Leads à relancer (cron)
CREATE INDEX IF NOT EXISTS lead_magnet_leads_due
  ON public.lead_magnet_leads (next_email_at)
  WHERE unsubscribed_at IS NULL AND bounced_at IS NULL AND converted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.lead_magnet_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.lead_magnet_leads(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_magnet_requests_lead ON public.lead_magnet_requests (lead_id);
CREATE INDEX IF NOT EXISTS lead_magnet_requests_tool ON public.lead_magnet_requests (tool, created_at);

ALTER TABLE public.lead_magnet_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_magnet_requests ENABLE ROW LEVEL SECURITY;

-- Lecture par les super-admins (onglet « Outils gratuits » du CRM)
DROP POLICY IF EXISTS "Super admins can view lead magnet leads" ON public.lead_magnet_leads;
CREATE POLICY "Super admins can view lead magnet leads"
  ON public.lead_magnet_leads FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid() AND is_active = true));
