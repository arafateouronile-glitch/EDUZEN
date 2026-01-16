# 🚀 Guide de Configuration Production

**Date** : 16 Janvier 2026  
**Objectif** : Configurer l'environnement de production complet

---

## 📋 Vue d'Ensemble

Ce guide détaille toutes les étapes pour configurer l'environnement de production d'EDUZEN.

---

## 1. Configuration Vercel

### 1.1 Créer le Projet

1. Aller sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Cliquer sur **"Add New"** → **"Project"**
3. Connecter le repository GitHub
4. Sélectionner le repository `EDUZEN`
5. Cliquer sur **"Import"**

### 1.2 Configuration du Build

Vercel détecte automatiquement Next.js, mais vérifier :
- **Framework Preset** : Next.js
- **Root Directory** : `./` (racine)
- **Build Command** : `npm run build`
- **Output Directory** : `.next` (par défaut)
- **Install Command** : `npm install`

### 1.3 Variables d'Environnement

Dans **Settings** → **Environment Variables**, ajouter :

#### Variables Obligatoires

```env
# Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet-prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_production
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role_production

# Application
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
NODE_ENV=production

# Sentry
SENTRY_DSN=https://votre-dsn@sentry.io/votre-projet
SENTRY_ORG=votre-organisation
SENTRY_PROJECT=votre-projet
SENTRY_AUTH_TOKEN=votre-token-auth

# Email
RESEND_API_KEY=re_votre_cle_api

# Secrets
CRON_SECRET=votre-secret-cron-aleatoire
ALLOWED_ORIGINS=https://votre-domaine.com
```

#### Variables Optionnelles

```env
# Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=votre-domaine.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Paiements
STRIPE_SECRET_KEY=sk_live_votre_cle
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_votre_cle
MOBILE_MONEY_API_KEY=votre_cle_api
MOBILE_MONEY_API_SECRET=votre_secret
```

**Important** :
- ✅ Sélectionner **"Production"** pour toutes les variables
- ✅ Ne JAMAIS commiter ces valeurs dans Git
- ✅ Utiliser les secrets Vercel pour les valeurs sensibles

### 1.4 Domaine Personnalisé

1. Aller dans **Settings** → **Domains**
2. Cliquer sur **"Add Domain"**
3. Entrer votre domaine (ex: `eduzen.com`)
4. Suivre les instructions DNS :
   - Ajouter un enregistrement `CNAME` pointant vers `cname.vercel-dns.com`
   - Ou ajouter un enregistrement `A` avec l'IP fournie
5. Vercel configure automatiquement SSL/HTTPS

### 1.5 Premier Déploiement

1. Cliquer sur **"Deploy"**
2. Attendre la fin du build
3. Vérifier que le déploiement est réussi
4. Tester l'URL de production

---

## 2. Configuration Supabase Production

### 2.1 Créer le Projet

1. Aller sur [Supabase Dashboard](https://app.supabase.com)
2. Cliquer sur **"New Project"**
3. Remplir les informations :
   - **Name** : `eduzen-production`
   - **Database Password** : Générer un mot de passe fort
   - **Region** : Choisir la région la plus proche de vos utilisateurs
   - **Pricing Plan** : Choisir selon vos besoins
4. Cliquer sur **"Create new project"**
5. Attendre la création (2-3 minutes)

### 2.2 Récupérer les Clés

1. Aller dans **Settings** → **API**
2. Noter :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public** key : `eyJhbGc...`
   - **service_role** key : `eyJhbGc...` (⚠️ SECRET, ne jamais exposer)

### 2.3 Appliquer les Migrations

#### Option 1 : Via Supabase CLI (Recommandé)

```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Se connecter
supabase login

# Lier le projet
supabase link --project-ref votre-project-ref

# Appliquer toutes les migrations
supabase db push
```

#### Option 2 : Via SQL Editor

1. Aller dans **SQL Editor** dans Supabase Dashboard
2. Pour chaque fichier dans `supabase/migrations/` :
   - Ouvrir le fichier
   - Copier le contenu SQL
   - Coller dans SQL Editor
   - Cliquer sur **"Run"**
3. **Important** : Appliquer dans l'ordre chronologique (par date du nom de fichier)

### 2.4 Vérifier RLS

1. Aller dans **Database** → **Tables**
2. Pour chaque table, vérifier :
   - ✅ **RLS Enabled** : `ON`
   - ✅ **Policies** : Au moins une policy pour SELECT, INSERT, UPDATE, DELETE
3. Tester l'isolation multi-tenant :
   ```sql
   -- Se connecter avec un utilisateur test
   -- Vérifier qu'il ne voit que ses propres données
   ```

### 2.5 Configurer Storage

1. Aller dans **Storage**
2. Créer les buckets suivants :
   - `documents` (public: false)
   - `logos` (public: true)
   - `docx-templates` (public: false)
   - `avatars` (public: true)
   - `signatures` (public: false)

3. Pour chaque bucket, configurer les policies RLS :
   ```sql
   -- Exemple pour documents
   CREATE POLICY "Users can upload documents"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

### 2.6 Configurer Backups

1. Aller dans **Settings** → **Database**
2. Activer **"Point-in-time Recovery"** (PITR)
3. Configurer :
   - **Backup Frequency** : Daily
   - **Retention** : 30 days
4. Tester la restauration (optionnel mais recommandé)

---

## 3. Configuration CI/CD GitHub Actions

Les workflows sont déjà créés dans `.github/workflows/`. Vérifier qu'ils sont activés :

### 3.1 Workflow Tests

Fichier : `.github/workflows/test.yml`

- ✅ S'exécute sur chaque PR
- ✅ Tests lint, type-check, unitaires, E2E
- ✅ Bloque le merge si tests échouent

### 3.2 Workflow Build

Fichier : `.github/workflows/build.yml`

- ✅ S'exécute sur chaque push vers `main`
- ✅ Build Next.js
- ✅ Vérifie bundle size

### 3.3 Workflow Deploy

Fichier : `.github/workflows/deploy-production.yml`

- ✅ Déploie automatiquement sur Vercel
- ✅ Nécessite les secrets GitHub configurés :
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`
  - `VERCEL_TOKEN`

**Configurer les secrets GitHub** :
1. Aller dans **Settings** → **Secrets and variables** → **Actions**
2. Ajouter les secrets Vercel

---

## 4. Configuration Sentry

### 4.1 Créer le Projet

1. Aller sur [Sentry Dashboard](https://sentry.io)
2. Créer un nouveau projet :
   - **Platform** : Next.js
   - **Name** : `eduzen-production`
3. Noter le **DSN** fourni

### 4.2 Configurer dans Vercel

1. Dans Vercel, aller dans **Settings** → **Environment Variables**
2. Ajouter :
   ```env
   SENTRY_DSN=https://votre-dsn@sentry.io/votre-projet
   SENTRY_ORG=votre-organisation
   SENTRY_PROJECT=votre-projet
   SENTRY_AUTH_TOKEN=votre-token-auth
   ```

### 4.3 Configurer Source Maps

Les source maps sont déjà configurées dans `sentry.client.config.ts` et `sentry.server.config.ts`.

Vérifier que `SENTRY_AUTH_TOKEN` est configuré pour uploader les source maps.

### 4.4 Configurer Alertes

1. Dans Sentry, aller dans **Alerts**
2. Créer des alertes pour :
   - **Errors** : Taux d'erreur > 5%
   - **Performance** : P95 > 2s
   - **Issues** : Nouvelle issue critique
3. Configurer les notifications (Email, Slack, etc.)

---

## 5. Checklist de Vérification

### Avant le Déploiement

- [ ] ✅ Projet Vercel créé et configuré
- [ ] ✅ Toutes les variables d'environnement configurées
- [ ] ✅ Domaine personnalisé configuré
- [ ] ✅ Projet Supabase Production créé
- [ ] ✅ Toutes les migrations appliquées
- [ ] ✅ RLS vérifié sur toutes les tables
- [ ] ✅ Storage buckets configurés
- [ ] ✅ Backups activés
- [ ] ✅ Secrets GitHub Actions configurés
- [ ] ✅ Projet Sentry créé et configuré
- [ ] ✅ Source maps configurés

### Après le Déploiement

- [ ] ✅ Application accessible sur le domaine
- [ ] ✅ HTTPS/SSL actif
- [ ] ✅ Headers de sécurité présents
- [ ] ✅ Authentification fonctionne
- [ ] ✅ Base de données accessible
- [ ] ✅ Storage fonctionne
- [ ] ✅ Sentry reçoit les erreurs
- [ ] ✅ CI/CD fonctionne

---

## 6. Commandes Utiles

### Vercel CLI

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Lier le projet
vercel link

# Déployer
vercel --prod

# Voir les logs
vercel logs
```

### Supabase CLI

```bash
# Appliquer migrations
supabase db push

# Générer types
supabase gen types typescript --project-id votre-project-id > types/database.types.ts

# Voir les logs
supabase logs
```

---

## 7. Support

En cas de problème :
1. Vérifier les logs Vercel
2. Vérifier les logs Supabase
3. Vérifier Sentry pour les erreurs
4. Consulter la documentation :
   - [Vercel Docs](https://vercel.com/docs)
   - [Supabase Docs](https://supabase.com/docs)
   - [Sentry Docs](https://docs.sentry.io)

---

**Dernière mise à jour** : 16 Janvier 2026
