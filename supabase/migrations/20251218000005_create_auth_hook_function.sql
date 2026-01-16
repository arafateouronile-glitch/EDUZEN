-- Migration pour créer une fonction Postgres qui peut être utilisée comme Auth Hook
-- Cette fonction sera appelée après la création d'un utilisateur

-- Fonction qui sera appelée par l'Auth Hook "before user created"
-- Note: Même si c'est "before", nous l'utiliserons pour préparer la synchronisation
-- La synchronisation réelle se fera via un trigger ou une fonction appelée après

-- Alternative: Fonction qui synchronise immédiatement après création
-- Cette fonction peut être appelée depuis un hook ou un trigger

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sync_result JSONB;
BEGIN
  -- Appeler la fonction de synchronisation
  SELECT public.sync_user_from_auth(NEW.id) INTO sync_result;
  
  -- Log du résultat (optionnel)
  IF (sync_result->>'success')::boolean THEN
    RAISE NOTICE 'User % synced successfully to public.users', NEW.email;
  ELSE
    RAISE WARNING 'Failed to sync user %: %', NEW.email, sync_result->>'error';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: Les triggers sur auth.users nécessitent des permissions superuser
-- qui ne sont généralement pas disponibles dans Supabase.
-- C'est pourquoi nous utilisons un Auth Hook à la place.

-- Fonction alternative pour être appelée directement depuis un Auth Hook Postgres
CREATE OR REPLACE FUNCTION public.sync_user_on_create(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Appeler la fonction de synchronisation existante
  SELECT public.sync_user_from_auth(user_id) INTO result;
  RETURN result;
END;
$$;

-- Commentaire pour documentation
COMMENT ON FUNCTION public.sync_user_on_create(UUID) IS 
'Fonction à utiliser dans un Auth Hook Postgres pour synchroniser un utilisateur après sa création. 
Appelez cette fonction avec: SELECT public.sync_user_on_create(user_id);';




