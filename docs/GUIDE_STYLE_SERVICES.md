---
title: Guide de Style pour les Services
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Guide de Style pour les Services

Ce document définit les conventions et patterns à suivre lors de la création ou modification de services dans l'application EDUZEN.

## Décision Architecturale : Classes vs Fonctions

**Décision : Utiliser des Classes pour tous les services**

Après analyse de l'ensemble du codebase, la décision a été prise d'utiliser **uniquement des classes** pour tous les services métier. Cette décision est basée sur :

### Avantages des Classes

1. **État cohérent** : Chaque service maintient sa propre instance Supabase, garantissant une configuration uniforme
2. **Testabilité** : Facilite le mocking et les tests unitaires (on peut facilement injecter une instance mockée)
3. **Extensibilité** : Permet l'héritage et la composition pour des services spécialisés
4. **Encapsulation** : Les méthodes privées peuvent être utilisées pour la logique interne
5. **Singleton pattern** : Facilite l'export d'une instance unique réutilisable

### Inconvénients des Fonctions (pourquoi on ne les utilise pas)

1. **Pas d'état partagé** : Chaque fonction devrait créer sa propre instance Supabase
2. **Difficile à tester** : Moins flexible pour l'injection de dépendances
3. **Pas d'héritage** : Impossible d'étendre ou de composer facilement

### État Actuel du Codebase

Tous les services existants (56+ services) utilisent déjà le pattern de classes. Cette uniformité facilite :
- La maintenance
- L'onboarding des nouveaux développeurs
- La cohérence du code

## Structure Générale

### Pattern Recommandé : Classes

Tous les services doivent être des **classes** (pas de fonctions exportées) pour :
- Maintenir un état cohérent (instance Supabase)
- Faciliter les tests unitaires
- Permettre l'extension future

```typescript
import { createClient } from '@/lib/supabase/client'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type Entity = TableRow<'table_name'>
type EntityInsert = TableInsert<'table_name'>
type EntityUpdate = TableUpdate<'table_name'>

export class EntityService {
  private supabase = createClient()

  // Méthodes du service...
}
```

### Export d'Instance Singleton

Chaque service doit exporter une instance singleton pour faciliter l'utilisation :

```typescript
export const entityService = new EntityService()
```

## Méthodes Standard

### 1. `getAll()` - Récupération avec Pagination

**Signature standard :**
```typescript
async getAll(
  organizationId: string,
  filters?: {
    // Filtres spécifiques à l'entité
    page?: number
    limit?: number
    search?: string
  }
): Promise<{
  data: Entity[]
  total: number
  page: number
  limit: number
  totalPages: number
}>
```

**Exemple :**
```typescript
async getAll(organizationId: string, filters?: {
  status?: Entity['status']
  search?: string
  page?: number
  limit?: number
}) {
  const page = filters?.page || 1
  const limit = filters?.limit || 50
  const offset = (page - 1) * limit

  let query = this.supabase
    .from('table_name')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.search) {
    query = query.or(`field1.ilike.%${filters.search}%,field2.ilike.%${filters.search}%`)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  }
}
```

### 2. `getById()` - Récupération par ID

**Signature standard :**
```typescript
async getById(id: string): Promise<Entity>
```

**Exemple :**
```typescript
async getById(id: string) {
  const { data, error } = await this.supabase
    .from('table_name')
    .select('*, related_table(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}
```

### 3. `create()` - Création

**Signature standard :**
```typescript
async create(entity: EntityInsert): Promise<Entity>
```

**Exemple :**
```typescript
async create(entity: EntityInsert) {
  // Validation optionnelle
  if (!entity.name) {
    throw new Error('Le nom est requis')
  }

  const { data, error } = await this.supabase
    .from('table_name')
    .insert(entity)
    .select()
    .single()

  if (error) throw error
  return data
}
```

### 4. `update()` - Mise à jour

**Signature standard :**
```typescript
async update(id: string, updates: EntityUpdate): Promise<Entity>
```

**Exemple :**
```typescript
async update(id: string, updates: EntityUpdate) {
  const { data, error } = await this.supabase
    .from('table_name')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
```

### 5. `delete()` - Suppression

**Signature standard :**
```typescript
async delete(id: string): Promise<void>
```

**Exemple :**
```typescript
async delete(id: string) {
  const { error } = await this.supabase
    .from('table_name')
    .delete()
    .eq('id', id)

  if (error) throw error
}
```

## Gestion des Erreurs

### Utiliser `errorHandler` et `AppError`

```typescript
import { errorHandler, AppError, ErrorCode } from '@/lib/errors'

async getAll(organizationId: string) {
  try {
    // Code du service...
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw errorHandler.handleError(error, {
      organizationId,
      operation: 'getAll',
    })
  }
}
```

## Documentation JSDoc

Toutes les méthodes publiques doivent avoir une documentation JSDoc :

```typescript
/**
 * Récupère tous les étudiants d'une organisation avec pagination
 * 
 * @param organizationId - ID de l'organisation
 * @param filters - Filtres optionnels (classe, statut, recherche, pagination)
 * @returns Objet avec data, total, page, limit, totalPages
 * @throws {AppError} Si l'organisation n'existe pas ou si l'utilisateur n'a pas les droits
 */
async getAll(organizationId: string, filters?: {...}) {
  // ...
}
```

## Helpers Utilitaires

### Utiliser les Helpers Existants

Pour réduire la duplication, utilisez les helpers de `@/lib/utils/supabase-helpers` :

```typescript
import { getAllByOrganization, getById } from '@/lib/utils/supabase-helpers'

async getAll(organizationId: string, filters?: {...}) {
  return getAllByOrganization<Entity>(
    this.supabase,
    'table_name',
    organizationId,
    {
      select: '*, related_table(*)',
      filters: { status: filters?.status },
      search: filters?.search ? { field: 'name', value: filters.search } : undefined,
      orderBy: { column: 'created_at', ascending: false },
    }
  )
}
```

## Validation

### Utiliser les Validators

```typescript
import { validateRequired, validatePositiveAmount } from '@/lib/utils/validators'

async create(entity: EntityInsert) {
  validateRequired(entity.name, 'Le nom est requis')
  if (entity.amount) {
    validatePositiveAmount(entity.amount, 'Le montant doit être positif')
  }
  // ...
}
```

## Génération de Numéros Uniques

### Utiliser `generateUniqueNumber`

```typescript
import { generateUniqueNumber } from '@/lib/utils/number-generator'

async create(entity: EntityInsert) {
  const uniqueNumber = await generateUniqueNumber(
    this.supabase,
    'table_name',
    'number_field',
    { prefix: 'STU', length: 6 }
  )

  const { data, error } = await this.supabase
    .from('table_name')
    .insert({ ...entity, number_field: uniqueNumber })
    // ...
}
```

## Logging

### Utiliser le Logger Centralisé

```typescript
import { logger } from '@/lib/utils/logger'

async create(entity: EntityInsert) {
  logger.info('Création d\'une nouvelle entité', { entity })
  
  try {
    // ...
    logger.info('Entité créée avec succès', { id: data.id })
    return data
  } catch (error) {
    logger.error('Erreur lors de la création de l\'entité', { error, entity })
    throw error
  }
}
```

## Tests

### Structure des Tests

Chaque service doit avoir des tests unitaires dans `tests/services/` :

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EntityService } from '@/lib/services/entity.service'

describe('EntityService', () => {
  let service: EntityService

  beforeEach(() => {
    service = new EntityService()
  })

  describe('getAll', () => {
    it('should return paginated results', async () => {
      // Test...
    })
  })
})
```

## Checklist de Création de Service

- [ ] Service créé comme classe
- [ ] Instance singleton exportée
- [ ] Méthodes `getAll`, `getById`, `create`, `update`, `delete` implémentées
- [ ] Pagination implémentée dans `getAll`
- [ ] Gestion d'erreurs avec `errorHandler`
- [ ] Documentation JSDoc pour toutes les méthodes publiques
- [ ] Utilisation des helpers quand approprié
- [ ] Validation des données d'entrée
- [ ] Logging des opérations importantes
- [ ] Tests unitaires créés

## Exemples de Services de Référence

- `lib/services/student.service.ts` - Service complet avec pagination, recherche, validation
- `lib/services/payment.service.ts` - Service avec logique métier complexe
- `lib/services/document.service.ts` - Service simple avec CRUD de base

## Notes Importantes

1. **Toujours filtrer par `organization_id`** pour garantir l'isolation multi-tenant
2. **Utiliser RLS** - Les politiques RLS doivent être configurées dans les migrations
3. **Pagination par défaut** - Limiter à 50 résultats par défaut
4. **Types stricts** - Utiliser `TableRow`, `TableInsert`, `TableUpdate` pour le typage
5. **Pas de logique UI** - Les services ne doivent contenir que la logique métier---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.