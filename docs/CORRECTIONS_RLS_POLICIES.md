---
title: Corrections RLS Policies - Documents et Payments
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔒 Corrections RLS Policies - Documents et Payments

## Problèmes Identifiés par l'Audit

L'audit RLS a révélé **2 tables avec des policies incomplètes** :

### ⚠️ Table `documents`
- **RLS** : ✅ Activé
- **Policies** : 2 (manque INSERT, UPDATE, DELETE)
- **Statut** : ⚠️ Policies incomplètes

### ⚠️ Table `payments`
- **RLS** : ✅ Activé
- **Policies** : 2 (manque INSERT, UPDATE, DELETE)
- **Statut** : ⚠️ Policies incomplètes

## Solutions Créées

### Migration 1 : `20241203000014_fix_documents_rls_policies.sql`

**Policies ajoutées** :
- ✅ **INSERT** : "Users can create documents in their organization"
  - Permet aux utilisateurs authentifiés de créer des documents dans leur organisation
  
- ✅ **UPDATE** : "Users can update documents in their organization"
  - Permet aux admins de modifier les documents de leur organisation
  
- ✅ **DELETE** : "Admins can delete documents in their organization"
  - Permet uniquement aux admins de supprimer des documents

### Migration 2 : `20241203000015_fix_payments_rls_policies.sql`

**Policies ajoutées** :
- ✅ **INSERT** : "Users can create payments in their organization"
  - Permet aux admins, comptables et responsables financiers de créer des paiements
  
- ✅ **UPDATE** : "Admins can update payments in their organization"
  - Permet aux admins et comptables de modifier les paiements
  - **Note** : Les paiements complétés ne devraient généralement pas être modifiables
  
- ✅ **DELETE** : "Super admins can delete payments in their organization"
  - Permet uniquement aux super_admins de supprimer des paiements
  - **Sécurité** : Restriction stricte pour éviter les erreurs financières

## Instructions d'Application

### Étape 1 : Documents

1. Ouvrir **Supabase Dashboard** → **SQL Editor**
2. Copier le contenu de `supabase/migrations/20241203000014_fix_documents_rls_policies.sql`
3. Exécuter la requête
4. Vérifier les résultats (devrait afficher 4 policies : SELECT, INSERT, UPDATE, DELETE)

### Étape 2 : Payments

1. Dans le même **SQL Editor**
2. Copier le contenu de `supabase/migrations/20241203000015_fix_payments_rls_policies.sql`
3. Exécuter la requête
4. Vérifier les résultats (devrait afficher 4 policies : SELECT, INSERT, UPDATE, DELETE)

### Étape 3 : Vérification

Ré-exécuter l'audit pour confirmer :

```sql
-- Ré-exécuter la section 6 de l'audit
SELECT 
  'Résumé sécurité' as audit_type,
  summary.tablename,
  CASE 
    WHEN summary.rls_enabled = false THEN '❌ RLS désactivé'
    WHEN summary.policy_count = 0 THEN '❌ Aucune policy'
    WHEN summary.policy_count < 3 THEN '⚠️ Policies incomplètes'
    ELSE '✅ Sécurisé'
  END as security_status,
  summary.policy_count
FROM (
  SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(DISTINCT p.policyname) as policy_count
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('documents', 'payments')
  GROUP BY t.tablename, t.rowsecurity
) summary;
```

**Résultat attendu** :
- `documents` : ✅ Sécurisé (4 policies)
- `payments` : ✅ Sécurisé (4 policies)

## Sécurité des Policies

### Documents
- **Création** : Tous les utilisateurs authentifiés de l'organisation
- **Modification** : Admins uniquement
- **Suppression** : Admins uniquement
- **Lecture** : Utilisateurs de l'organisation (déjà existant)

### Payments
- **Création** : Admins, comptables, responsables financiers
- **Modification** : Admins et comptables uniquement
- **Suppression** : Super admins uniquement (très restrictif)
- **Lecture** : Utilisateurs de l'organisation (déjà existant)

## Notes Importantes

### Payments - Suppression Restrictive
La policy DELETE pour `payments` est très restrictive (super_admin uniquement) car :
- Les paiements sont des données financières critiques
- La suppression peut causer des incohérences comptables
- Il est préférable d'annuler un paiement plutôt que de le supprimer

### Documents - Modification
La policy UPDATE permet aux admins de modifier tous les documents de leur organisation. Si vous souhaitez restreindre davantage (ex: seulement les documents créés par l'utilisateur), la policy peut être ajustée.

## Après Application

Une fois les migrations appliquées :

1. ✅ **Ré-exécuter l'audit** pour confirmer
2. ✅ **Tester les fonctionnalités** :
   - Créer un document
   - Modifier un document
   - Créer un paiement
   - Modifier un paiement
3. ✅ **Vérifier les permissions** avec différents rôles utilisateurs

## Checklist

- [ ] Migration documents appliquée
- [ ] Migration payments appliquée
- [ ] Audit ré-exécuté et confirmé
- [ ] Tests fonctionnels effectués
- [ ] Permissions vérifiées---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.