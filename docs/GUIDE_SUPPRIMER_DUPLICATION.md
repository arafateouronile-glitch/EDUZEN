---
title: Guide de Suppression de la Duplication de Code
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔄 Guide de Suppression de la Duplication de Code

## 🎯 Objectif

Réduire la duplication de code identifiée (15%) pour améliorer la maintenabilité.

## 🔍 Types de Duplication Identifiés

### 1. Gestion d'Erreurs (Résolu ✅)
- **Avant** : `if (error) throw error` partout
- **Après** : ErrorHandler centralisé

### 2. Requêtes Supabase Répétitives

**Pattern identifié :**
```typescript
// Répété dans plusieurs services
const { data, error } = await this.supabase
  .from('table')
  .select('*')
  .eq('organization_id', organizationId)
  .order('created_at', { ascending: false })

if (error) throw error
return data
```

**Solution : Créer des helpers réutilisables**

```typescript
// lib/utils/supabase-helpers.ts
export async function getAllByOrganization<T>(
  supabase: SupabaseClient,
  table: string,
  organizationId: string,
  options?: {
    filters?: Record<string, unknown>
    orderBy?: { column: string; ascending?: boolean }
    select?: string
  }
): Promise<T[]> {
  let query = supabase
    .from(table)
    .select(options?.select || '*')
    .eq('organization_id', organizationId)

  if (options?.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? false,
    })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    throw errorHandler.handleError(error, {
      organizationId,
      operation: 'getAllByOrganization',
      table,
    })
  }

  return (data || []) as T[]
}
```

### 3. Validation de Données

**Pattern identifié :**
```typescript
// Répété dans plusieurs services
if (!entity.name) {
  throw new Error('Le nom est obligatoire')
}
if (!entity.organization_id) {
  throw new Error('L\'organisation est obligatoire')
}
```

**Solution : Créer des validators réutilisables**

```typescript
// lib/utils/validators.ts
export function validateRequired<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[]
): void {
  for (const field of fields) {
    if (!data[field]) {
      throw errorHandler.createValidationError(
        `Le champ ${String(field)} est obligatoire`,
        String(field)
      )
    }
  }
}

// Utilisation
validateRequired(invoice, ['organization_id', 'student_id'])
```

### 4. Génération de Numéros Uniques

**Pattern identifié :**
```typescript
// Répété dans InvoiceService et StudentService
const { data: lastRecord } = await this.supabase
  .from('table')
  .select('number')
  .eq('organization_id', organizationId)
  .like('number', `${prefix}-${orgCode}-${year}-%`)
  .order('number', { ascending: false })
  .limit(1)
  .maybeSingle()

let sequence = 1
if (lastRecord?.number) {
  const parts = lastRecord.number.split('-')
  const lastSequence = parseInt(parts[parts.length - 1] || '0')
  sequence = lastSequence + 1
}

return `${prefix}-${orgCode}-${year}-${String(sequence).padStart(6, '0')}`
```

**Solution : Créer une fonction générique**

```typescript
// lib/utils/number-generator.ts
export async function generateUniqueNumber(
  supabase: SupabaseClient,
  table: string,
  organizationId: string,
  options: {
    prefix: string
    orgCode: string
    year?: string
    padding?: number
    fieldName?: string
  }
): Promise<string> {
  const year = options.year || new Date().getFullYear().toString().slice(-2)
  const padding = options.padding || 6
  const fieldName = options.fieldName || 'number'
  const pattern = `${options.prefix}-${options.orgCode}-${year}-%`

  const { data: lastRecord } = await supabase
    .from(table)
    .select(fieldName)
    .eq('organization_id', organizationId)
    .like(fieldName, pattern)
    .order(fieldName, { ascending: false })
    .limit(1)
    .maybeSingle()

  let sequence = 1
  if (lastRecord?.[fieldName]) {
    const parts = String(lastRecord[fieldName]).split('-')
    const lastSequence = parseInt(parts[parts.length - 1] || '0')
    sequence = lastSequence + 1
  }

  return `${options.prefix}-${options.orgCode}-${year}-${String(sequence).padStart(padding, '0')}`
}
```

### 5. Logging Répétitif

**Pattern identifié :**
```typescript
// Répété dans plusieurs services
logger.info('Enregistrement créé avec succès', {
  id: data?.id,
  organizationId: entity.organization_id,
})
```

**Solution : Créer des helpers de logging**

```typescript
// lib/utils/logger-helpers.ts
export function logSuccess(
  operation: string,
  data: { id?: string; organizationId?: string; [key: string]: unknown }
) {
  logger.info(`${operation} réussi`, data)
}

export function logError(
  operation: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  logger.error(`Erreur lors de ${operation}`, error, context)
}
```

---

## 📋 Checklist de Refactoring

### Phase 1 : Helpers Réutilisables
- [ ] Créer `lib/utils/supabase-helpers.ts` avec fonctions communes
- [ ] Créer `lib/utils/validators.ts` avec validations communes
- [ ] Créer `lib/utils/number-generator.ts` pour génération de numéros
- [ ] Créer `lib/utils/logger-helpers.ts` pour logging

### Phase 2 : Refactoring Services
- [ ] Refactoriser `InvoiceService` pour utiliser les helpers
- [ ] Refactoriser `StudentService` pour utiliser les helpers
- [ ] Refactoriser `PaymentService` pour utiliser les helpers
- [ ] Refactoriser `AttendanceService` pour utiliser les helpers

### Phase 3 : Autres Services
- [ ] Identifier et refactoriser les autres services avec duplication
- [ ] Tester chaque refactoring
- [ ] Documenter les changements

---

## 🚀 Exemple Complet de Refactoring

**AVANT :**
```typescript
export class InvoiceService {
  async getAll(organizationId: string, filters?: {...}) {
    let query = this.supabase
      .from('invoices')
      .select('*, students(*)')
      .eq('organization_id', organizationId)

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query.order('issue_date', { ascending: false })

    if (error) throw error
    return data
  }

  private async generateInvoiceNumber(...) {
    // 30 lignes de code dupliqué
  }
}
```

**APRÈS :**
```typescript
import { getAllByOrganization } from '@/lib/utils/supabase-helpers'
import { generateUniqueNumber } from '@/lib/utils/number-generator'

export class InvoiceService {
  async getAll(organizationId: string, filters?: {...}) {
    return getAllByOrganization<Invoice>(
      this.supabase,
      'invoices',
      organizationId,
      {
        select: '*, students(id, first_name, last_name)',
        filters: {
          ...(filters?.studentId && { student_id: filters.studentId }),
          ...(filters?.status && { status: filters.status }),
        },
        orderBy: { column: 'issue_date', ascending: false },
      }
    )
  }

  private async generateInvoiceNumber(...) {
    return generateUniqueNumber(this.supabase, 'invoices', organizationId, {
      prefix: 'FAC',
      orgCode,
      year,
      padding: 6,
      fieldName: 'invoice_number',
    })
  }
}
```

---

## 📊 Métriques

- **Avant** : ~15% de duplication
- **Objectif** : <5% de duplication
- **Gain estimé** : Réduction de 10% du code total

---

## ✅ Validation

Après chaque refactoring :
1. ✅ Tests passent
2. ✅ Pas de régression fonctionnelle
3. ✅ Code plus lisible
4. ✅ Documentation mise à jour---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.