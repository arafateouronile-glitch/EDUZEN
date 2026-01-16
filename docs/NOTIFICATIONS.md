---
title: Guide du Système de Notifications
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔔 Guide du Système de Notifications

Ce document décrit le système de notifications en temps réel implémenté dans EDUZEN.

## 🎯 Vue d'ensemble

Le système de notifications permet d'envoyer des notifications en temps réel aux utilisateurs via Supabase Realtime. Les notifications sont stockées en base de données et affichées dans l'interface utilisateur avec un badge indiquant le nombre de notifications non lues.

## 🏗️ Architecture

### Base de données

**Table** : `notifications`

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ
);
```

**Types de notifications** :
- `info` : Information générale
- `success` : Succès
- `warning` : Avertissement
- `error` : Erreur
- `message` : Message
- `payment` : Paiement
- `attendance` : Présence
- `grade` : Note
- `document` : Document
- `system` : Système

### Services

**`NotificationService`** (`lib/services/notification.service.ts`) :
- Création de notifications
- Récupération des notifications
- Marquage comme lues
- Abonnement en temps réel

### Hooks React

**`useNotifications`** (`lib/hooks/use-notifications.ts`) :
- Récupère les notifications d'un utilisateur
- Gère le nombre de notifications non lues
- S'abonne aux mises à jour en temps réel
- Fournit des mutations pour marquer comme lues

**`useUnreadNotificationsCount`** :
- Hook léger pour obtenir uniquement le nombre de notifications non lues
- Utile pour les badges

### Composants UI

**`NotificationBadge`** (`components/notifications/notification-badge.tsx`) :
- Badge affichant le nombre de notifications non lues
- Intégré dans le header

**`NotificationCenter`** (`components/notifications/notification-center.tsx`) :
- Centre de notifications avec liste complète
- Filtres (Toutes / Non lues)
- Actions (Marquer comme lu, Supprimer)

## 💻 Utilisation

### Créer une notification

```typescript
import { notificationService } from '@/lib/services/notification.service'

// Notification simple
await notificationService.create({
  user_id: 'user-id',
  organization_id: 'org-id',
  type: 'info',
  title: 'Nouvelle notification',
  message: 'Ceci est un message de notification',
})

// Notification avec lien
await notificationService.create({
  user_id: 'user-id',
  organization_id: 'org-id',
  type: 'payment',
  title: 'Paiement reçu',
  message: 'Un paiement de 1000 XOF a été reçu',
  link: '/dashboard/payments/123',
  data: {
    payment_id: '123',
    amount: 1000,
  },
})

// Notification pour plusieurs utilisateurs
await notificationService.createForUsers(
  ['user-1', 'user-2', 'user-3'],
  'org-id',
  'info',
  'Annonce importante',
  'Une nouvelle fonctionnalité est disponible',
  { feature: 'notifications' },
  '/dashboard/features'
)
```

### Utiliser dans un composant

```tsx
import { useNotifications } from '@/lib/hooks/use-notifications'

function MyComponent() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({ limit: 50 })

  return (
    <div>
      <h2>Notifications ({unreadCount} non lues)</h2>
      {notifications.map((notification) => (
        <div key={notification.id}>
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
          {!notification.read_at && (
            <button onClick={() => markAsRead(notification.id)}>
              Marquer comme lu
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
```

### Badge de notifications

```tsx
import { NotificationBadge } from '@/components/notifications/notification-badge'
import { NotificationCenter } from '@/components/notifications/notification-center'
import { useState } from 'react'

function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <NotificationBadge onClick={() => setIsOpen(true)} />
      <NotificationCenter open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
```

## 🔄 Temps réel

Le système utilise Supabase Realtime pour les notifications en temps réel :

1. **Abonnement** : Le hook `useNotifications` s'abonne automatiquement aux changements
2. **Événements** : Les événements `INSERT` et `UPDATE` sont écoutés
3. **Mise à jour** : Les notifications sont mises à jour automatiquement dans l'UI
4. **Toast** : Un toast est affiché pour les nouvelles notifications (sauf type `system`)

## 📊 Fonctions RPC

### `create_notification`
Crée une nouvelle notification.

```sql
SELECT create_notification(
  p_user_id := 'user-id',
  p_organization_id := 'org-id',
  p_type := 'info',
  p_title := 'Titre',
  p_message := 'Message',
  p_data := '{}'::jsonb,
  p_link := NULL,
  p_expires_at := NULL
);
```

### `mark_notification_read`
Marque une notification comme lue.

```sql
SELECT mark_notification_read('notification-id');
```

### `mark_all_notifications_read`
Marque toutes les notifications d'un utilisateur comme lues.

```sql
SELECT mark_all_notifications_read('user-id');
```

### `get_unread_notifications_count`
Retourne le nombre de notifications non lues.

```sql
SELECT get_unread_notifications_count('user-id');
```

### `cleanup_expired_notifications`
Nettoie les notifications expirées (à exécuter via CRON).

```sql
SELECT cleanup_expired_notifications();
```

## 🔒 Sécurité

- **RLS** : Les utilisateurs ne peuvent voir que leurs propres notifications
- **Validation** : Les types de notifications sont validés
- **Expiration** : Les notifications peuvent expirer automatiquement
- **Nettoyage** : Fonction CRON pour nettoyer les notifications expirées

## 🎨 Personnalisation

### Types de notifications

Les types de notifications ont des couleurs associées :

```typescript
const notificationTypeColors = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  message: 'bg-purple-500',
  payment: 'bg-indigo-500',
  attendance: 'bg-teal-500',
  grade: 'bg-pink-500',
  document: 'bg-orange-500',
  system: 'bg-gray-500',
}
```

### Formatage du temps relatif

Les notifications affichent le temps relatif (ex: "Il y a 2 heures") grâce à la fonction `formatRelativeTime`.

## 📝 Exemples d'utilisation

### Notification de paiement

```typescript
await notificationService.create({
  user_id: student.user_id,
  organization_id: student.organization_id,
  type: 'payment',
  title: 'Paiement reçu',
  message: `Un paiement de ${amount} ${currency} a été enregistré`,
  link: `/dashboard/payments/${paymentId}`,
  data: {
    payment_id: paymentId,
    amount,
    currency,
  },
})
```

### Notification de présence

```typescript
await notificationService.create({
  user_id: teacher.user_id,
  organization_id: teacher.organization_id,
  type: 'attendance',
  title: 'Présence enregistrée',
  message: `${studentName} a été marqué(e) présent(e)`,
  link: `/dashboard/attendance/${sessionId}`,
})
```

### Notification système

```typescript
await notificationService.create({
  user_id: user.id,
  organization_id: user.organization_id,
  type: 'system',
  title: 'Maintenance programmée',
  message: 'Une maintenance est prévue le 1er janvier de 2h à 4h',
  expires_at: '2024-01-02T00:00:00Z',
})
```

## 🚀 Prochaines améliorations

- [ ] Notifications push (browser notifications)
- [ ] Préférences de notification par utilisateur
- [ ] Groupement de notifications similaires
- [ ] Notifications programmées
- [ ] Templates de notifications
- [ ] Statistiques de notifications

---

**Note** : Le système de notifications est entièrement fonctionnel et prêt à être utilisé dans toute l'application.---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

