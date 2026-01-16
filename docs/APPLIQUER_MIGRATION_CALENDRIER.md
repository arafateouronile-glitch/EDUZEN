---
title: Application des Migrations Calendrier
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔧 Application des Migrations Calendrier

## Problème

Les erreurs `404 (Not Found)` ou `400 (Bad Request)` dans la console indiquent que :
- Les tables du calendrier n'existent pas encore dans Supabase :
  - `calendar_todos` ❌
  - `calendar_notifications` ❌
  - `calendar_user_preferences` ❌
- La fonction RPC `get_calendar_events` n'existe pas ou est incorrecte ❌

## Solution : Appliquer les 2 Migrations SQL

### Option 1 : Via le Dashboard Supabase (Recommandé)

1. **Ouvrir le Dashboard Supabase**
   - Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Sélectionnez votre projet

2. **Ouvrir l'éditeur SQL**
   - Cliquez sur **"SQL Editor"** dans le menu de gauche
   - Cliquez sur **"New query"**

3. **Migration 1 : Créer les tables du calendrier**
   - Ouvrez le fichier : `supabase/migrations/20241204000003_create_calendar_todos.sql`
   - Copiez **tout le contenu** du fichier
   - Collez-le dans l'éditeur SQL
   - Cliquez sur **"Run"** (ou `Cmd/Ctrl + Enter`)
   - ✅ Vous devriez voir : "Success. No rows returned"

4. **Migration 2 : Créer/Corriger la fonction RPC**
   - Ouvrez le fichier : `supabase/migrations/20241204000004_fix_calendar_events_overlap.sql`
   - Copiez **tout le contenu** du fichier
   - Collez-le dans l'éditeur SQL (nouvelle requête ou remplacez la précédente)
   - Cliquez sur **"Run"** (ou `Cmd/Ctrl + Enter`)
   - ✅ Vous devriez voir : "Success. No rows returned"

5. **Vérifier le succès**
   - Dans le **Table Editor**, vous devriez voir :
     - ✅ `calendar_todos`
     - ✅ `calendar_notifications`
     - ✅ `calendar_user_preferences`
   - Dans le **SQL Editor**, testez la fonction :
     ```sql
     SELECT * FROM get_calendar_events(
       'votre-organization-id'::uuid,
       '2024-12-01'::date,
       '2024-12-31'::date,
       NULL
     );
     ```

### Option 2 : Via Supabase CLI

```bash
# Si vous avez Supabase CLI configuré
cd /Users/arafatetoure/Documents/EDUZEN
npx supabase db push --linked
```

**Note** : Cette commande nécessite d'être authentifié (`supabase login`).

## Vérification

Après avoir appliqué la migration, vérifiez que les tables existent :

1. Dans le Dashboard Supabase, allez dans **"Table Editor"**
2. Vous devriez voir :
   - ✅ `calendar_todos`
   - ✅ `calendar_notifications`
   - ✅ `calendar_user_preferences`

## Après la Migration

Une fois la migration appliquée :

1. **Régénérer les types TypeScript** (optionnel mais recommandé) :
   ```bash
   npx supabase gen types typescript --linked > types/database.types.ts
   ```

2. **Recharger l'application**
   - Les erreurs 404 devraient disparaître
   - Le calendrier devrait fonctionner normalement

## Gestion d'Erreur Temporaire

En attendant l'application de la migration, le code a été amélioré pour :
- ✅ Retourner des tableaux vides au lieu de lancer des erreurs
- ✅ Afficher des warnings dans la console au lieu d'erreurs
- ✅ Permettre à l'application de fonctionner (sans données calendrier)

Les erreurs 404 continueront d'apparaître dans la console jusqu'à ce que la migration soit appliquée, mais elles ne casseront plus l'application.

## Fichier de Migration

📄 **Fichier** : `supabase/migrations/20241204000003_create_calendar_todos.sql`

Ce fichier contient :
- Création des 3 tables
- Index pour les performances
- Triggers pour `updated_at` et `completed_at`
- Politiques RLS (Row Level Security)
- Fonction RPC `get_calendar_events`
- Fonction `create_todo_reminder_notification`

---

**Une fois la migration appliquée, le calendrier sera pleinement fonctionnel !** 🎉---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.