# 🧪 Guide d'exécution des tests - Production

## Vue d'ensemble

Le projet dispose de 3 types de tests :
1. **Tests unitaires** (Vitest) - Services, composants, utilitaires
2. **Tests d'intégration** (Vitest) - Workflows et API
3. **Tests E2E** (Playwright) - Scénarios complets utilisateur

## 📋 Prérequis

### Installation des dépendances

```bash
# Installer toutes les dépendances (si pas déjà fait)
npm install

# Installer les navigateurs Playwright (si pas déjà fait)
npx playwright install
```

### Variables d'environnement

Assurez-vous d'avoir un fichier `.env.test` ou `.env.local` avec :
```bash
# Supabase (peut utiliser un projet de test)
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-test-service-key

# Pour les tests E2E
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3001
```

## 🧪 Tests unitaires (Vitest)

### Exécuter tous les tests unitaires

```bash
npm test
```

### Exécuter avec interface graphique

```bash
npm run test:ui
```

### Exécuter des tests spécifiques

```bash
# Tests critiques uniquement
npm test tests/critical

# Tests de services uniquement
npm run test:components

# Tests d'intégration
npm run test:integration

# Tests de composants
npm run test:components

# Un fichier spécifique
npm test tests/services/student.service.test.ts
```

### Couverture de code

```bash
# Générer un rapport de couverture
npm run test:coverage
```

**Seuils minimum configurés :**
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

Le rapport HTML sera généré dans `coverage/index.html`

## 🔄 Tests d'intégration (Vitest)

### Exécuter tous les tests d'intégration

```bash
npm run test:integration
```

### Tests disponibles

- **Workflows** :
  - `attendance-workflow.test.ts` - Flux de présence
  - `messaging-workflow.test.ts` - Flux de messagerie
  - `payment-workflow.test.ts` - Flux de paiement
  - `student-creation.test.ts` - Création d'étudiants
  - `notification-workflow.test.ts` - Notifications

- **API** :
  - `compliance-alerts.test.ts` - Alertes de conformité
  - `document-templates.test.ts` - Templates de documents
  - `documents-scheduled.test.ts` - Génération programmée
  - `payments-stripe.test.ts` - Intégration Stripe

## 🎭 Tests E2E (Playwright)

### Préparer l'environnement

**Important :** Les tests E2E nécessitent que l'application soit démarrée.

```bash
# Dans un terminal, démarrer le serveur de dev
npm run dev

# Dans un autre terminal, exécuter les tests
npm run test:e2e
```

### Exécuter tous les tests E2E

```bash
npm run test:e2e
```

### Exécuter avec interface graphique

```bash
npm run test:e2e:ui
```

### Exécuter en mode visible (headed)

```bash
npm run test:e2e:headed
```

### Exécuter en mode debug

```bash
npm run test:e2e:debug
```

### Exécuter des tests spécifiques

```bash
# Un fichier spécifique
npx playwright test e2e/auth.spec.ts

# Par tag (si configuré)
npx playwright test --grep @critical

# Un seul navigateur
npx playwright test --project=chromium
```

### Navigateurs testés

- ✅ Chromium (Desktop Chrome)
- ✅ Firefox (Desktop Firefox)
- ✅ WebKit (Desktop Safari)
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)

### Rapports

Après exécution, les rapports sont générés dans :
- **HTML** : `playwright-report/index.html`
- **JSON** : `playwright-report/results.json`
- **JUnit** : `playwright-report/junit.xml`

Ouvrir le rapport HTML :
```bash
npx playwright show-report
```

## 📊 Tests critiques à vérifier avant production

### 1. Authentification (`tests/critical/auth.test.ts`)

```bash
npm test tests/critical/auth.test.ts
```

**Vérifie :**
- ✅ Connexion utilisateur
- ✅ Gestion des sessions
- ✅ RLS policies
- ✅ Permissions

### 2. Paiements (`tests/critical/payments.test.ts`)

```bash
npm test tests/critical/payments.test.ts
```

**Vérifie :**
- ✅ Création de factures
- ✅ Traitement des paiements
- ✅ Intégration Stripe
- ✅ Calculs financiers

### 3. Intégration (`tests/critical/integration.test.ts`)

```bash
npm test tests/critical/integration.test.ts
```

**Vérifie :**
- ✅ Workflows complets
- ✅ Intégrations entre modules
- ✅ Cohérence des données

### 4. E2E Auth (`e2e/auth.spec.ts`)

```bash
npx playwright test e2e/auth.spec.ts
```

**Vérifie :**
- ✅ Flux complet de connexion
- ✅ Redirections
- ✅ Gestion des erreurs
- ✅ Persistence de session

### 5. E2E Dashboard (`e2e/dashboard.spec.ts`)

```bash
npx playwright test e2e/dashboard.spec.ts
```

**Vérifie :**
- ✅ Chargement du dashboard
- ✅ Affichage des statistiques
- ✅ Navigation
- ✅ Interactions utilisateur

### 6. E2E Payments (`e2e/payments.spec.ts`)

```bash
npx playwright test e2e/payments.spec.ts
```

**Vérifie :**
- ✅ Création de factures
- ✅ Paiements
- ✅ Historique
- ✅ Exports

## ✅ Checklist de validation

### Tests unitaires

- [ ] Tous les tests passent : `npm test`
- [ ] Couverture ≥ 70% : `npm run test:coverage`
- [ ] Tests critiques passent : `npm test tests/critical`
- [ ] Aucun test en échec
- [ ] Aucun test ignoré (`test.skip`, `test.only`)

### Tests d'intégration

- [ ] Tous les workflows fonctionnent : `npm run test:integration`
- [ ] API tests passent
- [ ] Intégrations externes testées (Stripe, etc.)
- [ ] Aucune régression détectée

### Tests E2E

- [ ] Tous les scénarios critiques passent : `npm run test:e2e`
- [ ] Tests sur Chromium, Firefox, WebKit
- [ ] Tests mobiles passent
- [ ] Rapport HTML généré et vérifié
- [ ] Aucun screenshot d'erreur dans le rapport

### Performance

- [ ] Temps d'exécution acceptable (< 5 min pour tous les tests)
- [ ] Pas de timeouts
- [ ] Mémoire utilisée raisonnable

## 🚨 Résolution des problèmes courants

### Erreur : "Cannot find module"

```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

### Erreur : "Supabase connection failed"

- Vérifier les variables d'environnement
- Vérifier que le projet Supabase de test est accessible
- Vérifier les clés API

### Erreur : "Playwright browsers not installed"

```bash
npx playwright install
```

### Timeout dans les tests E2E

- Augmenter le timeout dans `playwright.config.ts`
- Vérifier que le serveur dev est bien démarré
- Vérifier la connexion réseau

### Tests flaky (intermittents)

- Augmenter les `expect` timeouts
- Ajouter des `waitFor` explicites
- Vérifier les conditions de course

## 📈 Amélioration continue

### Ajouter de nouveaux tests

1. **Test unitaire** : Créer dans `tests/services/` ou `tests/components/`
2. **Test d'intégration** : Créer dans `tests/integration/`
3. **Test E2E** : Créer dans `e2e/` avec extension `.spec.ts`

### Améliorer la couverture

```bash
# Voir la couverture actuelle
npm run test:coverage

# Identifier les fichiers non testés
# Ouvrir coverage/index.html dans le navigateur
```

### CI/CD

Les tests peuvent être intégrés dans votre pipeline CI/CD :

```yaml
# Exemple GitHub Actions
- name: Run tests
  run: |
    npm test
    npm run test:integration
    npm run test:e2e
```

## 🎯 Objectifs pour la production

**Avant le déploiement en production :**

- ✅ 100% des tests critiques passent
- ✅ Couverture ≥ 70% sur le code critique
- ✅ Tous les tests E2E passent sur Chromium (minimum)
- ✅ Aucune régression majeure
- ✅ Tests de sécurité (RLS) passent

## 📚 Ressources

- [Documentation Vitest](https://vitest.dev/)
- [Documentation Playwright](https://playwright.dev/)
- [Configuration Vitest](./vitest.config.ts)
- [Configuration Playwright](./playwright.config.ts)


