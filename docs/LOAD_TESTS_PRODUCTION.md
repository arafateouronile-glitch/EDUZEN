# ⚡ Guide des Tests de Charge Production

**Date** : 16 Janvier 2026  
**Objectif** : Vérifier la performance de l'application sous charge

---

## 📋 Vue d'Ensemble

Les tests de charge permettent de vérifier que l'application peut supporter un nombre d'utilisateurs simultanés sans dégradation de performance.

**Outils recommandés** : k6 ou Artillery  
**Durée estimée** : 1 jour

---

## 🛠️ INSTALLATION

### Option 1 : k6 (Recommandé)

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D9
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Option 2 : Artillery

```bash
npm install -g artillery
```

---

## 📝 SCRIPTS DE TEST

### Script k6 - Test Basique

Créer `scripts/load-tests/k6-basic-test.js` :

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Montée à 10 utilisateurs
    { duration: '1m', target: 10 },   // Maintien à 10 utilisateurs
    { duration: '30s', target: 0 },   // Descente à 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% des requêtes < 2s
    http_req_failed: ['rate<0.01'],     // < 1% d'erreurs
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://votre-domaine.com';

export default function () {
  // Test 1: Page d'accueil
  let res = http.get(`${BASE_URL}/`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
  sleep(1);

  // Test 2: Page de connexion
  res = http.get(`${BASE_URL}/auth/login`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);

  // Test 3: API Health Check (si disponible)
  res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
```

### Script k6 - Test Complet

Créer `scripts/load-tests/k6-full-test.js` :

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // 10 utilisateurs
    { duration: '2m', target: 50 },  // Montée à 50
    { duration: '3m', target: 50 },   // Maintien à 50
    { duration: '2m', target: 100 }, // Montée à 100
    { duration: '3m', target: 100 },  // Maintien à 100
    { duration: '2m', target: 0 },    // Descente
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://votre-domaine.com';
const EMAIL = __ENV.TEST_EMAIL || 'test@example.com';
const PASSWORD = __ENV.TEST_PASSWORD || 'password123';

export default function () {
  // Test connexion
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginSuccess = check(loginRes, {
    'login status 200': (r) => r.status === 200,
  });

  errorRate.add(!loginSuccess);

  if (!loginSuccess) {
    return;
  }

  // Récupérer le token (si API REST)
  // const token = loginRes.json().token;

  // Test dashboard
  const dashboardRes = http.get(`${BASE_URL}/dashboard`, {
    // headers: { 'Authorization': `Bearer ${token}` },
  });

  check(dashboardRes, {
    'dashboard status 200': (r) => r.status === 200,
    'dashboard response time < 3s': (r) => r.timings.duration < 3000,
  });

  sleep(2);

  // Test liste étudiants
  const studentsRes = http.get(`${BASE_URL}/dashboard/students`);

  check(studentsRes, {
    'students status 200': (r) => r.status === 200,
  });

  sleep(1);
}
```

---

## 🚀 EXÉCUTION DES TESTS

### Test 10 Utilisateurs

```bash
# Avec k6
k6 run --env BASE_URL=https://votre-domaine.com scripts/load-tests/k6-basic-test.js

# Avec Artillery
artillery run scripts/load-tests/artillery-10-users.yml
```

### Test 50 Utilisateurs

Modifier le script pour cibler 50 utilisateurs :

```bash
k6 run --env BASE_URL=https://votre-domaine.com scripts/load-tests/k6-50-users.js
```

### Test 100 Utilisateurs

```bash
k6 run --env BASE_URL=https://votre-domaine.com scripts/load-tests/k6-100-users.js
```

---

## 📊 MÉTRIQUES À SURVEILLER

### Métriques k6

- **http_req_duration** : Temps de réponse des requêtes
- **http_req_failed** : Taux d'échec des requêtes
- **iterations** : Nombre d'itérations complétées
- **vus** : Nombre d'utilisateurs virtuels

### Seuils Acceptables

- **Temps de réponse P95** : < 2-3 secondes
- **Taux d'erreur** : < 1-2%
- **Disponibilité** : > 99%

---

## 📈 INTERPRÉTATION DES RÉSULTATS

### Résultats Acceptables ✅

```
✓ http_req_duration..............: avg=850ms  min=200ms  med=750ms  max=2.5s  p(95)=1.8s
✓ http_req_failed................: 0.50%   < 1%
✓ iterations.....................: 1500   150/s
```

### Résultats Problématiques ⚠️

```
✗ http_req_duration..............: avg=5.2s  min=1s  med=4.8s  max=15s  p(95)=8.5s
✗ http_req_failed................: 5.2%   > 2%
✗ iterations.....................: 500    50/s
```

**Actions** : Optimiser les requêtes lentes, vérifier la base de données, augmenter les ressources

---

## 🔧 OPTIMISATIONS SI PROBLÈMES

### Problème : Temps de réponse élevé

1. **Vérifier les requêtes Supabase**
   - Ajouter des index
   - Optimiser les requêtes N+1
   - Utiliser le cache

2. **Vérifier Vercel**
   - Augmenter les ressources (si nécessaire)
   - Vérifier les Edge Functions

3. **Vérifier la base de données**
   - Vérifier les connexions
   - Optimiser les requêtes lentes

### Problème : Taux d'erreur élevé

1. **Vérifier les logs**
   - Vercel Logs
   - Sentry
   - Supabase Logs

2. **Vérifier les limites**
   - Rate limiting
   - Quotas Supabase
   - Quotas Vercel

---

## 📝 RAPPORT DE TEST

### Template

```markdown
# Rapport Tests de Charge - [DATE]

## Configuration
- Outil : k6 vX.X.X
- URL testée : https://votre-domaine.com
- Scénario : 10/50/100 utilisateurs simultanés

## Résultats

### Test 10 Utilisateurs
- Durée moyenne : XXXms
- P95 : XXXms
- Taux d'erreur : X%
- ✅/❌ Résultat

### Test 50 Utilisateurs
- Durée moyenne : XXXms
- P95 : XXXms
- Taux d'erreur : X%
- ✅/❌ Résultat

### Test 100 Utilisateurs
- Durée moyenne : XXXms
- P95 : XXXms
- Taux d'erreur : X%
- ✅/❌ Résultat

## Analyse
[Analyse détaillée des résultats]

## Recommandations
[Liste des optimisations recommandées]
```

---

## ✅ CHECKLIST

- [ ] k6 ou Artillery installé
- [ ] Scripts de test créés
- [ ] Test 10 utilisateurs effectué
- [ ] Test 50 utilisateurs effectué
- [ ] Test 100 utilisateurs effectué
- [ ] Résultats documentés
- [ ] Optimisations appliquées si nécessaire

---

**Dernière mise à jour** : 16 Janvier 2026
