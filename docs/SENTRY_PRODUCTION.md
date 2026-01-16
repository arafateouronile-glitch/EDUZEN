# 🔍 Guide de configuration Sentry en production

## Vue d'ensemble

Sentry est déjà installé et configuré dans le projet. Ce guide vous explique comment l'activer et le configurer pour la production.

## ✅ Prérequis

1. **Sentry est installé** : `@sentry/nextjs` v10.32.1 est dans les dépendances
2. **Fichiers de configuration existants** :
   - `sentry.client.config.ts` (client/browser)
   - `sentry.server.config.ts` (serveur)

## 🚀 Configuration en production

### Étape 1 : Créer un projet Sentry

1. Allez sur https://sentry.io
2. Créez un compte (si vous n'en avez pas)
3. Créez un nouveau projet :
   - Platform: **Next.js**
   - Project Name: **EDUZEN** (ou le nom de votre choix)
   - Team: Sélectionnez votre équipe

### Étape 2 : Obtenir le DSN

1. Dans votre projet Sentry, allez dans **Settings** > **Projects** > **EDUZEN**
2. Allez dans **Client Keys (DSN)**
3. Copiez le **DSN** (format: `https://xxxxx@sentry.io/xxxxx`)

### Étape 3 : Configurer la variable d'environnement

Ajoutez le DSN dans votre `.env.production` :

```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
```

**Important pour Vercel :**
- Ajoutez cette variable dans Vercel Dashboard
- Settings > Environment Variables
- Nom: `NEXT_PUBLIC_SENTRY_DSN`
- Valeur: votre DSN
- Environnements: Production, Preview (optionnel), Development (optionnel)

### Étape 4 : Configuration automatique (Optionnel)

Vous pouvez exécuter le wizard Sentry pour configurer automatiquement :

```bash
npx @sentry/wizard@latest -i nextjs
```

⚠️ **Note** : Les fichiers de configuration existent déjà, le wizard peut proposer de les écraser. Vous pouvez refuser si la configuration actuelle vous convient.

### Étape 5 : Vérifier la configuration

Les fichiers `sentry.client.config.ts` et `sentry.server.config.ts` sont déjà configurés avec :

✅ **Filtrage des données sensibles** (mots de passe, tokens, cookies)  
✅ **Performance Monitoring** (10% des traces en production)  
✅ **Session Replay** (10% des sessions, 100% des sessions avec erreurs)  
✅ **Ignorer les erreurs non critiques** (réseau, timeout, navigateur)  
✅ **Tags par défaut** (client/serveur)

## 📊 Fonctionnalités configurées

### Performance Monitoring

```typescript
tracesSampleRate: 0.1 // 10% des transactions en production
```

- Suivi des performances des pages et API routes
- Identification des goulots d'étranglement
- Métriques de temps de chargement

### Session Replay

```typescript
replaysSessionSampleRate: 0.1  // 10% des sessions normales
replaysOnErrorSampleRate: 1.0  // 100% des sessions avec erreurs
```

- Enregistrement des interactions utilisateur
- Debugging visuel des erreurs
- Compréhension du contexte des bugs

### Filtrage de sécurité

Les données sensibles sont automatiquement filtrées :
- Headers: `authorization`, `cookie`, `x-api-key`
- Body: `password`, `token`, `secret`

### Erreurs ignorées

Les erreurs suivantes ne sont pas envoyées à Sentry :
- Erreurs de réseau (NetworkError, Failed to fetch)
- Erreurs de résolution DNS
- Timeouts
- Erreurs de chargement de chunks

## 🔧 Utilisation dans le code

### Capturer une erreur manuellement

```typescript
import * as Sentry from '@sentry/nextjs'

try {
  // Code qui peut échouer
  await riskyOperation()
} catch (error) {
  // Capturer l'erreur avec contexte
  Sentry.captureException(error, {
    tags: {
      section: 'payment',
      action: 'process'
    },
    extra: {
      userId: user.id,
      orderId: order.id
    }
  })
  
  // Afficher un message à l'utilisateur
  console.error('Erreur:', error)
}
```

### Ajouter du contexte

```typescript
import * as Sentry from '@sentry/nextjs'

// Définir le contexte utilisateur
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name
})

// Ajouter des tags
Sentry.setTag('page', 'dashboard')
Sentry.setTag('organization', organization.id)

// Ajouter des données supplémentaires
Sentry.setContext('order', {
  id: order.id,
  amount: order.amount,
  status: order.status
})
```

### Capturer un message (non-erreur)

```typescript
import * as Sentry from '@sentry/nextjs'

// Pour des événements importants qui ne sont pas des erreurs
Sentry.captureMessage('Payment processed successfully', 'info', {
  tags: {
    section: 'payment'
  },
  extra: {
    orderId: order.id,
    amount: order.amount
  }
})
```

### Créer une transaction personnalisée

```typescript
import * as Sentry from '@sentry/nextjs'

// Pour mesurer la performance d'une opération
const transaction = Sentry.startTransaction({
  name: 'Generate Report',
  op: 'task'
})

try {
  // Votre code
  await generateReport()
  
  transaction.setStatus('ok')
} catch (error) {
  transaction.setStatus('internal_error')
  Sentry.captureException(error)
} finally {
  transaction.finish()
}
```

## 🎯 Bonnes pratiques

### 1. Ne pas capturer toutes les erreurs

Certaines erreurs sont attendues et ne doivent pas être envoyées :

```typescript
try {
  await apiCall()
} catch (error) {
  // Erreur 404 est attendue, ne pas l'envoyer à Sentry
  if (error.status === 404) {
    return null
  }
  
  // Autres erreurs doivent être capturées
  Sentry.captureException(error)
}
```

### 2. Filtrer les erreurs côté serveur

Dans `sentry.server.config.ts`, vous pouvez ajouter des filtres spécifiques :

```typescript
beforeSend(event, hint) {
  // Ignorer les erreurs 404
  if (event.exception?.values?.[0]?.value?.includes('404')) {
    return null
  }
  
  // Votre logique de filtrage existante
  // ...
  
  return event
}
```

### 3. Utiliser les releases

Taguer vos déploiements avec des releases pour faciliter le debugging :

```bash
# Dans Vercel, ajoutez une variable d'environnement
SENTRY_RELEASE=$(git rev-parse HEAD)
```

Ou dans le code :

```typescript
Sentry.init({
  release: process.env.SENTRY_RELEASE || 'development',
  // ...
})
```

### 4. Configurer les alertes

Dans Sentry Dashboard :
1. Allez dans **Alerts**
2. Créez une alerte pour :
   - Erreurs critiques (niveau: Error, Fatal)
   - Augmentation soudaine d'erreurs
   - Erreurs par utilisateur (détection de spam)

### 5. Configurer les intégrations

Sentry peut s'intégrer avec :
- **Slack** : Recevoir des notifications en temps réel
- **Email** : Alertes par email
- **PagerDuty** : Alertes pour incidents critiques
- **GitHub/GitLab** : Lier les erreurs aux issues

## 📈 Monitoring et dashboard

### Vue d'ensemble

Dans Sentry Dashboard, vous pouvez voir :
- **Issues** : Toutes les erreurs capturées
- **Performance** : Temps de chargement, transactions lentes
- **Releases** : Erreurs par version de l'application
- **Users** : Erreurs affectant les utilisateurs

### Métriques importantes

- **Error Rate** : Pourcentage de sessions avec erreurs
- **Apdex Score** : Score de satisfaction utilisateur basé sur les performances
- **P95/P99 Latency** : Temps de réponse pour 95% et 99% des requêtes

## 🧪 Tester Sentry

### Test en développement

```typescript
// Créer une page de test: app/test-sentry/page.tsx
'use client'

import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'

export default function TestSentryPage() {
  const testError = () => {
    try {
      throw new Error('Test Sentry Error')
    } catch (error) {
      Sentry.captureException(error, {
        tags: { test: true },
        extra: { source: 'test-page' }
      })
      alert('Erreur test envoyée à Sentry !')
    }
  }

  const testMessage = () => {
    Sentry.captureMessage('Test message from Sentry', 'info')
    alert('Message test envoyé à Sentry !')
  }

  return (
    <div className="p-8">
      <h1>Test Sentry</h1>
      <div className="space-x-4 mt-4">
        <Button onClick={testError}>Tester une erreur</Button>
        <Button onClick={testMessage}>Tester un message</Button>
      </div>
    </div>
  )
}
```

Accédez à `/test-sentry` et cliquez sur les boutons pour vérifier que les erreurs apparaissent dans Sentry.

## ✅ Checklist de configuration

- [ ] Compte Sentry créé
- [ ] Projet Next.js créé dans Sentry
- [ ] DSN copié
- [ ] Variable `NEXT_PUBLIC_SENTRY_DSN` ajoutée dans `.env.production`
- [ ] Variable `NEXT_PUBLIC_SENTRY_DSN` ajoutée dans Vercel (si applicable)
- [ ] Test d'envoi d'erreur réussi
- [ ] Alertes configurées dans Sentry
- [ ] Intégrations configurées (Slack, Email, etc.)
- [ ] Release tracking configuré (optionnel)
- [ ] Documentation équipe créée sur l'utilisation de Sentry

## 🔗 Ressources

- [Documentation Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Guide Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Guide Session Replay](https://docs.sentry.io/product/session-replay/)
- [API Reference](https://docs.sentry.io/platforms/javascript/configuration/)

## 🆘 Support

En cas de problème :
1. Vérifiez que `NEXT_PUBLIC_SENTRY_DSN` est correctement défini
2. Vérifiez les logs du serveur pour les erreurs de connexion Sentry
3. Consultez la documentation Sentry
4. Vérifiez que votre plan Sentry permet le nombre d'événements nécessaires


