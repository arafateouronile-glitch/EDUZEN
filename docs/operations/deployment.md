# 🚀 Guide de Déploiement Production

Guide opérationnel pour déployer EDUZEN en production.

---

## 📋 Table des Matières

1. [Prérequis](#prérequis)
2. [Configuration Vercel](#configuration-vercel)
3. [Configuration Supabase](#configuration-supabase)
4. [Déploiement](#déploiement)
5. [Vérification Post-Déploiement](#vérification-post-déploiement)
6. [Rollback](#rollback)

---

## ✅ Prérequis

### Comptes Requis

- [ ] Compte Vercel (gratuit ou payant)
- [ ] Projet Supabase Production
- [ ] Compte Sentry (pour monitoring)
- [ ] Domaine personnalisé (optionnel)

### Outils Locaux

- [ ] Node.js 20+
- [ ] Git
- [ ] Supabase CLI (optionnel)

---

## ⚙️ Configuration Vercel

### 1. Créer un Projet

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur **"New Project"**
3. Importez votre repository GitHub
4. Configurez le projet :
   - **Framework Preset** : Next.js
   - **Root Directory** : `./`
   - **Build Command** : `npm run build`
   - **Output Directory** : `.next`

### 2. Variables d'Environnement

Dans Vercel Dashboard → Settings → Environment Variables, ajoutez :

**Obligatoires** :
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=https://app.eduzen.io
NEXTAUTH_SECRET=xxxxx
NEXTAUTH_URL=https://app.eduzen.io
NODE_ENV=production
```

**Optionnelles** :
```
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
RESEND_API_KEY=re_xxxxx
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=app.eduzen.io
```

**Important** : Sélectionnez **"Production"** pour toutes les variables.

### 3. Domaine Personnalisé

1. Vercel Dashboard → Settings → Domains
2. Cliquez sur **"Add Domain"**
3. Entrez votre domaine : `app.eduzen.io`
4. Suivez les instructions DNS :
   - Ajoutez un enregistrement CNAME pointant vers `cname.vercel-dns.com`
   - Ou configurez les DNS selon les instructions Vercel

5. SSL/HTTPS est activé automatiquement par Vercel

### 4. Build Settings

Vercel Dashboard → Settings → General :

- **Build Command** : `npm run build`
- **Output Directory** : `.next`
- **Install Command** : `npm ci`
- **Node Version** : `20.x`

---

## 🗄️ Configuration Supabase

### 1. Créer un Projet Production

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un **nouveau projet** (dédié à la production)
3. Notez :
   - Project URL
   - Anon Key
   - Service Role Key

### 2. Appliquer les Migrations

```bash
# Configurer DATABASE_URL
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Appliquer les migrations
./scripts/migrate-production.sh
```

Ou via Supabase Dashboard :
1. Dashboard → SQL Editor
2. Exécutez chaque migration dans l'ordre

### 3. Vérifier RLS

```bash
# Vérifier que RLS est activé
./scripts/verify-rls-production.sh
```

### 4. Configurer Storage

1. Dashboard → Storage
2. Créez les buckets nécessaires :
   - `documents` (public ou private selon besoin)
   - `avatars` (public)
   - `attachments` (private)

3. Configurez les policies RLS pour chaque bucket

### 5. Activer les Backups

1. Dashboard → Settings → Database → Backups
2. Activez **"Daily Backups"**
3. Configurez la rétention : **30 jours minimum**

---

## 🚀 Déploiement

### Méthode 1 : Déploiement Automatique (Recommandé)

**Via GitHub Actions** (déjà configuré) :

1. Poussez sur la branche `main`
2. Le workflow `.github/workflows/deploy.yml` se déclenche automatiquement
3. Les tests sont exécutés
4. Le build est créé
5. Le déploiement sur Vercel est effectué

**Vérification** :
- GitHub Actions → Voir les logs
- Vercel Dashboard → Deployments → Vérifier le statut

### Méthode 2 : Déploiement Manuel

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer en production
vercel --prod
```

---

## ✅ Vérification Post-Déploiement

### 1. Smoke Tests

```bash
# Configurer l'URL
export NEXT_PUBLIC_APP_URL=https://app.eduzen.io

# Exécuter les tests
./scripts/smoke-tests-production.sh
```

### 2. Vérification Sécurité

```bash
# Vérifier HTTPS, headers, variables
./scripts/security-check-production.sh
```

### 3. Tests Manuels

- [ ] Page d'accueil accessible
- [ ] Connexion fonctionne
- [ ] Dashboard charge correctement
- [ ] Création d'un étudiant fonctionne
- [ ] Génération de document fonctionne
- [ ] Emails sont envoyés

### 4. Monitoring

- [ ] Sentry reçoit les erreurs
- [ ] Analytics fonctionne (Plausible/GA)
- [ ] Logs Vercel accessibles

---

## 🔄 Rollback

### En Cas de Problème

#### Via Vercel Dashboard

1. Allez dans **Deployments**
2. Trouvez le déploiement précédent (qui fonctionnait)
3. Cliquez sur **"..."** → **"Promote to Production"**

#### Via CLI

```bash
# Lister les déploiements
vercel ls

# Promouvoir un déploiement spécifique
vercel promote [DEPLOYMENT_URL]
```

### Rollback de la Base de Données

Si nécessaire :

1. Dashboard Supabase → Database → Backups
2. Sélectionnez le backup d'avant le problème
3. Cliquez sur **"Restore"**
4. ⚠️ Cela écrase toutes les données actuelles

---

## 📊 Checklist de Déploiement

### Avant le Déploiement

- [ ] Tous les tests passent localement
- [ ] Build fonctionne sans erreur
- [ ] Variables d'environnement configurées
- [ ] Migrations Supabase appliquées
- [ ] RLS vérifié
- [ ] Backups activés

### Après le Déploiement

- [ ] Smoke tests passent
- [ ] Vérification sécurité OK
- [ ] Tests manuels OK
- [ ] Monitoring actif
- [ ] Documentation mise à jour

---

## 🆘 Support

En cas de problème :

- **Documentation Vercel** : https://vercel.com/docs
- **Documentation Supabase** : https://supabase.com/docs
- **Support EDUZEN** : support@eduzen.io

---

*Dernière mise à jour : 14 Janvier 2026*
