---
title: Documentation API - EDUZEN
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 📚 Documentation API - EDUZEN

**Version :** 1.0.0  
**Base URL :** `/api`  
**Date de mise à jour :** 2024-12-03

---

## 📋 Table des Matières

1. [Authentification](#authentification)
2. [2FA (Two-Factor Authentication)](#2fa-two-factor-authentication)
3. [Utilisateurs](#utilisateurs)
4. [Étudiants](#étudiants)
5. [Paiements](#paiements)
6. [Factures](#factures)
7. [Documents](#documents)
8. [Présence](#présence)
9. [Mobile Money](#mobile-money)
10. [Compliance](#compliance)
11. [Rate Limiting](#rate-limiting)
12. [Codes d'Erreur](#codes-derreur)

---

## 🔐 Authentification

Toutes les routes API (sauf `/api/auth/*`) nécessitent une authentification via JWT token dans les cookies de session.

**Headers requis :**
```
Cookie: sb-access-token=<token>
```

---

## 🔒 2FA (Two-Factor Authentication)

### `POST /api/2fa/generate-secret`

Génère un secret TOTP et un QR code pour activer la 2FA.

**Rate Limiting :** `authRateLimiter` (5 req/15min)

**Réponse :**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,...",
  "backupCodes": ["A1B2C3D4", "E5F6G7H8", ...]
}
```

---

### `POST /api/2fa/verify-activation`

Vérifie un code TOTP lors de l'activation de la 2FA.

**Rate Limiting :** `authRateLimiter` (5 req/15min)

**Body :**
```json
{
  "code": "123456"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "2FA activée avec succès"
}
```

---

### `POST /api/2fa/verify`

Vérifie un code TOTP lors de la connexion.

**Rate Limiting :** `authRateLimiter` (5 req/15min)

**Body :**
```json
{
  "code": "123456"
}
```

**Réponse :**
```json
{
  "success": true,
  "isBackupCode": false,
  "sessionToken": "abc123..."
}
```

---

### `POST /api/2fa/disable`

Désactive la 2FA pour un utilisateur.

**Rate Limiting :** `authRateLimiter` (5 req/15min)

**Body :**
```json
{
  "password": "user_password"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "2FA désactivée avec succès"
}
```

---

### `POST /api/2fa/regenerate-backup-codes`

Régénère les codes de récupération pour la 2FA.

**Rate Limiting :** `authRateLimiter` (5 req/15min)

**Réponse :**
```json
{
  "success": true,
  "backupCodes": ["A1B2C3D4", "E5F6G7H8", ...],
  "message": "Codes de récupération régénérés avec succès"
}
```

---

## 👥 Utilisateurs

### `POST /api/users/create`

Crée un nouvel utilisateur.

**Rate Limiting :** `mutationRateLimiter` (50 req/min)

**Permissions :** `super_admin` ou `admin`

**Body :**
```json
{
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone": "+221771234567",
  "organization_id": "org-123",
  "password": "secure_password",
  "role": "teacher",
  "is_active": true,
  "send_invitation": false
}
```

**Réponse :**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "teacher",
    "is_active": true
  },
  "message": "Utilisateur créé avec succès"
}
```

---

## 🎓 Étudiants

### `GET /api/v1/students`

Récupère la liste des étudiants d'une organisation.

**Query Parameters :**
- `organization_id` (requis) - ID de l'organisation
- `class_id` (optionnel) - Filtrer par classe
- `status` (optionnel) - Filtrer par statut (`active`, `inactive`, `graduated`)
- `search` (optionnel) - Recherche par nom ou numéro
- `page` (optionnel) - Numéro de page (défaut: 1)
- `pageSize` (optionnel) - Taille de page (défaut: 10)

**Réponse :**
```json
{
  "data": [
    {
      "id": "student-123",
      "first_name": "Jane",
      "last_name": "Doe",
      "student_number": "ORG-24-0001",
      "email": "jane@example.com",
      "status": "active",
      "class_id": "class-123",
      "classes": {
        "name": "6ème A",
        "level": "6ème"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalItems": 50,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## 💳 Paiements

### `POST /api/payments/stripe/create-intent`

Crée une intention de paiement Stripe.

**Rate Limiting :** `mutationRateLimiter` (50 req/min)

**Body :**
```json
{
  "amount": 10000,
  "currency": "EUR",
  "description": "Paiement frais de scolarité",
  "customer_email": "customer@example.com",
  "customer_name": "John Doe",
  "metadata": {
    "invoice_id": "inv-123"
  },
  "return_url": "https://app.eduzen.com/payments/success",
  "cancel_url": "https://app.eduzen.com/payments/cancel"
}
```

**Réponse :**
```json
{
  "paymentIntentId": "pi_1234567890",
  "clientSecret": "pi_1234567890_secret_...",
  "status": "requires_payment_method",
  "paymentId": "payment-123"
}
```

---

### `GET /api/payments/stripe/status/[paymentIntentId]`

Récupère le statut d'un paiement Stripe.

**Réponse :**
```json
{
  "status": "succeeded",
  "amount": 10000,
  "currency": "EUR",
  "paymentId": "payment-123"
}
```

---

## 📄 Documents

### `POST /api/documents/generate`

Génère un document à partir d'un template.

**Rate Limiting :** `mutationRateLimiter` (50 req/min)

**Body :**
```json
{
  "template_id": "template-123",
  "format": "pdf",
  "variables": {
    "student_name": "Jane Doe",
    "amount": "10000 XOF"
  },
  "send_email": false,
  "email_to": null
}
```

**Réponse :**
```json
{
  "success": true,
  "document_id": "doc-123",
  "file_url": "https://storage.supabase.co/...",
  "format": "pdf"
}
```

---

### `POST /api/resources/upload`

Upload une ressource éducative.

**Rate Limiting :** `uploadRateLimiter` (10 req/min)

**Body (FormData) :**
- `file` (File) - Fichier à uploader
- `organization_id` (string) - ID de l'organisation
- `title` (string) - Titre de la ressource
- `description` (string, optionnel) - Description
- `resource_type` (string) - Type de ressource
- `category_id` (string, optionnel) - ID de la catégorie
- `tags` (string, optionnel) - Tags séparés par virgules

**Réponse :**
```json
{
  "success": true,
  "resource": {
    "id": "resource-123",
    "title": "Cours de Mathématiques",
    "file_url": "https://storage.supabase.co/..."
  },
  "fileUrl": "https://storage.supabase.co/..."
}
```

---

## 📱 Mobile Money

### `POST /api/mobile-money/initiate`

Initie un paiement Mobile Money.

**Rate Limiting :** `mutationRateLimiter` (50 req/min)

**Body :**
```json
{
  "provider": "mtn",
  "amount": 10000,
  "currency": "XOF",
  "phone_number": "+221771234567",
  "description": "Paiement frais de scolarité",
  "invoice_id": "inv-123"
}
```

**Réponse :**
```json
{
  "success": true,
  "transaction_id": "txn-123",
  "status": "pending",
  "message": "Transaction initiée avec succès"
}
```

**Exemple d'utilisation :**
```bash
curl -X POST https://app.eduzen.com/api/mobile-money/initiate \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "mtn",
    "amount": 10000,
    "currency": "XOF",
    "phone_number": "+221771234567",
    "description": "Paiement frais de scolarité"
  }'
```

---

### `GET /api/mobile-money/status/[transactionId]`

Récupère le statut d'une transaction Mobile Money.

**Rate Limiting :** `generalRateLimiter` (100 req/min)

**Réponse :**
```json
{
  "transaction_id": "txn-123",
  "status": "completed",
  "amount": 10000,
  "currency": "XOF",
  "provider": "mtn"
}
```

**Exemple d'utilisation :**
```bash
curl -X GET https://app.eduzen.com/api/mobile-money/status/txn-123 \
  -H "Cookie: sb-access-token=..."
```

---

### `POST /api/mobile-money/webhook`

Webhook pour recevoir les notifications des opérateurs Mobile Money.

**Rate Limiting :** `generalRateLimiter` (100 req/min)

**Body :**
```json
{
  "transaction_id": "txn-123",
  "status": "successful",
  "amount": 10000,
  "currency": "XOF",
  "phone_number": "+221771234567"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Webhook traité avec succès"
}
```

---

## 💶 SEPA (Single Euro Payments Area)

### `POST /api/payments/sepa/create-direct-debit`

Crée un prélèvement SEPA.

**Rate Limiting :** `mutationRateLimiter` (50 req/min)

**Body :**
```json
{
  "amount": 10000,
  "currency": "EUR",
  "description": "Paiement frais de scolarité",
  "debtor_name": "John Doe",
  "debtor_iban": "FR1420041010050500013M02606",
  "debtor_bic": "AABAFR22",
  "reference": "REF-123456",
  "due_date": "2024-12-15",
  "mandate_id": "MANDATE-123",
  "creditor_name": "EDUZEN",
  "creditor_iban": "FR1420041010050500013M02607",
  "creditor_id": "CRED-123"
}
```

**Réponse :**
```json
{
  "paymentId": "payment-123",
  "status": "pending",
  "iban": "FR1420041010050500013M02607",
  "reference": "REF-123456",
  "dueDate": "2024-12-15"
}
```

**Exemple d'utilisation :**
```bash
curl -X POST https://app.eduzen.com/api/payments/sepa/create-direct-debit \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "EUR",
    "debtor_iban": "FR1420041010050500013M02606",
    "mandate_id": "MANDATE-123",
    "creditor_id": "CRED-123"
  }'
```

---

### `GET /api/payments/sepa/status/[paymentId]`

Récupère le statut d'un paiement SEPA.

**Rate Limiting :** `generalRateLimiter` (100 req/min)

**Réponse :**
```json
{
  "paymentId": "payment-123",
  "status": "completed",
  "amount": 10000,
  "currency": "EUR",
  "reference": "REF-123456"
}
```

---

### `POST /api/payments/sepa/create-transfer`

Crée un virement SEPA.

**Rate Limiting :** `mutationRateLimiter` (50 req/min)

**Body :**
```json
{
  "amount": 10000,
  "currency": "EUR",
  "description": "Virement frais de scolarité",
  "debtor_name": "EDUZEN",
  "debtor_iban": "FR1420041010050500013M02607",
  "debtor_bic": "AABAFR22",
  "creditor_name": "John Doe",
  "creditor_iban": "FR1420041010050500013M02606",
  "creditor_bic": "AABAFR22",
  "reference": "REF-123456"
}
```

**Réponse :**
```json
{
  "paymentId": "payment-123",
  "status": "pending",
  "reference": "REF-123456"
}
```

---

## ✅ Compliance

### `POST /api/compliance/alerts/check`

Vérifie les alertes de conformité.

**Rate Limiting :** `generalRateLimiter` (100 req/min)

**Body :**
```json
{
  "organization_id": "org-123",
  "check_type": "gdpr"
}
```

**Réponse :**
```json
{
  "alerts": [
    {
      "id": "alert-123",
      "type": "gdpr",
      "severity": "high",
      "message": "Données personnelles non chiffrées",
      "created_at": "2024-12-03T10:00:00Z"
    }
  ]
}
```

---

### `GET /api/compliance/alerts/critical-risks`

Récupère les risques critiques de conformité.

**Réponse :**
```json
{
  "risks": [
    {
      "id": "risk-123",
      "type": "data_breach",
      "severity": "critical",
      "description": "Accès non autorisé détecté",
      "created_at": "2024-12-03T10:00:00Z"
    }
  ]
}
```

---

## 🚦 Rate Limiting

L'API applique un rate limiting pour protéger contre les abus :

### Types de Rate Limiters

1. **`authRateLimiter`** - Authentification
   - Limite : 5 requêtes / 15 minutes
   - Routes : `/api/2fa/*`, `/api/auth/*`

2. **`mutationRateLimiter`** - Mutations
   - Limite : 50 requêtes / minute
   - Routes : `/api/*/create`, `/api/*/update`, `/api/*/delete`

3. **`uploadRateLimiter`** - Uploads
   - Limite : 10 requêtes / minute
   - Routes : `/api/*/upload`, `/api/resources/upload`

4. **`generalRateLimiter`** - Général
   - Limite : 100 requêtes / minute
   - Routes : Autres routes API

### Headers de Réponse

Quand une limite est atteinte, la réponse inclut :

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-12-03T10:15:00Z
Retry-After: 900
```

**Réponse :**
```json
{
  "error": "Too many requests",
  "message": "Vous avez dépassé la limite de requêtes. Veuillez réessayer plus tard."
}
```

---

## ❌ Codes d'Erreur

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
  "error": "Message d'erreur",
  "code": "ERROR_CODE",
  "details": {
    "field": "email",
    "message": "Email invalide"
  }
}
```

### Codes d'Erreur Personnalisés

- `VALIDATION_ERROR` - Erreur de validation
- `NOT_FOUND` - Ressource non trouvée
- `PERMISSION_DENIED` - Permission refusée
- `RATE_LIMIT_EXCEEDED` - Limite de requêtes dépassée
- `DATABASE_ERROR` - Erreur base de données
- `EXTERNAL_SERVICE_ERROR` - Erreur service externe

---

## 📅 Sessions

### `GET /api/sessions/active`

Récupère les sessions actives de l'utilisateur.

**Rate Limiting :** `generalRateLimiter` (100 req/min)

**Réponse :**
```json
{
  "sessions": [
    {
      "id": "session-123",
      "title": "Cours de Mathématiques",
      "start_time": "2024-12-03T10:00:00Z",
      "end_time": "2024-12-03T11:30:00Z",
      "status": "active"
    }
  ]
}
```

---

### `POST /api/sessions/timeout-rules`

Configure les règles de timeout pour les sessions.

**Rate Limiting :** `mutationRateLimiter` (50 req/min)

**Body :**
```json
{
  "organization_id": "org-123",
  "idle_timeout_minutes": 30,
  "absolute_timeout_minutes": 480,
  "warning_before_timeout_minutes": 5
}
```

**Réponse :**
```json
{
  "success": true,
  "timeout_rules": {
    "idle_timeout_minutes": 30,
    "absolute_timeout_minutes": 480
  }
}
```

---

### `POST /api/sessions/revoke`

Révoque une session active.

**Rate Limiting :** `mutationRateLimiter` (50 req/min)

**Body :**
```json
{
  "session_id": "session-123"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Session révoquée avec succès"
}
```

---

## 📚 Programmes

Les routes pour les programmes sont gérées via l'interface web. Les API routes seront ajoutées dans une version future.

---

## 📱 QR Attendance

### `POST /api/qr-attendance/generate`

Génère un QR code pour une session.

**Rate Limiting :** `mutationRateLimiter` (50 req/min)

**Body :**
```json
{
  "session_id": "session-123",
  "duration_minutes": 15,
  "max_scans": 100,
  "require_location": false,
  "allowed_radius_meters": 50
}
```

**Réponse :**
```json
{
  "success": true,
  "qr_code": {
    "id": "qr-123",
    "qr_code_data": "QR-CODE-DATA",
    "expires_at": "2024-12-03T10:15:00Z"
  },
  "qr_code_image": "data:image/png;base64,..."
}
```

---

### `GET /api/qr-attendance/active/[sessionId]`

Récupère le QR code actif d'une session.

**Rate Limiting :** `generalRateLimiter` (100 req/min)

**Réponse :**
```json
{
  "success": true,
  "qr_code": {
    "id": "qr-123",
    "qr_code_data": "QR-CODE-DATA",
    "expires_at": "2024-12-03T10:15:00Z"
  },
  "qr_code_image": "data:image/png;base64,..."
}
```

---

### `POST /api/qr-attendance/scan`

Scanne un QR code pour marquer la présence.

**Rate Limiting :** `mutationRateLimiter` (50 req/min)

**Body :**
```json
{
  "qr_code": "QR-CODE-DATA",
  "student_id": "student-123",
  "latitude": 14.7167,
  "longitude": -17.4677
}
```

**Réponse :**
```json
{
  "success": true,
  "attendance_id": "attendance-123",
  "message": "Présence enregistrée avec succès"
}
```

---

### `POST /api/qr-attendance/deactivate/[qrCodeId]`

Désactive un QR code.

**Rate Limiting :** `mutationRateLimiter` (50 req/min)

**Réponse :**
```json
{
  "success": true
}
```

---

## 📚 Programmes

> **Note :** Les routes API pour les programmes seront disponibles dans une version future. Pour l'instant, utilisez l'interface web.

Les programmes permettent d'organiser les formations par catégories. Un programme peut contenir plusieurs formations.

**Structure :**
- Programme → Formations → Sessions

**Exemple :**
- Programme : "Formation Continue"
  - Formation : "Excel Avancé"
    - Session : "Session Hiver 2024"

---

## 🎓 Formations

> **Note :** Les routes API pour les formations seront disponibles dans une version future. Pour l'instant, utilisez l'interface web.

Les formations représentent un cours ou un module d'enseignement. Une formation appartient à un programme et peut contenir plusieurs sessions.

**Caractéristiques :**
- Appartient à un programme
- Contient plusieurs sessions
- A un statut (draft, published, archived)
- A un prix et une durée

---

## 📝 Évaluations

> **Note :** Les routes API pour les évaluations seront disponibles dans une version future. Pour l'instant, utilisez l'interface web.

Les évaluations permettent de noter et d'évaluer les étudiants sur leurs compétences.

**Types d'évaluations :**
- Contrôle continu
- Examen final
- Projet
- Oral

**Caractéristiques :**
- Associée à une session
- Peut avoir plusieurs questions
- Permet de noter les étudiants
- Génère des statistiques

---

## 📝 Notes Importantes

1. **Authentification :** Toutes les routes nécessitent une session valide (sauf routes publiques)
2. **Rate Limiting :** Respecter les limites pour éviter les erreurs 429
3. **Validation :** Tous les champs requis doivent être fournis
4. **Pagination :** Utiliser `page` et `pageSize` pour les listes
5. **Filtres :** Les filtres sont optionnels mais recommandés pour les performances
6. **Webhooks :** Configurer les webhooks pour recevoir les notifications en temps réel

---

## 🔗 Liens Utiles

- [Guide d'Intégration](./GUIDE_INTEGRATION_API.md)
- [Exemples d'Utilisation](./API_EXAMPLES.md)
- [Schéma OpenAPI](./API_OPENAPI_SCHEMA.yaml)
- [Collection Postman](./EDUZEN_API.postman_collection.json)
- [Guide de Rate Limiting](./GUIDE_RATE_LIMITING_API.md)
- [Guide de Test Performance](./GUIDE_TEST_PERFORMANCE_DEVTOOLS.md)
- [Documentation Services](../README.md)

---

**Dernière mise à jour :** 2024-12-03---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.