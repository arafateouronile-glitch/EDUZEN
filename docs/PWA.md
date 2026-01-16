---
title: Guide PWA (Progressive Web App)
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Guide PWA (Progressive Web App)

## Vue d'ensemble

EDUZEN est configuré comme une Progressive Web App (PWA), permettant aux utilisateurs d'installer l'application sur leurs appareils mobiles et de l'utiliser même hors ligne.

## Fonctionnalités

### ✅ Service Worker

Le service worker (`/public/sw.js`) gère :
- **Cache des assets statiques** : Images, CSS, JS
- **Cache des pages** : Stratégie Network First pour les pages
- **Mode offline** : Affichage d'une page offline si aucune connexion
- **Background Sync** : Synchronisation des données en attente (à implémenter)

### ✅ Manifest

Le fichier `manifest.json` configure :
- Nom et description de l'application
- Icônes pour différents appareils
- Mode d'affichage (standalone)
- Couleurs de thème
- Raccourcis vers les pages principales

### ✅ Installation

L'application peut être installée sur :
- **Android** : Via le prompt d'installation du navigateur
- **iOS** : Via "Ajouter à l'écran d'accueil"
- **Desktop** : Via le prompt du navigateur (Chrome, Edge)

### ✅ Mode Offline

- Page dédiée (`/offline`) affichée quand l'utilisateur est hors ligne
- Cache des pages visitées pour consultation hors ligne
- Badge de statut en ligne/hors ligne

## Architecture

### Fichiers principaux

```
public/
  ├── manifest.json          # Configuration PWA
  ├── sw.js                  # Service Worker
  └── icons/                 # Icônes PWA

app/
  └── offline/
      └── page.tsx           # Page offline

components/
  └── pwa/
      ├── pwa-provider.tsx   # Provider pour PWA
      └── pwa-install-prompt.tsx  # Prompt d'installation

lib/
  └── utils/
      └── pwa.ts             # Utilitaires PWA

lib/
  └── hooks/
      └── use-pwa.ts         # Hook React pour PWA
```

### Composants

#### `PWAProvider`

Provider React qui :
- Enregistre le service worker
- Écoute les changements de statut en ligne/hors ligne
- Affiche un badge de statut

#### `PWAInstallPrompt`

Composant qui affiche un prompt d'installation quand l'application peut être installée.

#### `usePWA` Hook

Hook React qui fournit :
- `isInstallable` : L'app peut être installée
- `isInstalled` : L'app est installée
- `isStandalone` : L'app est en mode standalone
- `install()` : Fonction pour déclencher l'installation

## Utilisation

### Enregistrement du Service Worker

Le service worker est automatiquement enregistré par `PWAProvider` en production.

### Installation

L'utilisateur peut installer l'application via :
1. Le prompt automatique (après 3 secondes)
2. Le bouton d'installation dans le menu (à implémenter)
3. Les options du navigateur

### Mode Offline

Quand l'utilisateur est hors ligne :
- Les pages mises en cache sont affichées
- Une page `/offline` est affichée si la page n'est pas en cache
- Un badge "Mode hors ligne" apparaît en bas à droite

## Stratégies de Cache

### Network First (Pages)

1. Tenter de récupérer depuis le réseau
2. Si succès, mettre en cache et retourner
3. Si échec, retourner depuis le cache
4. Si pas en cache, afficher la page offline

### Cache First (Assets)

1. Vérifier le cache
2. Si trouvé, retourner depuis le cache
3. Sinon, récupérer depuis le réseau et mettre en cache

## Développement

### Désactiver le Service Worker en développement

Le service worker est automatiquement désactivé en développement pour éviter les problèmes de cache.

Pour forcer la désactivation :

```typescript
// Dans app/(dashboard)/layout.tsx
if (process.env.NODE_ENV === 'development') {
  // Désinscrire tous les service workers
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister())
  })
}
```

### Tester le mode offline

1. Ouvrir les DevTools (F12)
2. Aller dans l'onglet "Network"
3. Cocher "Offline"
4. Rafraîchir la page

### Vérifier le Service Worker

1. Ouvrir les DevTools (F12)
2. Aller dans l'onglet "Application"
3. Section "Service Workers"
4. Voir l'état et les caches

## Configuration

### Manifest

Modifier `/public/manifest.json` pour :
- Changer le nom, la description
- Ajouter/modifier les icônes
- Configurer les raccourcis
- Modifier les couleurs

### Service Worker

Modifier `/public/sw.js` pour :
- Changer les stratégies de cache
- Ajouter des assets à pré-cacher
- Implémenter Background Sync
- Ajouter des fonctionnalités offline

## Prochaines étapes

- [ ] Background Sync pour synchroniser les données en attente
- [ ] Notifications push
- [ ] Partage de fichiers via Web Share API
- [ ] Badge de notifications
- [ ] Synchronisation automatique au retour en ligne

## Références

- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev - PWA](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

