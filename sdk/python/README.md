---
title: EDUZEN API SDK - Python
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# EDUZEN API SDK - Python

SDK officiel pour l'API EDUZEN en Python.

## Installation

```bash
pip install eduzen-sdk
```

## Utilisation

### Configuration

```python
from eduzen import EDUZENClient

# Avec API Key
client = EDUZENClient(
    base_url="https://app.eduzen.com/api",
    api_key="your-api-key"
)

# Avec Access Token
client = EDUZENClient(
    base_url="https://app.eduzen.com/api",
    access_token="your-access-token"
)
```

### Exemples

#### Créer un utilisateur

```python
try:
    response = client.create_user(
        email="teacher@example.com",
        full_name="Jane Smith",
        organization_id="org-123",
        role="teacher",
        password="SecurePassword123!"
    )
    print("Utilisateur créé:", response)
except EDUZENAPIError as e:
    print(f"Erreur API: {e.message} ({e.code})")
except EDUZENNetworkError as e:
    print(f"Erreur réseau: {e.message}")
```

#### Récupérer les étudiants

```python
response = client.get_students(
    organization_id="org-123",
    page=1,
    limit=10,
    search="Doe"
)

print("Étudiants:", response.get("data", []))
print("Pagination:", response.get("pagination"))
```

#### Créer un paiement Stripe

```python
response = client.create_stripe_intent(
    amount=10000,
    currency="EUR",
    customer_email="parent@example.com",
    description="Paiement frais de scolarité"
)

print("Payment Intent:", response.get("paymentIntentId"))
print("Client Secret:", response.get("clientSecret"))
```

#### Générer un document

```python
response = client.generate_document(
    template_id="template-123",
    format="pdf",
    variables={
        "student_name": "Jane Doe",
        "amount": "10000 XOF",
        "date": "2024-12-03"
    },
    send_email=True,
    email_to="parent@example.com"
)

print("Document généré:", response.get("file_url"))
```

## Documentation

Pour plus d'informations, consultez la [documentation complète de l'API](https://docs.eduzen.com/api).

## Support

- Email: support@eduzen.com
- Documentation: https://docs.eduzen.com---

**Document EDUZEN** | [Retour à la documentation principale](../../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.