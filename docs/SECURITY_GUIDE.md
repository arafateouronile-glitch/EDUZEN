# Guide de Sécurité API - EDUZEN

Guide pratique pour implémenter et utiliser les fonctionnalités de sécurité dans EDUZEN.

---

## 🚀 Démarrage Rapide

### 1. Sécuriser une nouvelle route API

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withBodyValidation, withRateLimit, mutationRateLimiter } from '@/lib/utils'
import type { ValidationSchema } from '@/lib/utils/api-validation'

// 1. Définir le schéma de validation
const mySchema: ValidationSchema = {
  email: {
    type: 'email',
    required: true,
  },
  amount: {
    type: 'float',
    required: true,
    min: 0.01,
    max: 10000,
  },
  description: {
    type: 'string',
    required: false,
    maxLength: 500,
  },
}

// 2. Appliquer rate limiting + validation
export async function POST(request: NextRequest) {
  return withRateLimit(request, mutationRateLimiter, async (req) => {
    return withBodyValidation(req, mySchema, async (req, validatedData) => {
      // 3. Utiliser validatedData (typé et validé)
      const { email, amount, description } = validatedData

      // Votre logique métier ici
      // ...

      return NextResponse.json({ success: true })
    })
  })
}
```

---

## 📚 Types de Validation

### Types de base

#### String
```typescript
{
  name: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s]+$/,  // Optionnel
  }
}
```

#### Email
```typescript
{
  email: {
    type: 'email',
    required: true,
  }
}
```

#### UUID
```typescript
{
  user_id: {
    type: 'uuid',
    required: true,
  }
}
```

#### Numbers
```typescript
{
  age: {
    type: 'integer',
    required: true,
    min: 18,
    max: 120,
  },
  price: {
    type: 'float',
    required: true,
    min: 0.01,
    max: 999999.99,
  }
}
```

#### Boolean
```typescript
{
  is_active: {
    type: 'boolean',
    required: false,
  }
}
```

#### Date
```typescript
{
  birth_date: {
    type: 'date',  // ISO 8601
    required: true,
  }
}
```

#### JSON
```typescript
{
  metadata: {
    type: 'json',
    required: false,
  }
}
```

#### URL
```typescript
{
  website: {
    type: 'url',
    required: false,
  }
}
```

### Validation avancée

#### Whitelist de valeurs
```typescript
{
  role: {
    type: 'string',
    required: true,
    allowedValues: ['admin', 'teacher', 'student'],
  }
}
```

#### Custom validator
```typescript
{
  iban: {
    type: 'string',
    required: true,
    customValidator: (value: unknown) => {
      const iban = String(value).replace(/\s/g, '')

      if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
        return {
          isValid: false,
          errors: ['Format IBAN invalide']
        }
      }

      return {
        isValid: true,
        sanitized: iban  // Valeur nettoyée
      }
    }
  }
}
```

---

## 🚦 Rate Limiting

### Limiters disponibles

#### General Rate Limiter (100 req/min)
```typescript
import { withRateLimit, generalRateLimiter } from '@/lib/utils/rate-limiter'

export async function GET(request: NextRequest) {
  return withRateLimit(request, generalRateLimiter, async (req) => {
    // Votre logique
  })
}
```

#### Auth Rate Limiter (5 req/15min)
```typescript
import { authRateLimiter } from '@/lib/utils/rate-limiter'

// Pour les endpoints d'authentification
export async function POST(request: NextRequest) {
  return withRateLimit(request, authRateLimiter, async (req) => {
    // Login, 2FA, etc.
  })
}
```

#### Mutation Rate Limiter (50 req/min)
```typescript
import { mutationRateLimiter } from '@/lib/utils/rate-limiter'

// Pour les opérations de création/modification
export async function POST(request: NextRequest) {
  return withRateLimit(request, mutationRateLimiter, async (req) => {
    // Create, update, delete
  })
}
```

#### Upload Rate Limiter (10 req/min)
```typescript
import { uploadRateLimiter } from '@/lib/utils/rate-limiter'

// Pour les uploads de fichiers
export async function POST(request: NextRequest) {
  return withRateLimit(request, uploadRateLimiter, async (req) => {
    // Upload logic
  })
}
```

### Custom Rate Limiter
```typescript
import { RateLimiter } from '@/lib/utils/rate-limiter'

const customLimiter = new RateLimiter({
  maxRequests: 20,
  windowMs: 60000,  // 1 minute
})

export async function POST(request: NextRequest) {
  return withRateLimit(request, customLimiter, async (req) => {
    // Votre logique
  })
}
```

---

## 🔐 Sécurité Webhook

### Validation de signature

```typescript
import { validateWebhook } from '@/lib/utils/webhook-security'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('X-Webhook-Signature')
  const timestamp = request.headers.get('X-Webhook-Timestamp')
  const nonce = request.headers.get('X-Webhook-Nonce')

  const validation = await validateWebhook({
    body,
    signature,
    timestamp,
    nonce,
    secret: process.env.WEBHOOK_SECRET!,
    maxAge: 300000,  // 5 minutes
  })

  if (!validation.isValid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 401 }
    )
  }

  // Traiter le webhook
  const data = JSON.parse(body)
  // ...

  return NextResponse.json({ success: true })
}
```

---

## ⏰ Sécurité CRON

### Protection endpoints CRON

```typescript
import { withCronSecurity } from '@/lib/utils/cron-security'

export async function GET(request: NextRequest) {
  return withCronSecurity(
    request,
    async (req) => {
      // Votre logique CRON
      return NextResponse.json({ success: true })
    },
    {
      secret: process.env.CRON_SECRET,
      allowedIPs: process.env.CRON_ALLOWED_IPS?.split(',') || [],
      requireSecret: true,
      logExecution: true,
    }
  )
}
```

### Configuration `.env`
```bash
CRON_SECRET=your-super-secret-cron-key
CRON_ALLOWED_IPS=123.456.789.0,98.765.432.1
```

---

## 🧪 Tests

### Tester une route sécurisée

```typescript
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

describe('My Secure Route', () => {
  it('should validate required fields', async () => {
    const request = new NextRequest('http://localhost/api/my-route', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',  // Email invalide
      }),
    })

    const { POST } = await import('@/app/api/my-route/route')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.errors).toBeDefined()
    expect(data.errors.email).toBeDefined()
  })

  it('should accept valid data', async () => {
    const request = new NextRequest('http://localhost/api/my-route', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        amount: 100.50,
      }),
    })

    const { POST } = await import('@/app/api/my-route/route')
    const response = await POST(request)

    expect(response.status).toBe(200)
  })
})
```

### Lancer les tests

```bash
# Tests sécurité uniquement
npm run test:security

# Tous les tests
npm test

# Avec coverage
npm run test:coverage

# Rapport HTML
npm run test:coverage:report
```

---

## 🛡️ Protection XSS/Injection

### Détection automatique

Le système détecte automatiquement:
- `<script>`, `<iframe>`, `<object>`
- `javascript:`, `data:`, `vbscript:`
- `on*` event handlers
- SQL patterns: `'; DROP TABLE`, `UNION SELECT`

### Exemple

```typescript
// ❌ Sera rejeté automatiquement
{
  comment: "<script>alert('XSS')</script>Normal text"
}

// Erreur: "Contenu suspect détecté"
```

### Sanitization manuelle

Si besoin de traiter du HTML légitime, utilisez le type `html`:

```typescript
{
  content: {
    type: 'html',  // Sanitize avec DOMPurify
    required: true,
    maxLength: 10000,
  }
}
```

---

## 📊 Monitoring

### Logs sécurité

```typescript
import { logger, maskId, maskEmail } from '@/lib/utils/logger'

// Logger avec données masquées
logger.info('Payment created', {
  userId: maskId(user.id),            // xxxx-xxxx-xxxx-1234
  email: maskEmail(user.email),        // t***@example.com
  amount: payment.amount,
})

// Logger erreurs
logger.error('Payment failed', error, {
  error: sanitizeError(error),  // Supprime stack traces sensibles
})
```

### Métriques rate limiting

```typescript
const result = await generalRateLimiter.check(request)

console.log({
  allowed: result.allowed,
  remaining: result.remaining,
  resetTime: result.resetTime,
})
```

---

## ⚠️ Meilleures Pratiques

### ✅ À FAIRE
1. **Toujours valider les inputs** avec `withBodyValidation`
2. **Appliquer rate limiting** sur toutes les mutations
3. **Masquer les données sensibles** dans les logs
4. **Utiliser types stricts** (uuid, email, etc.)
5. **Tester les cas d'erreur** (validation, rate limit)
6. **Documenter les schémas** avec des commentaires

### ❌ À ÉVITER
1. **Ne jamais logger** passwords, tokens, secrets
2. **Ne pas contourner** la validation avec `as any`
3. **Ne pas ignorer** les erreurs de validation
4. **Ne pas augmenter** les limites sans raison
5. **Ne pas désactiver** la détection XSS
6. **Ne pas utiliser** `sanitize: true` (obsolète)

---

## 🆘 Dépannage

### Erreur: "Too many requests"
```typescript
// Solution: Attendre le reset ou utiliser un autre IP
const result = await rateLimiter.check(request)
console.log('Reset time:', new Date(result.resetTime))
```

### Erreur: "Validation échouée"
```typescript
// Vérifier le format exact des erreurs
const response = await POST(request)
const data = await response.json()
console.log('Erreurs:', data.errors)
// Format: { field: ['error1', 'error2'] }
```

### Erreur: "Webhook signature invalid"
```typescript
// Vérifier:
1. Le secret est correct
2. Le body est en format raw (pas JSON parsé)
3. Le timestamp est récent (<5min)
4. Le nonce n'est pas réutilisé
```

---

## 📖 Références

- [API Routes Security Audit](./API_ROUTES_SECURITY_AUDIT.md)
- [Phase 2 Security Complete](./PHASE_2_SECURITY_COMPLETE.md)
- [Phase 2 Security Progress](./PHASE_2_SECURITY_PROGRESS.md)
- [Action Plan](../ACTION_PLAN_QUICK_REFERENCE.md)

---

**Dernière mise à jour**: 2026-01-12
**Version**: 2.0.0
