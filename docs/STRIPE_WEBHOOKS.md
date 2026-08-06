# Webhooks Stripe — Configuration

## Un seul endpoint en production

L'application expose deux routes capables de traiter des événements Stripe :

| Route | Rôle |
|-------|------|
| **`/api/webhooks/stripe`** | Souscriptions + commissions affiliées + email fin d'essai |
| `/api/subscriptions/webhook` | Souscriptions + email fin d'essai + `checkout.session.completed` |

`/api/subscriptions/webhook` gère en plus `checkout.session.completed`, que `/api/webhooks/stripe` ne gère pas — mais ce n'est **pas nécessaire** : `app/api/subscriptions/create-checkout/route.ts` pré-crée déjà la ligne `subscriptions` (statut `incomplete`, `stripe_customer_id` rempli) avant la redirection vers Stripe Checkout, ce qui permet à `/api/webhooks/stripe` de retrouver l'organisation dès `customer.subscription.created`. `/api/subscriptions/webhook` est donc bien un endpoint **legacy, à ne plus utiliser**.

**Recommandation :** configurer **uniquement** `/api/webhooks/stripe` dans le dashboard Stripe (Settings → Webhooks → Add endpoint). Vérifier qu'`/api/subscriptions/webhook` n'est **pas** enregistré comme endpoint séparé — s'il l'est, le supprimer pour éviter le double traitement des mêmes événements (ex. `customer.subscription.updated` traité deux fois). Un log d'avertissement a été ajouté à cette route pour détecter si elle reçoit encore du trafic en production.

## Variables requises

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (signing secret de l’endpoint configuré)

## Idempotence

Les commissions affiliées sont idempotentes : contrainte `UNIQUE(stripe_invoice_id)` en base. En cas de retry Stripe, une erreur 23505 est ignorée et la réponse reste 200.
