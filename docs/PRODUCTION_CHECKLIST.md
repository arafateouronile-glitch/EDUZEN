# Checklist pré-déploiement production

À vérifier avant chaque déploiement en production (ou une fois en place pour le premier lancement).

## 1. Webhook Stripe — un seul endpoint

- [ ] Dans le [dashboard Stripe](https://dashboard.stripe.com/webhooks) : **un seul** endpoint actif.
- [ ] URL recommandée : `https://votre-domaine.com/api/webhooks/stripe`
- [ ] Ne pas activer `/api/subscriptions/webhook` pour éviter le double traitement.
- Voir [STRIPE_WEBHOOKS.md](./STRIPE_WEBHOOKS.md).

## 2. Variables d'environnement (production)

### Obligatoires

| Variable | Rôle |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase (côté client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service (API, webhooks, cron) — **ne pas exposer côté client** |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | Signing secret de l’endpoint webhook configuré |

### Recommandées pour la prod

| Variable | Rôle |
|----------|------|
| `SCHEDULED_GENERATION_SECRET_KEY` | Clé pour `POST /api/documents/scheduled/execute` (cron) |
| `GOTENBERG_URL` | URL de l’instance Gotenberg (génération PDF) |
| `UPSTASH_REDIS_REST_URL` | Rate limiting distribué (évite bypass en serverless) |
| `UPSTASH_REDIS_REST_TOKEN` | Token Upstash Redis |
| `RESEND_API_KEY` | Envoi d’emails (Resend) |

### Optionnelles

| Variable | Rôle |
|----------|------|
| `NEXT_PUBLIC_SENTRY_DSN` | Monitoring erreurs (Sentry) |
| `ALLOWED_ORIGINS` | Origines CORS autorisées (séparées par des virgules) |

## 3. Health check

- [ ] Tester en prod : `GET https://votre-domaine.com/api/health`
- [ ] Réponse attendue : `200` avec `{ "status": "ok", "supabase": "ok", ... }`
- À utiliser pour un monitoring uptime (UptimeRobot, Better Uptime, etc.).

## 4. Sécurité

- [ ] Aucune clé secrète (service role, Stripe secret, etc.) dans le code ou le front.
- [ ] `SCHEDULED_GENERATION_SECRET_KEY` défini et utilisé par le cron uniquement.
- [ ] Rate limiting : en prod, configurer Upstash (Redis) pour un rate limit fiable.

## 5. CI/CD

- Les workflows GitHub Actions (`.github/workflows/`) exécutent sur chaque PR :
  - Lint, type-check, tests, build, sécurité.
- Vérifier que les secrets nécessaires au build (ex. Supabase URL/anon key) sont renseignés dans les secrets du dépôt si le build en a besoin.

---

*Dernière mise à jour : après audit sécurité et quick wins.*
