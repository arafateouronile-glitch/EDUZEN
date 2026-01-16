# 💾 Guide de Sauvegarde et Restauration

Guide opérationnel pour gérer les sauvegardes et restaurations dans EDUZEN.

---

## 📋 Table des Matières

1. [Sauvegardes Automatiques](#sauvegardes-automatiques)
2. [Sauvegardes Manuelles](#sauvegardes-manuelles)
3. [Restauration](#restauration)
4. [Exports de Données](#exports-de-données)
5. [Bonnes Pratiques](#bonnes-pratiques)

---

## 🔄 Sauvegardes Automatiques

### Supabase

**Configuration** : Dashboard Supabase → Settings → Database → Backups

#### Paramètres Recommandés

- **Fréquence** : Quotidienne
- **Rétention** : 30 jours minimum (recommandé: 90 jours)
- **Format** : SQL dump
- **Stockage** : Supabase Storage (automatique)

#### Vérification

1. Accédez au Dashboard Supabase
2. Allez dans **Database → Backups**
3. Vérifiez que les backups quotidiens sont présents
4. Testez un téléchargement pour vérifier l'intégrité

---

## 📥 Sauvegardes Manuelles

### Export Complet de la Base

#### Via Supabase Dashboard

1. Dashboard → Database → Backups
2. Cliquez sur **"Create Backup"**
3. Attendez la génération (quelques minutes)
4. Téléchargez le fichier `.sql`

#### Via CLI

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Créer un backup
supabase db dump --project-id YOUR_PROJECT_ID > backup_$(date +%Y%m%d).sql
```

### Export des Fichiers (Storage)

Les fichiers uploadés (documents, images) sont stockés dans Supabase Storage.

**Export** :
1. Dashboard → Storage
2. Sélectionnez les buckets
3. Téléchargez ou utilisez l'API pour exporter

---

## 🔄 Restauration

### Restauration Complète

⚠️ **ATTENTION** : La restauration écrase toutes les données actuelles.

#### Via Supabase Dashboard

1. Dashboard → Database → Backups
2. Sélectionnez le backup à restaurer
3. Cliquez sur **"Restore"**
4. Confirmez l'opération
5. Attendez la restauration (peut prendre plusieurs minutes)

#### Via CLI

```bash
# Restaurer depuis un fichier SQL
psql $DATABASE_URL < backup_20260114.sql

# Ou via Supabase CLI
supabase db reset --db-url $DATABASE_URL --file backup_20260114.sql
```

### Restauration Partielle

Pour restaurer uniquement certaines tables :

```sql
-- Exemple: Restaurer uniquement la table users
psql $DATABASE_URL << EOF
\copy users FROM 'users_backup.csv' CSV HEADER;
EOF
```

---

## 📤 Exports de Données

### Export Utilisateur (RGPD)

Les utilisateurs peuvent exporter leurs données :

1. **Via l'application** :
   - Paramètres → Données → "Exporter mes données"
   - Format : ZIP contenant JSON + CSV + PDF

2. **Via API** (admin) :
   ```bash
   curl -X POST https://app.eduzen.io/api/admin/export-user-data \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"userId": "xxx"}'
   ```

### Export Comptable

Pour la comptabilité :

1. Dashboard → Paiements → Rapports
2. Sélectionnez la période
3. Exportez en **FEC** (Fichier des Écritures Comptables)

### Export Complet Organisation

Pour exporter toutes les données d'une organisation :

```bash
# Script d'export (à créer)
./scripts/export-organization-data.sh ORGANIZATION_ID
```

---

## ✅ Bonnes Pratiques

### 1. Fréquence

- ✅ **Quotidien** : Backups automatiques Supabase
- ✅ **Hebdomadaire** : Export manuel de vérification
- ✅ **Mensuel** : Export complet archivé hors Supabase

### 2. Stockage

- ✅ **Multi-lieux** : Supabase + Stockage externe (S3, Google Cloud)
- ✅ **Chiffrement** : Backups chiffrés
- ✅ **Rétention** : 30 jours minimum, 90 jours recommandé

### 3. Tests

- ✅ **Mensuel** : Tester la restauration sur un environnement de test
- ✅ **Vérification** : Vérifier l'intégrité des backups
- ✅ **Documentation** : Documenter les procédures

### 4. Sécurité

- ✅ **Accès limité** : Seuls les admins peuvent restaurer
- ✅ **Audit** : Logs de toutes les restaurations
- ✅ **Validation** : Vérifier les données après restauration

---

## 🚨 Procédure d'Urgence

### En Cas de Perte de Données

1. **Évaluer l'ampleur** :
   - Quelle table/quelle période ?
   - Impact utilisateurs ?

2. **Identifier le backup** :
   - Date du dernier backup valide
   - Localisation du fichier

3. **Restauration** :
   - Restaurer sur environnement de test d'abord
   - Vérifier l'intégrité
   - Restaurer en production

4. **Communication** :
   - Informer les utilisateurs si nécessaire
   - Documenter l'incident

---

## 📞 Support

Pour toute question sur les sauvegardes :

- **Email** : support@eduzen.io
- **Documentation Supabase** : https://supabase.com/docs/guides/database/backups

---

*Dernière mise à jour : 14 Janvier 2026*
