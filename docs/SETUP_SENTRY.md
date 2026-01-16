---
title: Configuration de Sentry pour le Monitoring
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Configuration de Sentry pour le Monitoring

Sentry est un service de monitoring d'erreurs et de performance qui permet de tracker les erreurs en production et d'analyser les performances de l'application.

## Installation

1. **Installer les dépendances** (optionnel - seulement si vous voulez utiliser Sentry) :
```bash
npm install @sentry/nextjs
```

2. **Configurer la DSN Sentry** :
   - Créer un compte sur [sentry.io](https://sentry.io)
   - Créer un nouveau projet Next.js
   - Copier la DSN fournie
   - Ajouter dans `.env.local` :
```env
NEXT_PUBLIC_SENTRY_DSN=https://votre-dsn@sentry.io/votre-projet-id
```

3. **Initialiser Sentry** (optionnel) :
```bash
npx @sentry/wizard@latest -i nextjs
```

## Configuration

Les fichiers de configuration sont déjà créés :
- `sentry.client.config.ts` - Configuration pour le client (browser)
- `sentry.server.config.ts` - Configuration pour le serveur (Node.js)

## Utilisation

Le logger (`lib/utils/logger.ts`) est déjà configuré pour utiliser Sentry automatiquement si la DSN est présente.

### Logger une erreur

```typescript
import { logger } from '@/lib/utils/logger'

try {
  // Votre code
} catch (error) {
  logger.error('Erreur lors du traitement', error, {
    userId: user.id,
    organizationId: org.id,
  })
}
```

### Mesurer les performances

```typescript
import { performanceMonitor } from '@/lib/utils/performance-monitor'

const result = await performanceMonitor.measure('operation_name', async () => {
  // Votre code
}, { context: 'additional data' })
```

### Utiliser le hook React

```typescript
import { usePerformance } from '@/lib/hooks/use-performance'

function MyComponent() {
  const { measure } = usePerformance({ name: 'MyComponent' })
  
  const handleClick = async () => {
    await measure(async () => {
      // Votre code
    }, 'button_click')
  }
}
```

## Fonctionnalités

- **Error Tracking** : Capture automatique des erreurs JavaScript
- **Performance Monitoring** : Tracking des temps de réponse
- **Session Replay** : Enregistrement des sessions utilisateur (10% des sessions, 100% des sessions avec erreurs)
- **Source Maps** : Support des source maps pour le debugging
- **Filtrage des données sensibles** : Suppression automatique des tokens, passwords, etc.

## Désactiver Sentry

Pour désactiver Sentry, supprimez simplement la variable `NEXT_PUBLIC_SENTRY_DSN` de votre `.env.local`. L'application continuera de fonctionner normalement sans Sentry.---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

