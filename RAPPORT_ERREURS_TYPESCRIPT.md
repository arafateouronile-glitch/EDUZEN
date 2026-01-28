# Rapport des Erreurs TypeScript

Date: 27 janvier 2026

## Résumé

Le projet contient **417 erreurs TypeScript** réparties dans plusieurs catégories.

## Catégories d'erreurs

### 1. Erreurs liées aux types de base de données (Supabase)
**Fichiers concernés:**
- `app/api/enterprise/training-requests/route.ts` - Tables manquantes: `company_managers`, `training_requests`, `companies`
- `app/api/opco-access/[token]/route.ts` - Tables manquantes: `opco_share_links`, `company_employees`
- `app/api/sign/process-pdf-url/route.ts` - Tables manquantes: `signatories`, `signing_processes`
- `app/api/sign/public/[token]/route.ts` - Tables manquantes: `signatories`, `signing_processes`
- `components/enterprise/header.tsx` - Table manquante: `company_managers`
- `components/qualiopi/premium/qualiopi-dashboard-premium.tsx` - Table manquante: `compliance_evidence_automated`

**Problème:** Ces tables n'existent pas dans les types générés de `database.types.ts`. Il faut soit:
- Ajouter ces tables à la base de données
- Régénérer les types depuis Supabase
- Créer des types manuels si ces tables sont des vues ou des relations

### 2. Erreurs liées aux propriétés manquantes dans les types
**Fichiers concernés:**
- `app/cataloguepublic/[slug]/page.tsx` (lignes 202-204) - **CORRIGÉ** ✅
  - `stats_trained_students`
  - `stats_satisfaction_rate`
  - `stats_success_rate`
- `app/api/opco-access/[token]/route.ts` - Propriétés manquantes: `expires_at`, `max_access_count`, `access_count`, `title`, `description`, `company`, `document_types`, `invoice_ids`, etc.
- `app/api/sign/process-pdf-url/route.ts` - Propriétés manquantes: `signed_at`, `process_id`, `order_index`
- `app/api/subscriptions/create-checkout/route.ts` - Propriétés manquantes: `stripe_price_id_yearly`, `stripe_price_id_monthly`
- `app/api/subscriptions/webhook/route.ts` - Propriétés manquantes: `current_period_start`, `current_period_end`
- `app/api/webhooks/stripe/route.ts` - Propriétés manquantes: `current_period_start`, `current_period_end`, `subscription`

### 3. Erreurs liées aux arguments de fonctions
**Fichiers concernés:**
- `app/api/documents/generate-word/route.ts` (ligne 58)
- `app/api/documents/generate/route.ts` (lignes 293, 425)
- `app/api/electronic-attendance/sessions/route.ts` (ligne 121)
- `app/api/learner/data/route.ts` (lignes 64, 87, 124)
- `components/document-editor/DocumentEditor.tsx` (lignes 504, 505)
- `components/document-editor/element-palette.tsx` (ligne 148)
- `components/document-editor/shape-editor.tsx` (ligne 88)
- `lib/utils/document-generation/html-generator.ts` (ligne 1164)
- `lib/utils/word-generator.ts` (multiples lignes)

**Problème:** Appels de fonctions avec un nombre incorrect d'arguments (attendu 1-2, reçu 3-7).

### 4. Erreurs liées aux types React/Recharts
**Fichiers concernés:**
- `components/auditor-portal/AuditorPortal.tsx` - Props `value` et `onClick` non supportées par Accordion
- `components/bpf/BPFInconsistencyPanel.tsx` - Prop `value` non supportée par Accordion
- `components/bpf/BPFRevenueChart.tsx` - Types Recharts incorrects
- `components/enterprise/skills-evolution-chart.tsx` - Types Recharts incorrects
- `components/super-admin/dashboard/revenue-chart.tsx` - Types Recharts incorrects
- `components/super-admin/dashboard/subscriptions-chart.tsx` - Types Recharts incorrects

**Problème:** Utilisation incorrecte des composants Recharts ou des props non supportées.

### 5. Erreurs liées aux variables non définies
**Fichiers concernés:**
- `app/api/documents/generate/route.ts` (ligne 425) - `errorStack` non défini
- `app/api/opco-access/[token]/route.ts` (ligne 45) - `apiError` non défini
- `app/api/sign/process-pdf-url/route.ts` (ligne 22) - Conflit avec variable `process` globale
- `app/api/sirene/search/route.ts` (lignes 149-150) - `siret` et `siren` non définis
- `lib/utils/api-error-response.ts` (ligne 123) - `logger` non défini
- `lib/utils/document-generation/pdf-generator.tsx` - `logger` non défini (multiples lignes)
- `lib/utils/document-generation/qr-barcode-generator.ts` - `logger` non défini
- `lib/utils/export.ts` (ligne 88) - `logger` non défini
- `lib/utils/i18n-format.ts` - `logger` non défini (multiples lignes)
- `lib/utils/keyboard-shortcuts.ts` - `logger` non défini
- `lib/utils/pwa.ts` - `logger` non défini (multiples lignes)
- `lib/utils/secure-storage.ts` - `logger` non défini

**Problème:** Variables utilisées sans être importées ou définies.

### 6. Erreurs liées aux types Stripe
**Fichiers concernés:**
- `app/api/subscriptions/create-checkout/route.ts` (ligne 8) - Version API Stripe obsolète
- `app/api/subscriptions/webhook/route.ts` (ligne 7) - Version API Stripe obsolète
- `app/api/webhooks/stripe/route.ts` (ligne 7) - Version API Stripe obsolète

**Problème:** Versions d'API Stripe obsolètes. Mettre à jour vers `"2025-12-15.clover"`.

### 7. Erreurs liées aux types de validation
**Fichiers concernés:**
- `app/api/users/create/route.ts` (ligne 29) - Type de retour incompatible avec `ValidationResult`
- `lib/services/import.service.ts` - Multiples erreurs de mapping de clés (lignes 64-74)
- `lib/services/organization-setup.service.ts` (ligne 154) - Type `"attestation"` non assignable à `DocumentType`
- `lib/services/organization-setup.service.ts` (lignes 309, 367, 394) - Propriétés non existantes dans les types
- `lib/services/signature-request.service.ts` (ligne 92) - Propriété `token_expires_at` non existante
- `lib/services/signing-process.service.ts` (ligne 118) - Conversion de type incorrecte
- `lib/services/student.service.ts` (ligne 254) - Type `string` non assignable à `ErrorCode`
- `lib/utils/with-secure-api.ts` (ligne 206) - Type `"MUTATION"` non assignable au type de rateLimit

### 8. Erreurs liées aux types de logging
**Fichiers concernés:**
- `lib/hooks/use-platform-admin.ts` (ligne 88)
- `lib/utils/analytics.ts` (lignes 59, 66)
- `lib/utils/document-generation/html-generator.ts` (multiples lignes)
- `lib/utils/document-generation/signature-processor.ts` (ligne 47)
- `lib/utils/pdf-generator.ts` (multiples lignes)
- `lib/utils/report-pdf-export.ts` (lignes 64, 240)
- `lib/utils/word-generator.ts` (multiples lignes)

**Problème:** Arguments de type incorrects passés à `logger` (attendu `LogContext`, reçu `string`, `number`, `string[]`, etc.).

### 9. Erreurs liées aux modules manquants
**Fichiers concernés:**
- `lib/utils/barcode-generator.ts` (ligne 8) - Module `bwip-js` non trouvé

**Problème:** Module non installé ou types manquants.

### 10. Erreurs liées aux types React
**Fichiers concernés:**
- `app/(public)/sign/[token]/page.tsx` (lignes 301, 305, 311) - Type `unknown` non assignable à `ReactNode`
- `components/onboarding/import-assistant.tsx` - Propriété `variant` non existante dans `Toast`
- `components/onboarding/organization-setup-wizard.tsx` - Propriété `variant` non existante dans `Toast`
- `components/sign/SignatureStepWithCheckbox.tsx` (ligne 55) - `sigRef.current` peut être `null`
- `components/super-admin/header.tsx` - Comparaisons de types incompatibles et arguments incorrects
- `components/lazy/index.tsx` (ligne 80) - Propriété `DocumentEditor` non existante

### 11. Erreurs liées aux types DOMPurify
**Fichiers concernés:**
- `lib/utils/sanitize-html.ts` (lignes 102, 126, 128, 130, 135, 148)

**Problème:** Types `TrustedHTML` et namespace `DOMPurify` non reconnus.

### 12. Erreurs liées aux types PDF
**Fichiers concernés:**
- `lib/utils/seal-pdf.ts` (ligne 62) - Type `"Helvetica"` non assignable à `StandardFonts`

### 13. Erreurs liées aux types de services
**Fichiers concernés:**
- `lib/services/quota.service.ts` (lignes 267-268) - Propriétés `name` et `features` non existantes

## Priorités de correction

### Priorité 1 (Critique - Bloquant)
1. ✅ **CORRIGÉ:** `app/cataloguepublic/[slug]/page.tsx` - Champs de statistiques
2. Variables non définies (`logger`, `errorStack`, `apiError`, etc.)
3. Tables Supabase manquantes dans les types

### Priorité 2 (Important)
1. Versions API Stripe obsolètes
2. Propriétés manquantes dans les types de base de données
3. Arguments de fonctions incorrects

### Priorité 3 (Moyen)
1. Types Recharts incorrects
2. Types de validation incorrects
3. Types React incorrects

### Priorité 4 (Faible)
1. Module `bwip-js` manquant
2. Types DOMPurify
3. Types PDF

## Actions recommandées

1. **Régénérer les types Supabase:**
   ```bash
   npm run db:generate
   ```

2. **Installer les dépendances manquantes:**
   ```bash
   npm install bwip-js @types/bwip-js
   ```

3. **Mettre à jour les versions Stripe:**
   - Remplacer `"2024-12-18.acacia"` et `"2024-11-20.acacia"` par `"2025-12-15.clover"`

4. **Corriger les imports manquants:**
   - Ajouter `import { logger } from '@/lib/utils/logger'` dans tous les fichiers concernés

5. **Corriger les types de base de données:**
   - Vérifier que toutes les tables utilisées existent dans la base de données
   - Ajouter les colonnes manquantes si nécessaire
   - Régénérer les types

## Statistiques

- **Total d'erreurs:** 417
- **Fichiers concernés:** ~80+
- **Erreurs corrigées:** 3 (champs de statistiques du catalogue)
- **Erreurs restantes:** ~414
