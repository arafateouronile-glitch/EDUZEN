---
title: Configuration dun Auth Hook Supabase
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔗 Configuration d'un Auth Hook Supabase

## 📍 Accès au Dashboard

1. Allez sur : https://supabase.com/dashboard/project/ocdlaouymksskmmhmzdr
2. Navigation : **Authentication** → **Hooks**

## ⚙️ Configuration de l'Auth Hook

### Cliquez sur "Add hook" ou "Create an auth hook"

Remplissez les champs suivants :

#### 1. **Hook Type**
Sélectionnez :
- ✅ **HTTP Request Hook** (ou **HTTP Endpoint**)

#### 2. **Hook Name**
```
sync-user-to-public
```

#### 3. **Event**
Sélectionnez l'événement qui déclenche le hook :
- ✅ **User Created** (ou `user.created`)

#### 4. **HTTP Method**
```
POST
```

#### 5. **HTTP URL**
```
https://ocdlaouymksskmmhmzdr.supabase.co/functions/v1/sync-user
```

> 💡 Remplacez `ocdlaouymksskmmhmzdr` par votre project ID si différent

#### 6. **HTTP Headers**
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

#### 7. **Active**
✅ Cochez pour activer le hook

### Sauvegarder

Cliquez sur **Save** ou **Create Hook**

## ✅ Vérification

Après la création, vous devriez voir :
- Le hook `sync-user-to-public` dans la liste
- Statut : **Active** (vert)
- Event : `User Created` ou `user.created`

## 🧪 Test

1. Créez un nouvel utilisateur de test via l'interface d'inscription
2. Allez dans **Edge Functions** → **sync-user** → **Logs**
3. Vous devriez voir un appel récent avec le statut 200
4. Vérifiez dans **Table Editor** → **users** que l'utilisateur a été créé

## 🔍 Format des données envoyées

L'Auth Hook enverra automatiquement les données de l'utilisateur créé dans le body de la requête POST :

```json
{
  "type": "INSERT",
  "record": {
    "id": "uuid-de-l-utilisateur",
    "email": "user@example.com",
    "raw_user_meta_data": {
      "full_name": "Nom de l'utilisateur",
      "role": "user"
    },
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

Notre Edge Function `sync-user` est déjà configurée pour recevoir ce format.

## 🚨 Dépannage

### Le hook ne se déclenche pas
- Vérifiez que le hook est **Active**
- Vérifiez l'URL (doit pointer vers votre Edge Function)
- Vérifiez que le `SERVICE_ROLE_KEY` est correct dans les headers
- Consultez les logs de l'Edge Function dans **Edge Functions** → **sync-user** → **Logs**

### Erreur 401 Unauthorized
- Vérifiez que le `SERVICE_ROLE_KEY` est correct
- Vérifiez le format du header : `Bearer [KEY]` (avec un espace après Bearer)

### Erreur 404 Not Found
- Vérifiez que l'Edge Function est bien déployée
- Vérifiez l'URL du hook
- Testez l'URL directement dans votre navigateur (vous devriez voir une erreur CORS, ce qui est normal)

### Erreur 500 Internal Server Error
- Consultez les logs de l'Edge Function pour voir l'erreur détaillée
- Vérifiez que la fonction RPC `sync_user_from_auth` existe dans votre base de données

## 📝 Notes importantes

- Les Auth Hooks sont déclenchés **après** la création de l'utilisateur dans `auth.users`
- Si le hook échoue, l'utilisateur reste dans `auth.users` mais n'est pas synchronisé dans `public.users`
- En cas d'échec, vous pouvez utiliser la fonction RPC `sync_user_from_auth` comme fallback
- Les Auth Hooks peuvent avoir un délai de quelques secondes, c'est normal

## 🔄 Alternative : Postgres Function Hook

Si vous préférez utiliser une fonction Postgres au lieu d'un endpoint HTTP, vous pouvez créer un hook qui appelle directement la fonction RPC :

1. **Hook Type** : Postgres Function
2. **Function Name** : `sync_user_from_auth`
3. **Event** : User Created

Cependant, l'approche HTTP avec Edge Function est recommandée car elle offre plus de flexibilité et de logging.---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

