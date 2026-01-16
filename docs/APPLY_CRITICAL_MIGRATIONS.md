---
title: Guide dApplication des Migrations Critiques
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔴 Guide d'Application des Migrations Critiques

## Problème Identifié

Les tables `courses` et `course_enrollments` existent dans la migration `20241202000030_create_elearning_system.sql`, mais :
1. La relation `instructor_id` pointe vers `auth.users(id)` au lieu de `public.users(id)`
2. Cela cause des erreurs 400 lors des requêtes avec jointures

## Solution

Deux migrations ont été créées pour corriger ce problème :

### Migration 1 : `20241203000010_fix_courses_relations.sql`
Corrige la foreign key `instructor_id` pour pointer vers `public.users`

### Migration 2 : `20241203000011_ensure_courses_tables_exist.sql`
Migration complète qui :
- Vérifie si les tables existent, sinon les crée
- Corrige automatiquement la relation `instructor_id`
- Crée les index nécessaires
- Configure les RLS policies
- Donne les permissions appropriées

## Instructions d'Application

### Option 1 : Via Supabase Dashboard (Recommandé)

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Ouvrir SQL Editor**
   - Cliquer sur "SQL Editor" dans le menu de gauche

3. **Appliquer la Migration**
   - Copier le contenu de `supabase/migrations/20241203000011_ensure_courses_tables_exist.sql`
   - Coller dans l'éditeur SQL
   - Cliquer sur "Run" ou `Cmd/Ctrl + Enter`

4. **Vérifier le Résultat**
   - Vous devriez voir des messages `NOTICE` indiquant :
     - "Table courses créée" ou "Table courses existe déjà"
     - "Table course_enrollments créée" ou "Table course_enrollments existe déjà"
     - "Relation instructor_id corrigée vers public.users" ou "Relation instructor_id est correcte"
     - "Migration terminée avec succès"

### Option 2 : Via Supabase CLI

```bash
# Si vous avez Supabase CLI installé
cd /Users/arafatetoure/Documents/EDUZEN
supabase db push

# Ou appliquer une migration spécifique
supabase migration up 20241203000011
```

### Option 3 : Via psql (si vous avez accès direct)

```bash
# Se connecter à la base de données
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Appliquer la migration
\i supabase/migrations/20241203000011_ensure_courses_tables_exist.sql
```

## Vérification Post-Migration

### 1. Vérifier que les tables existent

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('courses', 'course_enrollments');
```

**Résultat attendu** : 2 lignes (courses, course_enrollments)

### 2. Vérifier la relation instructor_id

```sql
SELECT 
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'courses'
  AND kcu.column_name = 'instructor_id';
```

**Résultat attendu** : 
- `foreign_table_schema` = `public`
- `foreign_table_name` = `users`
- `foreign_column_name` = `id`

### 3. Tester une requête avec jointure

```sql
SELECT 
  c.id,
  c.title,
  u.full_name as instructor_name
FROM courses c
LEFT JOIN users u ON c.instructor_id = u.id
LIMIT 5;
```

**Résultat attendu** : La requête doit s'exécuter sans erreur

### 4. Vérifier les RLS Policies

```sql
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('courses', 'course_enrollments')
ORDER BY tablename, cmd;
```

**Résultat attendu** : Au moins 3 policies pour `courses` et 3 pour `course_enrollments`

## Après Application

Une fois la migration appliquée :

1. ✅ **Re-générer les types TypeScript**
   ```bash
   npm run db:generate
   ```

2. ✅ **Tester dans l'application**
   - Aller sur `/dashboard/elearning`
   - Vérifier que les cours s'affichent sans erreur 400
   - Vérifier que les inscriptions fonctionnent

3. ✅ **Marquer le todo comme complété**
   - `critical-1` : ✅ Complété
   - `critical-2` : ✅ Complété

## En Cas d'Erreur

### Erreur : "relation does not exist"
- Les tables n'existent pas encore
- La migration `20241202000030_create_elearning_system.sql` n'a pas été appliquée
- **Solution** : Appliquer d'abord cette migration, puis la nouvelle

### Erreur : "constraint already exists"
- La contrainte existe déjà
- **Solution** : C'est normal, la migration gère cela avec `IF NOT EXISTS`

### Erreur : "permission denied"
- Vous n'avez pas les droits nécessaires
- **Solution** : Utiliser un compte avec les droits `superuser` ou contacter l'admin Supabase

## Support

Si vous rencontrez des problèmes :
1. Vérifier les logs dans Supabase Dashboard → Logs
2. Vérifier que toutes les migrations précédentes ont été appliquées
3. Vérifier que la table `users` existe dans le schéma `public`---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.