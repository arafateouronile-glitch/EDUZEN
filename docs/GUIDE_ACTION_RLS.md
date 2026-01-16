# 🚀 Guide d'Action - Correction RLS en Production

## Vue d'ensemble

Ce guide vous accompagne pas à pas pour corriger les problèmes RLS identifiés dans votre base de données.

**Statut actuel :**
- ✅ 231 tables avec RLS activé (97.5%)
- ⚠️ 6 tables sans RLS
- ⚠️ 11 tables avec RLS mais sans policies

## 📋 Étapes d'exécution

### Étape 1 : Analyse détaillée

**Action :** Exécuter le script d'analyse pour identifier précisément les problèmes

**Où :** SQL Editor de Supabase Dashboard

**Script :** `scripts/analyze-rls-issues.sql`

**Résultat attendu :** Vous obtiendrez 4 rapports :
1. 🔴 Tables sans RLS (avec niveau de risque)
2. 🟠 Tables avec RLS mais sans policies
3. 🟡 Tables critiques avec policies incomplètes
4. 📊 Résumé des tables critiques

**⚠️ Important :** Notez les noms des tables dans chaque catégorie avant de passer à l'étape suivante.

---

### Étape 2 : Priorisation des corrections

#### 🔴 Priorité CRITIQUE (À faire immédiatement)

Tables sans RLS qui contiennent des données sensibles :
- `users`
- `students`
- `payments`
- `invoices`
- `organizations`

**Action requise :** Activer RLS + Créer policies immédiatement

#### 🟠 Priorité IMPORTANTE (À faire rapidement)

Tables avec RLS activé mais sans policies (accès complètement bloqué) :
- Toutes les tables listées dans le rapport 🟠

**Action requise :** Créer au minimum une policy SELECT

#### 🟡 Priorité ATTENTION (À planifier)

Tables critiques avec policies incomplètes :
- Tables listées dans le rapport 🟡

**Action requise :** Ajouter les policies manquantes (INSERT, UPDATE, DELETE selon besoins)

---

### Étape 3 : Correction - Tables sans RLS

#### 3.1 Identifier les tables critiques

Exécutez cette requête pour voir exactement quelles tables sans RLS sont critiques :

```sql
SELECT 
  tablename,
  CASE 
    WHEN tablename IN ('users', 'students', 'payments', 'invoices', 'organizations') 
    THEN '🔴 CRITIQUE - Activer RLS immédiatement'
    WHEN tablename LIKE '%log%' OR tablename LIKE '%audit%' 
    THEN '⚠️ Table de logs - Peut rester sans RLS si c'est intentionnel'
    ELSE '📋 À vérifier manuellement'
  END as action
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT LIKE '\_%'
  AND tablename NOT IN ('schema_migrations')
ORDER BY 
  CASE 
    WHEN tablename IN ('users', 'students', 'payments', 'invoices', 'organizations') THEN 0
    ELSE 1
  END;
```

#### 3.2 Activer RLS sur les tables critiques

**Pour chaque table critique identifiée :**

```sql
-- Remplacer NOM_TABLE par le nom réel de la table
ALTER TABLE public.NOM_TABLE ENABLE ROW LEVEL SECURITY;
```

**Exemple pour plusieurs tables :**

```sql
-- Activer RLS sur plusieurs tables en une fois
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
```

#### 3.3 Créer des policies de base

Après avoir activé RLS, créez immédiatement au minimum une policy SELECT pour éviter de bloquer complètement l'accès :

```sql
-- Template de policy SELECT (à adapter selon la table)
CREATE POLICY "Users can view data in their organization"
  ON public.NOM_TABLE
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

---

### Étape 4 : Correction - Tables avec RLS mais sans policies

#### 4.1 Identifier les tables concernées

Exécutez cette requête :

```sql
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND t.tablename NOT LIKE '\_%'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.tablename = t.tablename 
    AND p.schemaname = 'public'
  )
ORDER BY t.tablename;
```

#### 4.2 Créer des policies pour chaque table

**Pour chaque table identifiée**, créez au minimum une policy SELECT :

```sql
-- Policy SELECT de base (à adapter selon la structure de la table)
CREATE POLICY "Users can view [NOM_TABLE] in their organization"
  ON public.NOM_TABLE
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

**⚠️ Adaptation nécessaire :**
- Si la table n'a pas `organization_id`, adaptez la condition USING
- Si la table a une relation différente (ex: `user_id`, `created_by`), ajustez la policy

---

### Étape 5 : Vérification post-correction

#### 5.1 Réexécuter l'audit

Exécutez à nouveau `scripts/check-rls-production.sql` pour vérifier que :
- ✅ Toutes les tables critiques ont RLS activé
- ✅ Toutes les tables avec RLS ont au moins une policy
- ✅ Le nombre de problèmes a diminué

#### 5.2 Tester l'accès

**Test manuel avec un utilisateur de test :**

1. Connectez-vous avec un utilisateur d'une organisation spécifique
2. Testez l'accès aux tables corrigées :
   ```sql
   -- Devrait retourner seulement les données de l'organisation de l'utilisateur
   SELECT * FROM students;
   SELECT * FROM payments;
   SELECT * FROM invoices;
   ```
3. Vérifiez que l'utilisateur ne peut pas voir les données d'autres organisations

---

## 📝 Patterns de policies selon le type de table

### Table avec `organization_id`

```sql
-- SELECT
CREATE POLICY "Users can view data in their organization"
  ON public.nom_table
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- INSERT
CREATE POLICY "Users can create data in their organization"
  ON public.nom_table
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- UPDATE
CREATE POLICY "Users can update data in their organization"
  ON public.nom_table
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- DELETE (si nécessaire)
CREATE POLICY "Users can delete data in their organization"
  ON public.nom_table
  FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );
```

### Table avec `user_id` ou `created_by`

```sql
CREATE POLICY "Users can view their own data"
  ON public.nom_table
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR created_by = auth.uid());
```

### Table publique (lecture seulement)

```sql
CREATE POLICY "Public can view public data"
  ON public.nom_table
  FOR SELECT TO public
  USING (is_public = true);
```

---

## 🔧 Scripts utilitaires

### Activer RLS sur plusieurs tables

```sql
DO $$
DECLARE
  table_name TEXT;
  critical_tables TEXT[] := ARRAY[
    'users', 'students', 'payments', 'invoices', 'organizations',
    'sessions', 'programs', 'formations'
  ];
BEGIN
  FOREACH table_name IN ARRAY critical_tables
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      RAISE NOTICE '✅ RLS activé sur: %', table_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur sur %: %', table_name, SQLERRM;
    END;
  END LOOP;
END $$;
```

### Vérifier qu'une table a des policies

```sql
SELECT 
  policyname,
  cmd as operation,
  qual as condition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'NOM_TABLE'
ORDER BY cmd;
```

---

## ✅ Checklist finale

Avant de considérer la correction terminée :

- [ ] Script d'analyse exécuté
- [ ] Tables critiques sans RLS identifiées
- [ ] RLS activé sur toutes les tables critiques
- [ ] Policies créées pour toutes les tables avec RLS
- [ ] Vérification post-correction effectuée
- [ ] Tests d'accès réussis avec utilisateurs de test
- [ ] Aucune table critique sans RLS restante
- [ ] Aucune table avec RLS mais sans policies restante
- [ ] Documentation mise à jour

---

## 🆘 En cas de problème

### Problème : "Error: policy already exists"

**Solution :** Supprimer l'ancienne policy d'abord :
```sql
DROP POLICY IF EXISTS "nom_policy" ON public.nom_table;
```

### Problème : "Error: column does not exist"

**Solution :** Vérifier la structure de la table :
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'nom_table';
```

### Problème : Accès complètement bloqué après activation RLS

**Solution :** Créer immédiatement une policy SELECT :
```sql
-- Policy temporaire très permissive (à restreindre ensuite)
CREATE POLICY "temp_select_all"
  ON public.nom_table
  FOR SELECT
  TO authenticated
  USING (true);
```

---

## 📚 Ressources

- Guide complet RLS : `docs/RLS_POLICIES_PRODUCTION.md`
- Script d'audit : `scripts/check-rls-production.sql`
- Script d'analyse : `scripts/analyze-rls-issues.sql`
- Script de correction : `scripts/fix-rls-issues.sql`

---

## 🎯 Objectif final

**Tous les problèmes RLS doivent être résolus :**
- ✅ 0 table critique sans RLS
- ✅ 0 table avec RLS mais sans policies
- ✅ Toutes les tables critiques ont des policies complètes


