---
title: Guide  Appliquer les migrations du calendrier
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 📅 Guide : Appliquer les migrations du calendrier

## 🎯 Objectif

Appliquer les migrations nécessaires pour que le calendrier interne fonctionne correctement avec :
- Les tables pour les TODOs (tâches)
- La fonction RPC `get_calendar_events` pour récupérer les événements

## 📋 Migrations à appliquer

Vous devez appliquer **2 migrations** dans l'ordre :

1. **`20241204000003_create_calendar_todos.sql`** - Crée les tables
2. **`20241204000004_fix_calendar_events_overlap.sql`** - Crée/met à jour la fonction RPC

## 🚀 Étapes

### Étape 1 : Ouvrir le SQL Editor dans Supabase

1. Connectez-vous à votre [dashboard Supabase](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** (menu de gauche)
4. Cliquez sur **New query**

### Étape 2 : Appliquer la première migration (Tables)

1. Ouvrez le fichier : `supabase/migrations/20241204000003_create_calendar_todos.sql`
2. **Copiez TOUT le contenu** du fichier
3. Collez-le dans le SQL Editor de Supabase
4. Cliquez sur **Run** (ou `Cmd/Ctrl + Enter`)
5. Vérifiez qu'il n'y a **aucune erreur** dans les résultats

**✅ Résultat attendu :** 
- Les tables suivantes sont créées :
  - `calendar_todos`
  - `calendar_notifications`
  - `calendar_user_preferences`
- Les politiques RLS sont créées
- Les index sont créés

### Étape 3 : Appliquer la deuxième migration (Fonction RPC)

1. Ouvrez le fichier : `supabase/migrations/20241204000004_fix_calendar_events_overlap.sql`
2. **Copiez TOUT le contenu** du fichier
3. Collez-le dans le SQL Editor de Supabase (nouvelle requête ou remplacez la précédente)
4. Cliquez sur **Run** (ou `Cmd/Ctrl + Enter`)
5. Vérifiez qu'il n'y a **aucune erreur** dans les résultats

**✅ Résultat attendu :**
- La fonction `get_calendar_events` est créée ou mise à jour
- La fonction retourne les sessions, formations et TODOs qui chevauchent la période demandée

### Étape 4 : Vérifier que tout fonctionne

Exécutez cette requête de test dans le SQL Editor :

```sql
-- Vérifier que les tables existent
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('calendar_todos', 'calendar_notifications', 'calendar_user_preferences')
ORDER BY table_name;
```

**Résultat attendu :** 3 lignes (une pour chaque table)

```sql
-- Vérifier que la fonction RPC existe
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_calendar_events';
```

**Résultat attendu :** 1 ligne avec `routine_name = 'get_calendar_events'`

### Étape 5 : Tester la fonction RPC (optionnel)

Pour tester la fonction avec vos données :

```sql
-- Remplacer par votre organization_id
SELECT * FROM get_calendar_events(
  '4d27f507-280c-4e55-8a48-6b9840e13f8a'::UUID,  -- Votre organization_id
  CURRENT_DATE - INTERVAL '1 month',              -- start_date
  CURRENT_DATE + INTERVAL '2 months',             -- end_date
  NULL::UUID                                       -- user_id (optionnel)
);
```

**Résultat attendu :** Une liste d'événements (sessions, formations, TODOs)

## ⚠️ En cas d'erreur

### Erreur : "relation already exists"
- **Cause :** Les tables existent déjà
- **Solution :** C'est normal, la migration utilise `CREATE TABLE IF NOT EXISTS`, donc elle est idempotente

### Erreur : "function already exists"
- **Cause :** La fonction existe déjà
- **Solution :** C'est normal, la migration utilise `CREATE OR REPLACE FUNCTION`, donc elle met à jour la fonction existante

### Erreur : "permission denied"
- **Cause :** Vous n'avez pas les permissions nécessaires
- **Solution :** Vérifiez que vous êtes connecté avec un compte ayant les droits d'administration sur le projet Supabase

### Erreur : "column does not exist"
- **Cause :** Une table référencée n'existe pas (ex: `sessions`, `formations`)
- **Solution :** Assurez-vous que toutes les migrations précédentes ont été appliquées

## 🔄 Après l'application

1. **Rafraîchissez** votre application (`Cmd/Ctrl + Shift + R`)
2. **Allez sur la page Calendrier** : `/dashboard/calendar`
3. **Vérifiez** que les événements s'affichent correctement

## 📝 Notes

- Les migrations sont **idempotentes** : vous pouvez les exécuter plusieurs fois sans problème
- Si vous avez déjà appliqué une migration, elle sera simplement mise à jour
- La fonction RPC `get_calendar_events` est utilisée en priorité, mais le code a un **fallback manuel** si la fonction n'existe pas encore

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans la console du navigateur
2. Vérifiez les logs dans Supabase Dashboard > Logs > Postgres Logs
3. Vérifiez que toutes les migrations précédentes ont été appliquées---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.