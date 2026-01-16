---
title: Documentation API - EDUZEN
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 📡 Documentation API - EDUZEN

Documentation complète des endpoints API de l'application EDUZEN.

## 🔐 Authentification

Tous les endpoints (sauf ceux explicitement publics) nécessitent une authentification via Supabase Auth. Les tokens JWT sont envoyés via les cookies HTTP-only.

### Vérifier l'authentification

```http
GET /api/auth/check
```

**Réponse** :
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

## 📄 Documents

### Générer un document

```http
POST /api/documents/generate
Content-Type: application/json

{
  "templateId": "uuid",
  "studentId": "uuid",
  "sessionId": "uuid",
  "variables": {}
}
```

**Réponse** :
```json
{
  "documentId": "uuid",
  "url": "https://...",
  "status": "generated"
}
```

### Générer plusieurs documents

```http
POST /api/documents/generate-batch
Content-Type: application/json

{
  "templateId": "uuid",
  "studentIds": ["uuid1", "uuid2"],
  "sessionId": "uuid",
  "variables": {}
}
```

### Programmer l'envoi d'un document

```http
POST /api/documents/schedule-send
Content-Type: application/json

{
  "documentId": "uuid",
  "sendAt": "2024-12-31T23:59:59Z",
  "recipientEmail": "student@example.com"
}
```

## 💳 Paiements

### Stripe - Créer un Payment Intent

```http
POST /api/payments/stripe/create-intent
Content-Type: application/json

{
  "invoiceId": "uuid",
  "amount": 10000,
  "currency": "EUR"
}
```

**Réponse** :
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

### Stripe - Vérifier le statut

```http
GET /api/payments/stripe/status/[paymentIntentId]
```

**Réponse** :
```json
{
  "status": "succeeded",
  "amount": 10000,
  "currency": "EUR"
}
```

### SEPA - Créer un prélèvement

```http
POST /api/payments/sepa/create-direct-debit
Content-Type: application/json

{
  "invoiceId": "uuid",
  "amount": 10000,
  "currency": "EUR",
  "iban": "FR76..."
}
```

### Mobile Money - Initier un paiement

```http
POST /api/mobile-money/initiate
Content-Type: application/json

{
  "invoiceId": "uuid",
  "amount": 10000,
  "phoneNumber": "+221771234567",
  "provider": "orange_money"
}
```

### Mobile Money - Vérifier le statut

```http
GET /api/mobile-money/status/[transactionId]
```

## 🔔 Webhooks

### Mobile Money Webhook

```http
POST /api/mobile-money/webhook
X-Signature: sha256=...
X-Timestamp: 1234567890
X-Nonce: unique-nonce

{
  "transactionId": "xxx",
  "status": "completed",
  "amount": 10000
}
```

**Sécurité** :
- Signature HMAC requise dans `X-Signature`
- Timestamp dans `X-Timestamp` (protection replay attack)
- Nonce unique dans `X-Nonce`

### E-Signature Webhook

```http
POST /api/esignature/webhook
X-Signature: sha256=...
X-Timestamp: 1234567890
X-Nonce: unique-nonce

{
  "documentId": "uuid",
  "status": "signed",
  "signatureData": {}
}
```

## ⏰ CRON Jobs

Tous les endpoints CRON nécessitent :
- Header `X-CRON-Secret` avec la valeur de `CRON_SECRET`
- IP whitelist (si configuré)

### Envoyer les notifications programmées

```http
POST /api/cron/send-notifications
X-CRON-Secret: your-secret
```

### Envoyer les documents programmés

```http
POST /api/cron/send-scheduled-documents
X-CRON-Secret: your-secret
```

### Vérifier les alertes de conformité

```http
POST /api/cron/compliance-alerts
X-CRON-Secret: your-secret
```

## 👤 Utilisateurs

### Créer un utilisateur

```http
POST /api/users/create
Content-Type: application/json

{
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "teacher",
  "organizationId": "uuid"
}
```

### Trouver un utilisateur par email

```http
GET /api/users/by-email?email=user@example.com
```

## 🎓 Apprenant (Learner Portal)

### Obtenir un token d'accès

```http
POST /api/learner/access-token
Content-Type: application/json

{
  "studentId": "uuid"
}
```

**Réponse** :
```json
{
  "token": "jwt-token",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### Valider un token

```http
POST /api/learner/access-token/validate
Content-Type: application/json

{
  "token": "jwt-token"
}
```

### Récupérer les données de l'apprenant

```http
GET /api/learner/data
X-Learner-Student-Id: uuid
```

## 📧 Email

### Envoyer un email

```http
POST /api/email/send
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Subject",
  "html": "<p>Body</p>",
  "attachments": []
}
```

## 🔐 2FA (Authentification à deux facteurs)

### Générer un secret

```http
POST /api/2fa/generate-secret
```

**Réponse** :
```json
{
  "secret": "base32-secret",
  "qrCode": "data:image/png;base64,..."
}
```

### Vérifier l'activation

```http
POST /api/2fa/verify-activation
Content-Type: application/json

{
  "token": "123456"
}
```

### Vérifier un code

```http
POST /api/2fa/verify
Content-Type: application/json

{
  "token": "123456"
}
```

### Désactiver 2FA

```http
POST /api/2fa/disable
```

### Régénérer les codes de secours

```http
POST /api/2fa/regenerate-backup-codes
```

## 🔗 Intégrations

### SSO - Configurer un provider

```http
GET /api/sso/config?provider=google
```

### SSO - Tester la connexion

```http
POST /api/sso/test-connection
Content-Type: application/json

{
  "provider": "google",
  "config": {}
}
```

### LMS - Synchroniser

```http
POST /api/lms/sync
Content-Type: application/json

{
  "sessionId": "uuid",
  "syncType": "full"
}
```

### CRM - Synchroniser

```http
POST /api/crm/sync
Content-Type: application/json

{
  "organizationId": "uuid",
  "syncType": "contacts"
}
```

### Comptabilité - Synchroniser

```http
POST /api/accounting/sync
Content-Type: application/json

{
  "organizationId": "uuid",
  "period": "2024-12"
}
```

## 📊 Conformité

### Vérifier les alertes

```http
GET /api/compliance/alerts/check
```

### Risques critiques

```http
GET /api/compliance/alerts/critical-risks
```

### Générer un rapport

```http
POST /api/compliance/reports/generate
Content-Type: application/json

{
  "type": "monthly",
  "period": "2024-12"
}
```

## 🔒 Sécurité

### Rate Limiting

Les endpoints critiques ont un rate limiting :
- **Auth** : 10 requêtes/minute
- **Paiements** : 5 requêtes/minute
- **Documents** : 20 requêtes/minute
- **Général** : 100 requêtes/minute

### Headers de sécurité

Toutes les réponses incluent :
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

## 📝 Codes d'erreur

### Codes HTTP

- `200` : Succès
- `201` : Créé
- `400` : Requête invalide
- `401` : Non authentifié
- `403` : Non autorisé
- `404` : Non trouvé
- `429` : Trop de requêtes (rate limit)
- `500` : Erreur serveur

### Codes d'erreur personnalisés

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Le champ 'email' est requis",
    "field": "email"
  }
}
```

## 🔄 Versioning

L'API utilise un versioning par préfixe :
- `/api/v1/` : Version 1 (actuelle)
- `/api/` : Endpoints non versionnés (dépréciés)

## 📚 Exemples

### Exemple complet : Générer un document

```bash
curl -X POST https://votre-domaine.com/api/documents/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxx-auth-token=..." \
  -d '{
    "templateId": "123e4567-e89b-12d3-a456-426614174000",
    "studentId": "123e4567-e89b-12d3-a456-426614174001",
    "sessionId": "123e4567-e89b-12d3-a456-426614174002",
    "variables": {
      "customField": "value"
    }
  }'
```

### Exemple : Créer un Payment Intent Stripe

```bash
curl -X POST https://votre-domaine.com/api/payments/stripe/create-intent \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxx-auth-token=..." \
  -d '{
    "invoiceId": "123e4567-e89b-12d3-a456-426614174000",
    "amount": 10000,
    "currency": "EUR"
  }'
```

## 🔗 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Documentation Stripe](https://stripe.com/docs/api)---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

