# Plan d'actions – Couverture tests 90 %

**Objectif :** Passer de **~60 %** à **90 %** de couverture (statements / lignes).  
**État actuel :** 752 tests, 65 fichiers, 60,5 % statements, 62 % lines.

---

## 1. Priorisation des modules

### Priorité haute (impact + facilité)

| Module | Couv. actuelle | Action |
|--------|----------------|--------|
| **input-validation** | ~50 % | Étendre validateString/Email/UUID/Integer/Float, sanitizeHTML/Text, hasSuspiciousContent |
| **formation.service** (ns) | ~43 % | Méthodes déjà partiellement couvertes ; ajouter cas limites, erreurs |
| **quota.service** | ~85 % | Combler lignes 238, 264, 275-279 |
| **rate-limiter** | ~80 % | Lignes 84-85, 122-146 (cleanup, keyGenerator, withRateLimit) |

### Priorité moyenne

| Module | Couv. actuelle | Action |
|--------|----------------|--------|
| **notification.service** | ~28 % | createForUsers (logger), getByUser/getUnreadCount erreurs, subscribe callbacks |
| **logger** | ~58 % | Branches production/Sentry non testables facilement ; error/warn/info/debug déjà OK |
| **api-validation** | ~36 % | Valideurs de routes API ; mocker NextRequest/Response |
| **accounting.service** | ~36 % | CRUD + requêtes complexes ; mocks Supabase lourds |

### Priorité basse (coût élevé)

| Module | Couv. actuelle | Action |
|--------|----------------|--------|
| **calendar.service** | ~17 % | Beaucoup de logique métier ; mocker Google Calendar / Supabase |
| **use-offline** | ~70 % | syncPendingData update/delete, useOfflineCourse, chemins d’erreur |
| **Charts** (bar, line, pie) | ~52–58 % | Rendu canvas / Recharts ; tests visuels ou snapshots |
| **Routes API** (feedback, create-transfer) | ~38–42 % | Intégration + mocks fetch/Supabase |

---

## 2. Plan par phase

### Phase A – Utils & validation (gain rapide)

1. **input-validation**  
   - Cas limites : `validateString` (pattern, trim), `validateEmail` (edge cases), `validateInteger`/`validateFloat` (NaN, vide).  
   - `sanitizeHTML` / `sanitizeText` : chaînes vides, null, très longues.  
   - `hasSuspiciousContent` : autres vecteurs XSS si présents.

2. **format.ts**  
   - Couvrir le catch de `formatDate` (lignes 24-25) : mock `date-fns` dans un fichier dédié si possible.

3. **rate-limiter**  
   - `defaultKeyGenerator` (x-real-ip, x-forwarded-for).  
   - `cleanup` (avance temps > 5 min).  
   - `withRateLimit` : 429, headers, `decrementOnFailure`.

### Phase B – Services (impact fort)

1. **formation.service**  
   - `getAllFormations` : search + passive filters.  
   - `getFormationById` / `getFormationWithAllSessions` : erreurs, null.  
   - `addSessionsToFormation` / `removeSessionFromFormation` : erreurs.

2. **notification.service**  
   - `createForUsers` sans `data`/`link`, avec erreur insert.  
   - `getByUser` : erreur, `limit`/`offset` edge cases.  
   - `getUnreadCount` : erreur (retour 0).  
   - Subscribe : simuler `postgres_changes` et vérifier callback (si exposé).

3. **quota.service**  
   - Lignes 238, 264, 275-279 : identifier les branches (RLS, erreurs, edge cases) et ajouter tests ciblés.

### Phase C – Hooks & composants

1. **use-offline**  
   - `syncPendingData` : actions `update`/`delete`, échecs partiels.  
   - `useOfflineCourse` : mock `createClient` + `from('courses')`, `downloadCourseForOffline`, `getCachedCourse`.

2. **use-local-storage**  
   - Ligne 18 (`window` undefined) : test sous fake SSR si possible.

3. **Composants UI**  
   - `select`, `button` : lignes non couvertes (handlers, aria).  
   - `motion` : ré-exports uniquement ; garder tests d’exports.

### Phase D – Routes API & reste

1. **Routes API**  
   - `feedback`, `create-transfer`, etc. : tests d’intégration avec mocks Supabase/fetch.

2. **calendar.service / accounting.service**  
   - Après stabilisation du reste ; mocks plus lourds.

---

## 3. Types de tests à privilégier

- **Services :**  
  - Mock Supabase chainable (`from().select().eq().order().single()` etc.).  
  - Succès + erreurs (PGRST116, 42P01, 42501, 23505, erreurs génériques).  
  - Validation des entrées (champs requis, formats).

- **Utils / validation :**  
  - Cas nominal + limites (vide, null, trop long, invalide).  
  - Erreurs (try/catch) quand la fonction catch et log.

- **Hooks :**  
  - `renderHook` + `act` ; timers faux pour debounce / rate-limit.  
  - Événements (`storage`, `online`/`offline`, `localStorageChange`).  
  - Mock `createClient` pour tout appel Supabase.

- **Composants :**  
  - Rendu, clics, handlers ; pas de snapshots fragiles si évitable.

---

## 4. Pièges à éviter

- **Supabase :** Vérifier que chaque maillon de la chaîne (`eq`, `order`, `range`, etc.) renvoie bien `this` ou la promesse finale selon l’usage.
- **Logger / Sentry :** Pas de tests sur `logger` en mode production ou Sentry si trop couplés ; couvrir les chemins dev.
- **`vi.clearAllMocks` :** Ne pas casser les implémentations des mocks localStorage/Supabase partagés ; restaurer ou utiliser `mockImplementationOnce`.
- **Fake timers :** Toujours `vi.useRealTimers()` en `afterEach` pour ne pas affecter les autres tests.

---

## 5. Métriques de suivi

- **Global :** `npm test -- --run --coverage` → viser `All files` statements ≥ 90 %, lines ≥ 90 %.  
- **Par module :** Utiliser le rapport coverage (colonnes Stmts, Branch, Funcs, Lines) pour suivre les progrès.  
- **Seuils Vitest :** Ajuster `vitest.config` (thresholds) au fur et à mesure pour refléter l’objectif 90 %.

---

## 6. Ordre d’exécution recommandé

1. Phase A (input-validation, rate-limiter, format si faisable).  
2. Phase B (formation.service, notification.service, quota.service).  
3. Phase C (use-offline, use-local-storage, UI).  
4. Phase D (API, calendar, accounting).

Exécuter `npm test -- --run --coverage` après chaque lot de tests et corriger les régressions avant de poursuivre.
