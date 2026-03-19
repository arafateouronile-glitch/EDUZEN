-- Fix sécurité : user_2fa_sessions avait une policy "FOR ALL USING (true)" sans restriction
-- de rôle, permettant à n'importe quel utilisateur authentifié de lire/modifier les sessions
-- 2FA de tous les autres utilisateurs.
--
-- Correction : scoper la policy "System can manage 2FA sessions" au service_role uniquement.

-- Supprimer la policy trop permissive (présente en 3 exemplaires dans la migration d'origine)
DROP POLICY IF EXISTS "System can manage 2FA sessions" ON public.user_2fa_sessions;

-- Re-créer scoped au service_role uniquement
CREATE POLICY "System can manage 2FA sessions"
  ON public.user_2fa_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- S'assurer que les utilisateurs ne peuvent gérer que leurs propres sessions
-- (les policies SELECT existantes restent inchangées, on ajoute INSERT/UPDATE/DELETE scoped)
DROP POLICY IF EXISTS "Users can manage their own 2FA sessions" ON public.user_2fa_sessions;
CREATE POLICY "Users can manage their own 2FA sessions"
  ON public.user_2fa_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
