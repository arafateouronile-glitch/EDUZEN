---
title: Configuration dun Auth Hook Postgres (Recommandé)
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔗 Configuration d'un Auth Hook Postgres (Recommandé)

## 📍 Accès au Dashboard

1. Allez sur : https://supabase.com/dashboard/project/ocdlaouymksskmmhmzdr
2. Navigation : **Authentication** → **Hooks**
3. Cliquez sur **"Add a new hook"**

## ⚙️ Configuration de l'Auth Hook Postgres

### Option 1 : Utiliser "before user created hook" (Recommandé)

Même si c'est "before", nous allons utiliser une fonction Postgres qui sera exécutée et qui synchronisera l'utilisateur une fois qu'il sera créé dans `auth.users`.

#### Étapes :

1. **Sélectionnez** : **"before user created hook"** (ou similaire)

2. **Hook Type** : Sélectionnez **"Postgres Function"** ou **"Database Function"**

3. **Function Name** : 
   ```
   sync_user_on_create
   ```

4. **Active** : ✅ Cochez pour activer

5. **Sauvegardez**

> ⚠️ **Note** : Si "before user created" ne fonctionne pas (car l'utilisateur n'existe pas encore), utilisez l'Option 2 ci-dessous.

### Option 2 : Utiliser un Hook HTTP (Alternative)

Si les hooks Postgres ne sont pas disponibles ou ne fonctionnent pas :

1. **Sélectionnez** : **"HTTP Request Hook"** ou **"HTTP Endpoint"**

2. **Hook Name** : `sync-user-to-public`

3. **Event** : Si disponible, sélectionnez **"after user created"** ou **"user.created"**
   - Si seulement "before" est disponible, cette option ne fonctionnera pas correctement

4. **HTTP URL** :
   ```
   https://ocdlaouymksskmmhmzdr.supabase.co/functions/v1/sync-user
   ```

5. **HTTP Method** : `POST`

6. **HTTP Headers** :
   - `Authorization: Bearer [VOTRE_SERVICE_ROLE_KEY]`
   - `Content-Type: application/json`

7. **Active** : ✅

## 🔧 Solution Alternative : Trigger PostgreSQL (Si disponible)

Si vous avez accès aux permissions superuser (rare dans Supabase), vous pouvez créer un trigger directement sur `auth.users` :

```sql
-- ATTENTION: Nécessite des permissions superuser
-- Généralement non disponible dans Supabase Cloud

CREATE TRIGGER sync_user_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
```

## ✅ Vérification

1. **Appliquer la migration** :
   ```bash
   npx supabase migration up
   ```
   
   Ou exécutez le contenu de `supabase/migrations/20251218000005_create_auth_hook_function.sql` dans le SQL Editor.

2. **Tester** :
   - Créez un nouvel utilisateur de test
   - Vérifiez dans **Table Editor** → **users** que l'utilisateur a été créé
   - Vérifiez les logs dans **Database** → **Logs** (si disponibles)

## 🚨 Dépannage

### Le hook Postgres ne fonctionne pas

Si "before user created" ne fonctionne pas car l'utilisateur n'existe pas encore :

1. **Utilisez l'Edge Function avec un délai** : Modifiez l'Edge Function pour qu'elle attende quelques secondes avant de synchroniser
2. **Utilisez un cron job** : Créez un job qui synchronise périodiquement les utilisateurs non synchronisés
3. **Synchronisation côté client** : Ajoutez une vérification dans votre application qui synchronise l'utilisateur s'il n'existe pas dans `public.users`

### La fonction n'existe pas

Assurez-vous d'avoir appliqué la migration :
```sql
-- Vérifier que la fonction existe
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'sync_user_on_create';
```

### Erreur de permissions

Vérifiez que la fonction a `SECURITY DEFINER` :
```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'sync_user_on_create';
```

`prosecdef` doit être `true`.

## 📝 Solution Recommandée Finale

Comme les hooks "before" ne peuvent pas accéder à l'utilisateur qui n'existe pas encore, la **meilleure solution** est :

1. **Utiliser l'Edge Function avec un webhook externe** (si Supabase le supporte)
2. **Ou synchroniser côté client** : Ajoutez une vérification dans votre application qui synchronise automatiquement l'utilisateur lors de la première connexion s'il n'existe pas dans `public.users`

Je vais créer cette solution côté client pour vous.---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

