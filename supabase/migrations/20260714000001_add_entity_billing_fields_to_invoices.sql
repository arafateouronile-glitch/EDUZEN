-- Permet d'émettre un devis/une facture directement à une entité externe
-- (entreprise/organisme), en plus du cas existant "apprenant individuel"
-- (student_id/enrollment_id). Ajoute aussi funding_type_id pour reprendre le
-- type de financement déjà saisi lors de l'inscription (apprenant ou entité).

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES public.external_entities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_entity_reservation_id UUID REFERENCES public.session_entity_reservations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS funding_type_id UUID REFERENCES public.funding_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_entity_id ON public.invoices(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_session_entity_reservation_id ON public.invoices(session_entity_reservation_id) WHERE session_entity_reservation_id IS NOT NULL;

-- Volontairement pas de modification des politiques RLS existantes sur
-- invoices ici : une politique "Block insert/update if subscription not
-- active" (voir 20260123000002_rls_anti_impayes.sql) conditionne déjà
-- l'écriture au statut d'abonnement de l'organisation, sans référencer
-- student_id. Ajouter une politique supplémentaire risquerait — les
-- politiques RLS permissives étant combinées en OR — d'affaiblir ce
-- garde-fou anti-impayés pour TOUTES les factures, pas seulement celles
-- des entités. Si l'insertion d'une facture/d'un devis d'entité échoue en
-- pratique à cause d'une politique RLS non retrouvée dans les migrations
-- versionnées, il faudra l'ajuster explicitement (et étroitement) depuis
-- Supabase Studio plutôt que via un large "FOR ALL".

COMMENT ON COLUMN public.invoices.entity_id IS 'Entreprise/organisme facturé (alternative à student_id pour un devis/facture émis à une entité externe)';
COMMENT ON COLUMN public.invoices.session_entity_reservation_id IS 'Réservation d''effectif entreprise (session_entity_reservations) à l''origine de ce devis/facture, le cas échéant';
COMMENT ON COLUMN public.invoices.funding_type_id IS 'Type de financement repris depuis l''inscription (apprenant ou entité) au moment de la création du devis/facture';
