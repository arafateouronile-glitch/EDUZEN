# Politique de Sécurité — EDUZEN

## Versions supportées

| Version | Support sécurité |
| ------- | ---------------- |
| latest (main) | ✅ Oui |
| anciennes branches | ❌ Non |

## Signaler une vulnérabilité

**Ne pas ouvrir de GitHub Issue publique pour les vulnérabilités de sécurité.**

### Canal privilégié

Envoyez un email à **security@yourdomain.com** avec :

- Description de la vulnérabilité
- Étapes pour la reproduire
- Impact potentiel (données exposées, comptes compromis, etc.)
- Votre nom / pseudo (pour les remerciements, si souhaité)

### Ce que vous pouvez attendre

| Délai | Action |
|-------|--------|
| 48h | Accusé de réception |
| 7 jours | Évaluation initiale + sévérité |
| 30 jours | Correction déployée (selon complexité) |
| 90 jours | Divulgation publique coordonnée |

Nous nous engageons à **ne pas poursuivre** les chercheurs qui signalent de bonne foi dans le respect de cette politique.

## Périmètre

### Dans le périmètre
- Application web `app.eduzen.fr`
- API publique `app.eduzen.fr/api/v1/*`
- Portail de signature `app.eduzen.fr/sign/*`
- Portail apprenant

### Hors périmètre
- Infrastructure tierce (Supabase, Vercel, Stripe, Resend)
- Attaques nécessitant un accès physique à la machine
- Attaques de type DoS/DDoS volumétrique
- Spam ou ingénierie sociale
- Résultats de scanners automatiques non vérifiés

## Pratiques de sécurité internes

- Authentification SSR via Supabase avec RLS (Row Level Security)
- Protection CSRF par double submit cookie
- CSP avec nonces par requête
- Rate limiting distribué (Upstash Redis) avec fallback en-mémoire
- Sanitization HTML via DOMPurify (client) et `xss` (serveur)
- Tokens secrets comparés via `timingSafeEqual`
- Headers de sécurité : HSTS, X-Frame-Options, Permissions-Policy
- Audit de dépendances npm en CI/CD

## Remerciements

Nous remercions les chercheurs qui ont contribué à améliorer la sécurité d'EDUZEN de manière responsable.
