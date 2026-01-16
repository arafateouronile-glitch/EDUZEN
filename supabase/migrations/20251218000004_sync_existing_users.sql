-- Script pour synchroniser tous les utilisateurs existants de auth.users vers public.users
-- À exécuter une seule fois après la mise en place du système de synchronisation

-- Utilise la fonction RPC sync_user_from_auth pour synchroniser chaque utilisateur
DO $$
DECLARE
  auth_user_record RECORD;
  sync_result JSONB;
  synced_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Début de la synchronisation des utilisateurs...';
  
  -- Parcourir tous les utilisateurs dans auth.users qui n'ont pas d'enregistrement dans public.users
  FOR auth_user_record IN
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
    ORDER BY au.created_at
  LOOP
    BEGIN
      -- Utiliser la fonction RPC pour synchroniser
      SELECT public.sync_user_from_auth(auth_user_record.id) INTO sync_result;
      
      IF (sync_result->>'success')::boolean THEN
        synced_count := synced_count + 1;
        RAISE NOTICE 'Utilisateur synchronisé: % (%)', auth_user_record.email, auth_user_record.id;
      ELSE
        error_count := error_count + 1;
        RAISE WARNING 'Erreur lors de la synchronisation de % (%): %', 
          auth_user_record.email, 
          auth_user_record.id, 
          sync_result->>'error';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE WARNING 'Exception lors de la synchronisation de % (%): %', 
          auth_user_record.email, 
          auth_user_record.id, 
          SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Synchronisation terminée: % utilisateurs synchronisés, % erreurs', synced_count, error_count;
END $$;

-- Vérifier le résultat
SELECT 
  COUNT(*) FILTER (WHERE pu.id IS NOT NULL) as users_synced,
  COUNT(*) FILTER (WHERE pu.id IS NULL) as users_not_synced,
  COUNT(*) as total_auth_users
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id;





