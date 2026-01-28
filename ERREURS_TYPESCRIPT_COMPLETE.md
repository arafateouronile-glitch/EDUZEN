# Erreurs TypeScript complètes de l'application

## 📊 Résumé
**Total d'erreurs détectées : ~50+ erreurs**

## 🔴 Erreurs par catégorie

### 1. Erreurs Logger (Expected 1-2 arguments, but got 3)
**Fichiers concernés :**
- `app/(learner)/learner/elearning/page.tsx:123`
- `app/(learner)/learner/evaluations/[quizId]/page.tsx:84`
- `app/(learner)/learner/formations/[sessionId]/page.tsx:289, 360`
- `app/(learner)/learner/payments/page.tsx:35, 71, 89`
- `app/(learner)/learner/planning/page.tsx:77`

**Solution :** Convertir `logger.method('message', arg1, arg2)` en `logger.method('message', { arg1, arg2 })`

### 2. Erreurs de types Framer Motion
**Fichier :** `app/(learner)/learner/page.tsx:550, 554`
- Type `string` non assignable à `Easing | Easing[] | undefined`
- Problème avec les propriétés `ease` dans les transitions

**Solution :** Utiliser des valeurs d'easing valides de Framer Motion (ex: `"easeInOut"` au lieu de `"linear"`)

### 3. Propriétés manquantes sur les types
**Fichiers concernés :**
- `app/(learner)/learner/profile/page.tsx:69, 229, 391` - Propriété `bio` n'existe pas
- `app/(learner)/learner/planning/page.tsx:69` - Propriété `status` n'existe pas sur `PostgrestError`
- `app/(portal)/portal/page.tsx:208` - Propriété `paid_amount` n'existe pas
- `app/(portal)/portal/payments/page.tsx:171` - Propriété `paid_amount` n'existe pas
- `app/(portal)/portal/children/page.tsx:84` - Propriété `classes` n'existe pas sur `StudentWithRelations`

**Solution :** 
- Ajouter les propriétés manquantes aux types ou utiliser des assertions de type
- Vérifier les types de base de données

### 4. Erreurs de types null
**Fichiers concernés :**
- `app/(portal)/portal/attendance/page.tsx:40` - `(string | null)[]` non assignable à `string[]`
- `app/(portal)/portal/children/page.tsx:37` - `(string | null)[]` non assignable à `readonly string[]`
- `app/(portal)/portal/documents/page.tsx:55` - `(string | null)[]` non assignable à `string[]`
- `app/(portal)/portal/page.tsx:41` - `(string | null)[]` non assignable à `readonly string[]`
- `app/(portal)/portal/payments/page.tsx:40, 86` - `(string | null)[]` non assignable à `string[]`
- `app/(learner)/learner/profile/page.tsx:81, 87, 109` - `supabase` is possibly 'null'
- `app/api/cron/send-scheduled-documents/route.ts:57, 81` - `string | null` non assignable à `string | undefined` ou `string`

**Solution :** Filtrer les valeurs null ou utiliser `|| undefined` / `|| ''`

### 5. Erreurs de comparaison de types
**Fichiers concernés :**
- `app/(learner)/learner/messages/[id]/page.tsx:393` - Comparaison `"student" | "group"` avec `"user"` (pas de chevauchement)
- `app/api/documents/generate/route.ts:313` - Comparaison `"HTML"` avec `"ODT"` (pas de chevauchement)

**Solution :** Corriger les valeurs comparées

### 6. Erreurs dans les API routes
**Fichiers concernés :**
- `app/api/documents/generate-docx/route.ts:85` - `Buffer` non assignable à `BodyInit`
- `app/api/documents/generate/route.ts:228` - `DocumentVariables` non assignable à `Json`
- `app/api/documents/generate/route.ts:263` - Expected 2-3 arguments, but got 5
- `app/api/documents/generate/route.ts:319` - Propriété `send` n'existe pas sur `EmailService`
- `app/api/documents/schedule-send/route.ts:86, 92` - Propriété `name` n'existe pas
- `app/api/documents/scheduled/execute/route.ts:102, 106, 110, 122` - Conversions de types incorrectes

**Solution :** 
- Convertir les types correctement
- Utiliser `as unknown as Type` pour les conversions complexes
- Vérifier les signatures des méthodes

### 7. Erreurs de types dans les portfolios
**Fichier :** `app/(portal)/portal/portfolios/[id]/page.tsx`
- Ligne 70 : Index signature manquante sur type `Json`
- Ligne 257, 279, 284 : `string | null` non assignable à des types de couleurs
- Ligne 268 : Propriété `map` n'existe pas

**Solution :** Ajouter des vérifications de type et des conversions appropriées

## 🎯 Priorités de correction

### Priorité 1 (Bloquant pour le build)
1. Erreurs logger (facile à corriger)
2. Erreurs de types null (facile à corriger)
3. Erreurs de comparaison de types (facile à corriger)

### Priorité 2 (Important)
4. Propriétés manquantes (nécessite vérification des types DB)
5. Erreurs dans les API routes (nécessite vérification des signatures)

### Priorité 3 (Amélioration)
6. Erreurs Framer Motion (amélioration UX)
7. Erreurs portfolios (amélioration fonctionnelle)

## 📝 Notes
- La plupart des erreurs sont des problèmes de types TypeScript strict
- Certaines erreurs nécessitent une vérification des types de base de données
- Les erreurs logger sont similaires à celles déjà corrigées précédemment
