---
title: Guide de Tests
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🧪 Guide de Tests

Ce document décrit la stratégie de tests pour l'application EDUZEN.

## 🎯 Objectif

Assurer la qualité et la fiabilité du code grâce à une couverture de tests complète.

## 📊 Couverture Cible

- **Objectif** : 60% de couverture de code
- **Seuil minimum** : 70% pour les lignes, fonctions, branches et statements (configuré dans `vitest.config.ts`)

## 🏗️ Structure des Tests

```
tests/
├── components/          # Tests de composants React
├── services/           # Tests de services
├── utils/              # Tests d'utilitaires
├── hooks/              # Tests de hooks personnalisés
├── integration/        # Tests d'intégration
├── security/           # Tests de sécurité (RLS, etc.)
├── critical/           # Tests des fonctionnalités critiques
└── setup.ts            # Configuration des tests
```

## 🧪 Types de Tests

### 1. Tests Unitaires

**Objectif** : Tester des fonctions ou classes isolées

**Exemples** :
- Services (`NotificationService`, `StudentService`)
- Utilitaires (`formatDate`, `formatCurrency`)
- Hooks personnalisés (`useNotifications`, `useAuth`)

**Structure** :
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('ServiceName', () => {
  beforeEach(() => {
    // Setup
  })

  it('devrait faire quelque chose', () => {
    // Arrange
    // Act
    // Assert
  })
})
```

### 2. Tests d'Intégration

**Objectif** : Tester l'interaction entre plusieurs composants

**Exemples** :
- API routes avec base de données
- Services avec Supabase
- Workflows complets

### 3. Tests E2E

**Objectif** : Tester les parcours utilisateur complets

**Exemples** :
- Création d'un étudiant
- Processus de paiement
- Authentification

## 🛠️ Outils

### Vitest

**Configuration** : `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
})
```

### Playwright

**Configuration** : `playwright.config.ts`

Pour les tests E2E.

## 📝 Exemples de Tests

### Test de Service

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationService } from '@/lib/services/notification.service'

describe('NotificationService', () => {
  let service: NotificationService

  beforeEach(() => {
    service = new NotificationService()
    vi.clearAllMocks()
  })

  it('devrait créer une notification', async () => {
    const params = {
      user_id: 'user-1',
      organization_id: 'org-1',
      type: 'info',
      title: 'Test',
      message: 'Message',
    }

    const result = await service.create(params)

    expect(result).toHaveProperty('id')
    expect(result.title).toBe('Test')
  })
})
```

### Test d'Utilitaire

```typescript
import { describe, it, expect } from 'vitest'
import { formatDate } from '@/lib/utils/format'

describe('formatDate', () => {
  it('devrait formater une date correctement', () => {
    const date = new Date('2024-01-15')
    const result = formatDate(date, 'dd/MM/yyyy')
    expect(result).toBe('15/01/2024')
  })
})
```

### Test de Hook

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useNotifications } from '@/lib/hooks/use-notifications'

describe('useNotifications', () => {
  it('devrait récupérer les notifications', async () => {
    const { result } = renderHook(() => useNotifications())

    await waitFor(() => {
      expect(result.current.notifications).toBeDefined()
    })
  })
})
```

## 🚀 Commandes

### Exécuter tous les tests

```bash
npm run test
```

### Exécuter les tests en mode watch

```bash
npm run test:watch
```

### Exécuter avec couverture

```bash
npm run test:coverage
```

### Exécuter un fichier spécifique

```bash
npm run test -- tests/services/notification.service.test.ts
```

### Tests E2E

```bash
npm run test:e2e
```

## 📋 Checklist de Tests

Avant de soumettre une PR, vérifiez :

- [ ] Les tests unitaires passent
- [ ] Les tests d'intégration passent
- [ ] La couverture de code est maintenue (> 60%)
- [ ] Les nouveaux services ont des tests
- [ ] Les nouvelles fonctionnalités ont des tests
- [ ] Les cas limites sont testés
- [ ] Les erreurs sont testées

## 🎯 Bonnes Pratiques

### 1. Nommage

- Utilisez des noms descriptifs : `devrait créer un étudiant avec succès`
- Groupez les tests avec `describe`
- Utilisez `it` ou `test` de manière cohérente

### 2. Structure AAA

- **Arrange** : Préparer les données
- **Act** : Exécuter l'action
- **Assert** : Vérifier le résultat

### 3. Isolation

- Chaque test doit être indépendant
- Utilisez `beforeEach` pour réinitialiser l'état
- Nettoyez les mocks après chaque test

### 4. Mocks

- Mockez les dépendances externes (Supabase, API, etc.)
- Utilisez `vi.fn()` pour les fonctions
- Utilisez `vi.mock()` pour les modules

### 5. Couverture

- Testez les cas de succès
- Testez les cas d'erreur
- Testez les cas limites
- Testez les cas edge

## 🔍 Debugging

### Mode Watch

```bash
npm run test -- --watch
```

### Mode UI

```bash
npm run test:ui
```

### Mode Debug

```bash
npm run test -- --inspect-brk
```

## 📊 Rapports de Couverture

Les rapports de couverture sont générés dans `coverage/` :

- `coverage/index.html` : Rapport HTML interactif
- `coverage/lcov.info` : Rapport LCOV pour CI/CD
- `coverage/coverage.json` : Rapport JSON

## 🚨 Tests Critiques

Certains tests sont marqués comme critiques et doivent toujours passer :

- `tests/critical/auth.test.ts` : Authentification
- `tests/critical/payments.test.ts` : Paiements
- `tests/critical/integration.test.ts` : Intégration

## 📚 Ressources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)

---

**Note** : Les tests sont essentiels pour maintenir la qualité du code. Ajoutez des tests pour chaque nouvelle fonctionnalité.---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

