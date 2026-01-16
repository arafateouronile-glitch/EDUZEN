---
title: Configuration Supabase - Service Role Key
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Configuration Supabase - Service Role Key

## Problème
L'erreur "Configuration serveur manquante" signifie que la variable `SUPABASE_SERVICE_ROLE_KEY` n'est pas définie.

## Solution

### 1. Trouver votre Service Role Key dans Supabase

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans **Settings** → **API**
4. Dans la section **Project API keys**, trouvez la **`service_role` key** (⚠️ SECRET - ne jamais exposer côté client)

### 2. Ajouter la variable dans votre fichier `.env.local`

Créez ou modifiez le fichier `.env.local` à la racine du projet :

```bash
# .env.local

# Variables Supabase (déjà existantes)
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key

# ⚠️ IMPORTANT : Ajoutez cette ligne avec votre Service Role Key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key_ici
```

### 3. Redémarrer le serveur Next.js

⚠️ **OBLIGATOIRE** : Après avoir ajouté/modifié `.env.local`, vous DEVEZ redémarrer le serveur :

```bash
# Arrêter le serveur (Ctrl+C)
# Puis redémarrer
npm run dev
# ou
PORT=3001 npm run dev
```

### 4. Vérifier que la variable est bien chargée

Les variables d'environnement dans Next.js ne sont accessibles qu'après redémarrage. Si vous avez déjà le serveur qui tourne, **arrêtez-le complètement et redémarrez-le**.

## Important

- ✅ `SUPABASE_SERVICE_ROLE_KEY` est utilisée uniquement côté serveur (API routes)
- ✅ Elle permet de contourner les RLS (Row Level Security) pour des opérations administrateur
- ⚠️ **NE JAMAIS** exposer cette clé côté client
- ⚠️ **NE JAMAIS** commiter cette clé dans Git (le fichier `.env.local` est normalement dans `.gitignore`)

## Vérification

Une fois configuré et le serveur redémarré, testez à nouveau le lien d'accès direct. L'erreur "Configuration serveur manquante" devrait disparaître.---

**Document EDUZEN** | [Retour à la documentation principale](README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.