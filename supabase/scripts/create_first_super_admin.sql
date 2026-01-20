-- =====================================================
-- Script pour créer le premier Super Admin
-- =====================================================
-- 
-- INSTRUCTIONS :
-- 1. Remplacez 'VOTRE_EMAIL@example.com' par l'email de votre compte
-- 2. Exécutez ce script dans le SQL Editor de Supabase
-- 3. Ou utilisez la fonction ci-dessous avec votre user_id
-- 
-- Si vous ne connaissez pas votre email exact, exécutez d'abord :
-- SELECT id, email, created_at FROM auth.users UNION SELECT id, email, created_at FROM public.users ORDER BY created_at DESC;
-- =====================================================

-- =====================================================
-- ÉTAPE 0 : Lister TOUS les utilisateurs disponibles
-- =====================================================
-- ⚠️ IMPORTANT : Exécutez d'abord cette requête pour trouver votre user_id
-- Copiez-collez et exécutez cette requête dans le SQL Editor :

SELECT 
  id,
  email,
  created_at,
  'Utilisez cet ID pour créer le super admin' as instruction
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- Une fois que vous avez votre user_id, utilisez l'Option 2 ci-dessous
-- avec votre user_id au lieu de l'email.

-- =====================================================
-- ⚠️ SOLUTION RAPIDE : Utiliser directement un user_id
-- =====================================================
-- Si votre email n'existe pas, utilisez cette méthode :
-- 
-- 1. Exécutez d'abord cette requête pour lister les utilisateurs :
--    SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 20;
--
-- 2. Copiez votre user_id (la colonne 'id')
--
-- 3. Exécutez cette commande en remplaçant 'VOTRE_USER_ID' :
--    SELECT create_super_admin(p_user_id := 'VOTRE_USER_ID');
--
-- =====================================================
-- Option 1 : Créer un super admin à partir d'un email
-- ⚠️ Cette méthode ne fonctionne que si votre email existe dans auth.users
-- =====================================================
DO $$
DECLARE
  target_user_id UUID;
  admin_exists BOOLEAN;
  user_email TEXT := 'arafateouronile@gmail.com';  -- ⚠️ REMPLACEZ ICI
BEGIN
  -- Récupérer l'ID de l'utilisateur par email (chercher dans auth.users uniquement)
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(user_email)  -- Recherche insensible à la casse
  LIMIT 1;

  -- Vérifier si l'utilisateur existe
  IF target_user_id IS NULL THEN
    -- Afficher les emails similaires pour aider
    RAISE NOTICE 'Aucun utilisateur trouvé avec l''email exact: %', user_email;
    RAISE NOTICE 'Emails similaires dans auth.users:';
    DECLARE
      similar_email TEXT;
    BEGIN
      FOR similar_email IN 
        SELECT email FROM auth.users 
        WHERE email ILIKE '%' || user_email || '%' 
        LIMIT 5
      LOOP
        RAISE NOTICE '  - %', similar_email;
      END LOOP;
    END;
    
    RAISE EXCEPTION 'Aucun utilisateur trouvé avec cet email (%). Vérifiez l''email ci-dessus ou utilisez: SELECT create_super_admin(p_user_id := ''uuid'');', user_email;
  END IF;

  RAISE NOTICE 'Utilisateur trouvé dans auth.users avec l''ID: %', target_user_id;

  -- Vérifier si un admin existe déjà pour cet utilisateur
  SELECT EXISTS(
    SELECT 1 FROM platform_admins WHERE user_id = target_user_id
  ) INTO admin_exists;

  IF admin_exists THEN
    RAISE NOTICE 'Un compte admin existe déjà pour cet utilisateur. Mise à jour du rôle en super_admin...';
    
    UPDATE platform_admins
    SET 
      role = 'super_admin',
      is_active = true,
      revoked_at = NULL,
      revoked_by = NULL,
      revoke_reason = NULL,
      updated_at = NOW()
    WHERE user_id = target_user_id;
  ELSE
    -- Créer le super admin
    INSERT INTO platform_admins (
      user_id,
      role,
      permissions,
      is_active,
      accepted_at
    ) VALUES (
      target_user_id,
      'super_admin',
      '{
        "view_dashboard": true,
        "view_revenue": true,
        "manage_subscriptions": true,
        "manage_invoices": true,
        "manage_promo_codes": true,
        "manage_referrals": true,
        "manage_blog": true,
        "publish_posts": true,
        "moderate_comments": true,
        "manage_team": true
      }'::jsonb,
      true,
      NOW()
    );
  END IF;

  RAISE NOTICE 'Super Admin créé avec succès pour l''utilisateur %', target_user_id;
END $$;

-- =====================================================
-- Option 2 : Fonction réutilisable pour créer un super admin
-- =====================================================

CREATE OR REPLACE FUNCTION create_super_admin(
  p_user_email TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  admin_id UUID;
  admin_exists BOOLEAN;
BEGIN
  -- Déterminer l'ID de l'utilisateur
  IF p_user_id IS NOT NULL THEN
    target_user_id := p_user_id;
  ELSIF p_user_email IS NOT NULL THEN
    -- Chercher dans auth.users uniquement (recherche insensible à la casse)
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(p_user_email)
    LIMIT 1;
  ELSE
    -- Utiliser l'utilisateur actuellement authentifié
    target_user_id := auth.uid();
  END IF;

  -- Vérifier si l'utilisateur existe
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé. Fournissez un email ou un user_id valide. Pour lister les utilisateurs: SELECT id, email FROM auth.users;';
  END IF;

  -- Vérifier si un admin existe déjà
  SELECT EXISTS(
    SELECT 1 FROM platform_admins WHERE user_id = target_user_id
  ) INTO admin_exists;

  IF admin_exists THEN
    -- Mettre à jour l'admin existant
    UPDATE platform_admins
    SET 
      role = 'super_admin',
      is_active = true,
      revoked_at = NULL,
      revoked_by = NULL,
      revoke_reason = NULL,
      updated_at = NOW()
    WHERE user_id = target_user_id
    RETURNING id INTO admin_id;
  ELSE
    -- Créer un nouveau super admin
    INSERT INTO platform_admins (
      user_id,
      role,
      permissions,
      is_active,
      accepted_at
    ) VALUES (
      target_user_id,
      'super_admin',
      '{
        "view_dashboard": true,
        "view_revenue": true,
        "manage_subscriptions": true,
        "manage_invoices": true,
        "manage_promo_codes": true,
        "manage_referrals": true,
        "manage_blog": true,
        "publish_posts": true,
        "moderate_comments": true,
        "manage_team": true
      }'::jsonb,
      true,
      NOW()
    )
    RETURNING id INTO admin_id;
  END IF;

  RETURN admin_id;
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION create_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION create_super_admin TO service_role;

-- =====================================================
-- Option 3 : Utilisation de la fonction (RECOMMANDÉ)
-- =====================================================

-- ⚠️ MÉTHODE LA PLUS SIMPLE : Utiliser directement un user_id
-- 1. Exécutez d'abord : SELECT id, email FROM auth.users;
-- 2. Copiez votre user_id
-- 3. Exécutez cette commande (remplacez 'VOTRE_USER_ID') :
SELECT create_super_admin(p_user_id := 'VOTRE_USER_ID');

-- Alternative : Par email (si votre email existe)
-- SELECT create_super_admin(p_user_email := 'admin@example.com');

-- Alternative : Utilisateur actuellement connecté
-- SELECT create_super_admin();

-- =====================================================
-- Option 4 : Lister les utilisateurs disponibles
-- =====================================================

-- Pour trouver votre user_id, exécutez cette requête :
-- SELECT 
--   'auth.users' as source,
--   id,
--   email,
--   created_at
-- FROM auth.users
-- UNION ALL
-- SELECT 
--   'public.users' as source,
--   id,
--   email,
--   created_at
-- FROM public.users
-- WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
-- ORDER BY created_at DESC;

-- =====================================================
-- Vérification : Lister tous les super admins
-- =====================================================

-- SELECT 
--   pa.id,
--   pa.role,
--   pa.is_active,
--   u.email,
--   u.full_name,
--   pa.created_at,
--   pa.accepted_at
-- FROM platform_admins pa
-- JOIN auth.users u ON u.id = pa.user_id
-- WHERE pa.role = 'super_admin'
-- ORDER BY pa.created_at DESC;
