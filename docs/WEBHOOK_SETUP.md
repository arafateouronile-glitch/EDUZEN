---
title: Configuration du Webhook Supabase Auth
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔗 Configuration du Webhook Supabase Auth

## 📍 Accès au Dashboard

1. Allez sur : https://supabase.com/dashboard/project/ocdlaouymksskmmhmzdr
2. Navigation : **Authentication** → **Webhooks**

## ⚙️ Configuration du Webhook

### Cliquez sur "Add Webhook" ou "Create Webhook"

Remplissez les champs suivants :

#### 1. **Name**
```
sync-user-to-public
```

#### 2. **URL**
```
https://ocdlaouymksskmmhmzdr.supabase.co/functions/v1/sync-user
```

#### 3. **Events**
Cochez uniquement :
- ✅ `user.created`

#### 4. **HTTP Method**
```
POST
```

#### 5. **HTTP Headers**
Cliquez sur "Add Header" et ajoutez :

**Header 1 :**
- Key: `Authorization`
- Value: `Bearer [VOTRE_SERVICE_ROLE_KEY]`

**Header 2 :**
- Key: `Content-Type`
- Value: `application/json`

> 🔑 **Trouver votre SERVICE_ROLE_KEY** :
> 1. Allez dans **Settings** → **API**
> 2. Copiez la clé **service_role** (celle qui est marquée comme "secret")
> 3. Remplacez `[VOTRE_SERVICE_ROLE_KEY]` dans le header Authorization

#### 6. **Active**
✅ Cochez pour activer le webhook

### Sauvegarder

Cliquez sur **Save** ou **Create Webhook**

## ✅ Vérification

Après la création, vous devriez voir :
- Le webhook `sync-user-to-public` dans la liste
- Statut : **Active** (vert)
- Event : `user.created`

## 🧪 Test

1. Créez un nouvel utilisateur de test via l'interface d'inscription
2. Allez dans **Edge Functions** → **sync-user** → **Logs**
3. Vous devriez voir un appel récent avec le statut 200
4. Vérifiez dans **Table Editor** → **users** que l'utilisateur a été créé

## 🚨 Dépannage

### Le webhook ne se déclenche pas
- Vérifiez que le webhook est **Active**
- Vérifiez l'URL (doit pointer vers votre Edge Function)
- Vérifiez que le `SERVICE_ROLE_KEY` est correct dans les headers
- Consultez les logs de l'Edge Function

### Erreur 401 Unauthorized
- Vérifiez que le `SERVICE_ROLE_KEY` est correct
- Vérifiez le format du header : `Bearer [KEY]` (avec un espace après Bearer)

### Erreur 404 Not Found
- Vérifiez que l'Edge Function est bien déployée
- Vérifiez l'URL du webhook---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

