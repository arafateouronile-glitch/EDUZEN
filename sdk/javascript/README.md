---
title: EDUZEN API SDK - JavaScriptTypeScript
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# EDUZEN API SDK - JavaScript/TypeScript

SDK officiel pour l'API EDUZEN en JavaScript et TypeScript.

## Installation

```bash
npm install @eduzen/sdk
```

## Utilisation

### Configuration

```typescript
import EDUZENClient from '@eduzen/sdk'

// Avec API Key
const client = new EDUZENClient({
  baseUrl: 'https://app.eduzen.com/api',
  apiKey: 'your-api-key'
})

// Avec Access Token
const client = new EDUZENClient({
  baseUrl: 'https://app.eduzen.com/api',
  accessToken: 'your-access-token'
})
```

### Exemples

#### Créer un utilisateur

```typescript
const response = await client.createUser({
  email: 'teacher@example.com',
  full_name: 'Jane Smith',
  organization_id: 'org-123',
  role: 'teacher',
  password: 'SecurePassword123!'
})

if (response.error) {
  console.error('Erreur:', response.error.message)
} else {
  console.log('Utilisateur créé:', response.data)
}
```

#### Récupérer les étudiants

```typescript
const response = await client.getStudents({
  organization_id: 'org-123',
  page: 1,
  limit: 10,
  search: 'Doe'
})

if (response.data) {
  console.log('Étudiants:', response.data)
  console.log('Pagination:', response.pagination)
}
```

#### Créer un paiement Stripe

```typescript
const response = await client.createStripeIntent({
  amount: 10000,
  currency: 'EUR',
  customer_email: 'parent@example.com',
  description: 'Paiement frais de scolarité'
})

if (response.data) {
  console.log('Payment Intent:', response.data.paymentIntentId)
  console.log('Client Secret:', response.data.clientSecret)
}
```

#### Générer un document

```typescript
const response = await client.generateDocument({
  template_id: 'template-123',
  format: 'pdf',
  variables: {
    student_name: 'Jane Doe',
    amount: '10000 XOF',
    date: '2024-12-03'
  },
  send_email: true,
  email_to: 'parent@example.com'
})

if (response.data) {
  console.log('Document généré:', response.data.file_url)
}
```

## Documentation

Pour plus d'informations, consultez la [documentation complète de l'API](https://docs.eduzen.com/api).

## Support

- Email: support@eduzen.com
- Documentation: https://docs.eduzen.com---

**Document EDUZEN** | [Retour à la documentation principale](../../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.