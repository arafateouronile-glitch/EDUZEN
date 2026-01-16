# 🔧 GUIDE ACTIONS MANUELLES - PHASE 2

**Date** : 16 Janvier 2026  
**Objectif** : Configurer Vercel, Supabase Production et Sentry  
**Durée estimée** : 1-2 jours

---

## 📋 CHECKLIST GLOBALE

- [ ] Vercel : Projet créé et configuré
- [ ] Supabase : Projet Production créé
- [ ] Supabase : Migrations appliquées
- [ ] Supabase : Storage configuré
- [ ] Supabase : Backups configurés
- [ ] Sentry : Projet créé
- [ ] Sentry : DSN configuré
- [ ] GitHub : Secrets configurés

---

## 🚀 ÉTAPE 1 : VERCEL

### 1.1 Créer le Projet Vercel

1. **Aller sur [vercel.com](https://vercel.com)**
   - Se connecter avec votre compte GitHub

2. **Créer un nouveau projet**
   - Cliquer sur "Add New..." → "Project"
   - Sélectionner votre repository GitHub `EDUZEN`
   - Cliquer sur "Import"

3. **Configurer le projet**
   - **Project Name** : `eduzen` (ou votre choix)
   - **Framework Preset** : Next.js (détecté automatiquement)
   - **Root Directory** : `./` (racine)
   - **Build Command** : `npm run build` (par défaut)
   - **Output Directory** : `.next` (par défaut)
   - **Install Command** : `npm install` (par défaut)

4. **Ne pas déployer maintenant**
   - Cliquer sur "Skip" ou fermer la fenêtre
   - On configurera les variables d'environnement d'abord

### 1.2 Configurer les Variables d'Environnement

1. **Aller dans Settings → Environment Variables**

2. **Ajouter les variables suivantes** (pour Production, Preview, Development) :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key

# Application
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
NEXT_PUBLIC_APP_NAME=EDUZEN

# Sentry (on le configurera après)
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# Email (Resend)
RESEND_API_KEY=re_xxx

# Paiements (si utilisé)
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Autres
NODE_ENV=production
```

**⚠️ IMPORTANT** :
- Remplacer `votre-projet` par votre ID Supabase
- Remplacer `votre-domaine.com` par votre domaine
- Obtenir les clés depuis vos services respectifs

3. **Sauvegarder** toutes les variables

### 1.3 Configurer le Domaine Personnalisé

1. **Aller dans Settings → Domains**

2. **Ajouter un domaine**
   - Entrer votre domaine (ex: `app.eduzen.io`)
   - Suivre les instructions DNS

3. **Configurer DNS**
   - Ajouter un enregistrement CNAME pointant vers `cname.vercel-dns.com`
   - Ou utiliser les serveurs de noms Vercel

4. **Attendre la validation** (peut prendre quelques minutes)

5. **SSL automatique** : Vercel configure automatiquement SSL/HTTPS

### 1.4 Premier Déploiement

1. **Aller dans Deployments**

2. **Déployer depuis la branche `main`**
   - Cliquer sur "Deploy" ou pousser un commit sur `main`
   - Le déploiement se fera automatiquement

3. **Vérifier le déploiement**
   - Attendre la fin du build
   - Vérifier que le déploiement est "Ready"
   - Tester l'URL de déploiement

---

## 🗄️ ÉTAPE 2 : SUPABASE PRODUCTION

### ⚠️ IMPORTANT : Séparation Local vs Production

**Ne pas utiliser le même projet Supabase pour local et production !**

- **Local** : Utilisez Supabase Local (Docker) - voir `docs/SUPABASE_ENVIRONMENTS_SETUP.md`
- **Production** : Créez un projet Supabase Cloud séparé

**Raisons** :
- 🚨 Éviter la corruption des données de production
- 🔒 Sécurité (isolation des environnements)
- ⚡ Performance (pas d'impact sur les utilisateurs)
- ✅ Meilleure pratique DevOps

### 2.1 Créer le Projet Supabase Production

1. **Aller sur [supabase.com](https://supabase.com)**
   - Se connecter avec votre compte

2. **Créer un nouveau projet** (⚠️ **SEPARÉ du projet local**)
   - Cliquer sur "New Project"
   - **Name** : `eduzen-production` (ou votre choix)
   - **Database Password** : Générer un mot de passe fort (⚠️ **SAUVEGARDER**)
   - **Region** : Choisir la région la plus proche (ex: `West Europe`)
   - **Pricing Plan** : Choisir votre plan

3. **Attendre la création** (2-3 minutes)

4. **Noter les informations importantes** :
   - Project URL : `https://xxxxx.supabase.co`
   - Anon Key : `eyJhbGc...`
   - Service Role Key : `eyJhbGc...` (⚠️ **SECRET**, ne jamais exposer)

### 2.2 Appliquer les Migrations

#### Option A : Via Supabase CLI (Recommandé)

1. **Installer Supabase CLI** (si pas déjà fait) :
```bash
npm install -g supabase
```

2. **Se connecter** :
```bash
supabase login
```

3. **Lier le projet** :
```bash
supabase link --project-ref votre-project-ref
```

4. **Appliquer les migrations** :
```bash
supabase db push
```

#### Option B : Via Supabase Dashboard

1. **Aller dans SQL Editor**

2. **Pour chaque migration** (dans l'ordre) :
   - Ouvrir le fichier de migration : `supabase/migrations/XXXX_*.sql`
   - Copier le contenu
   - Coller dans SQL Editor
   - Exécuter

3. **Vérifier l'ordre** :
   - Les migrations sont nommées avec des dates
   - Appliquer dans l'ordre chronologique

### 2.3 Configurer Storage Buckets

1. **Aller dans Storage**

2. **Créer les buckets suivants** :

#### Bucket : `documents`
- **Name** : `documents`
- **Public** : ❌ Non (privé)
- **File size limit** : 10 MB (ou selon vos besoins)
- **Allowed MIME types** : `application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document`

#### Bucket : `logos`
- **Name** : `logos`
- **Public** : ✅ Oui (pour afficher les logos)
- **File size limit** : 2 MB
- **Allowed MIME types** : `image/png,image/jpeg,image/jpg,image/svg+xml`

#### Bucket : `docx-templates`
- **Name** : `docx-templates`
- **Public** : ❌ Non (privé)
- **File size limit** : 5 MB
- **Allowed MIME types** : `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

3. **Configurer les Policies RLS** :

Pour chaque bucket, aller dans "Policies" et créer :

**Policy pour `documents`** :
```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow users to read their organization's documents
CREATE POLICY "Users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');
```

**Policy pour `logos`** :
```sql
-- Allow authenticated users to upload logos
CREATE POLICY "Users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Allow public read access
CREATE POLICY "Public can read logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');
```

**Policy pour `docx-templates`** :
```sql
-- Allow authenticated users to upload templates
CREATE POLICY "Users can upload docx templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'docx-templates');

-- Allow authenticated users to read templates
CREATE POLICY "Users can read docx templates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'docx-templates');
```

### 2.4 Configurer les Backups

1. **Aller dans Settings → Database**

2. **Activer Point-in-Time Recovery (PITR)**
   - Si disponible sur votre plan
   - Permet de restaurer à n'importe quel point dans le temps

3. **Configurer les backups automatiques**
   - **Frequency** : Daily (quotidien)
   - **Retention** : 30 days (30 jours)
   - **Time** : Choisir une heure de faible trafic (ex: 2h du matin)

4. **Tester la restauration** (optionnel mais recommandé)
   - Créer un projet de test
   - Restaurer un backup
   - Vérifier que tout fonctionne

### 2.5 Vérifier RLS

1. **Aller dans Table Editor**

2. **Pour chaque table importante** :
   - Vérifier que "RLS Enabled" est ✅ activé
   - Vérifier qu'il y a des policies créées

3. **Tables à vérifier** :
   - `users`
   - `organizations`
   - `students`
   - `invoices`
   - `payments`
   - `enrollments`
   - `sessions`
   - Etc.

---

## 📊 ÉTAPE 3 : SENTRY

### 3.1 Créer le Projet Sentry

1. **Aller sur [sentry.io](https://sentry.io)**
   - Se connecter avec votre compte

2. **Créer un nouveau projet**
   - Cliquer sur "Create Project"
   - **Platform** : Next.js
   - **Project Name** : `eduzen-production`
   - **Team** : Sélectionner votre équipe

3. **Noter le DSN**
   - Le DSN sera affiché : `https://xxx@sentry.io/xxx`
   - ⚠️ **SAUVEGARDER** ce DSN

### 3.2 Configurer Sentry dans Vercel

1. **Retourner sur Vercel**
   - Aller dans Settings → Environment Variables

2. **Ajouter les variables Sentry** :
```bash
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ORG=votre-org
SENTRY_PROJECT=eduzen-production
SENTRY_AUTH_TOKEN=votre-auth-token
```

3. **Obtenir l'Auth Token** :
   - Aller sur Sentry → Settings → Auth Tokens
   - Créer un nouveau token avec les permissions :
     - `project:read`
     - `project:releases`
     - `org:read`

### 3.3 Configurer Source Maps

1. **Installer Sentry CLI** (si pas déjà fait) :
```bash
npm install -g @sentry/cli
```

2. **Configurer dans `sentry.properties`** (créer à la racine) :
```properties
defaults.url=https://sentry.io/
defaults.org=votre-org
defaults.project=eduzen-production
auth.token=votre-auth-token
```

3. **Ajouter au workflow GitHub Actions** :
   - Le workflow `.github/workflows/deploy-production.yml` devrait déjà inclure l'upload des source maps
   - Vérifier que c'est bien configuré

### 3.4 Configurer les Alertes

1. **Aller dans Sentry → Alerts**

2. **Créer des alertes** :

#### Alerte : Erreurs Critiques
- **Condition** : Issue count > 10 in 1 hour
- **Action** : Email notification
- **Filtres** : Level = Error, Status = Unresolved

#### Alerte : Performance Dégradée
- **Condition** : P95 latency > 3s
- **Action** : Email notification

#### Alerte : Taux d'Erreur Élevé
- **Condition** : Error rate > 2%
- **Action** : Email notification

---

## 🔐 ÉTAPE 4 : GITHUB SECRETS

### 4.1 Configurer les Secrets GitHub

1. **Aller sur GitHub → Repository → Settings → Secrets and variables → Actions**

2. **Ajouter les secrets suivants** :

```bash
# Vercel
VERCEL_ORG_ID=votre-org-id
VERCEL_PROJECT_ID=votre-project-id
VERCEL_TOKEN=votre-vercel-token

# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key

# Sentry
SENTRY_AUTH_TOKEN=votre-auth-token
SENTRY_ORG=votre-org
SENTRY_PROJECT=eduzen-production

# Autres
NPM_TOKEN=votre-npm-token (si vous publiez des packages)
```

3. **Obtenir Vercel Token** :
   - Aller sur Vercel → Settings → Tokens
   - Créer un nouveau token avec les permissions nécessaires

---

## ✅ VÉRIFICATION FINALE

### Checklist de Vérification

- [ ] ✅ Vercel : Projet créé et déployé
- [ ] ✅ Vercel : Variables d'environnement configurées
- [ ] ✅ Vercel : Domaine configuré avec SSL
- [ ] ✅ Supabase : Projet Production créé
- [ ] ✅ Supabase : Migrations appliquées
- [ ] ✅ Supabase : Storage buckets créés
- [ ] ✅ Supabase : Backups configurés
- [ ] ✅ Supabase : RLS vérifié
- [ ] ✅ Sentry : Projet créé
- [ ] ✅ Sentry : DSN configuré dans Vercel
- [ ] ✅ Sentry : Alertes configurées
- [ ] ✅ GitHub : Secrets configurés

### Test Rapide

1. **Tester l'application en production** :
   - Aller sur votre domaine
   - Vérifier que la page se charge
   - Tester la connexion

2. **Vérifier les logs** :
   - Vercel Logs : Dashboard → Deployments → [Dernier] → Logs
   - Sentry : Dashboard → Issues
   - Supabase Logs : Dashboard → Logs

3. **Vérifier les erreurs** :
   - Si des erreurs apparaissent, vérifier les variables d'environnement
   - Vérifier les logs pour identifier le problème

---

## 🆘 DÉPANNAGE

### Problème : Déploiement Vercel échoue

**Solutions** :
- Vérifier les variables d'environnement
- Vérifier les logs de build
- Vérifier que `package.json` contient le script `build`

### Problème : Erreur de connexion Supabase

**Solutions** :
- Vérifier `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Vérifier que les migrations sont appliquées
- Vérifier les policies RLS

### Problème : Sentry ne reçoit pas d'erreurs

**Solutions** :
- Vérifier `SENTRY_DSN` dans Vercel
- Vérifier que Sentry est bien initialisé dans le code
- Vérifier les logs Vercel

---

## 📝 NOTES IMPORTANTES

### ⚠️ Sécurité

- **Ne jamais commiter** les secrets dans le code
- **Utiliser toujours** les variables d'environnement
- **Limiter l'accès** aux secrets GitHub et Vercel
- **Roter régulièrement** les tokens et clés

### 📊 Monitoring

- Configurer des alertes pour être notifié des problèmes
- Surveiller les logs régulièrement
- Configurer des dashboards de monitoring

---

**Dernière mise à jour** : 16 Janvier 2026
