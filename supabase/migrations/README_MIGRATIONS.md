---
title: Migrations Supabase - Templates de Documents
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Migrations Supabase - Templates de Documents

## ⚠️ Important

Les migrations suivantes doivent être exécutées dans Supabase pour que toutes les fonctionnalités fonctionnent correctement :

### Migrations à exécuter (dans l'ordre) :

1. **20241119000001_create_document_templates.sql**
   - Crée la table principale `document_templates`
   - **Status** : Probablement déjà exécutée

2. **20241201000001_create_document_template_versions.sql**
   - Crée la table `document_template_versions` pour le versioning
   - **Status** : ⚠️ **À EXÉCUTER**

3. **20241202000003_create_template_collaboration.sql**
   - Crée les tables de collaboration :
     - `template_shares`
     - `template_comments`
     - `template_approvals`
     - `template_activity_log` ⚠️
     - `template_notifications`
   - **Status** : ⚠️ **À EXÉCUTER**

4. **20241202000004_create_template_security.sql**
   - Crée les tables de sécurité :
     - `template_permissions`
     - `template_encryption` ⚠️
     - `template_audit_log`
     - `template_gdpr_compliance`
     - `template_archives`
   - **Status** : ⚠️ **À EXÉCUTER**

5. **20241202000005_create_template_sharing.sql**
   - Crée les tables pour le partage entre organisations et la bibliothèque
   - **Status** : ⚠️ **À EXÉCUTER**

6. **20241202000006_create_external_data_sources.sql**
   - Crée les tables pour l'intégration de données externes
   - **Status** : ⚠️ **À EXÉCUTER**

7. **20241202000007_create_global_document_layouts.sql**
   - Crée la table `global_document_layouts` pour les modèles globaux d'en-tête et de pied de page
   - Permet d'avoir un seul modèle d'en-tête et de pied de page pour tous les documents
   - **Status** : ⚠️ **À EXÉCUTER**

## Comment exécuter les migrations

### Option 1 : Via l'interface Supabase

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Ouvrez chaque fichier de migration dans l'ordre
4. Exécutez le SQL

### Option 2 : Via Supabase CLI

```bash
# Installer Supabase CLI si ce n'est pas déjà fait
npm install -g supabase

# Se connecter à votre projet
supabase login

# Lier votre projet local à Supabase
supabase link --project-ref votre-project-ref

# Appliquer toutes les migrations
supabase db push
```

### Option 3 : Via psql

```bash
# Se connecter à votre base de données Supabase
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Exécuter chaque migration dans l'ordre
\i supabase/migrations/20241119000001_create_document_templates.sql
\i supabase/migrations/20241201000001_create_document_template_versions.sql
\i supabase/migrations/20241202000003_create_template_collaboration.sql
\i supabase/migrations/20241202000004_create_template_security.sql
\i supabase/migrations/20241202000005_create_template_sharing.sql
\i supabase/migrations/20241202000006_create_external_data_sources.sql
\i supabase/migrations/20241202000007_create_global_document_layouts.sql
```

## Notes

- L'application continuera de fonctionner sans ces migrations, mais certaines fonctionnalités seront désactivées :
  - Versioning des templates
  - Historique des activités
  - Chiffrement des templates
  - Collaboration (partage, commentaires, approbations)
  - Intégration de données externes
  - Modèles globaux d'en-tête et de pied de page

- Les erreurs 404 dans la console sont normales tant que les migrations ne sont pas exécutées.
- L'application gère gracieusement l'absence de ces tables et affiche des avertissements dans la console.


## ⚠️ Important

Les migrations suivantes doivent être exécutées dans Supabase pour que toutes les fonctionnalités fonctionnent correctement :

### Migrations à exécuter (dans l'ordre) :

1. **20241119000001_create_document_templates.sql**
   - Crée la table principale `document_templates`
   - **Status** : Probablement déjà exécutée

2. **20241201000001_create_document_template_versions.sql**
   - Crée la table `document_template_versions` pour le versioning
   - **Status** : ⚠️ **À EXÉCUTER**

3. **20241202000003_create_template_collaboration.sql**
   - Crée les tables de collaboration :
     - `template_shares`
     - `template_comments`
     - `template_approvals`
     - `template_activity_log` ⚠️
     - `template_notifications`
   - **Status** : ⚠️ **À EXÉCUTER**

4. **20241202000004_create_template_security.sql**
   - Crée les tables de sécurité :
     - `template_permissions`
     - `template_encryption` ⚠️
     - `template_audit_log`
     - `template_gdpr_compliance`
     - `template_archives`
   - **Status** : ⚠️ **À EXÉCUTER**

5. **20241202000005_create_template_sharing.sql**
   - Crée les tables pour le partage entre organisations et la bibliothèque
   - **Status** : ⚠️ **À EXÉCUTER**

6. **20241202000006_create_external_data_sources.sql**
   - Crée les tables pour l'intégration de données externes
   - **Status** : ⚠️ **À EXÉCUTER**

7. **20241202000007_create_global_document_layouts.sql**
   - Crée la table `global_document_layouts` pour les modèles globaux d'en-tête et de pied de page
   - Permet d'avoir un seul modèle d'en-tête et de pied de page pour tous les documents
   - **Status** : ⚠️ **À EXÉCUTER**

## Comment exécuter les migrations

### Option 1 : Via l'interface Supabase

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Ouvrez chaque fichier de migration dans l'ordre
4. Exécutez le SQL

### Option 2 : Via Supabase CLI

```bash
# Installer Supabase CLI si ce n'est pas déjà fait
npm install -g supabase

# Se connecter à votre projet
supabase login

# Lier votre projet local à Supabase
supabase link --project-ref votre-project-ref

# Appliquer toutes les migrations
supabase db push
```

### Option 3 : Via psql

```bash
# Se connecter à votre base de données Supabase
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Exécuter chaque migration dans l'ordre
\i supabase/migrations/20241119000001_create_document_templates.sql
\i supabase/migrations/20241201000001_create_document_template_versions.sql
\i supabase/migrations/20241202000003_create_template_collaboration.sql
\i supabase/migrations/20241202000004_create_template_security.sql
\i supabase/migrations/20241202000005_create_template_sharing.sql
\i supabase/migrations/20241202000006_create_external_data_sources.sql
\i supabase/migrations/20241202000007_create_global_document_layouts.sql
```

## Notes

- L'application continuera de fonctionner sans ces migrations, mais certaines fonctionnalités seront désactivées :
  - Versioning des templates
  - Historique des activités
  - Chiffrement des templates
  - Collaboration (partage, commentaires, approbations)
  - Intégration de données externes
  - Modèles globaux d'en-tête et de pied de page

- Les erreurs 404 dans la console sont normales tant que les migrations ne sont pas exécutées.
- L'application gère gracieusement l'absence de ces tables et affiche des avertissements dans la console.


## ⚠️ Important

Les migrations suivantes doivent être exécutées dans Supabase pour que toutes les fonctionnalités fonctionnent correctement :

### Migrations à exécuter (dans l'ordre) :

1. **20241119000001_create_document_templates.sql**
   - Crée la table principale `document_templates`
   - **Status** : Probablement déjà exécutée

2. **20241201000001_create_document_template_versions.sql**
   - Crée la table `document_template_versions` pour le versioning
   - **Status** : ⚠️ **À EXÉCUTER**

3. **20241202000003_create_template_collaboration.sql**
   - Crée les tables de collaboration :
     - `template_shares`
     - `template_comments`
     - `template_approvals`
     - `template_activity_log` ⚠️
     - `template_notifications`
   - **Status** : ⚠️ **À EXÉCUTER**

4. **20241202000004_create_template_security.sql**
   - Crée les tables de sécurité :
     - `template_permissions`
     - `template_encryption` ⚠️
     - `template_audit_log`
     - `template_gdpr_compliance`
     - `template_archives`
   - **Status** : ⚠️ **À EXÉCUTER**

5. **20241202000005_create_template_sharing.sql**
   - Crée les tables pour le partage entre organisations et la bibliothèque
   - **Status** : ⚠️ **À EXÉCUTER**

6. **20241202000006_create_external_data_sources.sql**
   - Crée les tables pour l'intégration de données externes
   - **Status** : ⚠️ **À EXÉCUTER**

7. **20241202000007_create_global_document_layouts.sql**
   - Crée la table `global_document_layouts` pour les modèles globaux d'en-tête et de pied de page
   - Permet d'avoir un seul modèle d'en-tête et de pied de page pour tous les documents
   - **Status** : ⚠️ **À EXÉCUTER**

## Comment exécuter les migrations

### Option 1 : Via l'interface Supabase

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Ouvrez chaque fichier de migration dans l'ordre
4. Exécutez le SQL

### Option 2 : Via Supabase CLI

```bash
# Installer Supabase CLI si ce n'est pas déjà fait
npm install -g supabase

# Se connecter à votre projet
supabase login

# Lier votre projet local à Supabase
supabase link --project-ref votre-project-ref

# Appliquer toutes les migrations
supabase db push
```

### Option 3 : Via psql

```bash
# Se connecter à votre base de données Supabase
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Exécuter chaque migration dans l'ordre
\i supabase/migrations/20241119000001_create_document_templates.sql
\i supabase/migrations/20241201000001_create_document_template_versions.sql
\i supabase/migrations/20241202000003_create_template_collaboration.sql
\i supabase/migrations/20241202000004_create_template_security.sql
\i supabase/migrations/20241202000005_create_template_sharing.sql
\i supabase/migrations/20241202000006_create_external_data_sources.sql
\i supabase/migrations/20241202000007_create_global_document_layouts.sql
```

## Notes

- L'application continuera de fonctionner sans ces migrations, mais certaines fonctionnalités seront désactivées :
  - Versioning des templates
  - Historique des activités
  - Chiffrement des templates
  - Collaboration (partage, commentaires, approbations)
  - Intégration de données externes
  - Modèles globaux d'en-tête et de pied de page

- Les erreurs 404 dans la console sont normales tant que les migrations ne sont pas exécutées.
- L'application gère gracieusement l'absence de ces tables et affiche des avertissements dans la console.---

**Document EDUZEN** | [Retour à la documentation principale](../../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.