---
title: Guide Tests E2E avec Playwright
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🧪 Guide Tests E2E avec Playwright

**Date :** 2024-12-03  
**Statut :** Configuration complète créée

---

## 📋 Installation

### Dépendances

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Configuration

Le fichier `playwright.config.ts` est déjà configuré avec :
- ✅ Support multi-navigateurs (Chrome, Firefox, Safari)
- ✅ Support mobile (Chrome Mobile, Safari Mobile)
- ✅ Serveur de développement automatique
- ✅ Screenshots et vidéos en cas d'échec
- ✅ Traces pour le débogage

---

## 🚀 Exécution des Tests

### Commandes de Base

```bash
# Exécuter tous les tests
npx playwright test

# Exécuter en mode interactif (UI)
npx playwright test --ui

# Exécuter avec navigateur visible
npx playwright test --headed

# Exécuter un fichier spécifique
npx playwright test e2e/auth.spec.ts

# Exécuter en mode debug
npx playwright test --debug
```

### Options Avancées

```bash
# Exécuter sur un navigateur spécifique
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Exécuter en mode parallèle
npx playwright test --workers=4

# Générer un rapport HTML
npx playwright test --reporter=html
```

---

## 📝 Structure des Tests

### Fichiers de Tests

```
e2e/
├── example.spec.ts      # Exemples de tests
├── auth.spec.ts         # Tests d'authentification
├── dashboard.spec.ts    # Tests du dashboard
└── ...
```

### Structure d'un Test

```typescript
import { test, expect } from '@playwright/test'

test.describe('Nom du groupe de tests', () => {
  test.beforeEach(async ({ page }) => {
    // Configuration avant chaque test
    await page.goto('/')
  })

  test('description du test', async ({ page }) => {
    // Actions
    await page.click('button')
    
    // Assertions
    await expect(page.locator('h1')).toContainText('Expected Text')
  })
})
```

---

## 🎯 Tests Créés

### 1. `e2e/example.spec.ts`
- ✅ Test page d'accueil
- ✅ Test authentification
- ✅ Test dashboard
- ✅ Test navigation

### 2. `e2e/auth.spec.ts`
- ✅ Test affichage page de connexion
- ✅ Test erreur identifiants invalides
- ✅ Test redirection après connexion

### 3. `e2e/dashboard.spec.ts`
- ✅ Test affichage statistiques
- ✅ Test affichage graphiques
- ✅ Test navigation

---

## 🔧 Configuration Avancée

### Variables d'Environnement

Créer un fichier `.env.test` :

```env
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
```

### Authentification dans les Tests

Créer un helper pour l'authentification :

```typescript
// e2e/helpers/auth.ts
export async function login(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/)
}
```

---

## 📊 Coverage E2E

### Objectifs

- **Flux critiques :** 100% couverts
- **Pages principales :** >80% couvertes
- **Fonctionnalités clés :** >70% couvertes

### Flux à Tester

1. ✅ Authentification (connexion, déconnexion)
2. ✅ Dashboard (affichage, navigation)
3. ⏳ Gestion étudiants (CRUD)
4. ⏳ Gestion sessions (CRUD)
5. ⏳ Paiements (création, suivi)
6. ⏳ Documents (génération, téléchargement)

---

## 🐛 Débogage

### Mode Debug

```bash
npx playwright test --debug
```

### Traces

Les traces sont automatiquement générées en cas d'échec. Pour les visualiser :

```bash
npx playwright show-trace trace.zip
```

### Screenshots et Vidéos

- Screenshots : `test-results/`
- Vidéos : `test-results/`
- Rapport HTML : `playwright-report/`

---

## ✅ Checklist

- [x] Configuration Playwright créée
- [x] Tests d'exemple créés
- [x] Tests authentification créés
- [x] Tests dashboard créés
- [ ] Tests étudiants (à créer)
- [ ] Tests sessions (à créer)
- [ ] Tests paiements (à créer)
- [ ] Tests documents (à créer)
- [ ] Helper d'authentification (à créer)
- [ ] Coverage >80% pages principales

---

## 🎯 Prochaines Étapes

1. **Créer helper d'authentification**
2. **Créer tests pour étudiants**
3. **Créer tests pour sessions**
4. **Créer tests pour paiements**
5. **Atteindre coverage cible**

---

**Statut :** ✅ Configuration complète, tests de base créés---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.