-- Permet de rattacher un devis/une facture à une formation précise (déclinaison
-- d'un programme), en complément de program_id — utile pour préciser quelle
-- formation est concernée quand un programme a plusieurs formations.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_formation_id ON public.invoices(formation_id) WHERE formation_id IS NOT NULL;
