-- Migration pour synchroniser auth.users avec public.users
-- Crée automatiquement un enregistrement dans public.users quand un utilisateur s'inscrit

-- Note: Les triggers sur auth.users nécessitent des permissions spéciales dans Supabase
-- Cette migration synchronise d'abord les utilisateurs existants
-- Pour les nouveaux utilisateurs, utilisez un webhook Supabase ou créez l'enregistrement côté client

-- 1. Fonction pour créer un utilisateur dans public.users depuis auth.users
-- Cette fonction peut être appelée manuellement ou via un webhook
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier si l'utilisateur existe déjà dans public.users
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    -- Créer l'utilisateur dans public.users
    INSERT INTO public.users (
      id,
      email,
      full_name,
      role,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      COALESCE((NEW.raw_user_meta_data->>'role')::text, 'user'),
      COALESCE((NEW.raw_user_meta_data->>'is_active')::boolean, true),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Crée automatiquement un enregistrement dans public.users quand un utilisateur est créé dans auth.users. Peut être appelée via trigger ou webhook.';

-- Note: Le trigger sur auth.users nécessite des permissions de super-utilisateur
-- Dans Supabase, utilisez plutôt un webhook ou créez l'enregistrement côté client
-- Pour créer le trigger, exécutez cette commande en tant que super-utilisateur dans le SQL Editor:
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Fonction pour synchroniser un utilisateur depuis auth.users vers public.users
-- Cette fonction peut être appelée manuellement ou via un webhook
CREATE OR REPLACE FUNCTION public.sync_user_from_auth(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_user_record RECORD;
BEGIN
  -- Récupérer l'utilisateur depuis auth.users
  SELECT id, email, raw_user_meta_data, created_at
  INTO auth_user_record
  FROM auth.users
  WHERE id = user_id;
  
  -- Si l'utilisateur existe dans auth.users mais pas dans public.users
  IF auth_user_record.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    -- Créer l'utilisateur dans public.users
    INSERT INTO public.users (
      id,
      email,
      full_name,
      role,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      auth_user_record.id,
      auth_user_record.email,
      COALESCE(auth_user_record.raw_user_meta_data->>'full_name', auth_user_record.email),
      COALESCE((auth_user_record.raw_user_meta_data->>'role')::text, 'user'),
      COALESCE((auth_user_record.raw_user_meta_data->>'is_active')::boolean, true),
      auth_user_record.created_at,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.sync_user_from_auth(UUID) IS 'Synchronise un utilisateur depuis auth.users vers public.users';

-- 3. Synchroniser les utilisateurs existants
-- Note: L'accès à auth.users depuis le schéma public nécessite des permissions spéciales
-- Si cette partie échoue, utilisez le script manuel: 20251218000002_sync_auth_users_to_public_users_manual.sql
-- Ou exécutez directement dans le SQL Editor de Supabase (où vous avez les permissions nécessaires):
/*
DO $$
DECLARE
  auth_user_record RECORD;
  synced_count INTEGER := 0;
BEGIN
  FOR auth_user_record IN
    SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    INSERT INTO public.users (
      id, email, full_name, role, is_active, created_at, updated_at
    )
    VALUES (
      auth_user_record.id,
      auth_user_record.email,
      COALESCE(auth_user_record.raw_user_meta_data->>'full_name', auth_user_record.email),
      COALESCE((auth_user_record.raw_user_meta_data->>'role')::text, 'user'),
      COALESCE((auth_user_record.raw_user_meta_data->>'is_active')::boolean, true),
      auth_user_record.created_at,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    synced_count := synced_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Nombre d''utilisateurs synchronisés: %', synced_count;
END $$;
*/

-- 4. Note: Pour synchroniser les utilisateurs existants, exécutez la migration:
--    20251218000004_sync_existing_users.sql
--    Ou utilisez la fonction RPC directement:
--    SELECT public.sync_user_from_auth('user-id-here'::uuid);

