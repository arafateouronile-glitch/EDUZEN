-- Lecture des paiements : policy SELECT manquante (seuls INSERT/UPDATE/DELETE existaient)
-- Sans cette policy, les requêtes SELECT sur payments ne retournent aucune ligne.

DROP POLICY IF EXISTS "Users can read payments in their organization" ON public.payments;

CREATE POLICY "Users can read payments in their organization"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );
