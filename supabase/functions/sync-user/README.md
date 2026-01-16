---
title: Edge Function sync-user
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Edge Function: sync-user

Cette Edge Function synchronise automatiquement les utilisateurs de `auth.users` vers `public.users` lorsqu'un nouvel utilisateur s'inscrit.

## Déploiement

```bash
# Déployer la fonction
supabase functions deploy sync-user

# Avec des variables d'environnement personnalisées (optionnel)
supabase functions deploy sync-user --env-file .env.local
```

## Configuration

Les variables d'environnement suivantes sont nécessaires (configurées automatiquement par Supabase) :
- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé de service role (permissions élevées)

## Utilisation

Cette fonction est appelée automatiquement par un webhook Supabase Auth configuré dans le dashboard.

### Configuration du webhook

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

## Format de la requête

Le webhook envoie une requête POST avec le format suivant :

```json
{
  "type": "INSERT",
  "record": {
    "id": "uuid",
    "email": "user@example.com",
    "raw_user_meta_data": {
      "full_name": "John Doe",
      "role": "admin"
    },
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

## Réponse

### Succès (200)
```json
{
  "message": "User synced successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "admin"
  }
}
```

### Erreur (400/500)
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Logs

Les logs sont disponibles dans **Edge Functions** > **sync-user** > **Logs** dans le dashboard Supabase.

## Dépannage

### La fonction ne reçoit pas les requêtes

1. Vérifiez que le webhook est activé dans **Authentication** > **Webhooks**
2. Vérifiez que l'URL du webhook est correcte
3. Vérifiez les logs de l'Edge Function

### Erreur de permissions

Assurez-vous que le `SERVICE_ROLE_KEY` est correct et a les permissions nécessaires pour :
- Lire depuis `auth.users`
- Insérer dans `public.users`

### L'utilisateur n'est pas créé

1. Vérifiez les logs de l'Edge Function pour voir l'erreur exacte
2. Vérifiez les politiques RLS sur la table `users`
3. Vérifiez que la fonction `sync_user_from_auth` existe et fonctionne---

**Document EDUZEN** | [Retour à la documentation principale](../../../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

