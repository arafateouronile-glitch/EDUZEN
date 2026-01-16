---
title: Exemples dUtilisation de lAPI EDUZEN
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 📖 Exemples d'Utilisation de l'API EDUZEN

**Date de mise à jour :** 2024-12-03

---

## 🔐 Authentification

### Obtenir un token de session

```bash
# Connexion via l'interface web
# Le token est automatiquement stocké dans les cookies
```

---

## 🔒 2FA

### Activer la 2FA

```bash
# 1. Générer le secret et QR code
curl -X POST https://app.eduzen.com/api/2fa/generate-secret \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json"

# Réponse :
# {
#   "secret": "JBSWY3DPEHPK3PXP",
#   "qrCodeUrl": "data:image/png;base64,...",
#   "backupCodes": ["A1B2C3D4", "E5F6G7H8", ...]
# }

# 2. Scanner le QR code avec une app d'authentification (Google Authenticator, Authy)
# 3. Vérifier l'activation avec le code généré
curl -X POST https://app.eduzen.com/api/2fa/verify-activation \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

### Vérifier un code 2FA lors de la connexion

```bash
curl -X POST https://app.eduzen.com/api/2fa/verify \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'

# Réponse :
# {
#   "success": true,
#   "isBackupCode": false,
#   "sessionToken": "abc123..."
# }
```

---

## 👥 Utilisateurs

### Créer un utilisateur

```bash
curl -X POST https://app.eduzen.com/api/users/create \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "full_name": "Jane Smith",
    "phone": "+221771234567",
    "organization_id": "org-123",
    "password": "SecurePassword123!",
    "role": "teacher",
    "is_active": true,
    "send_invitation": false
  }'
```

### Créer un utilisateur avec invitation

```bash
curl -X POST https://app.eduzen.com/api/users/create \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "full_name": "Jane Smith",
    "organization_id": "org-123",
    "role": "teacher",
    "send_invitation": true
  }'
```

---

## 🎓 Étudiants

### Récupérer la liste des étudiants

```bash
curl -X GET "https://app.eduzen.com/api/v1/students?organization_id=org-123&page=1&limit=10" \
  -H "Cookie: sb-access-token=..." \
  -H "X-API-Key: your-api-key"
```

### Rechercher des étudiants

```bash
curl -X GET "https://app.eduzen.com/api/v1/students?organization_id=org-123&search=Doe&page=1&limit=10" \
  -H "Cookie: sb-access-token=..." \
  -H "X-API-Key: your-api-key"
```

### Filtrer par classe

```bash
curl -X GET "https://app.eduzen.com/api/v1/students?organization_id=org-123&class_id=class-123&page=1&limit=10" \
  -H "Cookie: sb-access-token=..." \
  -H "X-API-Key: your-api-key"
```

---

## 💳 Paiements

### Créer un paiement Stripe

```bash
curl -X POST https://app.eduzen.com/api/payments/stripe/create-intent \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "EUR",
    "description": "Paiement frais de scolarité",
    "customer_email": "parent@example.com",
    "customer_name": "John Doe",
    "metadata": {
      "invoice_id": "inv-123"
    },
    "return_url": "https://app.eduzen.com/payments/success",
    "cancel_url": "https://app.eduzen.com/payments/cancel"
  }'
```

### Vérifier le statut d'un paiement Stripe

```bash
curl -X GET https://app.eduzen.com/api/payments/stripe/status/pi_1234567890 \
  -H "Cookie: sb-access-token=..."
```

---

## 📄 Documents

### Générer un document PDF

```bash
curl -X POST https://app.eduzen.com/api/documents/generate \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "template-123",
    "format": "pdf",
    "variables": {
      "student_name": "Jane Doe",
      "amount": "10000 XOF",
      "date": "2024-12-03"
    },
    "send_email": false
  }'
```

### Générer et envoyer par email

```bash
curl -X POST https://app.eduzen.com/api/documents/generate \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "template-123",
    "format": "pdf",
    "variables": {
      "student_name": "Jane Doe"
    },
    "send_email": true,
    "email_to": "parent@example.com"
  }'
```

---

## 📱 Mobile Money

### Initier un paiement MTN

```bash
curl -X POST https://app.eduzen.com/api/mobile-money/initiate \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "mtn",
    "amount": 10000,
    "currency": "XOF",
    "phone_number": "+221771234567",
    "description": "Paiement frais de scolarité",
    "invoice_id": "inv-123"
  }'
```

### Vérifier le statut

```bash
curl -X GET https://app.eduzen.com/api/mobile-money/status/txn-123 \
  -H "Cookie: sb-access-token=..."
```

---

## 💶 SEPA

### Créer un prélèvement SEPA

```bash
curl -X POST https://app.eduzen.com/api/payments/sepa/create-direct-debit \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

### Créer un virement SEPA

```bash
curl -X POST https://app.eduzen.com/api/payments/sepa/create-transfer \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "EUR",
    "description": "Virement frais de scolarité",
    "debtor_name": "EDUZEN",
    "debtor_iban": "FR1420041010050500013M02607",
    "creditor_name": "John Doe",
    "creditor_iban": "FR1420041010050500013M02606",
    "reference": "REF-123456"
  }'
```

---

## ✅ Compliance

### Vérifier les alertes de conformité

```bash
curl -X POST https://app.eduzen.com/api/compliance/alerts/check \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json"
```

### Récupérer les risques critiques

```bash
curl -X GET https://app.eduzen.com/api/compliance/alerts/critical-risks \
  -H "Cookie: sb-access-token=..."
```

### Générer un rapport de conformité

```bash
curl -X POST https://app.eduzen.com/api/compliance/reports/generate \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "org-123",
    "report_type": "annual",
    "format": "pdf"
  }'
```

---

## 🚦 Gestion des Erreurs

### Exemple d'erreur de validation

```json
{
  "error": "Validation error",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "message": "Email invalide"
  }
}
```

### Exemple d'erreur de rate limit

```json
{
  "error": "Too many requests",
  "message": "Vous avez dépassé la limite de requêtes. Veuillez réessayer plus tard."
}
```

**Headers de réponse :**
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-12-03T10:15:00Z
Retry-After: 900
```

---

## 💡 Conseils

1. **Toujours vérifier les headers de rate limit** pour éviter les erreurs 429
2. **Utiliser la pagination** pour les listes longues
3. **Gérer les erreurs** avec des try/catch appropriés
4. **Valider les données** avant d'envoyer les requêtes
5. **Utiliser les filtres** pour améliorer les performances

---

**Pour plus d'informations, consultez :** [Documentation API complète](./API_DOCUMENTATION.md)---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.