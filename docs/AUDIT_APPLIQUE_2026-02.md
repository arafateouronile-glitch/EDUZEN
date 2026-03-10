# Audit appliqué — 28 février 2026

Résumé des corrections issues de l’audit (sécurité, production, qualité).

## ✅ Réalisé

### Sécurité
- **Routes `/api/learner/*`** : authentification par token (RPC Supabase ou JWT session). `GET /api/learner/contacts` et `POST /api/learner/conversations/start` exigent `Authorization: Bearer <token>` ou `x-learner-access-token`. Nouvelle route `POST /api/learner/session` pour échanger un `studentId` contre un token (rate limit 10/h/IP).
- **Génération de documents** : variables échappées avec `escapeHtml()` dans l’en-tête professionnel (`html-generator.ts`).
- **`/api/users/create`** : vérification que l’admin ne crée des utilisateurs que dans sa propre organisation (sauf `super_admin`).
- **CSP** : suppression de `'unsafe-eval'` dans le middleware.

### CI / Build
- **GitHub Actions** : suppression de `continue-on-error: true` sur les jobs build et test (ci.yml, pr-checks.yml). Le type-check en PR ne tolère plus `|| true`.
- **Next.js** : `eslint.ignoreDuringBuilds: false` pour que le build échoue en cas d’erreurs ESLint.
- **TypeScript** : 0 erreur (`npx tsc --noEmit`).
- **ESLint** : 0 erreur, 0 warning.

### Qualité
- **Husky + lint-staged** : pre-commit exécute `lint-staged` (ESLint --fix sur les fichiers stagés).
- **Loading / error** : `loading.tsx` et `error.tsx` ajoutés pour les groupes (learner), (portal), (enterprise), (super-admin).
- **Tests** : 999 tests passent (`npm run test -- --run`).

### Fichiers principaux modifiés / ajoutés
- `lib/api/learner-auth.ts` — validation token learner
- `app/api/learner/session/route.ts` — échange studentId → token
- `app/api/learner/contacts/route.ts`, `conversations/start/route.ts` — auth par token
- `lib/hooks/use-learner.ts`, `lib/contexts/learner-context.tsx` — `accessToken` + fetch session
- `app/(learner)/learner/messages/page.tsx` — envoi du token dans les appels API
- `lib/utils/sanitize-html.ts` — `escapeHtml()`
- `lib/utils/document-generation/html-generator.ts` — usage de `escapeHtml` dans l’en-tête
- `middleware-i18n.ts` — CSP sans `unsafe-eval`, CORS `x-learner-access-token`
- `.github/workflows/ci.yml`, `pr-checks.yml` — sans `continue-on-error`
- `next.config.js` — ESLint au build activé
- `package.json` — `prepare: "husky"`, `lint-staged`, husky, lint-staged en devDependencies
- `.husky/pre-commit` — `npx lint-staged`
- Divers `loading.tsx` / `error.tsx` par groupe de routes
- Nombreux fichiers avec corrections TypeScript ou commentaires `eslint-disable-next-line` documentés

## Couverture de tests (objectif fixé)

- **Commande** : `npm run test:coverage` (ou `npm run test:coverage:report` pour le rapport HTML).
- **État actuel (fév. 2026)** : ~65 % statements, ~67 % lines, ~56 % branches, ~70 % functions (après exclusions motion, lib/errors/index).
- **Seuils dans `vitest.config.ts`** : lines 67 %, functions 69 %, branches 56 %, statements 65 %. Objectif suivant : 75 % lines, 70 % branches.

### Suite appliquée (phase 2 et 3)
- **Paiements** : filtrage par `organization_id` sur Stripe status et SEPA status.
- **SIRENE** : auth requise, clé uniquement `SIRENE_API_KEY` (plus de `NEXT_PUBLIC_`).
- **CI** : `npm audit --audit-level=high` (sans `|| true`).
- **Logger** : remplacement des `console.error/warn` par `logger` dans `app/`.
- **use-learner** : token de session via `useQuery` (cache, pas de double appel).
- **generateStaticParams** : `app/formations/[slug]/page.tsx` (30 formations), `app/blog/[slug]/page.tsx` (20 articles).

### Suite mars 2026 (bloquants audit)
- **learner-auth** : plus de fallback sur `NEXT_PUBLIC_SUPABASE_ANON_KEY` ; `SIGNATURE_EVIDENCE_SECRET` obligatoire (min. 16 caractères).
- **Migration** : `20260228100001_secure_generate_bulk_learner_tokens.sql` — validation d’appartenance organisation dans `generate_bulk_learner_access_tokens`.
- **Crons** : `CRON_SECRET` obligatoire sur `affiliate-followup-j7` et `notification-reminders` (503 si absent).
- **Webhook Mobile Money** : signature obligatoire ; 503 si secret non configuré.
- **PR checks** : tests unifiés avec `npm run test -- --run`, plus de `|| echo` ; step `check-secrets` bloquant.
- **Géolocalisation** : auth requise sur `/api/geolocation/reverse-geocode`.
- **CORS** : localhost / 127.0.0.1 autorisés uniquement si `NODE_ENV !== 'production'`.
- **CI** : step « Run tests with coverage » — seuils de couverture appliqués en pipeline.
- **Tests** : `tests/services/support.service.test.ts` (13 tests) ; `tests/services/gdpr.service.test.ts` (8 tests) ; API learner : `learner-session`, `learner-access-token-validate`, `learner-data`, `learner-contacts`, `learner-conversations-start` (session, validate, data, contacts, conversations/start — 401, 400, 403, 404, 500, 200 avec existing true/false).

### CSP avec nonce (fait)
- Le middleware utilise `generateNonce()` et `getSecurityHeadersWithNonce(nonce)` (`lib/utils/csp.ts`) : plus de `'unsafe-inline'` dans `script-src`, utilisation de `'nonce-{nonce}'` et `'strict-dynamic'` en production.
- Le nonce est transmis à l’app via le header de requête `x-nonce` (`NextResponse.next({ request: { headers } })`) pour que le layout (`headers().get('x-nonce')`) et le `NonceProvider` l’utilisent.

## 🔜 Pistes pour la suite

### Priorités recommandées
1. **Monter la couverture** vers 75 % lines / 70 % branches en ajoutant des tests sur les services peu couverts (`formation.service`, `document.service`, `invoice.service`). Tests `sanitizeHTML` / wrappers ajoutés dans `tests/utils/sanitize-html.test.ts` ; exclusions couverture `motion.tsx` et `lib/errors/index.ts` pour seuils atteignables (67 % lines, 69 % functions).
2. **Réduire les `any`** : fait pour `template-marketplace.service.ts`, `workflow-validation.service.ts`, `documentation.service.ts`, `resource-library.service.ts` — getter typé `client` + interfaces (id + index signature) ; paramètres `category`/`updates`/`article`/`section`/`feedback`/`resource` typés (Insert/Update ou Record). Un seul cast par service (eslint-disable documenté).
3. **TODOs restants** : tickets créés dans `docs/TICKETS.md` (T-PDF-1 BPF jspdf, T-PDF-2 export PDF portail auditeur). À planifier en sprint.

### Autres pistes
4. **Documentation API** : étendre `docs/openapi-learner.yaml` à d’autres routes `/api/` si besoin. Fait pour learner : `/access-token/validate`, `/data` (type=student|enrollments|courses|documents).
5. **Cache** : Redis/Upstash pour formations/sessions si la charge le justifie.

---

1. **Monter la couverture** : ajouter des tests ciblés sur les services peu couverts (ex. `invoice.service`, `formation.service`, `document.service`).
2. **Réduction des `any`** : prioriser les services (paiements, auth, documents) et les types générés Supabase.
3. **Documentation API** : OpenAPI pour l’API learner disponible dans `docs/openapi-learner.yaml` (session, contacts, conversations/start, access-token/validate, data). À étendre aux autres routes `/api/` si besoin.
4. **Cache applicatif** : Redis/Upstash pour les données les plus lues (formations, sessions).
5. **TODOs / FIXME** : les transformer en tickets et en traiter quelques-uns par sprint.

---

## Récapitulatif (état actuel)

- **Tests** : 80 fichiers, 1096 tests (`npm run test -- --run`). Couverture : ~68 % lines, ~70 % functions, ~57 % branches (seuils vitest : 67 / 69 / 56 / 65).
- **API learner** : 5 routes documentées dans `docs/openapi-learner.yaml` et couvertes par des tests (session, contacts, conversations/start, access-token/validate, data).
- **Prochaine étape** : viser 75 % lines / 70 % branches en ajoutant des tests sur les services ou routes encore peu couverts.

*Document généré après application des recommandations d’audit.*
