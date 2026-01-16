# 🗄️ Configuration Supabase : Local vs Production

**Date** : 16 Janvier 2026  
**Objectif** : Expliquer pourquoi et comment séparer les environnements Supabase

---

## ❌ POURQUOI NE PAS UTILISER LE MÊME PROJET ?

### Problèmes Majeurs

1. **Corruption des Données de Production** 🚨
   - Tests en local peuvent modifier/supprimer des données réelles
   - Erreurs de script peuvent affecter les utilisateurs
   - Impossible de revenir en arrière

2. **Sécurité** 🔒
   - Risque d'exposer les clés de production en local
   - Données sensibles accessibles pendant le développement
   - Pas d'isolation des environnements

3. **Performance** ⚡
   - Tests en local consomment les ressources de production
   - Impact sur les utilisateurs réels
   - Limites de quota partagées

4. **Debugging** 🐛
   - Données de test mélangées avec données réelles
   - Impossible de tester des migrations sans risque
   - Logs confus (dev + prod)

5. **Meilleure Pratique DevOps** ✅
   - Séparation stricte dev/staging/prod
   - Tests isolés avant déploiement
   - Rollback possible

---

## ✅ SOLUTION RECOMMANDÉE : 3 PROJETS SEPARÉS

### Architecture Recommandée

```
┌─────────────────────────────────────────────────────────┐
│                    LOCAL (Development)                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Supabase Local (Docker)                          │  │
│  │  - Données de test locales                        │  │
│  │  - Aucune limite                                  │  │
│  │  - Redémarrage possible                           │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    STAGING (Pre-Production)             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Supabase Staging (Cloud)                         │  │
│  │  - Données de test réalistes                      │  │
│  │  - Tests d'intégration                            │  │
│  │  - Validation avant prod                          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION (Live)                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Supabase Production (Cloud)                      │  │
│  │  - Données réelles utilisateurs                   │  │
│  │  - Haute disponibilité                            │  │
│  │  - Backups automatiques                           │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ CONFIGURATION : 3 PROJETS SEPARÉS

### Option 1 : Local + Production (Minimum)

**Pour débuter**, vous pouvez commencer avec **2 projets** :
- **Local** : Supabase Local (Docker) pour développement
- **Production** : Supabase Cloud pour production

### Option 2 : Local + Staging + Production (Recommandé)

**Pour un environnement professionnel**, utilisez **3 projets** :
- **Local** : Supabase Local (Docker) pour développement
- **Staging** : Supabase Cloud pour tests d'intégration
- **Production** : Supabase Cloud pour production

---

## 📝 CONFIGURATION DES VARIABLES D'ENVIRONNEMENT

### Structure des Fichiers `.env`

#### `.env.local` (Local - Ne jamais commiter)

```bash
# Supabase Local (Docker)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3001
NODE_ENV=development
```

#### `.env.staging` (Staging - Optionnel)

```bash
# Supabase Staging (Cloud)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx-staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...staging
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...staging

# Application
NEXT_PUBLIC_APP_URL=https://staging.votre-domaine.com
NODE_ENV=staging
```

#### `.env.production` (Production - Vercel)

**⚠️ Ne jamais créer un fichier `.env.production` dans le repo !**

Configurer directement dans **Vercel** → Settings → Environment Variables

```bash
# Supabase Production (Cloud)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx-prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...production
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...production

# Application
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
NODE_ENV=production
```

---

## 🚀 SETUP : LOCAL (Supabase Docker)

### 1. Installer Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Linux
npm install -g supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2. Initialiser Supabase Local

```bash
# Dans le répertoire du projet
supabase init

# Démarrer Supabase Local
supabase start

# Noter les clés affichées
# NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Appliquer les Migrations Localement

```bash
# Les migrations sont appliquées automatiquement au démarrage
# Ou manuellement :
supabase db reset  # Reset + applique toutes les migrations
```

### 4. Créer `.env.local`

```bash
# Copier .env.example vers .env.local
cp .env.example .env.local

# Éditer .env.local avec les clés du Supabase Local
# (voir les clés affichées après `supabase start`)
```

---

## ☁️ SETUP : PRODUCTION (Supabase Cloud)

### 1. Créer le Projet Production

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet : `eduzen-production`
3. **Région** : Choisir la plus proche (ex: West Europe)
4. **Mot de passe DB** : Générer un mot de passe fort (⚠️ **SAUVEGARDER**)

### 2. Noter les Informations

```
Project URL: https://xxxxx.supabase.co
Anon Key: eyJhbGc...
Service Role Key: eyJhbGc... (⚠️ SECRET)
```

### 3. Appliquer les Migrations Production

#### Option A : Via Supabase CLI (Recommandé)

```bash
# Se connecter
supabase login

# Lier le projet production
supabase link --project-ref xxxxx

# Appliquer les migrations
supabase db push
```

#### Option B : Via Dashboard

1. Aller dans SQL Editor
2. Pour chaque migration (dans l'ordre) :
   - Ouvrir `supabase/migrations/XXXX_*.sql`
   - Copier le contenu
   - Coller dans SQL Editor
   - Exécuter

### 4. Configurer dans Vercel

1. Aller dans Vercel → Settings → Environment Variables
2. Ajouter :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```
3. Sélectionner : **Production, Preview, Development**

---

## 📊 COMPARAISON : LOCAL vs PRODUCTION

| Critère | Local (Docker) | Production (Cloud) |
|---------|----------------|-------------------|
| **Données** | De test | Réelles |
| **Performance** | Limitée par machine | Optimisée |
| **Disponibilité** | Lors du démarrage | 24/7 |
| **Backups** | Aucun | Automatiques |
| **Coûts** | Gratuit | Payant (selon plan) |
| **Limites** | Aucune | Selon plan |
| **Utilisation** | Développement | Production |

---

## 🔄 WORKFLOW RECOMMANDÉ

### 1. Développement Local

```bash
# Démarrer Supabase Local
supabase start

# Démarrer l'application
npm run dev

# Tester les modifications
# Les données de test sont locales
```

### 2. Appliquer les Migrations

```bash
# Créer une nouvelle migration
supabase migration new nom_migration

# Tester localement
supabase db reset  # Applique toutes les migrations

# Appliquer en production
supabase db push  # Push vers le projet lié
```

### 3. Déploiement Production

```bash
# Les variables d'environnement sont dans Vercel
# Le déploiement se fait automatiquement via GitHub Actions
git push origin main
```

---

## ✅ CHECKLIST DE CONFIGURATION

### Local
- [ ] Supabase CLI installé
- [ ] `supabase init` exécuté
- [ ] `supabase start` réussi
- [ ] `.env.local` créé avec les clés locales
- [ ] Migrations appliquées localement

### Production
- [ ] Projet Supabase Production créé
- [ ] Migrations appliquées (167 fichiers)
- [ ] Storage buckets configurés
- [ ] Backups configurés
- [ ] Variables d'environnement dans Vercel
- [ ] RLS vérifié

---

## 🆘 DÉPANNAGE

### Problème : Supabase Local ne démarre pas

**Solutions** :
- Vérifier que Docker Desktop est démarré
- Vérifier les ports (54321, 54322)
- Redémarrer : `supabase stop && supabase start`

### Problème : Erreur de connexion en production

**Solutions** :
- Vérifier les variables d'environnement dans Vercel
- Vérifier que les migrations sont appliquées
- Vérifier les policies RLS

---

## 📚 RESSOURCES

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Environment Variables](https://supabase.com/docs/guides/cli/local-development#environment-variables)

---

## ⚠️ NOTES IMPORTANTES

### Sécurité

- ⚠️ **Ne jamais commiter** `.env.local` ou `.env.production`
- ⚠️ **Ne jamais partager** les Service Role Keys
- ✅ Utiliser `.env.example` pour documenter les variables nécessaires

### Meilleures Pratiques

- ✅ Toujours tester les migrations localement avant production
- ✅ Utiliser des seeds pour les données de test
- ✅ Vérifier RLS après chaque migration
- ✅ Monitorer les logs de production

---

**Dernière mise à jour** : 16 Janvier 2026
