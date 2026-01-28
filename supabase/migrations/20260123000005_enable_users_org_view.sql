-- Migration pour permettre aux utilisateurs de voir les autres utilisateurs de leur organisation
-- Nécessaire pour que les admins puissent voir la liste des utilisateurs dans les paramètres
-- Utilise la fonction get_user_organization_id_uuid() existante pour éviter la récursion RLS

-- Supprimer la politique si elle existe déjà
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;

-- Créer la politique pour permettre aux utilisateurs de voir les utilisateurs de leur organisation
-- Cette politique utilise la fonction get_user_organization_id_uuid() qui est SECURITY DEFINER
-- et contourne RLS pour éviter la récursion
CREATE POLICY "Users can view users in their organization"
    ON users FOR SELECT
    TO authenticated
    USING (
        -- Un utilisateur peut voir son propre profil (déjà couvert par "Users can always view their own profile")
        id = auth.uid()
        OR
        -- OU voir les autres utilisateurs de la même organisation
        (
            organization_id IS NOT NULL
            AND organization_id = public.get_user_organization_id_uuid()
            AND public.get_user_organization_id_uuid() IS NOT NULL
        )
    );

-- Commentaire pour documentation
COMMENT ON POLICY "Users can view users in their organization" ON users IS 
'Permet aux utilisateurs authentifiés de voir les autres utilisateurs de leur organisation. Utilise get_user_organization_id_uuid() (SECURITY DEFINER) pour éviter la récursion RLS.';
