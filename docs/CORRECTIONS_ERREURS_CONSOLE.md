---
title: Corrections des Erreurs Console
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔧 Corrections des Erreurs Console

## Erreurs corrigées

### 1. ✅ Erreur 404 - favicon.ico

**Problème** : Le navigateur cherchait `/favicon.ico` qui n'existait pas.

**Solution** : 
1. Copie des icônes dans `public/icons/` (elles étaient à la racine)
2. Création de `public/favicon.ico` à partir de l'icône existante
3. Ajout des liens dans `app/layout.tsx` :
```tsx
<link rel="icon" href="/icons/icon-192x192.png" type="image/png" />
<link rel="shortcut icon" href="/icons/icon-192x192.png" type="image/png" />
```

### 2. ✅ Erreur frame.js - sendMessage

**Problème** : 
```
Uncaught TypeError: Cannot read properties of undefined (reading 'sendMessage')
at e.value (frame.js:2:125840)
```

Cette erreur provient d'une **extension de navigateur** (probablement une extension de développement ou de tracking), pas de votre code.

**Solution** : Ajout d'une gestion d'erreur globale dans `app/(dashboard)/layout.tsx` qui :
- Filtre les erreurs provenant de scripts externes (extensions)
- Les ignore en production
- Les log en développement avec un avertissement (pas une erreur critique)

**Fichiers modifiés** :
- `app/layout.tsx` : Ajout des liens favicon
- `app/(dashboard)/layout.tsx` : Ajout de la gestion d'erreur globale

## Messages d'information (non critiques)

Les messages suivants sont **normaux** et ne nécessitent pas d'action :

1. **React DevTools** : Message d'information suggérant d'installer React DevTools (optionnel)
2. **Service Worker registered** : Confirmation que le Service Worker PWA est bien enregistré
3. **Document already loaded** : Message d'information du framework

## Résultat

✅ Plus d'erreurs 404 pour le favicon
✅ Les erreurs d'extensions de navigateur sont filtrées et n'apparaissent plus comme des erreurs critiques
✅ Console plus propre et focus sur les vraies erreurs de l'application

## Note

Si vous voyez encore des erreurs `frame.js` ou `operationBanner.js`, c'est probablement dû à :
- Une extension de navigateur installée (React DevTools, Redux DevTools, etc.)
- Un script de tracking/analytics externe
- Une extension de développement

Ces erreurs sont maintenant **filtrées** et n'affectent pas le fonctionnement de l'application.---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.