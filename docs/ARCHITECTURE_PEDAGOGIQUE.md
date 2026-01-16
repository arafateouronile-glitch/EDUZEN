---
title: Architecture Pédagogique EDUZEN
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Architecture Pédagogique EDUZEN

## Modèle de données

### Entités principales

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE PÉDAGOGIQUE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────┐                     ┌─────────────────┐           │
│   │   PROGRAMMES    │                     │    SESSIONS     │           │
│   │  (Contenus de   │◄────── N:N ────────►│  (Instances de  │           │
│   │   formation)    │   session_programs  │   formation)    │           │
│   └─────────────────┘                     └────────┬────────┘           │
│                                                    │                     │
│                                                    │ N:N                 │
│                                                    │ formation_sessions  │
│                                                    │                     │
│                                           ┌────────▼────────┐           │
│                                           │   FORMATIONS    │           │
│                                           │  (Parcours de   │           │
│                                           │   formation)    │           │
│                                           └─────────────────┘           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Relations

| Relation | Type | Table de liaison | Description |
|----------|------|------------------|-------------|
| Programme ↔ Session | N:N | `session_programs` | Une session peut contenir plusieurs programmes, un programme peut être dans plusieurs sessions |
| Session ↔ Formation | N:N | `formation_sessions` | Une formation peut inclure plusieurs sessions, une session peut appartenir à plusieurs formations |

### Pas de hiérarchie stricte

- **Programmes** : Peuvent être créés indépendamment
- **Sessions** : Peuvent être créées indépendamment (avec `organization_id`)
- **Formations** : Peuvent être créées indépendamment

L'ordre de création n'a pas d'importance. Les associations sont faites a posteriori.

## Tables de base de données

### `programs`
```sql
- id (UUID, PK)
- organization_id (UUID, FK → organizations)
- code (TEXT, unique par org)
- name (TEXT)
- description (TEXT)
- category (TEXT)
- ... (autres champs métier)
```

### `sessions`
```sql
- id (UUID, PK)
- organization_id (UUID, FK → organizations) -- Nouveau: permet sessions indépendantes
- formation_id (UUID, FK → formations, NULLABLE) -- Legacy: relation directe optionnelle
- name (TEXT)
- start_date (DATE)
- end_date (DATE)
- status (TEXT)
- ... (autres champs)
```

### `formations`
```sql
- id (UUID, PK)
- organization_id (UUID, FK → organizations)
- program_id (UUID, FK → programs, NULLABLE) -- Relation optionnelle
- code (TEXT, unique par org)
- name (TEXT)
- ... (autres champs métier)
```

### `session_programs` (Table de liaison N:N)
```sql
- id (UUID, PK)
- session_id (UUID, FK → sessions)
- program_id (UUID, FK → programs)
- organization_id (UUID, FK → organizations)
- created_at, updated_at
- UNIQUE(session_id, program_id)
```

### `formation_sessions` (Table de liaison N:N)
```sql
- id (UUID, PK)
- formation_id (UUID, FK → formations)
- session_id (UUID, FK → sessions)
- organization_id (UUID, FK → organizations)
- order_index (INTEGER) -- Pour ordonner les sessions dans une formation
- created_at, updated_at
- UNIQUE(formation_id, session_id)
```

## Services

### SessionService

```typescript
// Gestion des sessions
sessionService.createSession(session, programIds?, organizationId?)
sessionService.createIndependentSession(session, programIds?, formationIds?)
sessionService.getSessionById(id)
sessionService.getAllSessions(organizationId, filters?)

// Gestion des programmes (N:N)
sessionService.getSessionPrograms(sessionId)
sessionService.updateSessionPrograms(sessionId, programIds, organizationId)

// Gestion des formations (N:N)
sessionService.getSessionFormations(sessionId)
sessionService.updateSessionFormations(sessionId, formationIds, organizationId)
sessionService.addSessionToFormations(sessionId, formationIds, organizationId)
sessionService.removeSessionFromFormation(sessionId, formationId)
sessionService.getFormationSessions(formationId)
```

### FormationService

```typescript
// Gestion des formations
formationService.createFormation(formation)
formationService.getFormationById(id)
formationService.getAllFormations(organizationId, filters?)

// Gestion des sessions (N:N)
formationService.getAllSessionsForFormation(formationId)
formationService.addSessionsToFormation(formationId, sessionIds, organizationId)
formationService.removeSessionFromFormation(formationId, sessionId)
formationService.updateFormationSessions(formationId, sessionIds, organizationId)
formationService.getFormationWithAllSessions(id)
```

## Exemples d'utilisation

### Créer un programme
```typescript
const program = await programService.createProgram({
  organization_id: orgId,
  code: 'PROG-001',
  name: 'Formation bureautique',
  description: 'Programme complet de formation aux outils bureautiques',
})
```

### Créer une session avec plusieurs programmes
```typescript
const session = await sessionService.createIndependentSession(
  {
    organization_id: orgId,
    name: 'Session Janvier 2024',
    start_date: '2024-01-15',
    end_date: '2024-01-19',
    status: 'planned',
  },
  ['program-id-1', 'program-id-2'], // Programmes associés
  ['formation-id-1'] // Formations associées (optionnel)
)
```

### Associer une session à plusieurs formations
```typescript
await sessionService.addSessionToFormations(
  sessionId,
  ['formation-id-1', 'formation-id-2'],
  organizationId
)
```

### Récupérer toutes les sessions d'une formation
```typescript
const sessions = await formationService.getAllSessionsForFormation(formationId)
```

## Migration

La migration `20241204000002_create_formation_sessions_n_n.sql` :
1. Crée la table `formation_sessions` pour les relations N:N
2. Migre les données existantes (relation `sessions.formation_id`)
3. Rend `formation_id` optionnel dans `sessions`
4. Ajoute `organization_id` dans `sessions` pour les sessions indépendantes
5. Met à jour les politiques RLS

## Notes importantes

1. **Rétrocompatibilité** : La colonne `sessions.formation_id` est conservée pour la compatibilité avec le code existant
2. **Flexibilité** : Une session peut exister sans être liée à une formation
3. **Pas de cascade destructive** : La suppression d'une formation ne supprime pas les sessions (seulement les liens)
4. **RLS** : Toutes les tables ont des politiques RLS basées sur `organization_id`---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.