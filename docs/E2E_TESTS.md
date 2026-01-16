---
title: Guide des Tests E2E
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Guide des Tests E2E

## Vue d'ensemble

Les tests E2E (End-to-End) utilisent Playwright pour tester les parcours utilisateur complets dans l'application.

## Structure

```
e2e/
  ├── auth.spec.ts          # Tests d'authentification
  ├── dashboard.spec.ts     # Tests du dashboard
  ├── students.spec.ts      # Tests de gestion des étudiants
  ├── documents.spec.ts     # Tests de gestion des documents
  ├── payments.spec.ts     # Tests de gestion des paiements
  ├── attendance.spec.ts   # Tests de gestion des présences
  ├── messaging.spec.ts     # Tests de messagerie
  ├── learner.spec.ts       # Tests de l'espace apprenant
  ├── navigation.spec.ts    # Tests de navigation
  ├── search.spec.ts        # Tests de recherche globale
  ├── notifications.spec.ts # Tests de notifications
  └── helpers/
      └── auth.ts           # Helpers pour l'authentification
```

## Parcours utilisateur testés

### 1. Authentification
- Connexion
- Inscription
- Déconnexion
- Gestion des erreurs d'authentification

### 2. Dashboard
- Affichage du dashboard
- Statistiques
- Navigation rapide

### 3. Gestion des étudiants
- Liste des étudiants
- Création d'un étudiant
- Recherche d'étudiants
- Filtrage
- Export

### 4. Gestion des documents
- Liste des documents
- Génération de documents
- Recherche
- Filtrage

### 5. Gestion des paiements
- Liste des factures
- Recherche
- Filtrage

### 6. Gestion des présences
- Enregistrement de présences
- Historique
- Sélection de session

### 7. Messagerie
- Liste des conversations
- Création de conversation
- Envoi de messages
- Pièces jointes

### 8. Espace apprenant
- Accès via lien
- Navigation
- Consultation des formations

### 9. Navigation
- Navigation entre les pages
- Menu latéral
- Déconnexion

### 10. Recherche globale
- Barre de recherche
- Résultats
- Navigation vers les résultats

### 11. Notifications
- Badge de notifications
- Centre de notifications
- Marquage comme lu

## Exécution des tests

### Localement

```bash
# Exécuter tous les tests
npm run test:e2e

# Exécuter un fichier spécifique
npx playwright test e2e/students.spec.ts

# Exécuter en mode UI (interactif)
npx playwright test --ui

# Exécuter en mode debug
npx playwright test --debug
```

### En CI/CD

Les tests E2E sont automatiquement exécutés dans le workflow GitHub Actions `.github/workflows/test-e2e.yml`.

## Configuration

La configuration Playwright se trouve dans `playwright.config.ts` :

- **Timeout** : 60 secondes par test
- **Base URL** : `http://localhost:3001` (ou `PLAYWRIGHT_TEST_BASE_URL`)
- **Browsers** : Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Retries** : 2 en CI, 0 en local
- **Traces** : Activés lors des retries
- **Screenshots** : Uniquement en cas d'échec
- **Videos** : Uniquement en cas d'échec

## Helpers

### `login(page)`

Helper pour se connecter dans les tests :

```typescript
import { login } from './helpers/auth'

test('mon test', async ({ page }) => {
  const loginSuccess = await login(page)
  if (!loginSuccess) {
    test.skip(true, 'Connexion échouée')
    return
  }
  // Continuer le test...
})
```

## Bonnes pratiques

### 1. Attendre le chargement

Toujours attendre que la page soit chargée :

```typescript
await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
```

### 2. Utiliser des sélecteurs robustes

Préférer les sélecteurs par `data-testid` :

```typescript
// ✅ Bon
page.locator('[data-testid="students-page"]')

// ❌ Moins robuste
page.locator('.students-page')
```

### 3. Gérer les éléments optionnels

Vérifier la visibilité avant d'interagir :

```typescript
const button = page.locator('button:has-text("Action")')
if (await button.isVisible({ timeout: 5000 })) {
  await button.click()
}
```

### 4. Éviter les timeouts fixes

Utiliser `waitForTimeout` avec parcimonie :

```typescript
// ❌ Éviter
await page.waitForTimeout(5000)

// ✅ Préférer
await page.waitForSelector('[data-testid="element"]', { timeout: 5000 })
```

### 5. Tests indépendants

Chaque test doit être indépendant et ne pas dépendre d'autres tests.

### 6. Nettoyage

Ne pas créer de données de test persistantes. Utiliser des mocks ou nettoyer après chaque test.

## Debugging

### Mode UI

```bash
npx playwright test --ui
```

### Mode Debug

```bash
npx playwright test --debug
```

### Traces

Les traces sont automatiquement générées lors des retries. Les visualiser :

```bash
npx playwright show-trace trace.zip
```

### Screenshots et Videos

Les screenshots et videos sont sauvegardés dans `test-results/` en cas d'échec.

## CI/CD

Les tests E2E sont exécutés dans GitHub Actions :

- Sur chaque Pull Request
- Sur chaque push vers `main` ou `develop`
- Avec upload des rapports HTML et videos

## Prochaines améliorations

- [ ] Tests de performance (temps de chargement)
- [ ] Tests d'accessibilité
- [ ] Tests de responsive design
- [ ] Tests de compatibilité navigateurs
- [ ] Tests de charge (k6, Artillery)

## Références

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

