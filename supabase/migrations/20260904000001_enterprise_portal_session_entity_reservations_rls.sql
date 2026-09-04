-- Permet à l'espace entreprise (portail /enterprise) de lire les réservations
-- d'effectif prévisionnel (session_entity_reservations) de l'entité rattachée à
-- l'entreprise, y compris pour un manager entreprise externe (company_managers)
-- et pas seulement pour un admin de l'organisme de formation.
--
-- Sans cette policy, une entreprise inscrite à une session via un simple effectif
-- prévisionnel (sans apprenants nominatifs) ne voyait pas la session dans son
-- espace pro : la policy d'origine restreint la lecture aux membres de
-- l'organisation propriétaire (users.organization_id).

DROP POLICY IF EXISTS "Company managers can view entity reservations for their company"
  ON public.session_entity_reservations;

CREATE POLICY "Company managers can view entity reservations for their company"
  ON public.session_entity_reservations
  FOR SELECT
  TO authenticated
  USING (
    entity_id IN (
      SELECT c.external_entity_id
      FROM public.companies c
      WHERE c.external_entity_id IS NOT NULL
        AND public.can_access_company(auth.uid(), c.id)
    )
  );
