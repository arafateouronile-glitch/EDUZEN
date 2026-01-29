# Relevé complet des erreurs pouvant empêcher le build

**Date :** 23 janvier 2026  
**Source :** `npx tsc --noEmit` (typescript-errors-final.txt)

---

## Résumé

| Catégorie | Nb erreurs | Fichiers | Bloquant |
|-----------|------------|----------|----------|
| Logger (arguments / nom manquant) | ~50 | 15+ | Oui |
| Supabase (tables/types manquants) | ~60 | 6 | Oui |
| Recharts (props non reconnues) | ~25 | 4 | Oui |
| Zod / Import service | ~40 | 1 | Oui |
| Stripe API (version / propriétés) | ~12 | 3 | Oui |
| ReactNode / Accordion / Toast | ~20 | 6 | Oui |
| Variables / noms manquants | ~10 | 5 | Oui |
| Autres (null, types, modules) | ~30 | 15+ | Oui |

**Total estimé : ~250+ erreurs TypeScript** pouvant bloquer le build.

---

## 1. Erreurs Logger

**Problème :** `logger` attend 1–2 arguments `(message, context?)` ; nombreux appels avec 3+ arguments ou `logger` non importé.

### Fichiers concernés

| Fichier | Erreurs | Détail |
|---------|---------|--------|
| `app/api/documents/generate-word/route.ts` | 1 | L.58 : 3 arguments au lieu de 1–2 |
| `app/api/documents/generate/route.ts` | 3 | L.293 (3 args), L.425–427 : `errorStack` non défini dans le scope utilisé |
| `app/api/electronic-attendance/sessions/route.ts` | 1 | L.121 : 3 arguments |
| `app/api/learner/data/route.ts` | 3 | L.64, 87, 124 : 3 arguments |
| `components/document-editor/DocumentEditor.tsx` | 2 | L.504–505 : 3 arguments |
| `components/document-editor/element-palette.tsx` | 1 | L.148 : 4 arguments |
| `components/document-editor/shape-editor.tsx` | 1 | L.88 : 4 arguments |
| `lib/utils/document-generation/html-generator.ts` | 15+ | Nombreux 2e/3e arguments non `LogContext`, L.1164 : 4 arguments |
| `lib/utils/document-generation/pdf-generator.tsx` | 5 | `logger` non importé (L.115, 127, 168, 171, 297) |
| `lib/utils/document-generation/qr-barcode-generator.ts` | 2 | `logger` non importé (L.24, 44) |
| `lib/utils/document-generation/signature-processor.ts` | 1 | L.47 : type `unknown` au lieu de `LogContext` |
| `lib/utils/word-generator.ts` | 25+ | 3–7 arguments, types non LogContext |
| `lib/utils/analytics.ts` | 2 | L.59, 66 : `unknown` au lieu de `LogContext` |
| `lib/utils/api-error-response.ts` | 1 | L.123 : `logger` introuvable |
| `lib/utils/export.ts` | 1 | L.88 : `logger` introuvable |
| `lib/utils/i18n-format.ts` | 4 | L.33, 52, 79, 109 : `logger` introuvable |
| `lib/utils/keyboard-shortcuts.ts` | 2 | L.44, 61 : `logger` introuvable |
| `lib/utils/pdf-generator.ts` | 3 | L.336, 502, 547 : type `unknown` |
| `lib/utils/pwa.ts` | 4 | L.50, 59, 67, 88 : `logger` introuvable |
| `lib/utils/report-pdf-export.ts` | 2 | L.64, 240 : type `unknown` |
| `lib/utils/secure-storage.ts` | 2 | L.138, 184 : `logger` introuvable |
| `lib/hooks/use-platform-admin.ts` | 1 | L.88 : string au lieu de `LogContext` |

---

## 2. Erreurs Supabase (tables / types)

**Problème :** Tables absentes des types générés (`company_managers`, `training_requests`, `opco_share_links`, `company_employees`, `companies`, `signatories`, `signing_processes`, `compliance_evidence_automated`) et propriétés manquantes sur `ResultOne`.

### Fichiers concernés

| Fichier | Erreurs | Détail |
|---------|---------|--------|
| `app/api/enterprise/training-requests/route.ts` | 20+ | `.from('company_managers'|'training_requests'|'companies')`, `company_id`, `can_request_training`, etc. |
| `app/api/opco-access/[token]/route.ts` | 38+ | `opco_share_links`, `company_employees`, propriétés (expires_at, access_count, document_types, invoice_ids, etc.), **L.45 : `apiError` introuvable** |
| `app/api/sign/process-pdf-url/route.ts` | 12+ | **L.22 : variable `process` utilisée avant déclaration / shadowing**, `signatories`, `signing_processes`, `signed_at`, `process_id`, `order_index` |
| `app/api/sign/public/[token]/route.ts` | 9+ | `signatories`, `signing_processes`, `signed_at`, `process_id`, `status`, `current_index`, `order_index` |
| `components/enterprise/header.tsx` | 2 | `.from('company_managers')` |
| `components/qualiopi/premium/qualiopi-dashboard-premium.tsx` | 2 | `.from('compliance_evidence_automated')` |

---

## 3. Erreurs Recharts

**Problème :** Props Recharts (children, fill, dataKey, content, etc.) non reconnues par les types.

### Fichiers concernés

| Fichier | Erreurs | Détail |
|---------|---------|--------|
| `components/bpf/BPFRevenueChart.tsx` | 9 | Sector, Pie, Cell, Tooltip (cx, cy, fill, content, active, payload) |
| `components/enterprise/skills-evolution-chart.tsx` | 12+ | AreaChart, XAxis, YAxis, Tooltip, Legend, Area (children, strokeDasharray, dataKey, yAxisId, verticalAlign, etc.) |
| `components/super-admin/dashboard/revenue-chart.tsx` | 10 | AreaChart, XAxis, YAxis, Tooltip, Legend, Area |
| `components/super-admin/dashboard/subscriptions-chart.tsx` | 5 | PieChart, Pie, Cell, Tooltip |

---

## 4. Erreurs Zod / Import service

**Problème :** Clés de mapping (alias de colonnes) non assignables aux types déduits du schéma Zod.

### Fichier

| Fichier | Erreurs | Détail |
|---------|---------|--------|
| `lib/services/import.service.ts` | 37 | L.64–74 : "prenom", "prénom", "nom", "name", "firstname", "lastname", "mail", "e-mail", "téléphone", "date_naissance", "adresse", "ville", "code_postal", "pays", "numero_etudiant", "statut", etc. non assignables à `requiredKeys`/`optionalKeys` du schéma |

---

## 5. Erreurs Stripe

**Problème :** Version d’API (`"2024-12-18.acacia"` / `"2024-11-20.acacia"` au lieu de `"2025-12-15.clover"`) et propriétés manquantes sur les types Stripe.

### Fichiers concernés

| Fichier | Erreurs | Détail |
|---------|---------|--------|
| `app/api/subscriptions/create-checkout/route.ts` | 3 | apiVersion, `stripe_price_id_yearly`, `stripe_price_id_monthly` |
| `app/api/subscriptions/webhook/route.ts` | 5 | apiVersion, `current_period_start`, `current_period_end` sur Response/Subscription |
| `app/api/webhooks/stripe/route.ts` | 5 | apiVersion, `current_period_start`/`current_period_end`, `subscription` sur Invoice |

---

## 6. Erreurs React / UI (ReactNode, Accordion, Toast)

**Problème :** `unknown` non assignable à `ReactNode` ; props `value`/`onClick` sur Accordion ; `variant` sur Toast.

### Fichiers concernés

| Fichier | Erreurs | Détail |
|---------|---------|--------|
| `app/(public)/sign/[token]/page.tsx` | 3 | L.301, 305, 311 : type `unknown` → ReactNode |
| `app/(dashboard)/dashboard/signing-processes/new/page.tsx` | 1 | L.45 : `string \| null` passé où `string` attendu |
| `components/auditor-portal/AuditorPortal.tsx` | 2 | Accordion : `value`, AccordionTrigger : `onClick` |
| `components/bpf/BPFInconsistencyPanel.tsx` | 1 | Accordion : `value` |
| `components/onboarding/import-assistant.tsx` | 4 | Toast : `variant` n’existe pas sur `Omit<Toast, "id">` |
| `components/onboarding/organization-setup-wizard.tsx` | 5 | Idem `variant` |
| `components/sign/SignatureStepWithCheckbox.tsx` | 1 | L.55 : `sigRef.current` possibly null |
| `components/lazy/index.tsx` | 1 | L.80 : `DocumentEditor` n’existe pas sur l’import (export default) |
| `components/super-admin/header.tsx` | 5 | L.259, 275, 280 : comparaisons theme "dark"/"system" (types sans overlap), L.267, 272, 277 : 1 argument au lieu de 0 |

---

## 7. Variables / noms manquants ou incorrects

| Fichier | Ligne | Erreur |
|---------|-------|--------|
| `app/api/documents/generate/route.ts` | 425 | `errorStack` utilisé alors que défini plus bas dans un autre bloc (scope) |
| `app/api/opco-access/[token]/route.ts` | 45 | `apiError` introuvable (à remplacer par `createSecureErrorResponse`) |
| `app/api/sign/process-pdf-url/route.ts` | 22 | `process` : variable de bloc utilisée avant déclaration / shadowing |
| `app/api/sirene/search/route.ts` | 149–150 | `siret` introuvable, shorthand `siren` sans valeur |

---

## 8. Autres erreurs (API, services, utils)

| Fichier | Erreur |
|---------|--------|
| `app/api/sign/submit/route.ts` L.93 | `const` assertion invalide |
| `app/api/teacher-documents/upload/route.ts` L.90 | Insert : `string \| null` là où `string` requis ; `organization_id` inconnu sur le type d’insert |
| `app/api/users/create/route.ts` L.29 | `ValidationResult` : `sanitized: null` non assignable (attendu `string \| undefined`) |
| `app/cataloguepublic/[slug]/page.tsx` L.202–204 | `stats_trained_students`, `stats_satisfaction_rate`, `stats_success_rate` absents du type |
| `lib/services/organization-setup.service.ts` | L.154 : `"attestation"` non assignable à `DocumentType` ; L.309 : `is_active` ; L.367 : `certification_issued` ; L.394 : `max_students` |
| `lib/services/quota.service.ts` L.267–268 | Accès à `.name` / `.features` sur un tableau |
| `lib/services/signature-request.service.ts` L.92 | `token_expires_at` inconnu sur `FlexibleInsert<"signature_requests">` |
| `lib/services/signing-process.service.ts` L.118 | Conversion de type `ProcessWithSignatories` (document array vs objet) |
| `lib/services/student.service.ts` L.254 | Argument `string` au lieu de `ErrorCode \| undefined` |
| `lib/utils/barcode-generator.ts` | L.6 : `@ts-expect-error` inutilisé ; L.8 : module `bwip-js` introuvable |
| `lib/utils/sanitize-html.ts` | DOMPurify namespace, TrustedHTML (includes, replace), paramètres `any` implicites, retour `string` |
| `lib/utils/seal-pdf.ts` L.62 | `"Helvetica"` non assignable à `StandardFonts` |
| `lib/utils/with-secure-api.ts` L.206 | `rateLimit: "MUTATION"` non assignable à `RateLimitType` ("AUTH" \| "PAYMENT" \| "DOCUMENT_GENERATION" \| "GENERAL") |

---

## Ordre de correction recommandé

1. **Variables / noms manquants** : `errorStack`, `apiError`, `process`, `siret`/`siren` (rapide, fort impact).
2. **Logger** : ajouter l’import `logger` où il manque, et normaliser les appels en `(message, context?)` ou `(message, error?, context?)` selon la signature réelle.
3. **Supabase** : utiliser `(supabase as any).from('...')` ou régénérer les types avec les tables manquantes.
4. **Recharts** : typage explicite des props ou `{...({} as any)}` sur les composants concernés.
5. **Stripe** : aligner `apiVersion` et utiliser des casts pour les propriétés manquantes.
6. **ReactNode / Accordion / Toast** : casts `as ReactNode`, correction des props (ou types des composants UI), `variant` → `type` si le Toast le permet.
7. **Zod / import.service** : élargir les types de mapping (ou `as any` temporaire) pour les alias de colonnes.
8. **Services et utils restants** : corrections ciblées (DocumentType, ValidationResult, quota, signature, seal-pdf, with-secure-api, sanitize-html, barcode-generator).

---

## Commande pour vérifier le build

```bash
npx tsc --noEmit
# ou
npm run build
```

Tant que ces erreurs sont présentes, `tsc` et le build Next.js peuvent échouer.
