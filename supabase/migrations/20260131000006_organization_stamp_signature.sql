-- Migration: Cachet et signature de l'organisme de formation
-- Les documents à signer par les deux parties (stagiaire + OF) pourront afficher
-- automatiquement la signature/cachet de l'OF dans la zone sig_of.

-- Cachet (image du cachet officiel de l'OF)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stamp_url text;

COMMENT ON COLUMN public.organizations.stamp_url IS 'URL du cachet de l''organisme (Storage ou URL externe), affiché sur les documents à deux signatures';

-- Signature de l'organisme (signature manuscrite ou image)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS signature_url text;

COMMENT ON COLUMN public.organizations.signature_url IS 'URL de la signature de l''organisme de formation, placée dans la zone sig_of des documents à deux parties';
