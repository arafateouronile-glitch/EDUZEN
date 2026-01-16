# 🔒 Guide de configuration RLS (Row Level Security) en production

## Vue d'ensemble

Les RLS (Row Level Security) policies sont essentielles pour sécuriser vos données en production. Elles garantissent que chaque utilisateur ne peut accéder qu'aux données de son organisation.

## ✅ Checklist de vérification

### 1. Exécuter l'audit RLS

Un script d'audit complet existe dans `supabase/migrations/20241203000013_audit_rls_policies.sql`. Exécutez-le dans le SQL Editor de Supabase :

```sql
-- Copiez et exécutez tout le contenu du fichier
-- supabase/migrations/20241203000013_audit_rls_policies.sql
```

Cela vous donnera :
- ✅ Liste des tables avec/sans RLS activé
- ✅ Nombre de policies par table
- ✅ Détail des opérations (SELECT, INSERT, UPDATE, DELETE)
- ✅ Tables critiques sans policies
- ✅ Policies potentiellement trop permissives

### 2. Vérifier les tables critiques

Les tables suivantes **DOIVENT** avoir RLS activé et des policies complètes :

#### Tables utilisateurs et organisations
- ✅ `users`
- ✅ `organizations`

#### Tables données métier
- ✅ `students`
- ✅ `sessions`
- ✅ `programs`
- ✅ `formations`
- ✅ `courses`
- ✅ `course_enrollments`

#### Tables financières (CRITIQUES)
- ✅ `payments`
- ✅ `invoices`

#### Tables pédagogiques
- ✅ `attendance`
- ✅ `evaluations`
- ✅ `grades`
- ✅ `documents`

#### Tables de contenu
- ✅ `educational_resources`
- ✅ `messages`
- ✅ `conversations`

## 🔍 Commandes de vérification

### Vérifier si RLS est activé sur une table

```sql
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS activé'
    ELSE '❌ RLS désactivé'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'nom_de_la_table';
```

### Lister toutes les policies d'une table

```sql
SELECT 
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'nom_de_la_table'
ORDER BY cmd;
```

### Vérifier toutes les tables sans RLS

```sql
SELECT 
  tablename,
  '❌ RLS désactivé' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN ('_prisma_migrations', 'schema_migrations') -- Tables système
ORDER BY tablename;
```

### Compteur de policies par table

```sql
SELECT 
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(DISTINCT cmd::text, ', ' ORDER BY cmd) as operations
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count ASC, tablename;
```

## 🛠️ Pattern de policy recommandé

### Structure de base d'une policy sécurisée

```sql
-- Activer RLS
ALTER TABLE public.nom_table ENABLE ROW LEVEL SECURITY;

-- SELECT : Lecture
CREATE POLICY "Users can view data in their organization"
  ON public.nom_table
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- INSERT : Création
CREATE POLICY "Users can create data in their organization"
  ON public.nom_table
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- UPDATE : Modification
CREATE POLICY "Users can update data in their organization"
  ON public.nom_table
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- DELETE : Suppression (optionnel selon les besoins)
CREATE POLICY "Users can delete data in their organization"
  ON public.nom_table
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );
```

### Cas spéciaux

#### Tables publiques (catalogue public, organisations par code)

```sql
-- Lecture publique avec filtre
CREATE POLICY "Public can read public data"
  ON public.programs
  FOR SELECT
  TO public
  USING (is_public = true);

-- Lecture publique par code d'organisation
CREATE POLICY "Public can read organizations by code"
  ON public.organizations
  FOR SELECT
  TO public
  USING (code IS NOT NULL);
```

#### Tables avec propriétaire (documents, messages)

```sql
-- Propriétaire peut tout faire
CREATE POLICY "Owners can manage their own data"
  ON public.documents
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Membres de l'organisation peuvent voir
CREATE POLICY "Organization members can view"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );
```

#### Tables pour les apprenants (learner portal)

```sql
-- Apprenants peuvent voir leurs propres données
CREATE POLICY "Learners can view their own data"
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id 
      FROM public.students 
      WHERE user_id = auth.uid()
    )
  );
```

## 🔐 Vérifications de sécurité

### 1. Vérifier les policies trop permissives

```sql
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  CASE 
    WHEN qual LIKE '%true%' OR qual IS NULL THEN '⚠️ DANGER: Policy trop permissive'
    WHEN qual LIKE '%auth.uid() IS NOT NULL%' AND qual NOT LIKE '%organization_id%' THEN '⚠️ ATTENTION: Permissive (tous utilisateurs authentifiés)'
    ELSE '✅ OK'
  END as security_level
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual LIKE '%true%' 
    OR qual IS NULL
    OR (qual LIKE '%auth.uid() IS NOT NULL%' AND qual NOT LIKE '%organization_id%')
  )
ORDER BY 
  CASE 
    WHEN qual LIKE '%true%' OR qual IS NULL THEN 0
    ELSE 1
  END,
  tablename;
```

### 2. Vérifier les tables sensibles sans policies

```sql
SELECT 
  t.tablename,
  CASE 
    WHEN t.rowsecurity = false THEN '❌ RLS désactivé'
    WHEN p.policy_count IS NULL THEN '❌ Aucune policy'
    ELSE '✅ OK'
  END as status
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'users', 'students', 'payments', 'invoices',
    'sessions', 'organizations', 'courses'
  )
  AND (t.rowsecurity = false OR p.policy_count IS NULL OR p.policy_count = 0)
ORDER BY t.tablename;
```

### 3. Tester les policies avec un utilisateur de test

```sql
-- Créer un utilisateur de test dans une organisation spécifique
-- Puis tester l'accès aux données

-- Se connecter en tant que cet utilisateur et essayer :
SELECT * FROM students WHERE organization_id = 'other-org-id';
-- Doit retourner 0 lignes (isolation des données)

SELECT * FROM students WHERE organization_id = 'my-org-id';
-- Doit retourner seulement les étudiants de l'organisation de l'utilisateur
```

## 📋 Script de vérification rapide

Créez un fichier `scripts/check-rls-production.sql` :

```sql
-- ============================================================================
-- SCRIPT DE VÉRIFICATION RLS EN PRODUCTION
-- ============================================================================

-- 1. Tables sans RLS activé
SELECT '🔴 Tables sans RLS' as check_type, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT LIKE '\_%' -- Exclure tables système
ORDER BY tablename;

-- 2. Tables sans policies
SELECT '🟠 Tables sans policies' as check_type, tablename
FROM pg_tables t
WHERE schemaname = 'public'
  AND rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.tablename = t.tablename 
    AND p.schemaname = 'public'
  )
ORDER BY tablename;

-- 3. Tables avec policies incomplètes (manque certaines opérations)
SELECT 
  '🟡 Policies incomplètes' as check_type,
  tablename,
  STRING_AGG(DISTINCT cmd::text, ', ' ORDER BY cmd) as missing_operations
FROM (
  SELECT DISTINCT t.tablename, op.cmd
  FROM pg_tables t
  CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) op(cmd)
  WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND t.tablename NOT LIKE '\_%'
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.tablename = t.tablename
        AND p.schemaname = 'public'
        AND (p.cmd = op.cmd OR p.cmd = 'ALL')
    )
) incomplete
GROUP BY tablename
ORDER BY tablename;

-- 4. Résumé par table
SELECT 
  '📊 Résumé' as check_type,
  tablename,
  CASE WHEN rowsecurity THEN '✅' ELSE '❌' END || ' RLS' as rls_status,
  COALESCE(policy_count, 0) as policies_count,
  CASE 
    WHEN NOT rowsecurity THEN '❌ RLS désactivé'
    WHEN policy_count = 0 THEN '❌ Aucune policy'
    WHEN policy_count < 3 THEN '⚠️ Incomplet'
    ELSE '✅ OK'
  END as status
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE '\_%'
ORDER BY 
  CASE WHEN NOT rowsecurity THEN 0 WHEN policy_count = 0 THEN 1 WHEN policy_count < 3 THEN 2 ELSE 3 END,
  tablename;
```

Exécutez-le dans le SQL Editor de Supabase pour un rapport complet.

## 🚨 Actions correctives

### Si une table n'a pas RLS activé

```sql
-- Activer RLS
ALTER TABLE public.nom_table ENABLE ROW LEVEL SECURITY;

-- Puis créer les policies nécessaires (voir patterns ci-dessus)
```

### Si une table a des policies manquantes

Référez-vous aux migrations dans `supabase/migrations/` qui contiennent `_rls` ou `_policies` dans leur nom :
- `20241203000014_fix_documents_rls_policies.sql`
- `20241203000015_fix_payments_rls_policies.sql`
- `20251222000002_fix_grades_rls.sql`
- etc.

### Si une policy est trop permissive

1. **Identifier la policy problématique** :
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'nom_table' 
AND (qual LIKE '%true%' OR qual IS NULL);
```

2. **Supprimer l'ancienne policy** :
```sql
DROP POLICY IF EXISTS "nom_policy" ON public.nom_table;
```

3. **Créer une nouvelle policy restrictive** (voir patterns ci-dessus)

## 🔄 Migration des policies

Les policies sont créées automatiquement lors de l'exécution des migrations. Assurez-vous que toutes les migrations ont été exécutées :

```bash
# Vérifier l'état des migrations
supabase migration list

# Si des migrations sont en attente, les exécuter
supabase db push
```

## 📚 Ressources

- [Documentation Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Guide des patterns RLS](https://supabase.com/docs/guides/auth/row-level-security#policies)
- Script d'audit : `supabase/migrations/20241203000013_audit_rls_policies.sql`

## ✅ Checklist finale avant production

- [ ] Audit RLS exécuté et aucun problème critique détecté
- [ ] Toutes les tables sensibles ont RLS activé
- [ ] Toutes les tables ont au moins SELECT, INSERT, UPDATE policies
- [ ] Aucune policy avec `qual = true` ou `qual IS NULL`
- [ ] Tests effectués avec utilisateurs de différentes organisations
- [ ] Isolation des données vérifiée (utilisateur A ne voit pas données utilisateur B)
- [ ] Tables publiques correctement configurées (si nécessaire)
- [ ] Policies pour apprenants configurées (si applicable)


