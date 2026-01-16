---
title: Icônes PWA
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Icônes PWA

Ce dossier doit contenir les icônes pour la Progressive Web App (PWA).

## Icônes requis

Les icônes suivantes sont référencées dans `manifest.json` :

- `icon-72x72.png` (72x72 pixels)
- `icon-96x96.png` (96x96 pixels)
- `icon-128x128.png` (128x128 pixels)
- `icon-144x144.png` (144x144 pixels)
- `icon-152x152.png` (152x152 pixels)
- `icon-192x192.png` (192x192 pixels)
- `icon-384x384.png` (384x384 pixels)
- `icon-512x512.png` (512x512 pixels)

## Génération des icônes

Vous pouvez générer ces icônes à partir d'une image source (par exemple, un logo 512x512) en utilisant :

1. **Outils en ligne** :
   - [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)

2. **Commande** (si vous avez ImageMagick installé) :
   ```bash
   # Créer toutes les tailles à partir d'une image source
   for size in 72 96 128 144 152 192 384 512; do
     convert source-logo.png -resize ${size}x${size} icon-${size}x${size}.png
   done
   ```

3. **Temporairement** : Vous pouvez créer des icônes de placeholder simples pour le développement.

## Note

Le service worker gère maintenant les erreurs si les icônes ne sont pas trouvées, mais il est recommandé de créer les vraies icônes pour une meilleure expérience utilisateur.



Ce dossier doit contenir les icônes pour la Progressive Web App (PWA).

## Icônes requis

Les icônes suivantes sont référencées dans `manifest.json` :

- `icon-72x72.png` (72x72 pixels)
- `icon-96x96.png` (96x96 pixels)
- `icon-128x128.png` (128x128 pixels)
- `icon-144x144.png` (144x144 pixels)
- `icon-152x152.png` (152x152 pixels)
- `icon-192x192.png` (192x192 pixels)
- `icon-384x384.png` (384x384 pixels)
- `icon-512x512.png` (512x512 pixels)

## Génération des icônes

Vous pouvez générer ces icônes à partir d'une image source (par exemple, un logo 512x512) en utilisant :

1. **Outils en ligne** :
   - [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)

2. **Commande** (si vous avez ImageMagick installé) :
   ```bash
   # Créer toutes les tailles à partir d'une image source
   for size in 72 96 128 144 152 192 384 512; do
     convert source-logo.png -resize ${size}x${size} icon-${size}x${size}.png
   done
   ```

3. **Temporairement** : Vous pouvez créer des icônes de placeholder simples pour le développement.

## Note

Le service worker gère maintenant les erreurs si les icônes ne sont pas trouvées, mais il est recommandé de créer les vraies icônes pour une meilleure expérience utilisateur.



Ce dossier doit contenir les icônes pour la Progressive Web App (PWA).

## Icônes requis

Les icônes suivantes sont référencées dans `manifest.json` :

- `icon-72x72.png` (72x72 pixels)
- `icon-96x96.png` (96x96 pixels)
- `icon-128x128.png` (128x128 pixels)
- `icon-144x144.png` (144x144 pixels)
- `icon-152x152.png` (152x152 pixels)
- `icon-192x192.png` (192x192 pixels)
- `icon-384x384.png` (384x384 pixels)
- `icon-512x512.png` (512x512 pixels)

## Génération des icônes

Vous pouvez générer ces icônes à partir d'une image source (par exemple, un logo 512x512) en utilisant :

1. **Outils en ligne** :
   - [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)

2. **Commande** (si vous avez ImageMagick installé) :
   ```bash
   # Créer toutes les tailles à partir d'une image source
   for size in 72 96 128 144 152 192 384 512; do
     convert source-logo.png -resize ${size}x${size} icon-${size}x${size}.png
   done
   ```

3. **Temporairement** : Vous pouvez créer des icônes de placeholder simples pour le développement.

## Note

Le service worker gère maintenant les erreurs si les icônes ne sont pas trouvées, mais il est recommandé de créer les vraies icônes pour une meilleure expérience utilisateur.---

**Document EDUZEN** | [Retour à la documentation principale](../../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.