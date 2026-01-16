---
title: Guide dApplication du Rate Limiting aux Routes API
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🛡️ Guide d'Application du Rate Limiting aux Routes API

## 📋 Routes Critiques à Protéger

### Routes d'Authentification (authRateLimiter - 5 req/15min)
- `/api/2fa/generate-secret`
- `/api/2fa/verify`
- `/api/2fa/verify-activation`
- `/api/2fa/disable`
- `/api/2fa/regenerate-backup-codes`
- `/api/sessions/active`
- `/api/sessions/revoke`

### Routes de Mutations (mutationRateLimiter - 50 req/min)
- `/api/users/create`
- `/api/users/by-email`
- `/api/documents/generate`
- `/api/documents/generate-batch`
- `/api/payments/sepa/create-direct-debit`
- `/api/payments/sepa/create-transfer`
- `/api/payments/stripe/create-intent`
- `/api/mobile-money/initiate`
- `/api/qr-attendance/generate`
- `/api/qr-attendance/scan`
- `/api/payment-reminders/process`

### Routes d'Upload (uploadRateLimiter - 10 req/min)
- `/api/resources/upload`
- `/api/document-templates` (POST)
- `/api/document-templates/[id]` (PUT)

### Routes Générales (generalRateLimiter - 100 req/min)
- Toutes les autres routes API

---

## 🔧 Comment Appliquer

### Exemple 1 : Route d'Authentification

```typescript
// app/api/2fa/verify/route.ts
import { withRateLimit, authRateLimiter } from '@/app/api/_middleware/rate-limit'

export async function POST(request: Request) {
  return withRateLimit(request, authRateLimiter, async (req) => {
    // Votre logique ici
    const body = await req.json()
    // ...
    return NextResponse.json({ success: true })
  })
}
```

### Exemple 2 : Route de Mutation

```typescript
// app/api/documents/generate/route.ts
import { withRateLimit, mutationRateLimiter } from '@/app/api/_middleware/rate-limit'

export async function POST(request: Request) {
  return withRateLimit(request, mutationRateLimiter, async (req) => {
    // Votre logique ici
    // ...
    return NextResponse.json({ document: data })
  })
}
```

### Exemple 3 : Route d'Upload

```typescript
// app/api/resources/upload/route.ts
import { withRateLimit, uploadRateLimiter } from '@/app/api/_middleware/rate-limit'

export async function POST(request: Request) {
  return withRateLimit(request, uploadRateLimiter, async (req) => {
    // Votre logique d'upload
    // ...
    return NextResponse.json({ url: fileUrl })
  })
}
```

---

## ✅ Checklist

- [ ] Routes 2FA protégées avec `authRateLimiter`
- [ ] Routes de création protégées avec `mutationRateLimiter`
- [ ] Routes d'upload protégées avec `uploadRateLimiter`
- [ ] Autres routes protégées avec `generalRateLimiter`
- [ ] Tester chaque route pour vérifier le rate limiting
- [ ] Vérifier les headers de réponse (`X-RateLimit-Remaining`, `X-RateLimit-Reset`)

---

## 🚨 Notes Importantes

1. **En production**, utilisez un rate limiter distribué (Redis/Upstash) au lieu du rate limiter en mémoire
2. **Ajustez les limites** selon vos besoins métier
3. **Testez** avec des outils comme `curl` ou Postman pour vérifier le rate limiting
4. **Surveillez** les erreurs 429 (Too Many Requests) dans vos logs---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.