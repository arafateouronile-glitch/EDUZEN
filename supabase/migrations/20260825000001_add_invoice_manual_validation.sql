-- Permet de marquer manuellement un devis comme validé par le client
-- (en plus de la validation par signature électronique déjà suivie via
-- signature_requests). Utilisé par la section "Devis validés" du tableau
-- de bord Paiements pour alerter les coordos qu'une session est à
-- planifier, même quand le client valide par téléphone/email plutôt que
-- par signature électronique.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.invoices.validated_at IS 'Date de validation manuelle du devis par un utilisateur (distinct de la signature électronique)';
COMMENT ON COLUMN public.invoices.validated_by IS 'Utilisateur ayant marqué le devis comme validé manuellement';
