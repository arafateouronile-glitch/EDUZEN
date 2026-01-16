---
title: Guide de Déploiement - EDUZEN
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🚀 Guide de Déploiement - EDUZEN

Guide complet pour déployer l'application EDUZEN en production.

## 📋 Prérequis

- Node.js >= 18.0.0
- npm >= 9.0.0
- Compte Supabase configuré
- Variables d'environnement configurées

## 🔧 Configuration

### 1. Variables d'environnement

Créez un fichier `.env.local` (ou configurez-les dans votre plateforme de déploiement) :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key

# Application
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
NODE_ENV=production

# Analytics (optionnel)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=votre-domaine.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Sentry (optionnel)
NEXT_PUBLIC_SENTRY_DSN=https://votre-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=votre_token

# CRON (optionnel)
CRON_SECRET=votre_secret_aleatoire
CRON_ALLOWED_IPS=127.0.0.1,::1

# Webhooks (optionnel)
MOBILE_MONEY_WEBHOOK_SECRET=votre_secret
ESIGNATURE_WEBHOOK_SECRET=votre_secret

# CORS (optionnel - pour les appels API depuis d'autres domaines)
ALLOWED_ORIGINS=https://votre-domaine.com,https://app.votre-domaine.com

# Alertes (optionnel)
ADMIN_EMAILS=admin1@example.com,admin2@example.com
SUPPORT_EMAIL=support@example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 2. Vérification des secrets

Avant le déploiement, exécutez :

```bash
npm run check-secrets
```

Cela vérifiera que tous les secrets requis sont configurés.

## 🏗️ Build

### Build de production

```bash
npm run build
```

Cela génère :
- Les pages statiques optimisées
- Les bundles JavaScript minifiés
- Les assets optimisés

### Vérification du build

```bash
npm run start
```

Testez l'application en local avant de déployer.

## 🌐 Déploiement

### Option 1 : Vercel (Recommandé)

1. **Installer Vercel CLI** :
```bash
npm i -g vercel
```

2. **Déployer** :
```bash
vercel --prod
```

3. **Configuration automatique** :
   - Vercel détecte automatiquement Next.js
   - Configure HTTPS automatiquement
   - Active la compression (gzip/brotli)
   - Configure le CDN

4. **Variables d'environnement** :
   - Ajoutez toutes les variables dans le dashboard Vercel
   - Section : Settings > Environment Variables

5. **Domaines personnalisés** :
   - Settings > Domains
   - Ajoutez votre domaine
   - Configurez les DNS selon les instructions

### Option 2 : Netlify

1. **Installer Netlify CLI** :
```bash
npm i -g netlify-cli
```

2. **Déployer** :
```bash
netlify deploy --prod
```

3. **Configuration** :
   - Créez un fichier `netlify.toml` :
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Option 3 : Serveur VPS/Dedicated

1. **Installation des dépendances** :
```bash
npm ci --production
```

2. **Build** :
```bash
npm run build
```

3. **Démarrer avec PM2** :
```bash
npm install -g pm2
pm2 start npm --name "eduzen" -- start
pm2 save
pm2 startup
```

4. **Configuration Nginx** :
```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. **HTTPS avec Let's Encrypt** :
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

## 🔒 Sécurité

### 1. HTTPS

HTTPS est automatiquement géré par la plateforme de déploiement (Vercel, Netlify, etc.).

#### Configuration

- **Vercel/Netlify** : Activé automatiquement
- **Serveur personnalisé** : Utilisez Let's Encrypt (voir ci-dessus)
- **HSTS Header** : Configuré dans `middleware.ts` et `next.config.js` uniquement en production
- **Upgrade Insecure Requests** : Activé dans le CSP pour forcer HTTPS

#### Vérification

```bash
# Vérifier que HTTPS est activé
curl -I https://votre-domaine.com

# Vérifier le header HSTS
curl -I https://votre-domaine.com | grep -i strict-transport
```

### 1.1. CORS (Cross-Origin Resource Sharing)

CORS est configuré dans `middleware.ts` pour les routes API.

#### Variables d'Environnement

Ajoutez dans `.env.local` :

```env
ALLOWED_ORIGINS=https://votre-domaine.com,https://app.votre-domaine.com
```

#### Configuration Actuelle

- **Origines autorisées** : Définies via `ALLOWED_ORIGINS` (séparées par virgules)
- **Origines par défaut** : `localhost` et `127.0.0.1` sont toujours autorisées en développement
- **Méthodes autorisées** : GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Headers autorisés** : Content-Type, Authorization, x-learner-student-id
- **Credentials** : Activés (`Access-Control-Allow-Credentials: true`)
- **Max Age** : 24 heures pour le cache preflight

#### Test CORS

```bash
# Test depuis un autre domaine
curl -H "Origin: https://autre-domaine.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://votre-domaine.com/api/endpoint
```

### 2. Headers de sécurité

Déjà configurés dans `next.config.js` et `middleware.ts` :
- Content Security Policy (CSP)
- Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

### 3. Rate Limiting

Implémenté sur :
- Endpoints d'authentification
- Endpoints de paiement
- Endpoints de documents
- Endpoints CRON

### 4. Webhooks

- Validation des signatures HMAC
- Protection contre les replay attacks
- Vérification des timestamps

## 📊 Monitoring

### 1. Sentry

Si configuré, Sentry track automatiquement :
- Les erreurs JavaScript
- Les erreurs serveur
- Les performances

### 2. Analytics

- **Plausible** : Tracking respectueux de la vie privée
- **Google Analytics** : Analytics complet

### 3. Dashboard de santé

Accédez à `/dashboard/admin/health` pour :
- Vérifier la connexion DB
- Voir les statistiques
- Monitorer les performances

## 🗄️ Base de données

### Migrations Supabase

1. **Appliquer les migrations** :
```bash
# Via Supabase CLI
supabase db push

# Ou manuellement via le dashboard Supabase
# SQL Editor > Exécuter les fichiers dans supabase/migrations/
```

2. **Vérifier les migrations** :
```sql
SELECT * FROM supabase.migrations ORDER BY version;
```

### RLS Policies

Toutes les politiques RLS sont définies dans les migrations. Vérifiez qu'elles sont appliquées.

## 🔄 Mises à jour

### Processus de mise à jour

1. **Backup** :
   - Backup de la base de données Supabase
   - Backup des fichiers de configuration

2. **Tests** :
   - Tester en staging d'abord
   - Vérifier les migrations

3. **Déploiement** :
   - Déployer en production
   - Vérifier les logs
   - Tester les fonctionnalités critiques

4. **Rollback** :
   - En cas de problème, revenir à la version précédente
   - Restaurer la base de données si nécessaire

## 🐛 Résolution de problèmes

### Erreur de build

1. Vérifiez les erreurs TypeScript :
```bash
npm run type-check
```

2. Vérifiez les erreurs ESLint :
```bash
npm run lint
```

### Erreur de connexion Supabase

1. Vérifiez les variables d'environnement
2. Vérifiez que le projet Supabase est actif
3. Vérifiez les RLS policies

### Performance lente

1. Vérifiez le dashboard de santé
2. Analysez les requêtes lentes dans Supabase
3. Vérifiez la compression (gzip/brotli)
4. Vérifiez le cache CDN

## 📝 Checklist de déploiement

- [ ] Toutes les variables d'environnement configurées
- [ ] `npm run check-secrets` passe sans erreur
- [ ] Build de production réussi (`npm run build`)
- [ ] Tests en local réussis (`npm run start`)
- [ ] Migrations Supabase appliquées
- [ ] RLS policies vérifiées
- [ ] HTTPS configuré
- [ ] Headers de sécurité vérifiés
- [ ] Analytics configuré (si nécessaire)
- [ ] Monitoring configuré (Sentry si nécessaire)
- [ ] Backup de la base de données effectué
- [ ] Documentation à jour

## 🔗 Ressources

- [Documentation Next.js](https://nextjs.org/docs/deployment)
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Sentry](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

## 📞 Support

En cas de problème :
1. Consultez les logs (Vercel/Netlify dashboard ou PM2 logs)
2. Vérifiez le dashboard de santé (`/dashboard/admin/health`)
3. Consultez la documentation Supabase
4. Contactez le support technique---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.