---
title: Guide de Standardisation des Services
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 📘 Guide de Standardisation des Services

Ce guide explique comment standardiser tous les services pour utiliser l'ErrorHandler global.

## 🎯 Objectifs

1. **Gestion d'erreurs cohérente** : Toutes les erreurs sont gérées de la même manière
2. **Messages utilisateur clairs** : Messages traduits et compréhensibles
3. **Logging automatique** : Toutes les erreurs sont loggées avec contexte
4. **Classification automatique** : Les erreurs sont classées par type et sévérité
5. **Retry automatique** : Les erreurs retryable peuvent être relancées automatiquement

---

## 📋 Checklist de Standardisation

Pour chaque service, effectuez les modifications suivantes :

### 1. Imports

**AVANT :**
```typescript
import { createClient } from '@/lib/supabase/client'
```

**APRÈS :**
```typescript
import { createClient } from '@/lib/supabase/client'
import { errorHandler, ErrorCode, AppError } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'
```

### 2. Gestion d'erreurs dans les méthodes

**AVANT :**
```typescript
async getAll(organizationId: string) {
  const { data, error } = await this.supabase
    .from('table')
    .select('*')
    .eq('organization_id', organizationId)

  if (error) throw error  // ❌ Pas de gestion cohérente
  return data
}
```

**APRÈS :**
```typescript
async getAll(organizationId: string) {
  try {
    const { data, error } = await this.supabase
      .from('table')
      .select('*')
      .eq('organization_id', organizationId)

    if (error) {
      throw errorHandler.handleError(error, {
        organizationId,
        operation: 'getAll',
      })
    }

    return data || []
  } catch (error) {
    // Si c'est déjà une AppError, la relancer
    if (error instanceof AppError) {
      throw error
    }
    // Sinon, la convertir
    throw errorHandler.handleError(error, {
      organizationId,
      operation: 'getAll',
    })
  }
}
```

### 3. Gestion d'erreurs spécifiques

**Erreur "Not Found" :**
```typescript
if (error.code === 'PGRST116' || error.code === '42P01') {
  throw errorHandler.handleError(error, {
    code: ErrorCode.DB_NOT_FOUND,
    operation: 'getById',
    id,
  })
}
```

**Erreur "Unique Constraint" :**
```typescript
if (error.code === '23505') {
  throw errorHandler.handleError(error, {
    code: ErrorCode.VALIDATION_UNIQUE_CONSTRAINT,
    operation: 'create',
    field: 'name',
  })
}
```

**Erreur "RLS Policy Violation" :**
```typescript
if (error.code === '42501') {
  throw errorHandler.handleError(error, {
    code: ErrorCode.DB_RLS_POLICY_VIOLATION,
    operation: 'delete',
    id,
  })
}
```

### 4. Validation avant opérations

**AVANT :**
```typescript
async create(entity: EntityInsert) {
  const { data, error } = await this.supabase
    .from('table')
    .insert(entity)
    .select()
    .single()

  if (error) throw error
  return data
}
```

**APRÈS :**
```typescript
async create(entity: EntityInsert) {
  try {
    // Validation
    if (!entity.name) {
      throw errorHandler.createValidationError(
        'Le nom est obligatoire',
        'name'
      )
    }

    const { data, error } = await this.supabase
      .from('table')
      .insert(entity)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw errorHandler.handleError(error, {
          code: ErrorCode.VALIDATION_UNIQUE_CONSTRAINT,
          operation: 'create',
          field: 'name',
        })
      }
      throw errorHandler.handleError(error, {
        operation: 'create',
        entity,
      })
    }

    logger.info('Enregistrement créé avec succès', {
      id: data?.id,
      organizationId: entity.organization_id,
    })

    return data
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw errorHandler.handleError(error, {
      operation: 'create',
      entity,
    })
  }
}
```

### 5. Logging des opérations réussies

Ajoutez des logs pour les opérations importantes :

```typescript
logger.info('Enregistrement créé avec succès', {
  id: data?.id,
  organizationId: entity.organization_id,
})
```

---

## 🔄 Utilisation dans les Composants

### Avec useErrorHandler Hook

**AVANT :**
```typescript
const { mutate } = useMutation({
  mutationFn: async (data) => {
    return await service.create(data)
  },
  onError: (error) => {
    console.error(error)  // ❌ Pas de notification utilisateur
  },
})
```

**APRÈS :**
```typescript
const { handleError } = useErrorHandler()

const { mutate } = useMutation({
  mutationFn: async (data) => {
    return await service.create(data)
  },
  onError: (error) => {
    handleError(error, {
      operation: 'create',
      component: 'MyComponent',
    })
  },
})
```

### Avec try/catch direct

```typescript
const { handleError } = useErrorHandler()

try {
  const result = await service.create(data)
  // Succès
} catch (error) {
  handleError(error, {
    operation: 'create',
    component: 'MyComponent',
  })
}
```

---

## 📊 Codes d'Erreurs Disponibles

### Authentification (1000-1999)
- `AUTH_REQUIRED` : Utilisateur non authentifié
- `AUTH_INVALID_CREDENTIALS` : Identifiants invalides
- `AUTH_SESSION_EXPIRED` : Session expirée
- `AUTH_INSUFFICIENT_PERMISSIONS` : Permissions insuffisantes
- `AUTH_2FA_REQUIRED` : 2FA requise
- `AUTH_2FA_INVALID` : Code 2FA invalide

### Validation (2000-2999)
- `VALIDATION_ERROR` : Erreur de validation générale
- `VALIDATION_REQUIRED_FIELD` : Champ obligatoire manquant
- `VALIDATION_INVALID_FORMAT` : Format invalide
- `VALIDATION_UNIQUE_CONSTRAINT` : Valeur déjà existante

### Base de données (3000-3999)
- `DB_CONNECTION_ERROR` : Erreur de connexion
- `DB_QUERY_ERROR` : Erreur de requête
- `DB_NOT_FOUND` : Ressource introuvable
- `DB_CONSTRAINT_VIOLATION` : Violation de contrainte
- `DB_RLS_POLICY_VIOLATION` : Violation de politique RLS

### Réseau/API (4000-4999)
- `NETWORK_ERROR` : Erreur réseau
- `API_TIMEOUT` : Timeout
- `API_RATE_LIMIT` : Limite de taux
- `API_SERVER_ERROR` : Erreur serveur
- `API_NOT_FOUND` : Ressource introuvable
- `API_BAD_REQUEST` : Requête invalide

### Métier (5000-5999)
- `BUSINESS_LOGIC_ERROR` : Erreur de logique métier
- `RESOURCE_LOCKED` : Ressource verrouillée
- `OPERATION_NOT_ALLOWED` : Opération non autorisée
- `QUOTA_EXCEEDED` : Quota dépassé

### Système (6000-6999)
- `INTERNAL_ERROR` : Erreur interne
- `CONFIGURATION_ERROR` : Erreur de configuration
- `SERVICE_UNAVAILABLE` : Service indisponible

---

## ✅ Exemple Complet

Voir le fichier `lib/services/_example-standardized.service.ts` pour un exemple complet.

---

## 🚀 Prochaines Étapes

1. Standardiser les services critiques en premier :
   - `payment.service.ts`
   - `student.service.ts`
   - `invoice.service.ts`
   - `attendance.service.ts`

2. Puis les autres services par ordre de priorité

3. Mettre à jour les composants pour utiliser `useErrorHandler`

4. Tester chaque service standardisé

---

## 📝 Notes

- Tous les services doivent utiliser `errorHandler.handleError()`
- Tous les composants doivent utiliser `useErrorHandler()` hook
- Les erreurs sont automatiquement loggées selon leur sévérité
- Les messages utilisateur sont automatiquement traduits
- Les erreurs retryable peuvent être relancées automatiquement---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.