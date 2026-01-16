---
title: Guide dIntégration API - EDUZEN
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔌 Guide d'Intégration API - EDUZEN

**Version :** 1.0.0  
**Date de mise à jour :** 2024-12-03

---

## 📋 Table des Matières

1. [Introduction](#introduction)
2. [Authentification](#authentification)
3. [Premiers Pas](#premiers-pas)
4. [Flux Principaux](#flux-principaux)
5. [Gestion des Erreurs](#gestion-des-erreurs)
6. [Rate Limiting](#rate-limiting)
7. [Webhooks](#webhooks)
8. [Exemples d'Intégration](#exemples-dintégration)
9. [Bonnes Pratiques](#bonnes-pratiques)
10. [Support](#support)

---

## 🎯 Introduction

L'API EDUZEN permet d'intégrer la plateforme de gestion scolaire dans vos systèmes existants. Elle fournit un accès RESTful à toutes les fonctionnalités principales.

### Caractéristiques

- ✅ RESTful API
- ✅ Authentification par JWT (cookies)
- ✅ Rate limiting pour protéger les ressources
- ✅ Webhooks pour les événements
- ✅ Documentation OpenAPI complète
- ✅ Support Mobile Money et SEPA

---

## 🔐 Authentification

### Méthode 1 : Session Web (Cookies)

L'authentification se fait via les cookies de session après connexion sur l'interface web.

**Utilisation :**
```bash
# 1. Se connecter via l'interface web
# 2. Les cookies sont automatiquement inclus dans les requêtes

curl -X GET https://app.eduzen.com/api/v1/students \
  -H "Cookie: sb-access-token=<token>"
```

### Méthode 2 : API Key

Pour les intégrations automatisées, utilisez une clé API.

**Création d'une API Key :**
1. Aller dans **Paramètres > API Keys**
2. Créer une nouvelle clé
3. Configurer les scopes (permissions)

**Utilisation :**
```bash
curl -X GET https://app.eduzen.com/api/v1/students \
  -H "X-API-Key: your-api-key"
```

### Scopes Disponibles

- `read:students` - Lire les étudiants
- `write:students` - Créer/modifier des étudiants
- `read:payments` - Lire les paiements
- `write:payments` - Créer des paiements
- `read:documents` - Lire les documents
- `write:documents` - Générer des documents

---

## 🚀 Premiers Pas

### 1. Installation

Aucune installation requise. L'API est accessible via HTTPS.

### 2. Configuration

**Variables d'environnement :**
```bash
EDUZEN_API_URL=https://app.eduzen.com/api
EDUZEN_API_KEY=your-api-key
```

### 3. Test de Connexion

```bash
curl -X GET https://app.eduzen.com/api/v1/students?organization_id=org-123 \
  -H "X-API-Key: your-api-key"
```

**Réponse attendue :**
```json
{
  "data": [],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalItems": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

---

## 📊 Flux Principaux

### Flux 1 : Créer un Étudiant et Générer une Facture

```bash
# 1. Créer un étudiant
curl -X POST https://app.eduzen.com/api/v1/students \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "org-123",
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com"
  }'

# 2. Générer une facture (via l'interface ou API future)
# 3. Initier un paiement
curl -X POST https://app.eduzen.com/api/payments/stripe/create-intent \
  -H "Cookie: sb-access-token=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "EUR",
    "customer_email": "jane@example.com",
    "description": "Frais de scolarité"
  }'
```

### Flux 2 : Présence par QR Code

```bash
# 1. Générer un QR code pour une session
curl -X POST https://app.eduzen.com/api/qr-attendance/generate \
  -H "Cookie: sb-access-token=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "session-123",
    "duration_minutes": 15
  }'

# 2. Scanner le QR code (côté étudiant)
curl -X POST https://app.eduzen.com/api/qr-attendance/scan \
  -H "Cookie: sb-access-token=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code": "QR-CODE-DATA",
    "student_id": "student-123"
  }'
```

### Flux 3 : Paiement Mobile Money

```bash
# 1. Initier le paiement
curl -X POST https://app.eduzen.com/api/mobile-money/initiate \
  -H "Cookie: sb-access-token=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "mtn",
    "amount": 10000,
    "currency": "XOF",
    "phone_number": "+221771234567",
    "description": "Paiement frais de scolarité"
  }'

# 2. Vérifier le statut
curl -X GET https://app.eduzen.com/api/mobile-money/status/txn-123 \
  -H "Cookie: sb-access-token=<token>"
```

---

## ❌ Gestion des Erreurs

### Codes HTTP Standards

- `200` - Succès
- `201` - Créé
- `400` - Requête invalide
- `401` - Non authentifié
- `403` - Permission refusée
- `404` - Non trouvé
- `429` - Trop de requêtes (Rate Limit)
- `500` - Erreur serveur

### Format d'Erreur

```json
{
  "error": "Validation error",
  "message": "Les champs suivants sont requis : email, full_name",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "message": "Email invalide"
  }
}
```

### Gestion des Erreurs (JavaScript)

```javascript
async function createUser(userData) {
  try {
    const response = await fetch('https://app.eduzen.com/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sb-access-token=${token}`
      },
      body: JSON.stringify(userData)
    })

    if (!response.ok) {
      const error = await response.json()
      
      if (response.status === 429) {
        // Rate limit - attendre avant de réessayer
        const retryAfter = response.headers.get('Retry-After')
        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000))
        return createUser(userData) // Retry
      }
      
      throw new Error(error.message || 'Erreur serveur')
    }

    return await response.json()
  } catch (error) {
    console.error('Erreur lors de la création:', error)
    throw error
  }
}
```

---

## 🚦 Rate Limiting

### Limites par Type

1. **Authentification** (`authRateLimiter`)
   - 5 requêtes / 15 minutes
   - Routes : `/api/2fa/*`, `/api/auth/*`

2. **Mutations** (`mutationRateLimiter`)
   - 50 requêtes / minute
   - Routes : `/api/*/create`, `/api/*/update`, `/api/*/delete`

3. **Uploads** (`uploadRateLimiter`)
   - 10 requêtes / minute
   - Routes : `/api/*/upload`

4. **Général** (`generalRateLimiter`)
   - 100 requêtes / minute
   - Autres routes

### Headers de Réponse

```
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2024-12-03T10:15:00Z
Retry-After: 60
```

### Gestion du Rate Limiting

```javascript
async function makeRequest(url, options) {
  const response = await fetch(url, options)
  
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
    return makeRequest(url, options) // Retry
  }
  
  return response
}
```

---

## 🔔 Webhooks

### Configuration

1. Aller dans **Paramètres > Webhooks**
2. Créer un nouveau webhook
3. Configurer l'URL de callback
4. Sélectionner les événements

### Événements Disponibles

- `payment.completed` - Paiement complété
- `payment.failed` - Paiement échoué
- `student.created` - Étudiant créé
- `attendance.marked` - Présence marquée
- `document.generated` - Document généré

### Format du Webhook

```json
{
  "event": "payment.completed",
  "timestamp": "2024-12-03T10:00:00Z",
  "data": {
    "payment_id": "payment-123",
    "amount": 10000,
    "currency": "EUR",
    "status": "completed"
  },
  "signature": "sha256=..."
}
```

### Vérification de la Signature

```javascript
const crypto = require('crypto')

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret)
  const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}
```

---

## 💡 Exemples d'Intégration

### Exemple 1 : Synchronisation Étudiants

```javascript
// Synchroniser les étudiants depuis un système externe
async function syncStudents(externalStudents) {
  const results = {
    created: 0,
    updated: 0,
    errors: []
  }

  for (const student of externalStudents) {
    try {
      // Vérifier si l'étudiant existe
      const existing = await findStudentByEmail(student.email)
      
      if (existing) {
        // Mettre à jour
        await updateStudent(existing.id, student)
        results.updated++
      } else {
        // Créer
        await createStudent(student)
        results.created++
      }
    } catch (error) {
      results.errors.push({ student, error: error.message })
    }
  }

  return results
}
```

### Exemple 2 : Paiement Automatique

```javascript
// Traiter les paiements en attente
async function processPendingPayments() {
  const pendingPayments = await getPendingPayments()
  
  for (const payment of pendingPayments) {
    try {
      if (payment.method === 'mobile_money') {
        await initiateMobileMoneyPayment(payment)
      } else if (payment.method === 'stripe') {
        await createStripeIntent(payment)
      }
    } catch (error) {
      await logPaymentError(payment.id, error)
    }
  }
}
```

### Exemple 3 : Génération de Documents en Masse

```javascript
// Générer des certificats pour tous les étudiants
async function generateCertificates(programId) {
  const students = await getStudentsByProgram(programId)
  const templateId = 'certificate-template-id'
  
  const results = await Promise.allSettled(
    students.map(student => 
      generateDocument({
        template_id: templateId,
        format: 'pdf',
        variables: {
          student_name: `${student.first_name} ${student.last_name}`,
          program_name: programId,
          date: new Date().toLocaleDateString('fr-FR')
        },
        send_email: true,
        email_to: student.email
      })
    )
  )
  
  return {
    success: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length
  }
}
```

---

## ✅ Bonnes Pratiques

### 1. Gestion des Erreurs

- ✅ Toujours vérifier les codes de statut HTTP
- ✅ Implémenter une logique de retry pour les erreurs temporaires
- ✅ Logger les erreurs pour le debugging
- ✅ Afficher des messages d'erreur clairs aux utilisateurs

### 2. Performance

- ✅ Utiliser la pagination pour les grandes listes
- ✅ Mettre en cache les données statiques
- ✅ Éviter les requêtes inutiles
- ✅ Utiliser les filtres pour réduire les données

### 3. Sécurité

- ✅ Ne jamais exposer les clés API dans le code client
- ✅ Utiliser HTTPS pour toutes les requêtes
- ✅ Valider toutes les données d'entrée
- ✅ Vérifier les signatures des webhooks

### 4. Rate Limiting

- ✅ Respecter les limites de rate limiting
- ✅ Implémenter un backoff exponentiel
- ✅ Mettre en cache les réponses quand possible
- ✅ Utiliser les headers `X-RateLimit-*` pour gérer les limites

### 5. Tests

- ✅ Tester tous les cas d'erreur
- ✅ Tester les limites de rate limiting
- ✅ Tester les webhooks
- ✅ Utiliser un environnement de staging

---

## 📚 Ressources

### Documentation

- [Documentation API Complète](./API_DOCUMENTATION.md)
- [Exemples d'Utilisation](./API_EXAMPLES.md)
- [Schéma OpenAPI](./API_OPENAPI_SCHEMA.yaml)
- [Collection Postman](./EDUZEN_API.postman_collection.json)

### Outils

- **Postman** : Importer la collection pour tester l'API
- **OpenAPI** : Utiliser le schéma pour générer des clients
- **cURL** : Exemples dans la documentation

### Support

- **Email** : support@eduzen.com
- **Documentation** : https://docs.eduzen.com
- **Status Page** : https://status.eduzen.com

---

## 🔗 Liens Utiles

- [Guide de Rate Limiting](./GUIDE_RATE_LIMITING_API.md)
- [Guide de Test Performance](./GUIDE_TEST_PERFORMANCE_DEVTOOLS.md)
- [README Principal](../README.md)

---

**Dernière mise à jour :** 2024-12-03---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.