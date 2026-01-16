---
title: Calendrier Interne EDUZEN
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 📅 Calendrier Interne EDUZEN

## Vue d'ensemble

Le calendrier EDUZEN est un système complet de gestion du temps qui intègre :
- **Sessions de formation** (cours, ateliers)
- **Formations** (parcours pédagogiques)
- **Tâches (TODOs)** avec rappels et notifications

Il fonctionne de manière 100% autonome, sans dépendre de services externes (Google Calendar, etc.).

## Fonctionnalités

### 1. Vues du calendrier

| Vue | Description |
|-----|-------------|
| **Mois** | Vue d'ensemble mensuelle avec indicateurs d'événements |
| **Semaine** | Grille horaire détaillée sur 7 jours |
| **Jour** | Focus sur une journée avec slots horaires |
| **Agenda** | Liste chronologique des événements à venir |

### 2. Types d'événements

| Type | Couleur | Source |
|------|---------|--------|
| Sessions | 🟢 Vert (#10B981) | Table `sessions` |
| Formations | 🟣 Violet (#8B5CF6) | Table `formations` |
| Tâches | 🔵 Bleu (#3B82F6) | Table `calendar_todos` |

### 3. Système de TODOs

#### Catégories
- 📋 **Tâche** - Tâche générale
- 👥 **Réunion** - Réunion ou rendez-vous
- ⏰ **Échéance** - Date limite importante
- 🔔 **Rappel** - Simple rappel
- 🎉 **Événement** - Événement spécial

#### Priorités
- **Basse** - Gris
- **Moyenne** - Bleu
- **Haute** - Orange
- **Urgente** - Rouge

#### Fonctionnalités des TODOs
- ✅ Création rapide depuis le calendrier
- ✅ Édition complète avec modal dédié
- ✅ Récurrence (quotidien, hebdomadaire, mensuel, annuel)
- ✅ Tags personnalisés
- ✅ Liaison avec sessions/formations/étudiants
- ✅ Couleurs personnalisables

### 4. Système de notifications

#### Types de notifications
- `todo_reminder` - Rappel de tâche
- `session_reminder` - Rappel de session
- `formation_start` - Début de formation
- `deadline` - Échéance proche

#### Canaux
- **In-app** - Notifications dans l'interface
- **Push** - Notifications navigateur
- **Email** - À venir
- **SMS** - À venir

#### Délais de rappel
- À l'échéance
- 5, 15, 30 minutes avant
- 1h, 2h avant
- 1 jour, 1 semaine avant

## Architecture technique

### Tables Supabase

```sql
-- Tâches
calendar_todos
├── id, organization_id, title, description
├── due_date, due_time, start_date, start_time
├── all_day, category, priority, color, status
├── reminder_enabled, reminder_minutes_before
├── is_recurring, recurrence_rule
├── linked_session_id, linked_formation_id
└── tags, metadata, created_at, updated_at

-- Notifications
calendar_notifications
├── id, organization_id, user_id
├── notification_type, todo_id, session_id, formation_id
├── title, message, status
├── scheduled_at, sent_at, read_at
└── channel, created_at

-- Préférences utilisateur
calendar_user_preferences
├── user_id, organization_id
├── default_view, week_starts_on, show_weekends
├── working_hours_start, working_hours_end
├── default_reminder_minutes
├── email_notifications, push_notifications
├── show_sessions, show_formations, show_todos
└── session_color, formation_color, todo_color
```

### Services

```typescript
// lib/services/calendar.service.ts
calendarService
├── getTodos() - Liste des tâches
├── createTodo() - Créer une tâche
├── updateTodo() - Modifier une tâche
├── deleteTodo() - Supprimer une tâche
├── completeTodo() - Marquer comme terminé
├── getCalendarEvents() - Tous les événements (TODOs + Sessions + Formations)
├── getNotifications() - Notifications utilisateur
├── markNotificationAsRead() - Marquer lu
├── getUserPreferences() - Préférences calendrier
└── upsertUserPreferences() - Modifier préférences
```

### Composants

```
components/calendar/
├── calendar-view.tsx      # Vue principale (mois/semaine/jour/agenda)
├── todo-modal.tsx         # Modal de création/édition de tâche
└── notification-center.tsx # Centre de notifications + hook useCalendarNotifications
```

## Utilisation

### Accès
- URL : `/dashboard/calendar`
- Bouton de notification dans le header (cloche)

### Raccourcis clavier
- `T` - Aujourd'hui
- `N` - Nouvelle tâche
- `←` `→` - Navigation

### Création d'une tâche
1. Cliquer sur "Nouvelle tâche" ou sur une date
2. Remplir le formulaire (titre, date, catégorie, priorité)
3. Configurer le rappel si souhaité
4. Enregistrer

### Notifications
1. Au premier clic sur la cloche, permission de notification demandée
2. Les rappels sont vérifiés toutes les minutes
3. Notification push envoyée selon le délai configuré

## Sécurité

### RLS Policies
- Utilisateurs voient uniquement les TODOs de leur organisation
- Modification limitée au créateur, assigné, ou admin
- Suppression limitée au créateur ou admin
- Notifications accessibles uniquement par leur destinataire

## À venir

- [ ] Intégration email pour les rappels
- [ ] Notifications SMS
- [ ] Vue équipe (qui fait quoi)
- [ ] Export iCal
- [ ] Synchronisation avec calendriers externes (optionnel)
- [ ] Widgets dashboard

## Migration SQL

Appliquer la migration pour créer les tables :
```bash
# Via Supabase CLI
npx supabase db push

# Ou manuellement dans le dashboard Supabase
# Fichier : supabase/migrations/20241204000003_create_calendar_todos.sql
```---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.