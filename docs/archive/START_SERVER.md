---
title: Démarrer le serveur
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🚀 Démarrer le serveur

## Commande à exécuter dans le terminal

Ouvrez un terminal dans le dossier du projet et exécutez :

```bash
cd /Users/arafatetoure/Documents/EDUZEN
npm run dev
```

## Si vous voyez des erreurs

### Erreur "Cannot find module"
```bash
npm install
npm run dev
```

### Erreur de port 3000 déjà utilisé
```bash
# Tuer le processus sur le port 3000
kill -9 $(lsof -ti:3000)

# Relancer
npm run dev
```

### Le serveur démarre mais la page ne charge pas

1. Vérifiez que le serveur affiche : `✓ Ready in Xs`
2. Ouvrez votre navigateur : http://localhost:3000
3. Faites un rafraîchissement complet : `Cmd + Shift + R`

## Messages de confirmation

Vous devriez voir :
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
✓ Ready in Xs
```

Une fois ce message affiché, le serveur est prêt !

## 🚀 Démarrer le serveur WebSocket (pour la collaboration en temps réel)

Pour utiliser la fonctionnalité de collaboration en temps réel dans l'éditeur de documents, vous devez démarrer le serveur WebSocket dans un **terminal séparé** :

```bash
npm run ws:server
```

Ou directement :
```bash
node websocket-server.js
```

### Messages de confirmation

Vous devriez voir :
```
🚀 WebSocket server for Yjs collaboration running
   Listening on: ws://localhost:1234 and ws://0.0.0.0:1234
   Ready to accept connections for real-time collaboration
   Example: ws://localhost:1234/template-{templateId}
```

### Si le port 1234 est déjà utilisé

```bash
# Tuer le processus sur le port 1234
lsof -ti:1234 | xargs kill -9

# Ou utiliser un autre port
WS_PORT=1235 npm run ws:server
```

### Note importante

- Le serveur WebSocket doit être démarré **en plus** du serveur Next.js
- Si le serveur WebSocket n'est pas démarré, la collaboration en temps réel ne fonctionnera pas, mais l'application fonctionnera normalement
- Pour la production, utilisez un serveur WebSocket dédié ou Supabase Realtime---

**Document EDUZEN** | [Retour à la documentation principale](README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.