---
title: Guide CICD
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🚀 Guide CI/CD

Ce document décrit la configuration et l'utilisation du pipeline CI/CD pour EDUZEN.

## 🎯 Vue d'ensemble

Le pipeline CI/CD automatise :
- ✅ Tests (unitaires, intégration, E2E)
- ✅ Linting et vérification de types
- ✅ Build de l'application
- ✅ Vérifications de sécurité
- ✅ Déploiement automatique (staging et production)

## 📋 Workflows GitHub Actions

### 1. PR Checks (`.github/workflows/pr-checks.yml`)

**Déclenchement** : Sur chaque Pull Request

**Jobs** :
- **Lint & Type Check** : ESLint et TypeScript
- **Test** : Tests unitaires et d'intégration
- **Build** : Vérification que le build passe
- **Security** : Audit npm et vérification des secrets
- **PR Size Check** : Alerte si la PR est trop grande

**Objectif** : Vérifier que le code est prêt pour la review

### 2. CI (`.github/workflows/ci.yml`)

**Déclenchement** : Sur chaque push vers `main` ou `develop`

**Jobs** :
- **Lint & Type Check** : Vérification du code
- **Test** : Tests avec couverture
- **Build** : Build de l'application
- **Security** : Vérifications de sécurité

**Objectif** : Vérifier que le code est stable

### 3. Deploy to Staging (`.github/workflows/deploy-staging.yml`)

**Déclenchement** : Sur push vers `develop` ou manuellement

**Jobs** :
- **Deploy** : Déploiement automatique sur staging

**Objectif** : Déployer automatiquement sur l'environnement de staging

### 4. Deploy to Production (`.github/workflows/deploy-production.yml`)

**Déclenchement** : Sur push vers `main` ou manuellement

**Jobs** :
- **Deploy** : Déploiement automatique sur production
- **Smoke Tests** : Tests de santé après déploiement

**Objectif** : Déployer automatiquement sur l'environnement de production

### 5. E2E Tests (`.github/workflows/test-e2e.yml`)

**Déclenchement** : Sur PR et push vers `main`/`develop`

**Jobs** :
- **E2E** : Tests end-to-end avec Playwright

**Objectif** : Vérifier que les parcours utilisateur fonctionnent

## 🔧 Configuration

### Secrets GitHub

Configurez les secrets suivants dans GitHub (Settings → Secrets and variables → Actions) :

#### Requis pour tous les environnements
- `NEXT_PUBLIC_SUPABASE_URL` : URL de votre projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé anonyme Supabase

#### Optionnels
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` : Domaine Plausible Analytics
- `NEXT_PUBLIC_GA_ID` : ID Google Analytics
- `SENTRY_DSN` : DSN Sentry
- `SENTRY_AUTH_TOKEN` : Token d'authentification Sentry

#### Pour Vercel
- `VERCEL_TOKEN` : Token Vercel
- `VERCEL_ORG_ID` : ID de l'organisation Vercel
- `VERCEL_PROJECT_ID` : ID du projet Vercel

#### Pour les tests E2E
- `PLAYWRIGHT_TEST_BASE_URL` : URL de base pour les tests (optionnel, défaut: http://localhost:3001)

### Branch Protection Rules

Configurez les règles de protection de branches dans GitHub :

1. **Settings → Branches → Add rule**
2. **Branch name pattern** : `main` et `develop`
3. **Protect matching branches** :
   - ✅ Require a pull request before merging
   - ✅ Require approvals : 1
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging

4. **Status checks** :
   - `lint-and-type-check`
   - `test`
   - `build`
   - `security`

## 🚀 Workflow de Développement

### 1. Développement Local

```bash
# Créer une branche
git checkout -b feature/ma-feature

# Développer
# ... faire des changements ...

# Tester localement
npm run test
npm run lint
npm run type-check
npm run build

# Commiter
git add .
git commit -m "feat: ajouter ma feature"
git push origin feature/ma-feature
```

### 2. Pull Request

1. Créer une PR sur GitHub
2. Les checks automatiques s'exécutent :
   - ✅ Lint & Type Check
   - ✅ Tests
   - ✅ Build
   - ✅ Security
3. Attendre l'approbation
4. Merge dans `develop`

### 3. Déploiement Staging

1. Push vers `develop` déclenche automatiquement :
   - ✅ Tests
   - ✅ Build
   - ✅ Déploiement sur staging
2. Vérifier que tout fonctionne sur staging
3. Créer une PR `develop` → `main` pour production

### 4. Déploiement Production

1. Push vers `main` déclenche automatiquement :
   - ✅ Tous les tests (unitaires, intégration, E2E)
   - ✅ Build
   - ✅ Déploiement sur production
   - ✅ Smoke tests
2. Vérifier que tout fonctionne sur production

## 📊 Monitoring

### Status des Workflows

Consultez le statut des workflows dans :
- **GitHub → Actions** : Vue d'ensemble de tous les workflows
- **GitHub → Pull Requests** : Status checks sur chaque PR

### Artifacts

Les artifacts suivants sont générés :
- **Coverage Report** : Rapport de couverture de code (7 jours)
- **Playwright Report** : Rapport des tests E2E (7 jours)
- **Playwright Videos** : Vidéos des tests E2E (7 jours)

## 🔍 Debugging

### Workflow Failed

1. **Vérifier les logs** : Cliquer sur le workflow failed → Voir les logs
2. **Reproduire localement** : Exécuter les mêmes commandes localement
3. **Vérifier les secrets** : S'assurer que tous les secrets sont configurés
4. **Vérifier les dépendances** : S'assurer que `package.json` est à jour

### Tests Failed

1. **Vérifier les logs de test** : Voir les détails dans les logs
2. **Exécuter localement** : `npm run test`
3. **Vérifier l'environnement** : Variables d'environnement, base de données, etc.

### Build Failed

1. **Vérifier les erreurs de build** : Voir les logs
2. **Tester localement** : `npm run build`
3. **Vérifier les variables d'environnement** : S'assurer qu'elles sont définies

## 🎯 Bonnes Pratiques

### 1. Commits

- Utilisez des messages de commit clairs
- Suivez le format Conventional Commits
- Commitez souvent

### 2. Pull Requests

- Créez des PRs petites et focalisées
- Remplissez le template de PR
- Attendez que tous les checks passent
- Demandez des reviews

### 3. Tests

- Écrivez des tests pour chaque nouvelle fonctionnalité
- Maintenez la couverture de code > 60%
- Testez localement avant de pousser

### 4. Déploiement

- Ne déployez jamais directement sur `main`
- Testez toujours sur staging d'abord
- Surveillez les déploiements en production

## 🔄 Rollback

En cas de problème en production :

1. **Identifier le commit problématique**
2. **Revert le commit** :
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
3. **Ou rollback manuel** : Déployer une version précédente

## 📚 Ressources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment](https://vercel.com/docs)
- [Playwright CI](https://playwright.dev/docs/ci)

---

**Note** : Le pipeline CI/CD est configuré et prêt à être utilisé. Assurez-vous de configurer tous les secrets nécessaires avant le premier déploiement.---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

