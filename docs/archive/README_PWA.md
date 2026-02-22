---
title: Progressive Web App (PWA) - EDUZEN
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Progressive Web App (PWA) - EDUZEN

EDUZEN est maintenant disponible en tant que Progressive Web App (PWA), permettant une installation sur iOS et Android sans nécessiter d'applications natives séparées.

## Fonctionnalités PWA

### Installation
- **iOS** : Utiliser le bouton "Partager" puis "Sur l'écran d'accueil"
- **Android** : Le navigateur proposera automatiquement l'installation
- **Desktop** : Le navigateur proposera l'installation via une bannière

### Fonctionnalités
- ✅ Mode standalone (fonctionne comme une app native)
- ✅ Fonctionnement hors ligne (Service Worker)
- ✅ Notifications push
- ✅ Raccourcis sur l'écran d'accueil
- ✅ Partage de contenu
- ✅ Cache intelligent pour performances optimales

## Configuration

### Icons
Les icônes doivent être placées dans `/public/icons/` :
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`

### Service Worker
Le Service Worker est automatiquement enregistré lors de la première visite sur le dashboard.

### Manifest
Le fichier `manifest.json` configure :
- Nom et description de l'app
- Couleurs du thème
- Icônes
- Raccourcis
- Mode d'affichage

## Développement

### Tester la PWA localement
1. Démarrer le serveur de développement : `npm run dev`
2. Ouvrir Chrome DevTools > Application > Service Workers
3. Vérifier que le Service Worker est enregistré
4. Tester l'installation via DevTools > Application > Manifest

### Tester sur mobile
1. Utiliser ngrok ou un tunnel similaire pour exposer le serveur local
2. Accéder à l'URL depuis un appareil mobile
3. Tester l'installation et les fonctionnalités hors ligne

## Prochaines étapes

Pour une expérience mobile complète, considérer :
1. **Notifications push** : Configurer FCM (Firebase Cloud Messaging) pour Android et APNS pour iOS
2. **Icônes** : Créer les icônes dans toutes les tailles requises
3. **Screenshots** : Ajouter des captures d'écran pour les stores
4. **Offline pages** : Personnaliser la page `/offline` pour chaque section



EDUZEN est maintenant disponible en tant que Progressive Web App (PWA), permettant une installation sur iOS et Android sans nécessiter d'applications natives séparées.

## Fonctionnalités PWA

### Installation
- **iOS** : Utiliser le bouton "Partager" puis "Sur l'écran d'accueil"
- **Android** : Le navigateur proposera automatiquement l'installation
- **Desktop** : Le navigateur proposera l'installation via une bannière

### Fonctionnalités
- ✅ Mode standalone (fonctionne comme une app native)
- ✅ Fonctionnement hors ligne (Service Worker)
- ✅ Notifications push
- ✅ Raccourcis sur l'écran d'accueil
- ✅ Partage de contenu
- ✅ Cache intelligent pour performances optimales

## Configuration

### Icons
Les icônes doivent être placées dans `/public/icons/` :
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`

### Service Worker
Le Service Worker est automatiquement enregistré lors de la première visite sur le dashboard.

### Manifest
Le fichier `manifest.json` configure :
- Nom et description de l'app
- Couleurs du thème
- Icônes
- Raccourcis
- Mode d'affichage

## Développement

### Tester la PWA localement
1. Démarrer le serveur de développement : `npm run dev`
2. Ouvrir Chrome DevTools > Application > Service Workers
3. Vérifier que le Service Worker est enregistré
4. Tester l'installation via DevTools > Application > Manifest

### Tester sur mobile
1. Utiliser ngrok ou un tunnel similaire pour exposer le serveur local
2. Accéder à l'URL depuis un appareil mobile
3. Tester l'installation et les fonctionnalités hors ligne

## Prochaines étapes

Pour une expérience mobile complète, considérer :
1. **Notifications push** : Configurer FCM (Firebase Cloud Messaging) pour Android et APNS pour iOS
2. **Icônes** : Créer les icônes dans toutes les tailles requises
3. **Screenshots** : Ajouter des captures d'écran pour les stores
4. **Offline pages** : Personnaliser la page `/offline` pour chaque section



EDUZEN est maintenant disponible en tant que Progressive Web App (PWA), permettant une installation sur iOS et Android sans nécessiter d'applications natives séparées.

## Fonctionnalités PWA

### Installation
- **iOS** : Utiliser le bouton "Partager" puis "Sur l'écran d'accueil"
- **Android** : Le navigateur proposera automatiquement l'installation
- **Desktop** : Le navigateur proposera l'installation via une bannière

### Fonctionnalités
- ✅ Mode standalone (fonctionne comme une app native)
- ✅ Fonctionnement hors ligne (Service Worker)
- ✅ Notifications push
- ✅ Raccourcis sur l'écran d'accueil
- ✅ Partage de contenu
- ✅ Cache intelligent pour performances optimales

## Configuration

### Icons
Les icônes doivent être placées dans `/public/icons/` :
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`

### Service Worker
Le Service Worker est automatiquement enregistré lors de la première visite sur le dashboard.

### Manifest
Le fichier `manifest.json` configure :
- Nom et description de l'app
- Couleurs du thème
- Icônes
- Raccourcis
- Mode d'affichage

## Développement

### Tester la PWA localement
1. Démarrer le serveur de développement : `npm run dev`
2. Ouvrir Chrome DevTools > Application > Service Workers
3. Vérifier que le Service Worker est enregistré
4. Tester l'installation via DevTools > Application > Manifest

### Tester sur mobile
1. Utiliser ngrok ou un tunnel similaire pour exposer le serveur local
2. Accéder à l'URL depuis un appareil mobile
3. Tester l'installation et les fonctionnalités hors ligne

## Prochaines étapes

Pour une expérience mobile complète, considérer :
1. **Notifications push** : Configurer FCM (Firebase Cloud Messaging) pour Android et APNS pour iOS
2. **Icônes** : Créer les icônes dans toutes les tailles requises
3. **Screenshots** : Ajouter des captures d'écran pour les stores
4. **Offline pages** : Personnaliser la page `/offline` pour chaque section---

**Document EDUZEN** | [Retour à la documentation principale](README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.