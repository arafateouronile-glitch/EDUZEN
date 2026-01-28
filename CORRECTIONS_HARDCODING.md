# Corrections des valeurs hardcodées

## ✅ Corrections effectuées

### 1. Clé de chiffrement (Critique - Sécurité) ✅
- **Fichier** : `lib/services/template-security.service.ts`
- **Avant** : `'default-key-change-in-production'` hardcodé
- **Après** : Utilise `SECURITY_CONFIG.getEncryptionKey()` qui :
  - Lance une erreur en production si `TEMPLATE_ENCRYPTION_KEY` n'est pas configurée
  - Affiche un avertissement en développement
  - Utilise la variable d'environnement si disponible

### 2. Couleurs de marque (Important) ✅
- **Fichier créé** : `lib/config/app-config.ts`
- **Couleurs centralisées** :
  - `BRAND_COLORS.primary` : `#274472`
  - `BRAND_COLORS.secondary` : `#34B9EE`
  - `BRAND_COLORS.accent` : `#8B5CF6`
  - Et leurs variantes (dark, light, etc.)

- **Fichiers corrigés** :
  - `app/(dashboard)/dashboard/settings/document-templates/[type]/sign-zones/page.tsx`
  - `app/(dashboard)/dashboard/payments/page.tsx`
  - `lib/services/organization-setup.service.ts`
  - `components/public/catalog-footer.tsx`
  - `components/public/programs-list.tsx`
  - `components/public/catalog-navbar.tsx`
  - `components/public/program-detail.tsx`
  - `components/enterprise/skills-evolution-chart.tsx`
  - `app/(dashboard)/dashboard/catalog/settings/page.tsx`

### 3. URLs (Utile) ✅
- **Fichier créé** : `lib/config/app-config.ts` avec `APP_URLS.getBaseUrl()`
- **Fichiers corrigés** :
  - `app/api/subscriptions/create-checkout/route.ts`
  - `app/api/users/create/route.ts`
  - `app/api/v1/docs/route.ts`
  - `app/openapi.json/route.ts`
  - `app/(dashboard)/dashboard/api-docs/page.tsx` (utilise `window.location.origin`)

### 4. Email par défaut (Utile) ✅
- **Fichier créé** : `lib/config/app-config.ts` avec `EMAIL_CONFIG.getFromEmail()`
- **Fichiers corrigés** :
  - `lib/utils/send-signed-pdf-email.ts`
  - `lib/utils/send-process-sign-email.ts`

### 5. Project ID Supabase (Utile) ✅
- **Fichier** : `package.json`
- **Avant** : `ocdlaouymksskmmhmzdr` hardcodé
- **Après** : Utilise `SUPABASE_PROJECT_ID` depuis les variables d'environnement avec fallback

## 📝 Variables d'environnement requises

### Production (obligatoires)
```bash
TEMPLATE_ENCRYPTION_KEY=votre-clé-sécurisée-256-bits
RESEND_FROM_EMAIL=EDUZEN <noreply@eduzen.fr>
NEXT_PUBLIC_APP_URL=https://eduzen.fr
```

### Optionnelles
```bash
SUPABASE_PROJECT_ID=votre-project-id  # Par défaut: ocdlaouymksskmmhmzdr
NEXT_PUBLIC_SITE_URL=https://eduzen.fr  # Fallback si NEXT_PUBLIC_APP_URL n'est pas défini
```

## 🔄 Migration

Pour utiliser la nouvelle configuration :

```typescript
// Import
import { BRAND_COLORS, APP_URLS, EMAIL_CONFIG, SECURITY_CONFIG } from '@/lib/config/app-config'

// Couleurs
const color = BRAND_COLORS.primary

// URLs
const baseUrl = APP_URLS.getBaseUrl()

// Email
const fromEmail = EMAIL_CONFIG.getFromEmail()

// Clé de chiffrement
const key = SECURITY_CONFIG.getEncryptionKey()
```

## ⚠️ Action requise en production

**IMPORTANT** : Configurez `TEMPLATE_ENCRYPTION_KEY` en production. Sans cette variable, l'application lancera une erreur pour protéger les données chiffrées.

Pour générer une clé sécurisée :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📊 Résumé

- ✅ **Clé de chiffrement** : Corrigée avec vérification en production
- ✅ **Couleurs** : Centralisées dans `lib/config/app-config.ts`
- ✅ **URLs** : Utilisent les variables d'environnement avec fallbacks
- ✅ **Email** : Utilise les variables d'environnement
- ✅ **Project ID Supabase** : Configurable via variable d'environnement

**Niveau de hardcoding avant** : Modéré (6 problèmes)
**Niveau de hardcoding après** : Faible (0 problème critique, quelques valeurs par défaut acceptables)
