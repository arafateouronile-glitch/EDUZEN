# Webhooks Stripe — Configuration

## Un seul endpoint en production

L'application expose deux routes capables de traiter des événements Stripe :

| Route | Rôle |
|-------|------|
| **`/api/webhooks/stripe`** | Souscriptions + commissions affiliées + email fin d'essai |
| `/api/subscriptions/webhook` | Souscriptions + email fin d'essai (sous-ensemble) |

**Recommandation :** configurer **uniquement** `/api/webhooks/stripe` dans le dashboard Stripe (Settings → Webhooks → Add endpoint). Ne pas ajouter `/api/subscriptions/webhook` pour éviter le double traitement des mêmes événements (ex. `customer.subscription.updated` traité deux fois).

## Variables requises

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (signing secret de l’endpoint configuré)

## Idempotence

Les commissions affiliées sont idempotentes : contrainte `UNIQUE(stripe_invoice_id)` en base. En cas de retry Stripe, une erreur 23505 est ignorée et la réponse reste 200.
