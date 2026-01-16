# 🗄️ Guide de Migration Supabase Production

**Date** : 16 Janvier 2026  
**Objectif** : Appliquer toutes les migrations en production

---

## 📋 Prérequis

- ✅ Projet Supabase Production créé
- ✅ Supabase CLI installé (`npm install -g supabase`)
- ✅ Accès au projet Supabase (URL et clés)

---

## 🚀 Méthode 1 : Via Supabase CLI (Recommandé)

### Étape 1 : Installation et Connexion

```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Se connecter à Supabase
supabase login

# Vous serez redirigé vers le navigateur pour l'authentification
```

### Étape 2 : Lier le Projet

```bash
# Lier votre projet local au projet Supabase Production
supabase link --project-ref votre-project-ref

# Le project-ref se trouve dans l'URL de votre projet Supabase :
# https://app.supabase.com/project/votre-project-ref
```

### Étape 3 : Appliquer les Migrations

```bash
# Appliquer toutes les migrations en production
supabase db push

# Cette commande :
# - Compare les migrations locales avec la base de production
# - Applique uniquement les migrations manquantes
# - Affiche un résumé des changements
```

### Étape 4 : Vérifier

```bash
# Vérifier l'état des migrations
supabase migration list

# Générer les types TypeScript depuis la production
supabase gen types typescript --project-id votre-project-id > types/database.types.ts
```

---

## 🖥️ Méthode 2 : Via SQL Editor (Manuel)

Si vous ne pouvez pas utiliser la CLI, vous pouvez appliquer les migrations manuellement :

### Étape 1 : Accéder au SQL Editor

1. Aller sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionner votre projet production
3. Aller dans **SQL Editor**

### Étape 2 : Appliquer les Migrations

Pour chaque fichier dans `supabase/migrations/` (dans l'ordre chronologique) :

1. Ouvrir le fichier de migration (ex: `20260116_add_docx_template_support.sql`)
2. Copier tout le contenu SQL
3. Coller dans le SQL Editor
4. Cliquer sur **"Run"** ou **"Ctrl+Enter"**
5. Vérifier qu'il n'y a pas d'erreur

**Important** : 
- ⚠️ Appliquer les migrations dans l'ordre chronologique (par date du nom de fichier)
- ⚠️ Ne pas sauter de migrations
- ⚠️ Vérifier chaque migration avant de passer à la suivante

### Liste des Migrations Principales

Voici les migrations critiques à vérifier :

1. **Migrations de base** : Tables principales (users, organizations, students, etc.)
2. **Migrations RLS** : Row Level Security policies
3. **Migrations 2FA** : Authentification à deux facteurs
4. **Migrations signatures** : Signatures électroniques
5. **Migrations electronic_attendance** : Présence électronique
6. **Migrations docx-templates** : Support templates DOCX

---

## ✅ Vérifications Post-Migration

### 1. Vérifier les Tables

```sql
-- Lister toutes les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 2. Vérifier RLS Activé

```sql
-- Vérifier que RLS est activé sur toutes les tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Toutes les tables doivent avoir `rowsecurity = true`.

### 3. Vérifier les Policies

```sql
-- Compter les policies par table
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;
```

Chaque table doit avoir au moins une policy pour chaque opération (SELECT, INSERT, UPDATE, DELETE).

### 4. Vérifier les Storage Buckets

```sql
-- Lister les buckets Storage
SELECT * FROM storage.buckets;
```

Vérifier que les buckets suivants existent :
- `documents`
- `logos`
- `docx-templates`
- `avatars`
- `signatures`

### 5. Tester l'Isolation Multi-Tenant

```sql
-- Se connecter avec un utilisateur test
-- Vérifier qu'il ne voit que ses propres données

-- Exemple : Vérifier qu'un utilisateur ne voit que ses étudiants
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-id-test';

SELECT * FROM students;
-- Ne doit retourner que les étudiants de l'organisation de l'utilisateur
```

---

## 🔧 Scripts Utiles

### Script de Vérification Complète

Créer un fichier `scripts/verify-supabase-production.sql` :

```sql
-- Vérification complète de la configuration Supabase Production

-- 1. Tables
SELECT 'Tables' as check_type, COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. RLS
SELECT 'RLS Enabled' as check_type, COUNT(*) as count
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

-- 3. Policies
SELECT 'Policies' as check_type, COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public';

-- 4. Functions
SELECT 'Functions' as check_type, COUNT(*) as count
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace;

-- 5. Storage Buckets
SELECT 'Storage Buckets' as check_type, COUNT(*) as count
FROM storage.buckets;
```

Exécuter dans le SQL Editor pour un aperçu rapide.

---

## ⚠️ Problèmes Courants

### Erreur : "relation already exists"

**Cause** : La migration a déjà été appliquée.

**Solution** : Ignorer cette migration ou utiliser `IF NOT EXISTS` dans le SQL.

### Erreur : "permission denied"

**Cause** : Pas les droits suffisants.

**Solution** : Utiliser le compte `service_role` ou vérifier les permissions.

### Erreur : "foreign key constraint"

**Cause** : Dépendance manquante.

**Solution** : Vérifier l'ordre des migrations et appliquer les migrations de base d'abord.

---

## 📝 Checklist Post-Migration

- [ ] ✅ Toutes les migrations appliquées sans erreur
- [ ] ✅ Toutes les tables créées
- [ ] ✅ RLS activé sur toutes les tables
- [ ] ✅ Policies configurées pour chaque table
- [ ] ✅ Storage buckets créés
- [ ] ✅ Functions RPC créées
- [ ] ✅ Types TypeScript générés
- [ ] ✅ Test d'isolation multi-tenant réussi
- [ ] ✅ Test de connexion depuis l'application

---

## 🔗 Ressources

- [Supabase CLI Docs](https://supabase.com/docs/reference/cli)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Dernière mise à jour** : 16 Janvier 2026
