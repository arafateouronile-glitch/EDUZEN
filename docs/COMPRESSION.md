---
title: Configuration de la Compression (GzipBrotli)
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Configuration de la Compression (Gzip/Brotli)

## Vue d'ensemble

Next.js active automatiquement la compression pour les réponses HTTP en production. Cette documentation explique comment cela fonctionne et comment vérifier que c'est bien configuré.

## Compression automatique

Next.js utilise automatiquement la compression **gzip** et **brotli** pour :
- Les fichiers statiques (JS, CSS, images optimisées)
- Les réponses API
- Les pages rendues côté serveur

### Configuration

La compression est activée par défaut en production (`NODE_ENV=production`). Aucune configuration supplémentaire n'est nécessaire.

### Vérification

Pour vérifier que la compression fonctionne :

1. **Via les DevTools du navigateur** :
   - Ouvrez les DevTools (F12)
   - Allez dans l'onglet "Network"
   - Rechargez la page
   - Vérifiez la colonne "Size" vs "Transferred"
   - Si "Transferred" < "Size", la compression fonctionne

2. **Via curl** :
```bash
curl -H "Accept-Encoding: gzip, br" -I https://votre-domaine.com
```

Vous devriez voir :
```
Content-Encoding: gzip
# ou
Content-Encoding: br
```

3. **Via l'outil en ligne** :
   - Utilisez [PageSpeed Insights](https://pagespeed.web.dev/)
   - Vérifiez la section "Enable text compression"

## Compression des images

Next.js optimise automatiquement les images via :
- Conversion en formats modernes (AVIF, WebP)
- Redimensionnement selon la taille de l'écran
- Lazy loading

Configuration dans `next.config.js` :
```javascript
images: {
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  minimumCacheTTL: 60 * 60 * 24 * 30, // 30 jours
}
```

## Compression côté serveur (Vercel/Netlify)

Si vous déployez sur Vercel ou Netlify, la compression est gérée automatiquement par la plateforme.

### Vercel
- Compression automatique activée
- Support gzip et brotli
- Aucune configuration nécessaire

### Netlify
- Compression automatique activée
- Support gzip et brotli
- Aucune configuration nécessaire

### Serveur personnalisé

Si vous utilisez un serveur personnalisé (Node.js, Express, etc.), vous devrez configurer la compression manuellement :

```javascript
const compression = require('compression')
const express = require('express')
const app = express()

// Activer la compression
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  },
  level: 6, // Niveau de compression (0-9)
}))
```

## Bonnes pratiques

1. **Ne compressez pas les fichiers déjà compressés** :
   - Images (JPEG, PNG, GIF)
   - Vidéos
   - Fichiers ZIP, etc.

2. **Priorité Brotli > Gzip** :
   - Brotli offre une meilleure compression
   - Supporté par tous les navigateurs modernes

3. **Cache des fichiers compressés** :
   - Utilisez un CDN pour mettre en cache les fichiers compressés
   - Réduit la charge sur le serveur

## Monitoring

Pour surveiller l'efficacité de la compression :

1. **Métriques à suivre** :
   - Taille des fichiers avant/après compression
   - Ratio de compression
   - Temps de réponse

2. **Outils** :
   - Google PageSpeed Insights
   - WebPageTest
   - Lighthouse

## Résolution de problèmes

### La compression ne fonctionne pas

1. Vérifiez que vous êtes en production (`NODE_ENV=production`)
2. Vérifiez les headers HTTP dans les DevTools
3. Vérifiez la configuration du serveur/reverse proxy

### Compression trop agressive

Si la compression ralentit le serveur :
- Réduisez le niveau de compression
- Utilisez un CDN pour mettre en cache

## Références

- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [MDN: HTTP Compression](https://developer.mozilla.org/en-US/docs/Web/HTTP/Compression)
- [Brotli Compression](https://github.com/google/brotli)---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

