---
title: Guide de déploiement de lEdge Function sync-user
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🚀 Guide de déploiement de l'Edge Function sync-user

Ce guide explique comment déployer l'Edge Function `sync-user` sur Supabase.

## 📋 Prérequis

1. **Supabase CLI installé** :
   ```bash
   npm install -g supabase
   # ou
   brew install supabase/tap/supabase
   ```

2. **Authentification avec Supabase** :
   ```bash
   supabase login
   ```

3. **Lier votre projet** :
   ```bash
   supabase link --project-ref votre-project-id
   ```
   
   Vous pouvez trouver votre `project-id` dans l'URL de votre projet Supabase :
   - URL : `https://ocdlaouymksskmmhmzdr.supabase.co`
   - Project ID : `ocdlaouymksskmmhmzdr`

## 🔧 Déploiement

### Option 1 : Déploiement direct (recommandé)

```bash
# Depuis la racine du projet
cd /Users/arafatetoure/Documents/EDUZEN

# Déployer la fonction
supabase functions deploy sync-user
```

### Option 2 : Déploiement avec variables d'environnement

Si vous avez besoin de variables d'environnement personnalisées :

```bash
# Créer un fichier .env.local (optionnel, les variables sont déjà configurées par Supabase)
supabase functions deploy sync-user --env-file .env.local
```

**Note** : Les variables `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont automatiquement injectées par Supabase lors du déploiement. Vous n'avez généralement pas besoin de les configurer manuellement.

## ✅ Vérification du déploiement

Après le déploiement, vous devriez voir :
```
Deploying function sync-user...
Function sync-user deployed successfully
```

Vous pouvez vérifier dans le dashboard Supabase :
1. Allez dans **Edge Functions** dans votre dashboard
2. Vous devriez voir `sync-user` dans la liste
3. Cliquez dessus pour voir les détails et les logs

## 🔗 Configuration du webhook

Une fois la fonction déployée, configurez le webhook :

1. **Dans le dashboard Supabase** :
   - Allez dans **Authentication** > **Webhooks**
   - Cliquez sur **Add Webhook**

2. **Configuration** :
   - **Name** : `sync-user-to-public`
   - **URL** : `https://ocdlaouymksskmmhmzdr.supabase.co/functions/v1/sync-user`
     (Remplacez `ocdlaouymksskmmhmzdr` par votre project ID)
   - **Events** : Cochez `user.created`
   - **HTTP Method** : `POST`
   - **HTTP Headers** : 
     ```
     Authorization: Bearer [VOTRE_SERVICE_ROLE_KEY]
     Content-Type: application/json
     ```
     Vous pouvez trouver votre `SERVICE_ROLE_KEY` dans **Settings** > **API** > **service_role key**

3. **Sauvegarder** le webhook

## 🧪 Tester la fonction

### Test 1 : Test manuel avec curl

```bash
curl -X POST \
  'https://ocdlaouymksskmmhmzdr.supabase.co/functions/v1/sync-user' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "INSERT",
    "record": {
      "id": "test-uuid",
      "email": "test@example.com",
      "raw_user_meta_data": {
        "full_name": "Test User",
        "role": "user"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  }'
```

### Test 2 : Créer un nouvel utilisateur

1. Créez un nouvel utilisateur via l'interface d'inscription
2. Vérifiez dans **Edge Functions** > **sync-user** > **Logs** que la fonction a été appelée
3. Vérifiez dans la table `public.users` que l'utilisateur a été créé

## 🔍 Dépannage

### Erreur : "Function not found"

- Vérifiez que la fonction est bien déployée : `supabase functions list`
- Vérifiez que vous êtes dans le bon projet : `supabase projects list`

### Erreur : "Unauthorized"

- Vérifiez que le `SERVICE_ROLE_KEY` est correct dans les headers du webhook
- Vérifiez que la clé n'a pas expiré

### La fonction ne se déclenche pas

1. Vérifiez que le webhook est activé dans **Authentication** > **Webhooks**
2. Vérifiez les logs de l'Edge Function
3. Vérifiez que l'URL du webhook est correcte
4. Testez manuellement avec curl pour voir si la fonction fonctionne

### Erreur de permissions dans les logs

- Vérifiez que la fonction `sync_user_from_auth` existe et a les bonnes permissions
- Vérifiez les politiques RLS sur la table `users`

## 📝 Mise à jour de la fonction

Pour mettre à jour la fonction après modification :

```bash
supabase functions deploy sync-user
```

## 🔄 Commandes utiles

```bash
# Lister toutes les fonctions déployées
supabase functions list

# Voir les logs de la fonction
supabase functions logs sync-user

# Supprimer la fonction (si nécessaire)
supabase functions delete sync-user
```---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

