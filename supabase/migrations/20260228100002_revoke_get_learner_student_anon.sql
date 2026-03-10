-- P0 Sécurité : révoquer l'exécution de get_learner_student pour le rôle anon.
-- Sans cela, tout client non authentifié pouvait appeler get_learner_student(any_uuid) et lire les données étudiant.
-- L'accès reste possible pour : service_role (backend API) et authenticated (app avec session).
-- Réf. audit 2026-02-28 (docs/AUDIT_COMPLET_2026-02-28.md).

REVOKE EXECUTE ON FUNCTION public.get_learner_student(uuid) FROM anon;

COMMENT ON FUNCTION public.get_learner_student(uuid) IS
  'Récupère les données d''un étudiant. SECURITY DEFINER. Réservé à service_role (backend) et authenticated (session). Révoqué pour anon (audit 2026-02-28).';
