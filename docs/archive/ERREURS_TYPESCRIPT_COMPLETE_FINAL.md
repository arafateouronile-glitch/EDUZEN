# Liste Complète des Erreurs TypeScript

**Date :** 26 janvier 2026  
**Total d'erreurs :** 416 lignes d'erreurs (environ 200+ erreurs uniques)

## 📊 Statistiques Globales

**Total d'erreurs :** ~200+ erreurs uniques (416 lignes dans le fichier)

### Répartition par Code d'Erreur TypeScript

1. **TS2339** (69 erreurs) - Property does not exist on type
2. **TS2322** (69 erreurs) - Type is not assignable to type
3. **TS2345** (43 erreurs) - Argument of type is not assignable to parameter
4. **TS2554** (25 erreurs) - Expected N arguments, but got M
5. **TS2304** (24 erreurs) - Cannot find name
6. **TS2769** (16 erreurs) - No overload matches this call
7. **TS2589** (13 erreurs) - Type instantiation is excessively deep
8. **TS2353** (13 erreurs) - Object literal may only specify known properties
9. **TS7006** (10 erreurs) - Parameter implicitly has an 'any' type
10. **TS2820** (6 erreurs) - Type is not assignable (suggestions)
11. **TS2367** (3 erreurs) - Comparison appears to be unintentional
12. **TS7031** (2 erreurs) - Binding element implicitly has an 'any' type
13. **TS18047** (2 erreurs) - Variable is possibly 'null'
14. **TS2578** (1 erreur) - Unused '@ts-expect-error' directive
15. **TS2552** (1 erreur) - Cannot find name (suggestions)

## 📊 Résumé par Catégorie

### 1. Erreurs Logger (30+ erreurs)
**Problème :** Appels `logger.*()` avec mauvais nombre d'arguments ou types incorrects

**Fichiers affectés :**
- `app/api/documents/generate-word/route.ts` (1 erreur)
- `app/api/documents/generate/route.ts` (2 erreurs)
- `app/api/electronic-attendance/sessions/route.ts` (1 erreur)
- `app/api/learner/data/route.ts` (3 erreurs)
- `components/document-editor/DocumentEditor.tsx` (2 erreurs)
- `components/document-editor/element-palette.tsx` (1 erreur)
- `components/document-editor/shape-editor.tsx` (1 erreur)
- `lib/utils/document-generation/html-generator.ts` (15+ erreurs)
- `lib/utils/document-generation/pdf-generator.tsx` (5 erreurs)
- `lib/utils/document-generation/qr-barcode-generator.ts` (2 erreurs)
- `lib/utils/word-generator.ts` (20+ erreurs)
- Et plusieurs autres fichiers...

**Types d'erreurs :**
- `TS2554: Expected 1-2 arguments, but got 3/4/5/7`
- `TS2345: Argument of type 'string'/'number'/'string[]' is not assignable to parameter of type 'LogContext'`
- `TS2304: Cannot find name 'logger'`

### 2. Erreurs Supabase/Type Instantiation (50+ erreurs)
**Problème :** Tables manquantes dans les types générés ou instanciation de types trop profonde

**Fichiers affectés :**
- `app/api/enterprise/training-requests/route.ts` (20+ erreurs)
- `app/api/opco-access/[token]/route.ts` (40+ erreurs)
- `app/api/sign/process-pdf-url/route.ts` (10+ erreurs)
- `app/api/sign/public/[token]/route.ts` (10+ erreurs)
- `components/enterprise/header.tsx` (2 erreurs)
- `components/qualiopi/premium/qualiopi-dashboard-premium.tsx` (2 erreurs)

**Types d'erreurs :**
- `TS2589: Type instantiation is excessively deep and possibly infinite`
- `TS2769: No overload matches this call` - Tables manquantes : `company_managers`, `training_requests`, `companies`, `opco_share_links`, `company_employees`, `signatories`, `signing_processes`, `compliance_evidence_automated`
- `TS2339: Property 'X' does not exist on type 'NonNullable<ResultOne>'`

### 3. Erreurs React/ReactNode (10+ erreurs)
**Problème :** Types `unknown` non assignables à `ReactNode`

**Fichiers affectés :**
- `app/(public)/sign/[token]/page.tsx` (3 erreurs)
- `components/auditor-portal/AuditorPortal.tsx` (2 erreurs)
- `components/bpf/BPFInconsistencyPanel.tsx` (1 erreur)

**Types d'erreurs :**
- `TS2322: Type 'unknown' is not assignable to type 'ReactNode'`
- `TS2322: Property 'value'/'onClick' does not exist on type 'AccordionProps'`

### 4. Erreurs Recharts (40+ erreurs)
**Problème :** Props Recharts non reconnues par TypeScript

**Fichiers affectés :**
- `components/bpf/BPFRevenueChart.tsx` (10+ erreurs)
- `components/enterprise/skills-evolution-chart.tsx` (15+ erreurs)
- `components/super-admin/dashboard/revenue-chart.tsx` (10+ erreurs)
- `components/super-admin/dashboard/subscriptions-chart.tsx` (5+ erreurs)

**Types d'erreurs :**
- `TS2322: Property 'children'/'fill'/'content'/'dataKey'/'axisLine'/'cursor'/'verticalAlign'/'strokeDasharray'/'yAxisId'/'type' does not exist on type 'IntrinsicAttributes'`
- `TS7006: Parameter 'value'/'active'/'payload' implicitly has an 'any' type`

### 5. Erreurs Types Null/Undefined (10+ erreurs)
**Problème :** Types `string | null` non assignables à `string`

**Fichiers affectés :**
- `app/(dashboard)/dashboard/signing-processes/new/page.tsx` (1 erreur)
- `app/api/teacher-documents/upload/route.ts` (1 erreur)
- `app/api/sign/process-pdf-url/route.ts` (3 erreurs)
- `components/sign/SignatureStepWithCheckbox.tsx` (1 erreur)

**Types d'erreurs :**
- `TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'`
- `TS18047: 'X' is possibly 'null'`

### 6. Erreurs Stripe/Subscriptions (10+ erreurs)
**Problème :** Versions Stripe API ou propriétés manquantes

**Fichiers affectés :**
- `app/api/subscriptions/create-checkout/route.ts` (3 erreurs)
- `app/api/subscriptions/webhook/route.ts` (4 erreurs)
- `app/api/webhooks/stripe/route.ts` (4 erreurs)

**Types d'erreurs :**
- `TS2322: Type '"2024-12-18.acacia"' is not assignable to type '"2025-12-15.clover"'`
- `TS2339: Property 'stripe_price_id_yearly'/'stripe_price_id_monthly'/'current_period_start'/'current_period_end'/'subscription' does not exist`

### 7. Erreurs Import Service (30+ erreurs)
**Problème :** Clés de mapping non reconnues par Zod

**Fichier :** `lib/services/import.service.ts` (30+ erreurs)

**Types d'erreurs :**
- `TS2322: Type '"prenom"'/"prénom"'/"nom"'/"name"'/"firstname"' is not assignable to type 'requiredKeys<...>'`
- Erreurs similaires pour tous les alias de colonnes (email, phone, address, etc.)

### 8. Erreurs Autres Services (20+ erreurs)
**Fichiers affectés :**
- `lib/services/organization-setup.service.ts` (3 erreurs)
- `lib/services/quota.service.ts` (2 erreurs)
- `lib/services/signature-request.service.ts` (1 erreur)
- `lib/services/signing-process.service.ts` (1 erreur)
- `lib/services/student.service.ts` (1 erreur)

**Types d'erreurs :**
- `TS2322: Type '"attestation"' is not assignable to type 'DocumentType'`
- `TS2353: Object literal may only specify known properties, and 'X' does not exist`
- `TS2352: Conversion of type '...' to type '...' may be a mistake`

### 9. Erreurs Utilitaires (30+ erreurs)
**Fichiers affectés :**
- `lib/utils/analytics.ts` (2 erreurs)
- `lib/utils/api-error-response.ts` (1 erreur)
- `lib/utils/barcode-generator.ts` (2 erreurs)
- `lib/utils/document-generation/html-generator.ts` (plusieurs erreurs logger)
- `lib/utils/document-generation/pdf-generator.tsx` (5 erreurs logger)
- `lib/utils/document-generation/qr-barcode-generator.ts` (2 erreurs logger)
- `lib/utils/export.ts` (1 erreur logger)
- `lib/utils/i18n-format.ts` (4 erreurs logger)
- `lib/utils/keyboard-shortcuts.ts` (2 erreurs logger)
- `lib/utils/pdf-generator.ts` (3 erreurs)
- `lib/utils/pwa.ts` (4 erreurs logger)
- `lib/utils/report-pdf-export.ts` (2 erreurs)
- `lib/utils/sanitize-html.ts` (10+ erreurs)
- `lib/utils/seal-pdf.ts` (1 erreur)
- `lib/utils/secure-storage.ts` (2 erreurs logger)
- `lib/utils/with-secure-api.ts` (1 erreur)
- `lib/utils/word-generator.ts` (nombreuses erreurs logger)

### 10. Erreurs Composants UI (10+ erreurs)
**Fichiers affectés :**
- `app/cataloguepublic/[slug]/page.tsx` (3 erreurs - propriétés stats manquantes)
- `components/lazy/index.tsx` (1 erreur)
- `components/onboarding/import-assistant.tsx` (4 erreurs)
- `components/onboarding/organization-setup-wizard.tsx` (5 erreurs)
- `components/super-admin/header.tsx` (5 erreurs)

**Types d'erreurs :**
- `TS2339: Property 'stats_trained_students'/'stats_satisfaction_rate'/'stats_success_rate' does not exist`
- `TS2339: Property 'DocumentEditor' does not exist`
- `TS2353: Object literal may only specify known properties, and 'variant' does not exist`
- `TS2367: This comparison appears to be unintentional`
- `TS2554: Expected 0 arguments, but got 1`

### 11. Erreurs API Routes (10+ erreurs)
**Fichiers affectés :**
- `app/api/documents/generate/route.ts` (3 erreurs - logger + errorStack)
- `app/api/sign/submit/route.ts` (1 erreur)
- `app/api/sirene/search/route.ts` (2 erreurs)
- `app/api/users/create/route.ts` (1 erreur)

**Types d'erreurs :**
- `TS2304: Cannot find name 'errorStack'/'apiError'/'siret'/'siren'`
- `TS1355: A 'const' assertions can only be applied to...`
- `TS2322: Type '...' is not assignable to type 'ValidationResult'`

## 🔧 Solutions Recommandées

### Priorité 1 - Erreurs Bloquantes

1. **Logger** : Corriger tous les appels `logger.*()` pour utiliser la signature correcte `(message, error?, context?)`
2. **Tables Supabase manquantes** : Régénérer les types avec `npm run db:generate` ou ajouter `as any` temporairement
3. **Types ReactNode** : Convertir les `unknown` en `ReactNode` avec `as ReactNode`

### Priorité 2 - Erreurs Importantes

4. **Recharts** : Ajouter `{...({} as any)}` aux composants ou utiliser `React.createElement`
5. **Types null** : Ajouter des vérifications null ou utiliser `|| ''` / `?? ''`
6. **Stripe API** : Mettre à jour les versions d'API Stripe

### Priorité 3 - Erreurs Secondaires

7. **Import Service** : Ajuster les types Zod pour accepter les alias
8. **Utilitaires** : Corriger les imports `logger` manquants
9. **Composants UI** : Corriger les props manquantes ou incorrectes

## 📝 Fichiers à Corriger en Priorité (par nombre d'erreurs)

1. **`app/api/opco-access/[token]/route.ts`** - 38 erreurs (Supabase types)
2. **`lib/services/import.service.ts`** - 37 erreurs (Zod types)
3. **`lib/utils/word-generator.ts`** - 30 erreurs (Logger)
4. **`app/api/enterprise/training-requests/route.ts`** - 20 erreurs (Supabase types)
5. **`lib/utils/document-generation/html-generator.ts`** - 13 erreurs (Logger)
6. **`app/api/sign/process-pdf-url/route.ts`** - 12 erreurs (Supabase types)
7. **`components/super-admin/dashboard/revenue-chart.tsx`** - 10 erreurs (Recharts)
8. **`components/enterprise/skills-evolution-chart.tsx`** - 10 erreurs (Recharts)
9. **`lib/utils/sanitize-html.ts`** - 9 erreurs (DOMPurify)
10. **`components/bpf/BPFRevenueChart.tsx`** - 9 erreurs (Recharts)
11. **`app/api/sign/public/[token]/route.ts`** - 9 erreurs (Supabase types)
12. **`components/super-admin/header.tsx`** - 6 erreurs (UI)
13. **`lib/utils/document-generation/pdf-generator.tsx`** - 5 erreurs (Logger)
14. **`components/onboarding/organization-setup-wizard.tsx`** - 5 erreurs (UI)
15. **`app/api/webhooks/stripe/route.ts`** - 5 erreurs (Stripe API)
16. **`app/api/subscriptions/webhook/route.ts`** - 5 erreurs (Stripe API)

## 🎯 Prochaines Étapes

1. Corriger toutes les erreurs Logger (priorité 1)
2. Régénérer les types Supabase ou ajouter `as any` temporairement
3. Corriger les erreurs ReactNode
4. Corriger les erreurs Recharts
5. Corriger les erreurs restantes par ordre de priorité
