-- Migration: Ajouter SIRET et numéro de déclaration d'activité aux organisations
-- Ces champs sont requis pour les documents officiels et le BPF.

-- SIRET (14 chiffres)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS siret VARCHAR(14);

COMMENT ON COLUMN public.organizations.siret IS 'Numéro SIRET de l''organisme (14 chiffres)';

-- Numéro de déclaration d'activité (obligatoire pour les organismes de formation en France)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS nda_number TEXT;

COMMENT ON COLUMN public.organizations.nda_number IS 'Numéro de déclaration d''activité (préfecture / DIRECCTE)';
