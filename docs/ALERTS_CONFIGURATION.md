---
title: Configuration des Alertes Système
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔔 Configuration des Alertes Système

Ce document décrit comment configurer et utiliser le système d'alertes pour notifier les administrateurs en cas d'erreurs critiques ou d'événements importants.

## 📋 Vue d'ensemble

Le système d'alertes permet d'envoyer des notifications automatiques via :
- **Email** : Notifications par email aux administrateurs
- **Slack** : Notifications dans un canal Slack (optionnel)

## 🔧 Configuration

### Variables d'Environnement

Ajoutez dans `.env.local` ou votre plateforme de déploiement :

```env
# Emails des administrateurs (séparés par des virgules)
ADMIN_EMAILS=admin1@example.com,admin2@example.com

# Email de support (fallback si ADMIN_EMAILS n'est pas défini)
SUPPORT_EMAIL=support@example.com

# Webhook Slack (optionnel)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Configuration Slack

1. **Créer un Webhook Slack** :
   - Aller sur https://api.slack.com/apps
   - Créer une nouvelle app
   - Activer "Incoming Webhooks"
   - Créer un webhook pour votre canal
   - Copier l'URL du webhook

2. **Ajouter l'URL dans les variables d'environnement** :
   ```env
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

## 🎯 Niveaux d'Alerte

### 1. Info
- Événements informatifs non critiques
- Exemple : Nouvelle fonctionnalité activée, mise à jour de configuration

### 2. Warning
- Avertissements qui nécessitent une attention
- Exemple : Quota d'utilisation élevé, performance dégradée

### 3. Error
- Erreurs système qui nécessitent une intervention
- Exemple : Échec de connexion à la base de données, erreur d'API externe

### 4. Critical
- Erreurs critiques qui nécessitent une intervention immédiate
- Exemple : Panne de service, perte de données, faille de sécurité

## 💻 Utilisation

### Dans le Code

```typescript
import { alertService } from '@/lib/services/alert.service'

// Alerte critique
await alertService.sendCriticalError(error, {
  userId: user.id,
  action: 'payment_processing',
})

// Alerte système
await alertService.sendSystemError(
  'Failed to connect to database',
  { host: 'db.example.com', port: 5432 }
)

// Avertissement
await alertService.sendWarning(
  'High memory usage detected',
  { usage: '85%', threshold: '80%' }
)

// Information
await alertService.sendInfo(
  'New feature activated',
  { feature: 'advanced_analytics' }
)

// Alerte personnalisée
await alertService.sendAlert({
  level: 'error',
  title: 'Payment Processing Failed',
  message: 'Failed to process payment for invoice #123',
  details: {
    invoiceId: '123',
    amount: 1000,
    currency: 'XOF',
  },
  channel: 'both', // Email + Slack
  recipients: ['finance@example.com'], // Destinataires spécifiques
})
```

### Dans les Routes API

```typescript
import { alertService } from '@/lib/services/alert.service'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    // ... logique de traitement
  } catch (error) {
    // Envoyer une alerte pour les erreurs critiques
    if (error instanceof CriticalError) {
      await alertService.sendCriticalError(error, {
        endpoint: '/api/payments',
        method: 'POST',
      })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Dans les Services

```typescript
import { alertService } from '@/lib/services/alert.service'

export class PaymentService {
  async processPayment(paymentId: string) {
    try {
      // ... logique de traitement
    } catch (error) {
      // Logger l'erreur
      logger.error('Payment processing failed', { paymentId, error })

      // Envoyer une alerte
      await alertService.sendSystemError(
        `Payment processing failed for payment ${paymentId}`,
        { paymentId, error: error.message }
      )

      throw error
    }
  }
}
```

## 📧 Format des Emails

Les emails d'alerte incluent :
- **En-tête coloré** : Couleur selon le niveau d'alerte
- **Titre** : Titre de l'alerte
- **Message** : Description détaillée
- **Détails** : Informations supplémentaires (JSON formaté)
- **Timestamp** : Date et heure de l'alerte

## 💬 Format des Messages Slack

Les messages Slack incluent :
- **Titre** : Avec le niveau d'alerte
- **Message** : Description de l'alerte
- **Champs** : Organisation ID, détails, timestamp
- **Couleur** : Selon le niveau d'alerte

## 🎛️ Canaux de Notification

### Email uniquement
```typescript
await alertService.sendAlert({
  level: 'warning',
  title: 'High Usage',
  message: 'Memory usage is above 80%',
  channel: 'email',
})
```

### Slack uniquement
```typescript
await alertService.sendAlert({
  level: 'error',
  title: 'API Error',
  message: 'External API returned 500',
  channel: 'slack',
})
```

### Email + Slack
```typescript
await alertService.sendAlert({
  level: 'critical',
  title: 'System Down',
  message: 'Database connection lost',
  channel: 'both',
})
```

## 🔍 Destinataires

### Destinataires par défaut
- Si `recipients` n'est pas spécifié, les emails sont envoyés à :
  1. `ADMIN_EMAILS` (si configuré)
  2. `SUPPORT_EMAIL` (fallback)

### Destinataires spécifiques
```typescript
await alertService.sendAlert({
  level: 'error',
  title: 'Payment Issue',
  message: 'Payment gateway error',
  recipients: ['finance@example.com', 'tech@example.com'],
})
```

## 🚨 Alertes Automatiques

### Erreurs Critiques
Les erreurs marquées avec `[CRITICAL]` dans les logs sont automatiquement envoyées comme alertes critiques.

```typescript
logger.error('[CRITICAL] Database connection lost', { host: 'db.example.com' })
// → Alerte automatique envoyée
```

### Dashboard de Santé
Le dashboard de santé (`/dashboard/admin/health`) peut être configuré pour envoyer des alertes si :
- La connexion DB échoue
- Les performances se dégradent
- Les erreurs augmentent

## 📊 Monitoring

### Vérifier les Alertes Envoyées

Les alertes sont loggées dans :
- **Console** : En développement
- **Sentry** : En production (si configuré)
- **Logs serveur** : Tous les envois d'alertes

### Tester les Alertes

```typescript
// Test d'alerte email
await alertService.sendInfo('Test Alert', {
  test: true,
  timestamp: new Date().toISOString(),
})

// Test d'alerte Slack
await alertService.sendAlert({
  level: 'info',
  title: 'Test Alert',
  message: 'This is a test alert',
  channel: 'slack',
})
```

## 🔒 Sécurité

- Les emails sont envoyés uniquement aux destinataires autorisés
- Les webhooks Slack doivent être sécurisés (HTTPS uniquement)
- Les informations sensibles ne doivent pas être incluses dans les alertes
- Les alertes sont loggées pour audit

## 📝 Bonnes Pratiques

1. **Utiliser le bon niveau** :
   - `info` : Événements informatifs
   - `warning` : Problèmes non critiques
   - `error` : Erreurs système
   - `critical` : Urgences

2. **Inclure le contexte** :
   - Toujours inclure des détails pertinents
   - Inclure les IDs d'entités concernées
   - Inclure les timestamps si pertinent

3. **Éviter le spam** :
   - Ne pas envoyer d'alertes pour chaque erreur mineure
   - Utiliser le rate limiting si nécessaire
   - Grouper les alertes similaires

4. **Tester régulièrement** :
   - Vérifier que les emails arrivent
   - Vérifier que Slack fonctionne
   - Tester avec différents niveaux

## 🐛 Résolution de Problèmes

### Les emails ne sont pas envoyés

1. Vérifier `ADMIN_EMAILS` ou `SUPPORT_EMAIL`
2. Vérifier la configuration du service email
3. Vérifier les logs pour les erreurs

### Les messages Slack ne sont pas envoyés

1. Vérifier `SLACK_WEBHOOK_URL`
2. Vérifier que le webhook est actif
3. Vérifier les logs pour les erreurs

### Trop d'alertes

1. Ajuster les niveaux d'alerte
2. Implémenter un rate limiting
3. Filtrer les alertes non critiques

## 📞 Support

En cas de problème avec les alertes :
1. Vérifier les logs (`lib/utils/logger.ts`)
2. Vérifier les variables d'environnement
3. Tester manuellement avec `alertService.sendInfo()`---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

