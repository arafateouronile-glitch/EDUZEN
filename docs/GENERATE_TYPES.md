---
title: Génération des types TypeScript
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Génération des types TypeScript

## Problème

Si vous obtenez l'erreur :
```
Your account does not have the necessary privileges to access this endpoint
```

Cela signifie que votre compte n'a pas les privilèges nécessaires pour utiliser l'API Supabase Management.

## Solutions

### Solution 1 : Utiliser la connexion directe à la base de données (Recommandé)

1. Récupérez votre `DATABASE_URL` depuis le dashboard Supabase :
   - Allez dans Settings > Database
   - Copiez la "Connection string" (URI) ou utilisez le format :
     ```
     postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
     ```

2. Définissez la variable d'environnement :
   ```bash
   export DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
   ```

3. Générez les types :
   ```bash
   npm run db:generate:db
   ```

### Solution 2 : Utiliser un Access Token Supabase

1. Créez un Access Token depuis le dashboard Supabase :
   - Allez dans Account Settings > Access Tokens
   - Créez un nouveau token avec les permissions nécessaires

2. Configurez l'access token :
   ```bash
   supabase login
   # Suivez les instructions pour vous connecter avec votre token
   ```

3. Générez les types :
   ```bash
   npm run db:generate
   ```

### Solution 3 : Générer les types depuis le Dashboard Supabase

1. Allez dans votre projet Supabase Dashboard
2. Allez dans Settings > API
3. Copiez le "Database types" TypeScript
4. Collez-le dans `types/database.types.ts`

### Solution 4 : Utiliser Supabase Local Development

Si vous avez configuré Supabase localement :

```bash
npm run db:generate:local
```

## Vérification

Après avoir généré les types, vérifiez que le fichier `types/database.types.ts` contient bien les types pour la table `session_programs` :

```typescript
session_programs: {
  Row: {
    id: string
    session_id: string
    program_id: string
    organization_id: string
    created_at: string
    updated_at: string
  }
  // ...
}
```---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

