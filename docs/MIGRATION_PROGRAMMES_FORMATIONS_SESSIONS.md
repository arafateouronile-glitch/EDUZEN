---
title: Guide de Migration  Distinction Programmes Formations et Sessions
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Guide de Migration : Distinction Programmes, Formations et Sessions

Ce guide vous explique étape par étape comment exécuter la migration pour distinguer les **Programmes**, **Formations** et **Sessions** dans la plateforme eduzen.

## 📋 Structure finale

```
Programme (ex: "Programme de formation continue")
  └── Formation (ex: "Formation Excel avancé")
       └── Session (ex: "Session Hiver 2024")
```

## ⚠️ IMPORTANT : Sauvegarde avant migration

**AVANT de commencer, créez une sauvegarde de votre base de données Supabase !**

1. Allez dans Supabase Dashboard > Settings > Database
2. Cliquez sur "Backup" ou utilisez pg_dump
3. Sauvegardez également vos données critiques

## 🔄 Étapes de migration

### ÉTAPE 1 : Vérifier l'état actuel

Avant de commencer, vérifiez quelles tables existent déjà :

```sql
-- Exécutez dans le SQL Editor de Supabase
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('programs', 'program_sessions', 'formations', 'sessions')
ORDER BY table_name;
```

**Notez quelles tables existent déjà.**

### ÉTAPE 2 : Vérifier les données existantes

Vérifiez combien d'enregistrements vous avez :

```sql
-- Compter les programmes actuels (qui deviendront des formations)
SELECT COUNT(*) as nombre_programmes FROM public.programs;

-- Compter les sessions actuelles
SELECT COUNT(*) as nombre_sessions FROM public.program_sessions;

-- Vérifier les inscriptions
SELECT COUNT(*) as nombre_inscriptions FROM public.enrollments;
```

**Notez ces nombres pour vérifier après la migration.**

### ÉTAPE 3 : Vérifier les contraintes de clé étrangère

Vérifiez les contraintes FK qui pointent vers `program_sessions` :

```sql
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'program_sessions';
```

**Notez toutes les contraintes trouvées.**

### ÉTAPE 4 : Exécuter la migration

1. **Ouvrez le SQL Editor dans Supabase**
   - Allez dans Supabase Dashboard
   - Cliquez sur "SQL Editor" dans le menu de gauche
   - Cliquez sur "New query"

2. **Copiez le contenu complet de la migration**
   - Ouvrez le fichier : `supabase/migrations/20241115000001_restructure_programs_formations_sessions.sql`
   - Copiez TOUT le contenu (Ctrl+A puis Ctrl+C)

3. **Collez dans le SQL Editor**
   - Collez le contenu dans le SQL Editor
   - Vérifiez qu'il n'y a pas d'erreur de syntaxe

4. **Exécutez la migration**
   - Cliquez sur "Run" ou appuyez sur Ctrl+Enter
   - **ATTENTION** : Cette migration peut prendre plusieurs minutes selon la quantité de données

5. **Surveillez les messages**
   - Les messages `RAISE NOTICE` apparaîtront dans la console
   - Notez tous les messages importants

### ÉTAPE 5 : Vérifier la migration

Après l'exécution, vérifiez que tout s'est bien passé :

```sql
-- 1. Vérifier que les nouvelles tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('programs', 'formations', 'sessions')
ORDER BY table_name;

-- 2. Vérifier le nombre de formations migrées
SELECT COUNT(*) as nombre_formations FROM public.formations;

-- 3. Vérifier le nombre de sessions migrées
SELECT COUNT(*) as nombre_sessions FROM public.sessions;

-- 4. Vérifier que les colonnes ont été renommées
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'enrollments' 
  AND column_name IN ('program_session_id', 'session_id');

-- 5. Vérifier les contraintes FK sur sessions
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.table_name IN ('enrollments', 'attendance', 'grades')
  AND kcu.column_name = 'session_id';
```

### ÉTAPE 6 : Vérifier les données

Vérifiez que les données ont été correctement migrées :

```sql
-- Comparer le nombre de formations avec l'ancien nombre de programmes
SELECT 
  (SELECT COUNT(*) FROM public.formations) as formations_nouveau,
  (SELECT COUNT(*) FROM public.program_sessions) as sessions_ancien,
  (SELECT COUNT(*) FROM public.sessions) as sessions_nouveau;

-- Vérifier quelques formations
SELECT id, code, name, program_id, organization_id 
FROM public.formations 
LIMIT 5;

-- Vérifier quelques sessions
SELECT id, name, formation_id, start_date, end_date 
FROM public.sessions 
LIMIT 5;

-- Vérifier les inscriptions
SELECT 
  e.id,
  e.session_id,
  s.name as session_name,
  f.name as formation_name
FROM enrollments e
LEFT JOIN sessions s ON s.id = e.session_id
LEFT JOIN formations f ON f.id = s.formation_id
LIMIT 5;
```

### ÉTAPE 7 : Nettoyer (optionnel)

Une fois que vous avez vérifié que tout fonctionne correctement, vous pouvez supprimer les tables temporaires :

```sql
-- ATTENTION : Ne faites ceci QUE si tout est vérifié !
-- D'abord, vérifiez que formations_temp n'est plus nécessaire
SELECT COUNT(*) as reste_dans_temp FROM public.formations_temp;

-- Si le compte est 0 ou que toutes les données sont dans formations
-- Vous pouvez supprimer formations_temp
-- DROP TABLE IF EXISTS public.formations_temp CASCADE;
```

## ✅ Vérifications finales

Après la migration, vérifiez que :

1. ✅ La table `programs` existe (nouvelle, pour les vrais programmes)
2. ✅ La table `formations` existe et contient vos anciens programmes
3. ✅ La table `sessions` existe et contient vos anciennes sessions
4. ✅ Les colonnes `enrollments.session_id` et `attendance.session_id` existent
5. ✅ Les contraintes FK pointent vers `sessions` et non `program_sessions`
6. ✅ Les politiques RLS fonctionnent correctement

## 🚨 En cas d'erreur

Si vous rencontrez une erreur :

1. **N'interrompez PAS la migration** - laissez-la se terminer
2. **Notez l'erreur exacte** (code, message, ligne)
3. **Vérifiez les messages NOTICE** dans la console
4. **Consultez le guide de dépannage** ci-dessous

### Erreurs courantes

#### Erreur : "relation already exists"
- **Cause** : La table/index existe déjà
- **Solution** : La migration utilise `IF NOT EXISTS`, c'est normal
- **Action** : Continuez, c'est géré automatiquement

#### Erreur : "cannot drop table because other objects depend on it"
- **Cause** : Des contraintes FK pointent encore vers l'ancienne table
- **Solution** : Vérifiez que l'ÉTAPE 5 a bien mis à jour les contraintes FK
- **Action** : Vérifiez avec la requête de l'ÉTAPE 3

#### Erreur : "column does not exist"
- **Cause** : La colonne a déjà été renommée
- **Solution** : Vérifiez avec `SELECT column_name FROM information_schema.columns WHERE table_name = 'enrollments'`
- **Action** : C'est normal si c'est déjà fait

## 📝 Notes importantes

- ⏱️ **Temps estimé** : 2-5 minutes pour une base de données moyenne
- 🔄 **Idempotence** : La migration peut être exécutée plusieurs fois (avec `IF NOT EXISTS`)
- 💾 **Sauvegarde** : Toujours créer une sauvegarde avant !
- 🔍 **Vérification** : Vérifiez toujours les données après migration
- 🚫 **Rollback** : En cas de problème, restaurez depuis la sauvegarde

## 🎯 Après la migration

Une fois la migration réussie :

1. ✅ Générer les nouveaux types TypeScript :
   ```bash
   npm run db:generate
   ```

2. ✅ Mettre à jour les services :
   - Créer `formation.service.ts` (au lieu de `program.service.ts`)
   - Créer `session.service.ts` (au lieu d'utiliser `program_sessions`)
   - Mettre à jour `program.service.ts` pour gérer les vrais programmes

3. ✅ Mettre à jour les pages :
   - `/dashboard/programs` → Liste des programmes
   - `/dashboard/formations` → Liste des formations (avec filtrage par programme)
   - `/dashboard/sessions` → Liste des sessions (avec filtrage par formation)

4. ✅ Tester toutes les fonctionnalités :
   - Créer un programme
   - Créer une formation liée à un programme
   - Créer une session liée à une formation
   - Créer une inscription à une session
   - Gérer l'assiduité

## 📞 Support

Si vous rencontrez des problèmes, consultez les logs dans Supabase Dashboard > Logs > Postgres Logs pour plus de détails.---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

