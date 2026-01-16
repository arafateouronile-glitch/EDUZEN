# Guide d'Utilisation de la Validation des Inputs

Ce guide montre comment utiliser le système de validation pour sécuriser les API routes.

## Table des Matières

1. [Validation des Query Parameters](#validation-des-query-parameters)
2. [Validation du Body](#validation-du-body)
3. [Validation avec Middleware](#validation-avec-middleware)
4. [Schemas Pré-configurés](#schemas-pré-configurés)
5. [Validation Personnalisée](#validation-personnalisée)
6. [Exemples Complets](#exemples-complets)

---

## Validation des Query Parameters

### Exemple basique

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateQueryParams, type ValidationSchema } from '@/lib/utils/api-validation'

export async function GET(request: NextRequest) {
  // Définir le schéma de validation
  const schema: ValidationSchema = {
    q: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 100,
    },
    organization_id: {
      type: 'uuid',
      required: false,
    },
    page: {
      type: 'integer',
      required: false,
      min: 1,
    },
  }

  // Valider les paramètres
  const validation = await validateQueryParams(request, schema)

  if (!validation.isValid) {
    return NextResponse.json(
      {
        error: 'Validation échouée',
        errors: validation.errors,
      },
      { status: 400 }
    )
  }

  // Utiliser les données validées et sanitizées
  const { q, organization_id, page } = validation.data!

  // ... votre logique métier
}
```

---

## Validation du Body

### Exemple création d'entité

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateRequestBody, type ValidationSchema } from '@/lib/utils/api-validation'

export async function POST(request: NextRequest) {
  // Définir le schéma de validation
  const schema: ValidationSchema = {
    title: {
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 200,
    },
    description: {
      type: 'html',
      required: false,
      maxLength: 5000,
    },
    email: {
      type: 'email',
      required: true,
    },
    price: {
      type: 'float',
      required: true,
      min: 0,
      max: 999999,
    },
    is_active: {
      type: 'boolean',
      required: false,
    },
    start_date: {
      type: 'date',
      required: true,
    },
  }

  // Valider le body
  const validation = await validateRequestBody(request, schema)

  if (!validation.isValid) {
    return NextResponse.json(
      {
        error: 'Validation échouée',
        errors: validation.errors,
      },
      { status: 400 }
    )
  }

  // Utiliser les données validées
  const data = validation.data!

  // ... insertion en base de données
}
```

---

## Validation avec Middleware

### Query Parameters

```typescript
import { NextRequest } from 'next/server'
import { withQueryValidation, type ValidationSchema } from '@/lib/utils/api-validation'

export async function GET(request: NextRequest) {
  const schema: ValidationSchema = {
    student_id: { type: 'uuid', required: true },
    status: { type: 'string', allowedValues: ['active', 'inactive', 'pending'] },
  }

  return withQueryValidation(request, schema, async (req, data) => {
    // Données déjà validées dans `data`
    const { student_id, status } = data

    // ... votre logique
    return NextResponse.json({ success: true })
  })
}
```

### Body

```typescript
import { NextRequest } from 'next/server'
import { withBodyValidation, type ValidationSchema } from '@/lib/utils/api-validation'

export async function POST(request: NextRequest) {
  const schema: ValidationSchema = {
    name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
    email: { type: 'email', required: true },
  }

  return withBodyValidation(request, schema, async (req, data) => {
    // Données déjà validées dans `data`
    const { name, email } = data

    // ... votre logique
    return NextResponse.json({ success: true })
  })
}
```

---

## Schemas Pré-configurés

Le système fournit des schemas réutilisables pour les cas d'usage courants.

### Pagination

```typescript
import { paginationSchema } from '@/lib/utils/api-validation'

const schema = {
  ...paginationSchema, // Ajoute: page, limit, offset
  // vos champs supplémentaires
  category: { type: 'string', required: false },
}
```

### Recherche

```typescript
import { searchSchema } from '@/lib/utils/api-validation'

// Inclut déjà: q (requis), page, limit, offset
const validation = await validateQueryParams(request, searchSchema)
```

### Tri

```typescript
import { sortingSchema } from '@/lib/utils/api-validation'

const schema = {
  ...sortingSchema, // Ajoute: sort_by, order
  // vos champs supplémentaires
}
```

### Filtrage par organisation

```typescript
import { organizationFilterSchema } from '@/lib/utils/api-validation'

const schema = {
  ...organizationFilterSchema, // organization_id requis (UUID)
  // vos champs supplémentaires
}
```

### Plage de dates

```typescript
import { dateRangeSchema } from '@/lib/utils/api-validation'

const schema = {
  ...dateRangeSchema, // start_date, end_date (optionnels)
  // vos champs supplémentaires
}
```

---

## Validation Personnalisée

### Custom Validator

```typescript
const schema: ValidationSchema = {
  password: {
    type: 'string',
    required: true,
    minLength: 8,
    customValidator: (value: unknown) => {
      const password = String(value)

      // Vérifier complexité du mot de passe
      const hasUpperCase = /[A-Z]/.test(password)
      const hasLowerCase = /[a-z]/.test(password)
      const hasNumbers = /\d/.test(password)
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        return {
          isValid: false,
          errors: [
            'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial',
          ],
        }
      }

      return { isValid: true, sanitized: password }
    },
  },
}
```

### Pattern Validation

```typescript
const schema: ValidationSchema = {
  slug: {
    type: 'string',
    required: true,
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, // Format kebab-case
  },
  phone: {
    type: 'string',
    required: true,
    pattern: /^\+?[1-9]\d{1,14}$/, // Format E.164
  },
}
```

### Allowed Values (Enum)

```typescript
const schema: ValidationSchema = {
  role: {
    type: 'string',
    required: true,
    allowedValues: ['admin', 'instructor', 'student'],
  },
  status: {
    type: 'string',
    required: true,
    allowedValues: ['draft', 'published', 'archived'],
  },
}
```

---

## Exemples Complets

### Route de Recherche

```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withQueryValidation, searchSchema } from '@/lib/utils/api-validation'

export async function GET(request: NextRequest) {
  return withQueryValidation(request, searchSchema, async (req, data) => {
    const { q, page = 1, limit = 20 } = data

    // Rechercher dans la base de données
    const results = await searchDatabase(q as string, {
      page: Number(page),
      limit: Number(limit),
    })

    return NextResponse.json({
      success: true,
      results,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: results.length,
      },
    })
  })
}
```

### Route de Création d'Utilisateur

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withBodyValidation, type ValidationSchema } from '@/lib/utils/api-validation'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const schema: ValidationSchema = {
    email: {
      type: 'email',
      required: true,
    },
    first_name: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 50,
    },
    last_name: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 50,
    },
    role: {
      type: 'string',
      required: true,
      allowedValues: ['admin', 'instructor', 'student'],
    },
    phone: {
      type: 'string',
      required: false,
      pattern: /^\+?[1-9]\d{1,14}$/,
    },
  }

  return withBodyValidation(request, schema, async (req, data) => {
    const supabase = await createClient()

    // Vérifier que l'email n'existe pas déjà
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
    }

    // Créer l'utilisateur
    const { data: user, error } = await supabase.from('users').insert(data).select().single()

    if (error) {
      return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
    }

    return NextResponse.json({ success: true, user }, { status: 201 })
  })
}
```

### Route avec Multiple Validations

```typescript
// app/api/payments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  validateQueryParams,
  validateRequestBody,
  organizationFilterSchema,
  dateRangeSchema,
  type ValidationSchema,
} from '@/lib/utils/api-validation'

export async function GET(request: NextRequest) {
  const querySchema = {
    ...organizationFilterSchema,
    ...dateRangeSchema,
    status: {
      type: 'string',
      allowedValues: ['pending', 'completed', 'failed'],
    },
  }

  const validation = await validateQueryParams(request, querySchema)

  if (!validation.isValid) {
    return NextResponse.json({ error: 'Validation échouée', errors: validation.errors }, { status: 400 })
  }

  const { organization_id, start_date, end_date, status } = validation.data!

  // ... logique de récupération des paiements
}

export async function POST(request: NextRequest) {
  const bodySchema: ValidationSchema = {
    organization_id: { type: 'uuid', required: true },
    student_id: { type: 'uuid', required: true },
    amount: { type: 'float', required: true, min: 0 },
    currency: { type: 'string', required: true, allowedValues: ['EUR', 'USD', 'XOF'] },
    payment_method: {
      type: 'string',
      required: true,
      allowedValues: ['card', 'mobile_money', 'bank_transfer'],
    },
    metadata: { type: 'json', required: false },
  }

  const validation = await validateRequestBody(request, bodySchema)

  if (!validation.isValid) {
    return NextResponse.json({ error: 'Validation échouée', errors: validation.errors }, { status: 400 })
  }

  // ... logique de création du paiement
}
```

---

## Types de Validation Disponibles

| Type      | Description                         | Options                                    |
| --------- | ----------------------------------- | ------------------------------------------ |
| `string`  | Chaîne de caractères (sanitizée)    | minLength, maxLength, pattern, allowedValues |
| `email`   | Email (validé et normalisé)         | -                                          |
| `uuid`    | UUID v4                             | -                                          |
| `integer` | Nombre entier                       | min, max                                   |
| `float`   | Nombre décimal                      | min, max                                   |
| `boolean` | Booléen                             | -                                          |
| `date`    | Date ISO 8601                       | -                                          |
| `json`    | JSON (parsé et sanitizé)            | -                                          |
| `html`    | HTML (sanitizé avec DOMPurify)      | maxLength                                  |
| `url`     | URL (validée, HTTP/HTTPS uniquement)| -                                          |

---

## Protection Automatique

Le système de validation inclut automatiquement:

### 1. Protection XSS
- Sanitization HTML avec DOMPurify
- Détection de contenu suspect (script tags, event handlers, etc.)
- Échappement HTML entities

### 2. Protection SQL Injection
- Sanitization des caractères SQL dangereux
- Note: Toujours utiliser les requêtes paramétrées de Supabase

### 3. Protection NoSQL Injection
- Filtrage des opérateurs MongoDB ($, etc.)
- Sanitization récursive des objets

### 4. Protection Command Injection
- Filtrage des caractères shell dangereux
- Sanitization des chemins de fichiers (path traversal)

### 5. Logging de Sécurité
- Logs automatiques des validations échouées
- Logs des contenus suspects détectés
- Utilisation de `logger` pour traçabilité

---

## Bonnes Pratiques

1. **Toujours valider les inputs**
   - Côté client ET côté serveur
   - Ne jamais faire confiance aux données utilisateur

2. **Utiliser les schemas pré-configurés**
   - Réutiliser `paginationSchema`, `searchSchema`, etc.
   - Créer vos propres schemas réutilisables

3. **Définir des limites strictes**
   - `maxLength` pour éviter les attaques par volume
   - `min`/`max` pour les nombres
   - `allowedValues` pour les enums

4. **Combiner avec rate limiting**
   ```typescript
   import { withRateLimit, generalRateLimiter } from '@/lib/utils/rate-limiter'
   import { withBodyValidation } from '@/lib/utils/api-validation'

   export async function POST(request: NextRequest) {
     return withRateLimit(request, generalRateLimiter, async (req) => {
       return withBodyValidation(req, schema, async (r, data) => {
         // Logique protégée par rate limit ET validation
       })
     })
   }
   ```

5. **Logger les tentatives suspectes**
   - Le système le fait automatiquement
   - Monitorer les logs pour détecter les attaques

---

## Migration des Routes Existantes

Pour migrer une route existante:

### Avant

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const organizationId = searchParams.get('organization_id')

  // Pas de validation! ❌
  const results = await search(query, organizationId)
  // ...
}
```

### Après

```typescript
import { withQueryValidation, searchSchema, organizationFilterSchema } from '@/lib/utils/api-validation'

export async function GET(request: NextRequest) {
  const schema = {
    ...searchSchema,
    ...organizationFilterSchema,
  }

  return withQueryValidation(request, schema, async (req, data) => {
    // Données validées et sanitizées! ✅
    const { q, organization_id } = data
    const results = await search(q, organization_id)
    // ...
  })
}
```

---

## Support

Pour toute question ou problème avec le système de validation, consulter:

- `lib/utils/input-validation.ts` - Fonctions de validation de base
- `lib/utils/api-validation.ts` - Middleware pour API routes
- Ce guide - Exemples et bonnes pratiques
