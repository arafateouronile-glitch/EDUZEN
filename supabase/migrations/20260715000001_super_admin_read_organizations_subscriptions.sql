-- Le panel super-admin (onboarding funnel) interroge organizations/subscriptions
-- directement depuis le client (soumis à RLS), mais aucune policy ne permettait
-- à un platform_admin (super_admin) de lire les orgs dont il n'est pas membre —
-- la page affichait donc "Aucune donnée" pour tout super-admin.

CREATE POLICY "Super admins can view all organizations"
ON organizations
FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can view all subscriptions"
ON subscriptions
FOR SELECT
TO authenticated
USING (public.is_super_admin());
