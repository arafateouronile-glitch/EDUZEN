---
title: Configuration de la synchronisation automatique des utilisateurs
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔄 Configuration de la synchronisation automatique des utilisateurs

Ce guide explique comment configurer la synchronisation automatique des utilisateurs de `auth.users` vers `public.users` de manière permanente.

## 📋 Vue d'ensemble

La solution utilise :
1. **Une Edge Function Supabase** qui écoute les événements d'inscription
2. **Un webhook Supabase Auth** qui déclenche la fonction
3. **Une fonction RPC SQL** comme fallback
4. **Un mécanisme côté client** pour les cas où le webhook échoue

## 🚀 Installation

### Étape 1 : Déployer l'Edge Function

1. **Déployer la fonction** :
```bash
supabase functions deploy sync-user
```

2. **Configurer les secrets** (si nécessaire) :
```bash
supabase secrets set SUPABASE_URL=your-project-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Étape 2 : Configurer le webhook dans Supabase Dashboard

1. Allez dans **Authentication** > **Webhooks** dans votre dashboard Supabase
2. Cliquez sur **Add Webhook**
3. Configurez :
   - **Name** : `sync-user-to-public`
   - **URL** : `https://[votre-project-id].supabase.co/functions/v1/sync-user`
   - **Events** : Sélectionnez `user.created`
   - **HTTP Method** : `POST`
   - **HTTP Headers** : 
     ```
     Authorization: Bearer [VOTRE_SERVICE_ROLE_KEY]
     Content-Type: application/json
     ```

### Étape 3 : Appliquer la migration SQL

Exécutez la migration dans le SQL Editor de Supabase :
```sql
-- Le fichier: supabase/migrations/20251218000003_create_sync_user_rpc.sql
```

Cette migration crée la fonction `sync_user_from_auth()` qui peut être utilisée comme fallback.

### Étape 4 : Synchroniser les utilisateurs existants

Exécutez ce script dans le SQL Editor pour synchroniser les utilisateurs existants :

```sql
-- Synchroniser tous les utilisateurs existants
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
    -- Utiliser la fonction RPC
    PERFORM public.sync_user_from_auth(auth_user_record.id);
    synced_count := synced_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Nombre d''utilisateurs synchronisés: %', synced_count;
END $$;
```

## 🔧 Fallback côté client

Si le webhook échoue, le code d'inscription dans `lib/hooks/use-auth.ts` crée déjà l'utilisateur dans `public.users`. Cette approche fonctionne mais nécessite que l'utilisateur passe par le processus d'inscription de l'application.

## 🧪 Tester la solution

### Test 1 : Créer un nouvel utilisateur

1. Créez un nouvel utilisateur via l'interface d'inscription
2. Vérifiez dans le dashboard Supabase que l'utilisateur apparaît dans `public.users`
3. Vérifiez les logs de l'Edge Function dans **Edge Functions** > **sync-user** > **Logs**

### Test 2 : Synchroniser un utilisateur existant

Exécutez dans le SQL Editor :
```sql
SELECT public.sync_user_from_auth('ff6fe5a3-6f1b-41df-bd2c-17f851afb518'::uuid);
```

## 🔍 Dépannage

### Le webhook ne se déclenche pas

1. Vérifiez que le webhook est activé dans **Authentication** > **Webhooks**
2. Vérifiez les logs de l'Edge Function
3. Vérifiez que l'URL du webhook est correcte
4. Vérifiez que le `SERVICE_ROLE_KEY` est correct

### L'utilisateur n'est pas créé dans public.users

1. Vérifiez les logs de l'Edge Function
2. Vérifiez les politiques RLS sur la table `users`
3. Essayez d'appeler manuellement la fonction RPC :
   ```sql
   SELECT public.sync_user_from_auth('user-id-here'::uuid);
   ```

### Erreur de permissions

Si vous obtenez une erreur de permissions, assurez-vous que :
1. La fonction `sync_user_from_auth` a `SECURITY DEFINER`
2. Les permissions sont accordées : `GRANT EXECUTE ON FUNCTION ... TO service_role;`

## 📝 Notes importantes

- **Sécurité** : La fonction utilise `SECURITY DEFINER` pour bypass RLS, ce qui est nécessaire pour accéder à `auth.users`
- **Performance** : Le webhook est asynchrone et ne bloque pas l'inscription
- **Fiabilité** : Le fallback côté client garantit que l'utilisateur sera créé même si le webhook échoue
- **Maintenance** : Surveillez les logs de l'Edge Function pour détecter les problèmes

## 🔄 Mise à jour

Pour mettre à jour l'Edge Function :
```bash
supabase functions deploy sync-user
```

Pour mettre à jour la fonction SQL, exécutez simplement la migration à nouveau (elle utilise `CREATE OR REPLACE`).---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

