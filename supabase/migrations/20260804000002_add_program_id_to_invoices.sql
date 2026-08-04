-- Permet de rattacher un devis/une facture à un programme (utile notamment pour
-- un devis "entreprise" émis avant qu'une session précise ne soit choisie —
-- session_id reste optionnel côté UI, program_id offre un rattachement plus
-- large indépendant d'une session donnée).

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_program_id ON public.invoices(program_id) WHERE program_id IS NOT NULL;
