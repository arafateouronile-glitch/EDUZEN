# Plan d'Action Rapide - EDUZEN Sécurité

**Date**: 2026-01-11
**Objectif**: Corriger les vulnérabilités critiques et atteindre 95%+ de tests

---

## 🔴 URGENT - À Faire CETTE SEMAINE (P0)

### Action 1: Remplacer passport-saml (2-3h)
**Risque**: CVSS 10.0 - Authentification SSO complètement compromise

```bash
# 1. Désinstaller passport-saml vulnérable
npm uninstall passport-saml

# 2. Installer le fork maintenu
npm install @node-saml/passport-saml@latest

# 3. Vérifier les fichiers à modifier
find . -type f -name "*.ts" -o -name "*.tsx" | xargs grep -l "passport-saml" | grep -v node_modules
```

**Fichiers à modifier**:
- `lib/auth/saml.ts` (ou équivalent)
- Mettre à jour imports: `import { Strategy } from '@node-saml/passport-saml'`
- Vérifier la configuration (API peut avoir changé légèrement)

**Test**:
```bash
# Tester l'authentification SAML
npm test -- auth
```

---

### Action 2: Mettre à jour jsPDF (4-6h)
**Risque**: Path Traversal + ReDoS + DoS en génération PDF

```bash
# 1. Mettre à jour jsPDF
npm install jspdf@4.0.0

# ⚠️ BREAKING CHANGES - Vérifier la migration:
# https://github.com/parallax/jsPDF/releases/tag/v4.0.0
```

**Fichiers à modifier**:
1. `lib/utils/document-generation/pdf-generator.ts`
2. `app/api/documents/generate/route.ts`

**Changements API jsPDF v3 → v4**:
```typescript
// AVANT (v3)
import jsPDF from 'jspdf'
const doc = new jsPDF()

// APRÈS (v4)
import { jsPDF } from 'jspdf'
const doc = new jsPDF()

// Vérifier aussi:
// - addImage()
// - setFont()
// - save()
```

**Tests critiques**:
```bash
# 1. Tester génération PDF
# Créer un document test via l'interface

# 2. Vérifier tous les formats
# - Attestation
# - Certificat
# - Facture
# - Convention

# 3. Vérifier multi-pages
# 4. Vérifier images/logos
# 5. Vérifier header/footer
```

**Checklist post-migration**:
```
□ Build passe sans erreur
□ Tests unitaires passent
□ PDF généré correctement (tous formats)
□ Multi-pages fonctionne
□ Images/logos s'affichent
□ Header/footer correct
□ Téléchargement fonctionne
□ Email avec pièce jointe fonctionne
```

---

### Action 3: Corriger DocumentService tests (3-4h)
**Impact**: 8 tests en échec sur 156 (5%)

**Fichier**: `tests/services/document.service.test.ts`

**Problèmes identifiés**:
1. Mock Supabase incomplet avec errorHandler
2. Codes d'erreur changés (VALID_2004 vs autres)
3. Validation champs requise ("Le titre est obligatoire")

**Corrections**:

#### Fix 1: Mettre à jour le mock Supabase
```typescript
// tests/__mocks__/supabase.ts
export const createMockSupabase = () => ({
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: mockData, error: null }),
        maybeSingle: () => Promise.resolve({ data: mockData, error: null }),
      }),
    }),
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: mockData, error: null }),
      }),
    }),
    // ... autres méthodes
  }),
})
```

#### Fix 2: Ajuster les tests de validation
```typescript
// AVANT
it('devrait créer un document avec succès', async () => {
  const result = await documentService.create({
    organization_id: 'org-1',
    // Manque title!
  })
  expect(result).toBeDefined()
})

// APRÈS
it('devrait créer un document avec succès', async () => {
  const result = await documentService.create({
    organization_id: 'org-1',
    title: 'Test Document', // ✅ Ajouté
    type: 'attestation',
    content: 'Test content',
  })
  expect(result).toBeDefined()
})
```

#### Fix 3: Mettre à jour les codes d'erreur attendus
```typescript
// AVANT
expect(error.code).toBe('VALID_2004')

// APRÈS - Vérifier le code réel dans errorHandler
expect(error.code).toBe('VALIDATION_ERROR') // Ou le code actuel
```

**Lancer les tests**:
```bash
npm test -- document.service.test.ts
```

---

## 🟠 HAUTE PRIORITÉ - Cette Semaine (P1)

### Action 4: Migrer routes auth vers validation stricte (4-6h)

**Routes prioritaires**:
1. `/api/auth/signup`
2. `/api/auth/login`
3. `/api/users/by-email`
4. `/api/sessions/create`

**Template de migration**:

```typescript
// AVANT
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // ...
}

// APRÈS
import { withBodyValidation, type ValidationSchema } from '@/lib/utils/api-validation'

const schema: ValidationSchema = {
  email: {
    type: 'email',
    required: true,
  },
  password: {
    type: 'string',
    required: true,
    minLength: 8,
    maxLength: 72,
    customValidator: (value: unknown) => {
      const password = String(value)
      const hasUpperCase = /[A-Z]/.test(password)
      const hasLowerCase = /[a-z]/.test(password)
      const hasNumbers = /\d/.test(password)

      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        return {
          isValid: false,
          errors: ['Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'],
        }
      }

      return { isValid: true, sanitized: password }
    },
  },
}

export async function POST(request: NextRequest) {
  return withBodyValidation(request, schema, async (req, validatedData) => {
    const { email, password } = validatedData
    // ✅ Données validées et sanitizées
    // ...
  })
}
```

**Checklist par route**:
```
□ Import withBodyValidation
□ Créer schema de validation
□ Wrapper handler avec withBodyValidation
□ Utiliser validatedData au lieu de body
□ Remplacer console.log par logger
□ Tester la route (Postman/curl)
□ Tester avec données invalides
```

---

## 🟡 MOYENNE PRIORITÉ - Ce Mois (P2)

### Action 5: Corriger PushNotifications tests (2h)

**Fichier**: `tests/services/push-notifications.service.test.ts`

**Fix**: Ajouter `.single()` et `.maybeSingle()` au mock
```typescript
// tests/__mocks__/supabase.ts
export const createMockSupabase = () => ({
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        // ✅ Ajouter ces méthodes
        single: () => Promise.resolve({ data: mockData, error: null }),
        maybeSingle: () => Promise.resolve({ data: mockData, error: null }),
      }),
    }),
  }),
})
```

---

### Action 6: Remplacer xlsx (6-8h)

```bash
# 1. Désinstaller xlsx
npm uninstall xlsx

# 2. Installer exceljs
npm install exceljs

# 3. Trouver tous les usages de xlsx
grep -r "import.*xlsx" --include="*.ts" --include="*.tsx" app/ lib/

# 4. Migrer vers exceljs (API différente)
```

**Migration xlsx → exceljs**:
```typescript
// AVANT (xlsx)
import * as XLSX from 'xlsx'
const workbook = XLSX.utils.book_new()
const worksheet = XLSX.utils.json_to_sheet(data)
XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
XLSX.writeFile(workbook, 'output.xlsx')

// APRÈS (exceljs)
import ExcelJS from 'exceljs'
const workbook = new ExcelJS.Workbook()
const worksheet = workbook.addWorksheet('Sheet1')
worksheet.columns = [
  { header: 'Name', key: 'name', width: 30 },
  { header: 'Email', key: 'email', width: 30 },
]
worksheet.addRows(data)
await workbook.xlsx.writeFile('output.xlsx')
```

---

## 📊 Suivi de Progression

### Checklist Globale

#### P0 - Cette Semaine
```
□ passport-saml remplacé (2-3h)
□ jsPDF mis à jour (4-6h)
□ DocumentService tests corrigés (3-4h)
□ Routes auth migrées (4-6h)

Total: 13-19h
```

#### P1 - Ce Mois
```
□ PushNotifications tests corrigés (2h)
□ xlsx remplacé par exceljs (6-8h)
□ Routes sensibles migrées (8-12h)
□ @supabase/ssr mis à jour (2-3h)

Total: 18-25h
```

#### Métriques Cibles
```
✅ Score sécurité: 9.2/10 → 9.7/10 (+0.5)
✅ Tests passés: 89.1% → 95%+ (+6%)
✅ Vulnérabilités critiques: 2 → 0 (-100%)
✅ Routes validées: 3% → 15% (+12%)
```

---

## 🧪 Tests de Vérification

### Après chaque action

```bash
# 1. Build réussit
npm run build

# 2. Tests passent
npm test

# 3. Audit sécurité
npm audit

# 4. ESLint security
npx eslint --config .eslintrc.security.json "app/**/*.{ts,tsx}" "lib/**/*.{ts,tsx}"

# 5. Lancer l'app localement
npm run dev
```

### Tests manuels critiques

#### Authentification (après Action 1 & 4)
```
□ Inscription fonctionnelle
□ Connexion fonctionnelle
□ SSO SAML fonctionnel (si utilisé)
□ Session persistante
□ Déconnexion fonctionnelle
□ Rate limiting active (5 tentatives max)
```

#### Génération PDF (après Action 2)
```
□ Attestation PDF générée
□ Certificat PDF généré
□ Facture PDF générée
□ Convention PDF générée
□ Multi-pages fonctionne
□ Images/logos affichés
□ Téléchargement fonctionne
□ Email avec PDF fonctionne
```

#### Validation inputs (après Action 4)
```
□ Email invalide rejeté
□ Mot de passe faible rejeté
□ XSS dans inputs bloqué
□ SQL injection dans inputs bloqué
□ Erreurs de validation claires
```

---

## 📞 Support & Ressources

### Documentation

- [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) - Audit complet
- [VALIDATION_IMPLEMENTATION_REPORT.md](VALIDATION_IMPLEMENTATION_REPORT.md) - Guide validation
- [lib/utils/validation-examples.md](lib/utils/validation-examples.md) - Exemples validation
- [PHASE_1_PROGRESS_REPORT.md](PHASE_1_PROGRESS_REPORT.md) - Détails progression

### Commandes Utiles

```bash
# Trouver usages d'une dépendance
grep -r "import.*nom-package" --include="*.ts" --include="*.tsx" .

# Scanner vulnérabilités
npm audit
npm audit fix # Auto-fix non-breaking
npm audit fix --force # Auto-fix breaking (⚠️ Risqué)

# Tests spécifiques
npm test -- auth # Tests auth uniquement
npm test -- document.service # Service spécifique
npm test -- --watch # Mode watch

# Build
npm run build # Production build
npm run dev # Dev mode
npm run lint # Linter
```

### Liens Externes

- [jsPDF v4 Migration Guide](https://github.com/parallax/jsPDF/releases/tag/v4.0.0)
- [@node-saml/passport-saml](https://github.com/node-saml/passport-saml)
- [ExcelJS Documentation](https://github.com/exceljs/exceljs)
- [OWASP Top 10](https://owasp.org/Top10/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## ✅ Checklist Finale

### Avant de Merger en Production

```
□ Toutes les actions P0 complétées
□ Tests à 95%+ de réussite
□ npm audit ne montre que LOW ou moins
□ ESLint security scan passe sans erreur
□ Build production réussit
□ Tests manuels critiques passés
□ Documentation mise à jour
□ .env.example à jour
□ Backup base de données fait
□ Plan de rollback préparé
```

---

**Créé par**: Claude Sonnet 4.5
**Date**: 2026-01-11
**Version**: 1.0

**Prêt à commencer?** Suivez les actions P0 dans l'ordre! 🚀

