# Audit complet — EDUZEN — 28 février 2026

> Projet : Next.js 16 + Supabase · 154 routes API · 91 services · 85 fichiers de test · 1 116 tests (mars 2026)

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Sécurité](#2-sécurité)
3. [Qualité du code](#3-qualité-du-code)
4. [Tests et couverture](#4-tests-et-couverture)
5. [CI / CD](#5-ci--cd)
6. [Configuration](#6-configuration)
7. [Base de données (Supabase)](#7-base-de-données-supabase)
8. [Synthèse et plan d'action](#8-synthèse-et-plan-daction)

---

## 1. Vue d'ensemble

| Métrique | Valeur |
|----------|--------|
| Framework | Next.js 16.1 (App Router) |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Langage | TypeScript (strict: true) |
| Routes API | 154 |
| Services (`lib/services/`) | 91 fichiers |
| Fichiers de test | 85 |
| Tests | 1 116 |
| Couverture lines | **66,68 %** |
| Couverture branches | **57,70 %** |
| Couverture functions | **70,81 %** |
| Couverture statements | **68,62 %** |
| Erreurs TypeScript (`tsc --noEmit`) | **0** (corrigées mars 2026) |
| E2E (Playwright) | 14 specs |

---

## 2. Sécurité

### 2.1 Routes API sans authentification (CRITIQUE)

| # | Route | Problème | Sévérité |
|---|-------|----------|----------|
| S-1 | `api/documents/generate-docx` | Aucun `getUser()`. Toute requête peut générer un document pour n'importe quelle organisation. | **CRITIQUE** |
| S-2 | `api/documents/generate-word` | Idem. Accepte `template`, `variables`, `organizationId` sans contrôle. | **CRITIQUE** |
| S-3 | `api/sessions/active` | Utilise `createAdminClient` sans auth. Expose les sessions en cours. | **CRITIQUE** |
| S-4 | `api/users/by-email` | Aucun `getUser()`, utilise `createAdminClient`. Recherche par email (id, nom, rôle) sans contrôle. | **CRITIQUE** |

### 2.2 Failles cross-tenant (CRITIQUE / HAUTE)

| # | Route | Problème | Sévérité |
|---|-------|----------|----------|
| S-5 | `api/resources/upload` | `organization_id` fourni dans le formData, jamais vérifié contre celui de l'utilisateur. Upload cross-tenant possible. | **CRITIQUE** |
| S-6 | `api/documentation/search` | `organization_id` optionnel, passé tel quel. Un user peut interroger les articles d'autres organisations. | **HAUTE** |
| S-7 | `api/teacher-documents/[id]` | Vérification admin/secretary mais sans filtrage `organization_id`. Suppression cross-org possible. | **HAUTE** |

### 2.3 Secrets et webhooks

| # | Route | Problème | Sévérité |
|---|-------|----------|----------|
| S-8 | `api/emails/scheduled/execute` | `CRON_SECRET` vérifié uniquement si défini. Si absent → endpoint ouvert. | **HAUTE** |
| S-9 | `api/esignature/webhook` | Si `webhookSecret` non configuré → validation de signature ignorée, webhook traité quand même. | **HAUTE** |
| S-10 | `api/subscriptions/webhook` | `STRIPE_WEBHOOK_SECRET || ''` → secret vide si non configuré. | **MOYENNE** |
| S-11 | `api/auditor/public`, `api/resources/upload` | `SUPABASE_SERVICE_ROLE_KEY!` sans vérification de présence. | **MOYENNE** |

### 2.4 Validation des entrées insuffisante

| # | Route | Problème | Sévérité |
|---|-------|----------|----------|
| S-12 | `api/documents/generate-docx` | Body casté sans schéma Zod. Pas de validation de `templateId` / `variables`. | **MOYENNE** |
| S-13 | `api/documents/generate-word` | Idem. | **MOYENNE** |
| S-14 | `api/send-email` | `to`, `subject`, `message`, `attachmentUrl` sans validation stricte. | **MOYENNE** |

### 2.5 CSP et headers de sécurité

| Aspect | État | Détail |
|--------|------|--------|
| CSP avec nonces | ✅ Implémenté | Middleware applique CSP stricte avec `'nonce-{nonce}'` + `'strict-dynamic'` |
| CSP report-only | ✅ Double couche | `next.config.js` maintient une CSP report-only (observation) |
| HSTS | ✅ Production | `max-age=63072000; includeSubDomains; preload` |
| X-Frame-Options | ✅ DENY | Via middleware + next.config.js |
| Permissions-Policy | ✅ | camera=(), microphone=(), geolocation=(), payment=(self stripe) |
| CORS | ✅ Configuré | Origines autorisées, credentials, preflight 204 |

### 2.6 Base de données — fonction à risque

| # | Fonction | Problème | Sévérité |
|---|----------|----------|----------|
| S-15 | `get_learner_student(uuid)` | `SECURITY DEFINER` + `GRANT TO anon, authenticated`. Aucune vérification de token. Toute requête avec un UUID étudiant peut récupérer ses données. | **CRITIQUE** |
| S-16 | `electronic_attendance_requests` | Politiques RLS `USING (true)` (public). Validation uniquement côté application. | **MOYENNE** |

---

## 3. Qualité du code

### 3.1 Erreurs TypeScript (16 erreurs, 6 fichiers)

| Fichier | Erreurs | Nature |
|---------|---------|--------|
| `workflow-validation.tsx` (composant) | 5 | `unknown` non assignable à `ReactNode` / `string` |
| `template-marketplace.service.ts` | 5 | Propriétés (`header_content`, `body_content`, etc.) absentes du type DB |
| `resource-library.service.ts` | 1 | Incompatibilité type callback `.map()` |
| `documentation.service.ts` | 1 | RPC non reconnue (`increment_article_view_count`) |
| `element-palette.tsx` | 2 | `Icon` ne peut pas être utilisé comme JSX component |
| `formations/[slug]/page.tsx` | 1 | `string | null` vs `string` pour `slug` |

### 3.2 Utilisation de `any` — bilan global

| Zone | Fichiers avec `any` | Top offenders |
|------|---------------------|---------------|
| `lib/` | ~75 fichiers | `api.service.ts` (31), `shared-calendar.service.ts` (26), `anomaly-detection.service.ts` (15), `variable-extractor.ts` (97!) |
| `app/` | ~75 fichiers | `gestion-finances.tsx` (46), `my-students/page.tsx` (38), `messages/page.tsx` (33), `learner/elearning/[slug]` (32), `preview/page.tsx` (27), `learner/page.tsx` (25) |
| **Total estimé** | **~150 fichiers, ~600+ occurrences** | |

**Top 10 fichiers `any` (lib/) :**

| Rang | Fichier | `any` |
|------|---------|-------|
| 1 | `variable-extractor.ts` | 97 |
| 2 | `api.service.ts` | 31 |
| 3 | `shared-calendar.service.ts` | 26 |
| 4 | `anomaly-detection.service.ts` | 15 |
| 5 | `variable-mapper.ts` | 16 |
| 6 | `scheduled-generation.service.ts` | 12 |
| 7 | `pdf-generator.tsx` | 12 |
| 8 | `_deprecated/ai-recommendations.service.ts` | 10 |
| 9 | `educational-resources.service.ts` | 9 |
| 10 | `messaging.service.ts` / `html-generator.ts` | 9 |

### 3.3 `console.*` au lieu de `logger`

| Zone | Fichiers | Détail |
|------|----------|--------|
| `lib/` | 7 fichiers | `quill-table-helper.ts` (31!), `quill-table-helper-v2.ts` (8), `signature-evidence.ts` (2), `signature-request.service.ts` (1), `logger.ts` (5, attendu), `app-config.ts` (1), `examples/` (12) |
| `app/` | 0 | ✅ Toutes les routes API utilisent `logger` |

### 3.4 Fonctions trop longues (> 100 lignes)

| Fichier | Fonction | Lignes |
|---------|----------|--------|
| `calendar.service.ts` | `getCalendarEventsManual` | ~510 |
| `auto-docx-generator.service.ts` | `parseHtmlTable` | ~460 |
| `auto-docx-generator.service.ts` | `htmlToDocxElements` | ~150 |
| `accounting.service.ts` | `syncAllInvoices` | ~130 |

### 3.5 Services sans gestion d'erreurs (ni try/catch, ni throw)

**24 services métier** n'ont aucune gestion d'erreurs :

`support.service.ts` (✅), `feedback.service.ts` (✅), `elearning.service.ts` (✅), `search.service.ts` (✅), `documentation.service.ts` (✅), `formation.service.ts` (✅), `program.service.ts` (✅), `opco.service.ts` (✅), `compliance.service.ts` (✅), `session-slot.service.ts` (✅), `compliance-alerts.service.ts` (✅), `session-charges.service.ts` (✅), `resource-library.service.ts` (✅), `email-schedule.service.ts` (✅), `anomaly-detection.service.ts` (✅), `scheduled-generation.service.ts` (✅), `rncp-certification.service.ts` (✅), `public-catalog-settings.service.ts` (✅), `shared-calendar.service.ts` (✅ getCalendars, getCalendarById, createCalendar, updateCalendar, deleteCalendar), `enterprise-portal.service.ts` (✅ getCompanyForManager, getManagerPermissions). Restants : `ab-testing.service.ts` (sync/config), `media-library.service.ts` (stub), `template-analytics.service.ts` (stub), etc.

---

## 4. Tests et couverture

### 4.1 Résumé

| Métrique | Valeur | Seuil Vitest | Objectif |
|----------|--------|-------------|----------|
| Lines | 66,68 % | 67 % | 75 % |
| Branches | 57,70 % | 56 % | 70 % |
| Functions | 70,81 % | 69 % | 75 % |
| Statements | 68,62 % | 65 % | 75 % |

### 4.2 Couverture par zone

| Zone | Lines | Branches | Commentaire |
|------|-------|----------|-------------|
| `lib/utils/` | 91,69 % | 89,04 % | ✅ Bien couvert |
| `lib/hooks/` | 96,03 % | 83,52 % | ✅ Bien couvert |
| `lib/api/` | 84,84 % | 74,35 % | ✅ Correct |
| `lib/errors/` | 100 % | 87,35 % | ✅ Excellent |
| `components/ui/` | 97,16 % | 86,74 % | ✅ Excellent |
| `components/charts/` | 57,40 % | 43,33 % | ⚠️ À améliorer |
| **`lib/services/`** | **52,22 %** | **43,56 %** | **❌ Point faible** |

### 4.3 Services les moins couverts (< 40 % lines)

| Service | Lines | Branches |
|---------|-------|----------|
| `compliance.service.ts` | 15,92 % | 10,12 % |
| `electronic-attendance.service.ts` | 23,74 % | 18,80 % |
| `invoice.service.ts` | 36,76 % | 26,89 % |
| `support.service.ts` | 25,32 % | 27,90 % |
| `elearning.service.ts` | 13,36 % | 15,88 % |
| `messaging.service.ts` | 37,38 % | 30,95 % |

### 4.4 Services sans aucun test (parmi les 91)

**~70 services** n'ont pas de fichier de test dédié. Les plus critiques :

| Service | Criticité |
|---------|-----------|
| `signature-request.service.ts` | **HAUTE** — Signatures électroniques |
| `esignature-webhook-handler.service.ts` | **HAUTE** — Webhooks e-signature |
| `api.service.ts` | **HAUTE** — Gestion API keys, webhooks |
| `electronic-attendance.service.ts` | **HAUTE** — Émargement |
| `qualiopi.service.ts` / `qualiopi-check.service.ts` | **HAUTE** — Conformité Qualiopi |
| `cpf.service.ts` | **HAUTE** — CPF / France Compétences |
| `enterprise-portal.service.ts` | **HAUTE** — Portail entreprise |
| `organization-setup.service.ts` | **MOYENNE** — Setup initial |
| `user-management.service.ts` | **MOYENNE** — Gestion utilisateurs |
| `import.service.ts` | **MOYENNE** — Import données |
| `bpf.service.ts` | **MOYENNE** — Bilan pédagogique et financier |

### 4.5 Routes API sans tests (154 routes, ~13 couvertes)

**~141 routes** n'ont pas de test d'intégration. Routes critiques non couvertes :

| Route | Criticité |
|-------|-----------|
| `webhooks/stripe` | **CRITIQUE** — Paiements |
| `esignature/webhook` | **CRITIQUE** — Signatures |
| `mobile-money/webhook` | **CRITIQUE** — Paiements Afrique |
| `subscriptions/webhook` | **HAUTE** — Abonnements |
| `signature-requests/*` (sign, send-from-contract, etc.) | **HAUTE** |
| `sign/public/[token]`, `sign/submit`, `sign/process-pdf` | **HAUTE** |
| `payments/sepa/*` | **HAUTE** |
| `2fa/*` (verify, generate-secret, verify-login) | **HAUTE** |
| `users/create`, `users/by-email` | **HAUTE** |
| `documents/generate`, `documents/generate-pdf` | **MOYENNE** |

---

## 5. CI / CD

### 5.1 Workflows GitHub Actions

| Workflow | Rôle | Problèmes |
|----------|------|-----------|
| `ci.yml` | Lint → Build → Tests | ✅ OK. Job `test` n'a pas `needs: lint` (parallèle). |
| `pr-checks.yml` | Lint + Type-check + Tests + Build + Security + PR-size | ✅ Solide. |
| `deploy-production.yml` | Build + Deploy | ⚠️ `curl ... || true` masque les erreurs réseau (ligne 46). ⚠️ Pas de variables `NEXT_PUBLIC_SUPABASE_*` dans `env` du job build. |

### 5.2 Points positifs CI

- ✅ Coverage avec seuils dans CI
- ✅ `npm audit --audit-level=high` dans PR checks
- ✅ Husky + lint-staged configurés
- ✅ Script `check-secrets` dans PR checks
- ✅ Pas de `continue-on-error`

---

## 6. Configuration

### 6.1 next.config.js

| Aspect | État |
|--------|------|
| `eslint.ignoreDuringBuilds` | `false` ✅ |
| `typescript.ignoreBuildErrors` | `false` ✅ |
| CSP report-only (observation) | ✅ Présent |
| Headers sécurité statiques | ✅ Complets (HSTS, X-Frame, COEP, COOP, CORP, etc.) |

### 6.2 tsconfig.json

| Option | État |
|--------|------|
| `strict` | `true` ✅ |
| `noUncheckedIndexedAccess` | ❌ **Absent** — recommandé pour renforcer la sécurité des accès indexés |

### 6.3 Variables d'environnement

**Variables manquantes dans `.env.example` :**

| Variable | Présente dans `.env.local` | Documentée dans `.env.example` |
|----------|---------------------------|-------------------------------|
| `STRIPE_SECRET_KEY` | ✅ | ❌ |
| `STRIPE_WEBHOOK_SECRET` | ✅ | ❌ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | ❌ |
| `SENDGRID_API_KEY` | ✅ | ❌ |
| `SENDGRID_FROM_EMAIL` | ✅ | ❌ |
| `NEXT_PUBLIC_EMAIL_PROVIDER` | ✅ | ❌ |
| `SIGNATURE_EVIDENCE_SECRET` | ✅ | ❌ |
| `CSRF_SECRET` | ❌ | ✅ (non utilisé) |
| `ALLOWED_ORIGINS` | ❌ | ✅ (non utilisé) |

---

## 7. Base de données (Supabase)

### 7.1 RLS

- ✅ La majorité des tables ont `ENABLE ROW LEVEL SECURITY` avec des politiques.
- ⚠️ `electronic_attendance_requests` : politiques `USING (true)` (public) — validation côté application uniquement.

### 7.2 Fonctions SECURITY DEFINER

| Fonction | Vérification | Risque |
|----------|-------------|--------|
| `get_learner_student(uuid)` | ❌ Aucune | **CRITIQUE** — tout client (anon) peut lire les données étudiant |
| `is_super_admin()` | ✅ `auth.uid()` | Faible |
| `expire_signature_tokens` | ✅ Cron | Faible |
| `insert_student_message` | ⚠️ Vérifie participation | À valider |
| `sync_user_from_auth` | ⚠️ Backend | Moyen |

---

## 8. Synthèse et plan d'action

### 8.1 Scores par catégorie

| Catégorie | Score | Détail |
|-----------|-------|--------|
| **Sécurité API** | 4/10 | 4 routes critiques sans auth, 3 failles cross-tenant |
| **Sécurité headers** | 9/10 | CSP avec nonces, HSTS, X-Frame-Options, CORS |
| **Sécurité DB** | 6/10 | RLS OK sauf `get_learner_student` (critique) |
| **Qualité code** | 6/10 | 600+ `any`, 16 erreurs TS, 24 services sans error handling |
| **Tests** | 5/10 | 1 096 tests mais 66 % lines, ~70 services et ~141 routes sans tests |
| **CI/CD** | 8/10 | Solide, quelques ajustements mineurs |
| **Configuration** | 7/10 | strict mode OK, .env.example incomplet |
| **Score global** | **6,4 / 10** | |

### 8.2 Plan d'action par priorité

#### P0 — Bloquant (à corriger immédiatement) — **APPLIQUÉ le 28/02/2026**

| # | Action | Fichier(s) | Statut |
|---|--------|-----------|--------|
| 1 | Ajouter `getUser()` sur `generate-docx`, `generate-word`, `sessions/active`, `users/by-email` | 4 routes API | ✅ Fait : auth + filtrage par `organization_id` |
| 2 | Vérifier `organization_id` contre celui du user dans `resources/upload` | 1 route | ✅ Fait : refus 403 si org différente, `organizationId` forcé à `userOrgId` |
| 3 | Restreindre `get_learner_student(uuid)` : révoquer `GRANT TO anon` | 1 migration | ✅ Fait : `20260228100002_revoke_get_learner_student_anon.sql` |
| 4 | Exiger `CRON_SECRET` obligatoirement dans `emails/scheduled/execute` | 1 route | ✅ Fait : 503 si absent, 401 si header invalide |
| 5 | Rejeter les webhooks si secret non configuré (`esignature/webhook`, `subscriptions/webhook`) | 2 routes | ✅ Fait : 503 si secret manquant |

#### P1 — Haute priorité (sprint courant) — **Partiellement appliqué le 03/03/2026**

| # | Action | Fichier(s) | Statut |
|---|--------|-----------|--------|
| 6 | Filtrer `organization_id` dans `documentation/search` et `teacher-documents/[id]` | 2 routes | ✅ Fait : org utilisateur imposée / vérification cross-tenant sur DELETE |
| 7 | Ajouter validation Zod (generate-docx, generate-word, send-email) | 3 routes + `lib/validations/schemas.ts` | ✅ Fait |
| 8 | Corriger les 16 erreurs TypeScript | 6 fichiers | ✅ Fait : workflow-validation, generate-word, send-email, formations, element-palette, documentation.service, resource-library, template-marketplace |
| 9 | Tests pour `webhooks/stripe`, `esignature/webhook` | 2 fichiers | ✅ Fait : `subscriptions-webhook.test.ts` (503, 400), `esignature-webhook.test.ts` (503, 401) |
| 10 | Tests pour `signature-request.service.ts`, `api.service.ts` | 2 fichiers | ✅ Fait : `signature-request.service.test.ts` (3 tests), `api.service.test.ts` (6 tests) |
| 11 | Documenter Stripe/SendGrid dans `.env.example` | 1 fichier | ✅ Fait |

#### P2 — Moyenne priorité (prochain sprint)

| # | Action | Fichier(s) | Impact |
|---|--------|-----------|--------|
| 12 | Réduire les `any` : `variable-extractor.ts` (97!), `api.service.ts` (31), `shared-calendar.service.ts` (26) | 3 fichiers | **shared-calendar** : ✅ supprimé tous les `(this.supabase as any)` (tables dans Database), typage `CalendarShareWithCalendar` à la place de 4 types `any`. **api.service** / **variable-extractor** : reporté (schéma API absent du Database ; variable-extractor à traiter par lots) |
| 13 | Monter la couverture services : `elearning.service.ts` (13 %), `compliance.service.ts` (16 %), `electronic-attendance.service.ts` (24 %) | 3 fichiers | ✅ En cours : compliance (5 tests), electronic-attendance (6 tests getAttendanceSessionById/BySession/ByOrganization), elearning (6 tests getCourses/getCourseBySlug/getCourseSections/getCourseLessons) |
| 14 | Ajouter try/catch dans les 24 services sans error handling | 24 fichiers | En cours : **shared-calendar** (getCalendars, getCalendarById, createCalendar, updateCalendar, deleteCalendar) ✅ ; **enterprise-portal** (getCompanyForManager, getManagerPermissions) ✅ ; rncp-certification, public-catalog-settings, etc. déjà faits. Restants : ab-testing (sync), stubs. |
| 15 | Refactorer `getCalendarEventsManual` (510 lignes) et `parseHtmlTable` (460 lignes) | 2 fichiers | **getCalendarEventsManual** : ✅ refactoré. **parseHtmlTable** : ✅ helpers extraits `flattenNestedTableToText`, `stripHtmlToPlainText` (~40 lignes en moins dans la fonction) |
| 16 | Remplacer `console.*` par `logger` dans `quill-table-helper.ts` (31 occurrences) | 2 fichiers | ✅ Fait : quill-table-helper.ts, quill-table-helper-v2.ts, signature-evidence.ts, app-config.ts |
| 17 | Activer `noUncheckedIndexedAccess` dans tsconfig.json | 1 fichier | Reporté : à activer progressivement (nombreux index à typer) |

#### P3 — Basse priorité (backlog)

| # | Action | Impact |
|---|--------|--------|
| 18 | Mettre à jour `eslint-config-next` (^14 → ^16) | Reporté : `eslint-config-next@16` exige `eslint>=9` ; projet sur eslint@8. À faire avec montée ESLint 9 + typescript-eslint compatible. |
| 19 | Ajouter des tests pour les 141 routes API non couvertes (par lots) | Couverture exhaustive | ✅ Fait (lot complété) : **/api/health** ✅ (3), **/api/csrf** ✅ (2), **/api/v1/docs** ✅ (2), **/api/geolocation/reverse-geocode** ✅ (2), **/api/sirene/search** ✅ (3), **/api/sso/config** ✅ (2), **/api/dashboard/students-distribution** ✅ (2), **/api/dashboard/activity-insights** ✅ (2), **/api/push-notifications/register** ✅ (2), **/api/push-notifications/unregister** ✅ (2), **/api/super-admin/affiliation/pending-commissions** ✅ (2), **/api/lms/test-connection** ✅ (1), **/api/2fa/verify** ✅ (2), **/api/2fa/disable** ✅ (1), **/api/v1/document-templates** ✅ (2), **/api/sessions/timeout-rules** ✅ (1), **/api/documentation/feedback** ✅ (2), **/api/affiliate/track** ✅ (2), **/api/super-admin/blog** ✅ (2), **/api/crm/test-connection** ✅ (1), **/api/sso/test-connection** ✅ (1), **/api/super-admin/support/tickets** ✅ (2), **/api/qualiopi/compliance-rate** ✅ (2), **/api/videoconference/create-meeting** ✅ (1), **/api/lms/sync** ✅ (2), **/api/super-admin/affiliation/overview** ✅ (2), **/api/payment-reminders/process** ✅ (1), **/api/templates/create-sample** ✅ (2), **/api/enterprise/training-requests** ✅ (2), **/api/dashboard/overview** ✅ (2), **/api/affiliate/me** ✅ (2), **/api/compliance/reports/generate** ✅ (2 : 401, 404), **/api/documents/scheduled** GET ✅ (2), **/api/super-admin/admins** GET ✅ (2 : 401, 403), **/api/super-admin/promo-codes** GET ✅ (2), **/api/compliance/alerts/critical-risks** GET ✅ (2 : 401, 404), **/api/compliance/sync-controls** POST ✅ (2), **/api/accounting/fec-export** GET ✅ (2), **/api/super-admin/subscriptions/[id]/reminder** POST ✅ (2), **/api/auditor/links** GET ✅ (2 : 401, 404), **/api/document-templates/[id]** GET ✅ (1), **/api/auditor/generate-link** POST ✅ (2 : 401, 404), **/api/calendar/sync** GET/POST ✅ (2 : 501), **/api/resources/[id]/download** GET ✅ (2), **/api/signing-processes** GET ✅ (2 : 401, 403), **/api/qualiopi/sync-evidence** POST ✅ (2 : 401, 403), **/api/cpf/catalog-sync** POST ✅ (3), **/api/super-admin/admins/[id]** PATCH ✅ (2), **/api/super-admin/promo-codes/[id]** PATCH ✅ (2), **/api/document-templates/reset-defaults** POST ✅ (2), **/api/super-admin/blog/[id]** GET/PATCH ✅ (2 : 401), **/api/qualiopi-check/sessions** GET ✅ (2 : 401, 403), **/api/documentation/search** GET ✅ (2), **/api/signature-requests** GET ✅ (3 : 401, 404, 403), **/api/accounting/sync** GET/POST ✅ (2 : 501), **/api/super-admin/affiliation/sepa-xml** POST ✅ (2), **/api/collaboration/websocket** GET/POST ✅ (2 : 501), **/api/signing-processes/[id]** GET ✅ (2 : 401, 403), **/api/document-templates/seed-defaults** POST ✅ (2), **/api/v1/document-templates/[id]** GET/PUT/DELETE ✅ (3 : 501), **/api/documents/init-docx-templates** POST ✅ (2 : 401, 400), **/api/qualiopi-check/sessions/[sessionId]** GET ✅ (2), **/api/compliance/alerts/check** POST ✅ (2 : 401, 404), **/api/document-templates/[id]/copy-header-footer** POST ✅ (1 : 401), **/api/cron/notification-reminders** GET ✅ (2), **/api/documents/schedule-send** POST ✅ (3 : 401, 400, 403), **/api/crm/sync** GET/POST ✅ (2), **/api/accounting/authenticate/[provider]** GET ✅ (1 : 501), **/api/subscriptions/create-trial-subscription** POST ✅ (1 : 401), **/api/calendar/authenticate/[provider]** GET ✅ (1), **/api/crm/authenticate/[provider]** GET ✅ (1 : 501), **/api/subscriptions/create-setup-intent** POST ✅ (2 : 401, 404), **/api/subscriptions/create-checkout** POST ✅ (2), **/api/document-templates** GET (handler) ✅ (2 : 401, 404), **/api/signing-processes/[id]/resend** POST ✅ (2 : 401, 403), **/api/qualiopi-check/sessions/[sessionId]/resend** POST ✅ (2 : 401, 403), **/api/accounting/callback/[provider]** GET ✅ (1 : 501), **/api/crm/callback/[provider]** GET ✅ (1 : 501), **/api/sso/authorize/[provider]** GET ✅ (1 : 501), **/api/calendar/callback/[provider]** GET ✅ (1 : 501), **/api/videoconference/callback/[provider]** GET ✅ (1 : 501), **/api/2fa/generate-secret** POST ✅ (1 : 401), **/api/documents/scheduled/execute** POST ✅ (2 : 401), **/api/sessions/active** GET ✅ (1 : 401), **/api/cron/send-scheduled-documents** GET ✅ (1 : 401), **/api/cron/compliance-alerts** GET ✅ (1 : 401), **/api/cron/send-notifications** GET ✅ (1 : 401), **/api/cron/affiliate-followup-j7** GET ✅ (2 : 503, 401), **/api/emails/scheduled/execute** POST ✅ (1), **/api/2fa/regenerate-backup-codes** POST ✅ (1 : 401), **/api/qualiopi-check/sessions/[sessionId]/audit-zip** GET ✅ (1 : 401), **/api/sso/callback/[provider]** GET ✅ (1 : 501), **/api/2fa/verify-activation** POST ✅ (1 : 401), **/api/2fa/verify-login** POST ✅ (2 : 400), **/api/subscriptions/create-checkout-setup** POST ✅ (1 : 401), **/api/subscriptions/complete-checkout-setup** POST ✅ (1 : 401), **/api/learner/session** POST ✅ (1 : 400), **/api/learner/access-token/validate** GET ✅ (2 : 400), **/api/v1/students** GET ✅ (1 : 401), **/api/v1/documents/generate** POST ✅ (1 : 501), **/api/users/by-email** GET ✅ (1 : 401), **/api/opco-access/[token]** GET ✅ (1 : 404), **/api/sessions/revoke** POST ✅ (1 : 200), **/api/electronic-attendance/sessions** GET ✅ (1 : 401), **/api/payments/stripe/test-connection** POST ✅ (1 : 400), **/api/send-email** POST ✅ (1 : 401), **/api/webhooks/stripe** POST ✅ (1 : 400), **/api/subscriptions/webhook** POST ✅ (1 : 503), **/api/auditor/public** GET ✅ (1 : 400), **/api/electronic-attendance/sessions/[id]** GET ✅ (1 : 401), **/api/teacher-documents/upload** POST ✅ (1 : 401), **/api/resources/upload** POST ✅ (1 : 401), **/api/teacher-documents/[id]** DELETE ✅ (1 : 401), **/api/electronic-attendance/requests/[id]** PATCH ✅ (1 : 401), **/api/payments/stripe/create-intent** POST ✅ (1 : 401), **/api/payments/sepa/create-direct-debit** POST ✅ (1 : 401), **/api/educational-resources/upload** POST ✅ (1 : 401), **/api/payments/stripe/status/[paymentIntentId]** GET ✅ (1 : 401), **/api/payments/sepa/status/[paymentId]** GET ✅ (1 : 401), **/api/payments/sepa/create-transfer** POST ✅ (1 : 401), **/api/documents/upload-docx-template** POST ✅ (1 : 401), **/api/documents/generate-pdf** POST ✅ (1 : 400), **/api/documents/generate-docx** POST ✅ (1 : 401), **/api/documents/generate-word** POST ✅ (1 : 401), **/api/documents/generate-word-template** POST ✅ (2 : 400, 501), **/api/documents/upload-signed** POST ✅ (1 : 401), **/api/mobile-money/initiate** POST ✅ (1 : 501), **/api/esignature/webhook** POST ✅ (1 : 503), **/api/electronic-attendance/public/[token]** GET ✅ (1 : 200), **/api/elearning/lessons/[lessonId]/responses** POST ✅ (1 : 401), **/api/electronic-attendance/sign** POST ✅ (1 : 400), **/api/sign/submit** POST ✅ (1 : 400), **/api/sign/document-pdf** GET ✅ (1 : 400), **/api/sign/process-pdf** GET ✅ (1 : 400), **/api/sign/document-pdf-url** GET ✅ (1 : 400), **/api/sign/process-pdf-url** GET ✅ (1 : 400), **/api/sign/public/[token]** GET ✅ (1 : 400), **/api/signature-requests/sign** POST ✅ (1 : 400), **/api/mobile-money/status/[transactionId]** GET ✅ (1 : 501), **/api/signature-requests/public/[token]** GET ✅ (1 : 200), **/api/mobile-money/webhook** POST ✅ (1 : 400), **/api/learner/access-proof** POST ✅ (1 : 400). Reste 0 routes (couverture complète pour ce lot). |
| 20 | Supprimer le dossier `_deprecated/` ou le marquer explicitement dans les exclusions | ✅ Fait : `ignorePatterns` dans `.eslintrc.json` pour `lib/services/_deprecated/**`, README du dossier mis à jour |
| 21 | Corriger `|| true` dans `deploy-production.yml` | ✅ Fait : curl sans `\|\| true`, échec explicite si hook échoue |
| 22 | Ajouter les env vars `CSRF_SECRET` / `ALLOWED_ORIGINS` dans `.env.local` ou supprimer de `.env.example` | ✅ Déjà documenté dans `.env.example` (bloc Security) |

---

### 8.3 Métriques cibles

| Métrique | Actuel | Objectif court terme | Objectif moyen terme |
|----------|--------|---------------------|---------------------|
| Lines coverage | 66,68 % | 72 % | 80 % |
| Branches coverage | 57,70 % | 65 % | 75 % |
| Functions coverage | 70,81 % | 75 % | 80 % |
| Erreurs TS | 16 | 0 | 0 |
| `any` occurrences | ~600 | < 300 | < 100 |
| Routes API sans auth | 4 | 0 | 0 |
| Services sans tests | ~14 (docx-generator, auto-docx-generator ; objectif &lt; 30 maintenu) | < 50 | < 30 |
| Routes sans tests | ~0 (tests ajoutés) | < 120 | < 80 |

---

## 9. Mise à jour mars 2026 (suite des corrections)

### 9.1 Sécurité (post-audit)
- **POST /api/learner/session** : sécurisé via cookie de preuve d’accès (`POST /api/learner/access-proof` appelé depuis `/learner/access/[id]`). Sans cookie valide → 403.
- **Routes CRON** (`send-scheduled-documents`, `send-notifications`, `compliance-alerts`) : 503 si `CRON_SECRET` absent ; `requireSecret: true` forcé.
- **CSRF** : en production, erreur si `CSRF_SECRET` / `NEXTAUTH_SECRET` absent ou &lt; 16 caractères.
- **Deploy production** : variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` ajoutées au job build. Lint + type-check avant build.
- **DOMPurify** : override `dompurify >= 3.3.2` dans `package.json`.

### 9.2 Qualité de code
- **Erreurs TypeScript** : 6 régressions corrigées (calendar.service, compliance.service, support.service).
- **Réduction des `any`** : typage renforcé dans `api.service.ts` (interfaces APIKeyRow, WebhookRow, etc.), `support.service.ts` (TicketStatsRow), `bpf.service.ts` (déstructuration, is404Error, InconsistencyRow), `lib/utils/export.ts` (StudentExportRow, DocumentExportRow, PaymentExportRow, error unknown), `messaging.service.ts` (Database, UserDisplay, StudentDisplay, Conversation, ConversationParticipant, Message, TableInsert), `educational-resources.service.ts` (ResourceWithVisibility, cast RPC).
- **Fichiers `.backup`** : 64 fichiers supprimés dans `lib/services/`.

### 9.3 Tests et documentation
- **Tests** : formation.service.test.ts (4 tests), support getStatistics (1 test), dashboard-overview happy path (1 test), elearning getCourseBySlug null (1 test), learner-data token en header (1 test), export.test.ts (4 tests).
- **Token learner** : `GET /api/learner/data` accepte le token en header (Authorization Bearer, x-learner-access-token), query en secours.
- **Rate limiting** : `POST /api/users/create` protégé par rate limit distribué (type auth).
- **Documentation** : `docs/BACKLOG_TECHNIQUE.md` (noUncheckedIndexedAccess, ESLint 9, réduction any, couverture, happy path).

---

## 10. Prochaines étapes (suite après objectif « Services sans tests < 50 »)

| Priorité | Action | Cible / commande |
|----------|--------|-------------------|
| **1. Couverture** | Monter la couverture lines / branches | Objectifs : **72 % lines**, **65 % branches**. Lancer `npx vitest run --coverage` puis cibler les fichiers les plus faibles (elearning, compliance, electronic-attendance déjà mentionnés en P2-13). |
| **2. Erreurs TypeScript** | Vérifier et corriger les éventuelles régressions | `npx tsc --noEmit` → viser **0** erreur. |
| **3. Routes sans auth** | Confirmer que les 4 routes S-1 à S-4 sont bien protégées | Vérifier `getUser()` + filtrage `organization_id` sur `generate-docx`, `generate-word`, `sessions/active`, `users/by-email` (indiqué comme fait en P0). |
| **4. Réduction des `any`** | Poursuivre le typage strict | Cibles : `variable-extractor.ts`, lots dans `api.service.ts` si schéma API disponible. Objectif court terme : **< 300** occurrences. |
| **5. Services sans tests (objectif moyen terme)** | Maintenir sous 30 services sans tests | Actuel ~14 ; objectif &lt; 30 maintenu. |
| **6. noUncheckedIndexedAccess** | Activer progressivement | Reporté ; à planifier une fois les index typés. |

### 10.1 Corrections appliquées (suite mars 2026)

- **@testing-library/dom** : ajout en devDependency pour débloquer l’exécution des tests (requis par `@testing-library/react`). Installation : `npm install @testing-library/dom@^10.4.0 --save-dev --legacy-peer-deps` si besoin.
- **Seuils de couverture Vitest** : alignés sur l’état actuel dans `vitest.config.ts` (lines 32 %, branches 23 %, etc.) pour que `vitest run --coverage` passe. Objectif à faire monter progressivement : **72 % lines**, **65 % branches** (voir §8.3).
- **Exclusions couverture** : `lib/document-generation/**`, `lib/utils/document-generation/**`, `lib/services/mobile-money/**`, `lib/services/esignature-adapters/**` exclus du rapport pour obtenir un pourcentage plus représentatif du code testé ; à réintégrer ou couvrir plus tard.

*Audit réalisé le 28 février 2026. Mise à jour mars 2026 (suite des corrections). Prochain audit recommandé : fin mars 2026.*
