# Guide de Configuration WAF - EDUZEN

Ce document fournit les recommandations pour configurer un Web Application Firewall (WAF) pour protéger l'application EDUZEN.

## Table des Matières

1. [Vercel Firewall (Recommandé)](#1-vercel-firewall-recommandé)
2. [Cloudflare WAF](#2-cloudflare-waf)
3. [AWS WAF](#3-aws-waf)
4. [Règles Personnalisées](#4-règles-personnalisées)
5. [Monitoring et Alertes](#5-monitoring-et-alertes)

---

## 1. Vercel Firewall (Recommandé)

Puisque EDUZEN est déployé sur Vercel, la solution la plus simple est d'utiliser Vercel Firewall.

### 1.1 Activation

```bash
# Via Vercel Dashboard
# Project Settings → Security → Firewall

# Ou via vercel.json
```

### 1.2 Configuration vercel.json

```json
{
  "firewall": {
    "rules": [
      {
        "name": "Block Suspicious Countries",
        "action": "deny",
        "condition": {
          "geoCountry": ["KP", "IR", "SY"]
        }
      },
      {
        "name": "Rate Limit API",
        "action": "rateLimit",
        "condition": {
          "path": "/api/*"
        },
        "rateLimit": {
          "limit": 100,
          "window": "1m"
        }
      },
      {
        "name": "Block SQL Injection",
        "action": "deny",
        "condition": {
          "path": "/api/*",
          "query": {
            "pattern": "(union|select|insert|update|delete|drop|truncate|alter|exec|execute|xp_|sp_|0x)"
          }
        }
      }
    ]
  }
}
```

### 1.3 Protection DDoS

Vercel inclut une protection DDoS automatique :
- ✅ Rate limiting global
- ✅ Détection de patterns malveillants
- ✅ Blocage géographique disponible
- ✅ Challenge automatique pour trafic suspect

---

## 2. Cloudflare WAF

Si vous utilisez Cloudflare en plus de Vercel (recommandé pour une protection supplémentaire).

### 2.1 Configuration DNS

```
# Configurer Cloudflare comme proxy
# DNS → Type: CNAME
# Name: @
# Target: cname.vercel-dns.com
# Proxy status: Proxied (orange cloud)
```

### 2.2 Règles WAF Recommandées

#### Managed Rulesets

```yaml
# Activer dans Security → WAF → Managed rules

OWASP Core Ruleset:
  - Enabled: true
  - Sensitivity: Medium
  - Action: Block

Cloudflare Managed Ruleset:
  - Enabled: true
  - Includes:
    - XSS Protection
    - SQL Injection Protection
    - RCE Protection
    - File Inclusion Protection
```

#### Custom Rules

```javascript
// Rule 1: Block Bad Bots
(cf.client.bot) and not (cf.verified_bot_category in {"search_engine" "monitoring"})
Action: Block

// Rule 2: Block Known Attack Patterns
(http.request.uri.query contains "union" and http.request.uri.query contains "select") or
(http.request.uri.query contains "<script") or
(http.request.uri.query contains "javascript:")
Action: Block

// Rule 3: Rate Limit Login
(http.request.uri.path eq "/api/auth/login") or
(http.request.uri.path eq "/api/2fa/verify-login")
Action: Rate Limit (5 requests per 10 seconds)

// Rule 4: Protect Admin Routes
(http.request.uri.path contains "/dashboard/settings") and
(not cf.threat_score lt 10)
Action: Managed Challenge

// Rule 5: Block Suspicious User Agents
(http.user_agent contains "sqlmap") or
(http.user_agent contains "nikto") or
(http.user_agent contains "nessus") or
(http.user_agent contains "nmap")
Action: Block
```

### 2.3 Page Rules

```yaml
# Cache static assets
*.eduzen.com/icons/*:
  Cache Level: Cache Everything
  Edge Cache TTL: 1 month

# Bypass cache for API
*.eduzen.com/api/*:
  Cache Level: Bypass
  Security Level: High

# Force HTTPS
*.eduzen.com/*:
  Always Use HTTPS: On
  SSL: Full (Strict)
```

### 2.4 Rate Limiting

```yaml
# Rate Limiting Rules (Security → Rate Limiting)

Rule 1 - Global API Rate Limit:
  - If: URI path contains "/api/"
  - Then: Rate limit with 100 requests per minute
  - Action: Block for 1 minute

Rule 2 - Auth Endpoint Protection:
  - If: URI path equals "/api/auth/login"
  - Then: Rate limit with 5 requests per minute
  - Action: Block for 15 minutes

Rule 3 - 2FA Brute Force Protection:
  - If: URI path equals "/api/2fa/verify-login"
  - Then: Rate limit with 3 requests per minute
  - Action: Block for 30 minutes
```

---

## 3. AWS WAF

Si vous migrez vers AWS ou utilisez une architecture hybride.

### 3.1 Web ACL Configuration

```json
{
  "Name": "EDUZEN-WAF",
  "DefaultAction": {
    "Allow": {}
  },
  "Rules": [
    {
      "Name": "AWSManagedRulesCommonRuleSet",
      "Priority": 1,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "Action": {
        "Block": {}
      }
    },
    {
      "Name": "AWSManagedRulesSQLiRuleSet",
      "Priority": 2,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesSQLiRuleSet"
        }
      },
      "Action": {
        "Block": {}
      }
    },
    {
      "Name": "AWSManagedRulesKnownBadInputsRuleSet",
      "Priority": 3,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesKnownBadInputsRuleSet"
        }
      },
      "Action": {
        "Block": {}
      }
    }
  ]
}
```

### 3.2 Custom Rules AWS

```json
{
  "Name": "BlockSQLInjection",
  "Priority": 10,
  "Statement": {
    "SqliMatchStatement": {
      "FieldToMatch": {
        "QueryString": {}
      },
      "TextTransformations": [
        {
          "Priority": 0,
          "Type": "URL_DECODE"
        },
        {
          "Priority": 1,
          "Type": "LOWERCASE"
        }
      ]
    }
  },
  "Action": {
    "Block": {}
  }
}
```

---

## 4. Règles Personnalisées

### 4.1 Patterns à Bloquer

```regex
# SQL Injection Patterns
(union\s+select|select\s+\*|insert\s+into|delete\s+from|drop\s+table|truncate\s+table)

# XSS Patterns
(<script|javascript:|on\w+\s*=|<img[^>]+onerror)

# Path Traversal
(\.\./|\.\.\\|%2e%2e%2f|%252e%252e%252f)

# Command Injection
(;|\||`|\$\(|&&)

# LDAP Injection
(\*\)|\)\(|\(|\)|\\)

# XML/XXE
(<!ENTITY|<!DOCTYPE|SYSTEM|PUBLIC)
```

### 4.2 Headers à Vérifier

```yaml
# Bloquer si ces headers sont suspects
User-Agent:
  - Block if empty
  - Block if contains: sqlmap, nikto, nessus, nmap, dirbuster

Referer:
  - Block if contains suspicious domains

Content-Type:
  - Only allow: application/json, multipart/form-data, application/x-www-form-urlencoded
  - For API routes
```

### 4.3 Géoblocage Recommandé

```yaml
# Pays à bloquer (à adapter selon votre audience)
High-Risk Countries (optionnel):
  - KP (Corée du Nord)
  - IR (Iran)
  - SY (Syrie)
  - CU (Cuba)

# Si votre audience est uniquement francophone africaine:
Allow Only:
  - FR (France)
  - SN (Sénégal)
  - CI (Côte d'Ivoire)
  - ML (Mali)
  - BF (Burkina Faso)
  - NE (Niger)
  - TG (Togo)
  - BJ (Bénin)
  - GN (Guinée)
  - CM (Cameroun)
  - GA (Gabon)
  - CG (Congo)
  - CD (RDC)
  - MG (Madagascar)
  - MA (Maroc)
  - TN (Tunisie)
  - DZ (Algérie)
```

---

## 5. Monitoring et Alertes

### 5.1 Métriques à Surveiller

```yaml
Critical Metrics:
  - Request rate (per second)
  - Blocked requests count
  - 4xx/5xx error rates
  - Unique IPs per minute
  - Login failure rate

Alerting Thresholds:
  - Request rate > 1000/s → Alert
  - Blocked requests > 100/min → Alert
  - Error rate > 5% → Alert
  - Login failures > 50/min → Alert (possible brute force)
```

### 5.2 Configuration Sentry

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Alertes de sécurité
  beforeSend(event) {
    // Détecter les patterns d'attaque
    if (event.request?.query_string) {
      const suspicious = [
        'union', 'select', '<script', 'javascript:'
      ]
      if (suspicious.some(p =>
        event.request!.query_string!.toLowerCase().includes(p)
      )) {
        event.tags = {
          ...event.tags,
          security_alert: 'potential_injection'
        }
        event.level = 'warning'
      }
    }
    return event
  }
})
```

### 5.3 Webhook d'Alerte

```typescript
// lib/utils/security-alerts.ts
export async function sendSecurityAlert(alert: {
  type: 'brute_force' | 'injection_attempt' | 'rate_limit_exceeded'
  ip: string
  path: string
  details: string
}) {
  // Envoyer vers Slack/Discord/Email
  await fetch(process.env.SECURITY_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `🚨 Security Alert: ${alert.type}`,
      attachments: [{
        color: 'danger',
        fields: [
          { title: 'IP', value: alert.ip, short: true },
          { title: 'Path', value: alert.path, short: true },
          { title: 'Details', value: alert.details },
        ]
      }]
    })
  })
}
```

---

## 6. Checklist de Déploiement WAF

### Avant le Déploiement

- [ ] Tester les règles en mode "Log only" pendant 1 semaine
- [ ] Vérifier qu'aucun utilisateur légitime n'est bloqué
- [ ] Documenter tous les faux positifs

### Après le Déploiement

- [ ] Activer le mode "Block" progressivement
- [ ] Monitorer les métriques pendant 48h
- [ ] Ajuster les seuils si nécessaire

### Maintenance Continue

- [ ] Review hebdomadaire des logs WAF
- [ ] Mise à jour mensuelle des règles
- [ ] Test de pénétration trimestriel
- [ ] Audit annuel de la configuration

---

## 7. Configuration Recommandée pour EDUZEN

### Configuration Minimale (Gratuit)

```yaml
Provider: Vercel Firewall
Includes:
  - Protection DDoS basique
  - Rate limiting global
  - Blocage géographique basique

Coût: Gratuit (inclus dans Vercel Pro)
```

### Configuration Recommandée

```yaml
Provider: Cloudflare Free + Vercel
Includes:
  - Tout ce qui précède
  - CDN global
  - SSL/TLS automatique
  - Managed rulesets basiques
  - Rate limiting avancé

Coût: Gratuit
```

### Configuration Enterprise

```yaml
Provider: Cloudflare Pro/Business + Vercel
Includes:
  - Tout ce qui précède
  - WAF OWASP complet
  - Bot Management
  - Advanced Rate Limiting
  - Security Analytics
  - 24/7 Support

Coût: ~$20-200/mois
```

---

## Contacts et Ressources

- [Vercel Firewall Documentation](https://vercel.com/docs/security/firewall)
- [Cloudflare WAF Documentation](https://developers.cloudflare.com/waf/)
- [AWS WAF Documentation](https://docs.aws.amazon.com/waf/)
- [OWASP ModSecurity CRS](https://owasp.org/www-project-modsecurity-core-rule-set/)
