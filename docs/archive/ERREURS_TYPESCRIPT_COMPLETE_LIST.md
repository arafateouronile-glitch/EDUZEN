# Liste complète des erreurs TypeScript

**Date :** 26 janvier 2026  
**Total d'erreurs :** 60 erreurs

## 📊 Résumé par catégorie

1. **Erreurs Recharts (composants graphiques)** : 25 erreurs
2. **Erreurs Logger (signature incorrecte)** : 20 erreurs
3. **Erreurs Framer Motion** : 2 erreurs
4. **Erreurs de types null/undefined** : 5 erreurs
5. **Erreurs d'imports manquants** : 4 erreurs
6. **Erreurs de types React** : 3 erreurs
7. **Erreurs de types génériques** : 1 erreur

---

## 1. Erreurs Recharts (25 erreurs)

### Fichier : `app/(dashboard)/dashboard/sessions/[id]/sections/gestion-finances.tsx`

**Ligne 1505** : `Pie` component - Property 'children' does not exist
```typescript
// Erreur : Type avec children non assignable
<Pie data={...} cx={...} cy={...}>
  <Cell key={...} fill={...} />
</Pie>
```

**Ligne 1515** : `Cell` component - Property 'fill' does not exist
```typescript
<Cell key={...} fill={...} strokeWidth={...} />
```

**Ligne 1518** : `Cell` component - Property 'content' does not exist
```typescript
<Cell content={...} />
```

**Ligne 1520** : `Label` component - Property 'verticalAlign' does not exist
```typescript
<Label verticalAlign={...} height={...} formatter={...} />
```

**Ligne 1522** : Parameter 'value' implicitly has an 'any' type
```typescript
formatter: (value: any) => Element
// Solution : (value: any) => JSX.Element
```

### Fichier : `app/(dashboard)/dashboard/sessions/[id]/sections/suivi.tsx`

**Lignes 411, 459, 507** : `Pie` et `BarChart` components - Property 'children' does not exist (3 erreurs)

**Lignes 426, 476, 549** : `Cell` component - Property 'fill' does not exist (3 erreurs)

**Lignes 429, 473, 545** : `Tooltip` component - Property 'content' does not exist (3 erreurs)

**Lignes 431, 534** : `Label` component - Property 'verticalAlign' does not exist (2 erreurs)

**Lignes 460, 532** : `ReferenceLine` component - Property 'strokeDasharray' does not exist (2 erreurs)

**Lignes 462, 469, 541** : `XAxis` et `YAxis` components - Properties manquantes (3 erreurs)

**Ligne 433** : Parameter 'value' implicitly has an 'any' type

**Solution pour Recharts :** Utiliser `React.createElement` ou wrapper avec `as any` pour les composants Recharts qui ont des problèmes de types.

---

## 2. Erreurs Logger (20 erreurs)

### Fichier : `app/(dashboard)/dashboard/settings/document-templates/[type]/edit/components/body-editor.tsx`
- **Ligne 215** : Expected 1-2 arguments, but got 3
- **Ligne 276** : Expected 1-2 arguments, but got 3

### Fichier : `app/(dashboard)/dashboard/settings/page.tsx`
- **Ligne 74** : Expected 1-2 arguments, but got 3
- **Ligne 142** : Expected 1-2 arguments, but got 3
- **Ligne 145** : Expected 1-2 arguments, but got 3
- **Ligne 156** : Expected 1-2 arguments, but got 3

### Fichier : `app/(dashboard)/dashboard/settings/users/page.tsx`
- **Lignes 84, 88, 111, 121, 131, 132, 141** : Expected 1-2 arguments, but got 3 (7 erreurs)

### Fichier : `app/(dashboard)/layout.tsx`
- **Ligne 128** : Expected 1-2 arguments, but got 3

### Fichier : `app/api/documents/generate-docx/route.ts`
- **Lignes 53, 70, 71, 72, 83** : Expected 1-2 arguments, but got 3 (5 erreurs)

### Fichier : `app/api/documents/generate-pdf/route.ts`
- **Lignes 31, 32, 52, 53, 67** : Expected 1-2 arguments, but got 3 (5 erreurs)

### Fichier : `app/api/documents/generate-word/route.ts`
- **Lignes 31, 32** : Expected 1-2 arguments, but got 3 (2 erreurs)

### Fichier : `app/(learner)/learner/documents/page.tsx`
- **Ligne 274** : Argument of type 'number' is not assignable to parameter of type 'LogContext'
- **Ligne 275** : Argument of type 'any[]' is not assignable to parameter of type 'LogContext'
- **Ligne 313** : Argument of type 'string' is not assignable to parameter of type 'LogContext'
- **Ligne 316** : Argument of type 'PostgrestError' is not assignable to parameter of type 'LogContext'

### Fichier : `app/(super-admin)/super-admin/subscriptions/page.tsx`
- **Lignes 105, 106** : Argument of type 'OrganizationSubscription' is not assignable to parameter of type 'LogContext'

**Solution :** Convertir tous les appels `logger.*()` avec 3 arguments en format `logger.*('message', error?, { context })`

---

## 3. Erreurs Framer Motion (2 erreurs)

### Fichier : `app/(learner)/learner/page.tsx`
- **Ligne 578** : Type '{ readonly y: readonly [-10, 10, -10]; }' is not assignable
- **Ligne 586** : Type '{ readonly y: readonly [-10, 10, -10]; }' is not assignable

**Problème :** `floatingAnimation` est défini avec `as const`, ce qui rend les propriétés `readonly`, mais Framer Motion attend des types mutables.

**Solution :** Retirer `as const` de `floatingAnimation` ou utiliser un type mutable explicite.

---

## 4. Erreurs de types null/undefined (5 erreurs)

### Fichier : `app/(dashboard)/dashboard/signing-processes/new/page.tsx`
- **Ligne 45** : Argument of type 'string | null' is not assignable to parameter of type 'string'

**Solution :** Utiliser `|| ''` ou `?? ''` pour gérer les valeurs null.

### Fichier : `app/(public)/sign/[token]/page.tsx`
- **Ligne 145** : Property 'status' does not exist on type '{}'
- **Ligne 216** : Property 'document' does not exist on type '{}'
- **Ligne 225** : Property 'title' does not exist on type '{}'

**Solution :** Typer correctement les objets ou utiliser `as any` si nécessaire.

### Fichier : `app/api/documents/generate-pdf/route.ts`
- **Ligne 161** : Argument of type 'string' is not assignable to parameter of type 'LogContext'

**Solution :** Convertir en objet context : `{ message: string }`

---

## 5. Erreurs d'imports manquants (4 erreurs)

### Fichier : `app/(dashboard)/dashboard/teacher/documents/page.tsx`
- **Lignes 346, 349, 351, 354** : Cannot find name 'Badge'

**Solution :** Ajouter `import { Badge } from '@/components/ui/badge'`

---

## 6. Erreurs de types React (3 erreurs)

### Fichier : `app/(public)/sign/[token]/page.tsx`
- **Ligne 292** : Type 'unknown' is not assignable to type 'ReactNode'
- **Ligne 296** : Type 'unknown' is not assignable to type 'ReactNode'
- **Ligne 302** : Type 'unknown' is not assignable to type 'ReactNode'

**Solution :** Convertir les valeurs `unknown` en `ReactNode` avec `as ReactNode` ou typer correctement.

---

## 7. Erreurs de types génériques (1 erreur)

### Fichier : `app/(dashboard)/dashboard/settings/document-templates/[type]/sign-zones/page.tsx`
- **Ligne 94** : Type 'Record<string, any>' is not assignable to type 'string'

**Solution :** Convertir le Record en string ou ajuster le type attendu.

---

## 🎯 Plan de correction par priorité

### Priorité 1 (Bloquant pour le build) 🔴
1. **Erreurs Logger** (20 erreurs) - Faciles à corriger
2. **Erreurs d'imports manquants** (4 erreurs) - Très faciles
3. **Erreurs de types null** (5 erreurs) - Faciles

### Priorité 2 (Important) 🟡
4. **Erreurs Framer Motion** (2 erreurs) - Moyennes
5. **Erreurs de types React** (3 erreurs) - Moyennes

### Priorité 3 (Amélioration) 🟢
6. **Erreurs Recharts** (25 erreurs) - Complexes mais non bloquantes
7. **Erreurs de types génériques** (1 erreur) - À vérifier

---

## 📝 Notes

- Les erreurs Recharts sont nombreuses mais non bloquantes pour le build (elles fonctionnent à l'exécution)
- Les erreurs Logger sont systématiques et faciles à corriger en masse
- Les erreurs Framer Motion nécessitent une attention particulière aux types `readonly`
