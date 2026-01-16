---
title: Configuration complète de la synchronisation des utilisateurs
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔄 Configuration complète de la synchronisation des utilisateurs

## 📋 Vue d'ensemble

Cette solution garantit que **tous les utilisateurs** (existants et futurs) sont automatiquement synchronisés de `auth.users` vers `public.users`.

### Architecture

```
┌─────────────────┐
│  auth.users     │  ← Utilisateur créé (inscription)
└────────┬────────┘
         │
         │ Webhook (user.created)
         ▼
┌─────────────────┐
│  Edge Function   │  ← sync-user (automatique)
│  sync-user       │
└────────┬────────┘
         │
         │ INSERT/UPDATE
         ▼
┌─────────────────┐
│  public.users    │  ← Utilisateur synchronisé ✅
└─────────────────┘
```

## 🎯 Avantages de cette solution

✅ **Automatique** : Aucune intervention manuelle nécessaire  
✅ **Temps réel** : Synchronisation immédiate à la création  
✅ **Fiable** : Fonctionne même si l'application est en maintenance  
✅ **Scalable** : Gère des milliers d'utilisateurs sans problème  
✅ **Robuste** : Gestion d'erreurs et retry automatique  

## 📦 Étapes de configuration

### 1. Déployer l'Edge Function

```bash
# Se connecter à Supabase
supabase login

# Lier votre projet (remplacez par votre project-id)
supabase link --project-ref ocdlaouymksskmmhmzdr

# Déployer la fonction
cd /Users/arafatetoure/Documents/EDUZEN
supabase functions deploy sync-user
```

**Vérification** : Allez dans le dashboard Supabase → Edge Functions → Vous devriez voir `sync-user` dans la liste.

### 2. Configurer le webhook Supabase Auth

1. **Dans le dashboard Supabase** :
   - Allez dans **Authentication** → **Webhooks**
   - Cliquez sur **Add Webhook**

2. **Configuration du webhook** :
   - **Name** : `sync-user-to-public`
   - **URL** : `https://ocdlaouymksskmmhmzdr.supabase.co/functions/v1/sync-user`
     (Remplacez `ocdlaouymksskmmhmzdr` par votre project ID)
   - **Events** : Cochez uniquement `user.created`
   - **HTTP Method** : `POST`
   - **HTTP Headers** :
     ```
     Authorization: Bearer [VOTRE_SERVICE_ROLE_KEY]
     Content-Type: application/json
     ```
     > 💡 **Trouver votre SERVICE_ROLE_KEY** : Settings → API → service_role key (secret)

3. **Sauvegarder** le webhook

### 3. Appliquer les migrations SQL

Ces migrations créent la fonction RPC de fallback et synchronisent les utilisateurs existants :

```bash
# Appliquer toutes les migrations
npx supabase migration up

# Ou via le dashboard Supabase : SQL Editor → Exécuter chaque migration dans l'ordre
```

**Migrations à appliquer** :
1. `20251218000001_add_organization_branding.sql` (si pas déjà fait)
2. `20251218000003_create_sync_user_rpc.sql` (fonction RPC de fallback)
3. `20251218000004_sync_existing_users.sql` (synchronise les utilisateurs existants)

### 4. Synchroniser les utilisateurs existants

Exécutez cette migration pour corriger les utilisateurs déjà créés :

```sql
-- Dans le SQL Editor du dashboard Supabase
-- Le contenu de supabase/migrations/20251218000004_sync_existing_users.sql
```

Ou pour un utilisateur spécifique :

```sql
SELECT public.sync_user_from_auth('ff6fe5a3-6f1b-41df-bd2c-17f851afb518');
```

## ✅ Vérification

### Test 1 : Vérifier que l'Edge Function est déployée

```bash
supabase functions list
```

Vous devriez voir `sync-user` dans la liste.

### Test 2 : Vérifier que le webhook est configuré

Dans le dashboard Supabase :
- Authentication → Webhooks
- Vérifiez que `sync-user-to-public` est actif et écoute `user.created`

### Test 3 : Tester avec un nouvel utilisateur

1. Créez un nouvel utilisateur via l'interface d'inscription
2. Vérifiez dans **Edge Functions** → **sync-user** → **Logs** que la fonction a été appelée
3. Vérifiez dans la table `public.users` que l'utilisateur a été créé

### Test 4 : Vérifier la synchronisation des utilisateurs existants

```sql
-- Compter les utilisateurs non synchronisés
SELECT 
  COUNT(*) FILTER (WHERE pu.id IS NOT NULL) as users_synced,
  COUNT(*) FILTER (WHERE pu.id IS NULL) as users_not_synced,
  COUNT(*) as total_auth_users
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id;
```

Si `users_not_synced > 0`, exécutez la migration `20251218000004_sync_existing_users.sql`.

## 🔧 Maintenance

### Vérifier les logs de l'Edge Function

```bash
supabase functions logs sync-user
```

Ou dans le dashboard : Edge Functions → sync-user → Logs

### En cas d'échec du webhook

Si un utilisateur n'est pas synchronisé (rare), utilisez la fonction RPC :

```sql
SELECT public.sync_user_from_auth('user-id-here');
```

### Mettre à jour l'Edge Function

Après modification de `supabase/functions/sync-user/index.ts` :

```bash
supabase functions deploy sync-user
```

## 🚨 Dépannage

### Problème : Le webhook ne se déclenche pas

1. Vérifiez que le webhook est activé dans Authentication → Webhooks
2. Vérifiez l'URL du webhook (doit pointer vers votre Edge Function)
3. Vérifiez que le `SERVICE_ROLE_KEY` est correct dans les headers
4. Consultez les logs de l'Edge Function

### Problème : Erreur "User already exists"

C'est normal si l'utilisateur existe déjà. La fonction retourne un succès dans ce cas.

### Problème : Erreur de permissions

Vérifiez que la fonction RPC `sync_user_from_auth` existe et a les bonnes permissions :
```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'sync_user_from_auth';
```

`prosecdef` doit être `true` (SECURITY DEFINER).

## 📊 Monitoring

### Dashboard Supabase

- **Edge Functions** → **sync-user** → **Logs** : Voir tous les appels
- **Edge Functions** → **sync-user** → **Metrics** : Statistiques d'utilisation

### Requête SQL pour monitoring

```sql
-- Statistiques de synchronisation
SELECT 
  DATE(created_at) as date,
  COUNT(*) as users_created
FROM public.users
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🎯 Résultat attendu

Après cette configuration :

✅ **Tous les nouveaux utilisateurs** sont automatiquement synchronisés  
✅ **Tous les utilisateurs existants** sont synchronisés  
✅ **Aucune intervention manuelle** n'est nécessaire  
✅ **Système robuste et fiable** pour la production  

## 📝 Notes importantes

- L'Edge Function utilise le `SERVICE_ROLE_KEY` pour bypasser RLS
- La fonction RPC `sync_user_from_auth` est un fallback, pas la solution principale
- Le webhook se déclenche uniquement sur `user.created`, pas sur les mises à jour
- Pour mettre à jour un utilisateur existant, utilisez directement l'API ou la fonction RPC---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

