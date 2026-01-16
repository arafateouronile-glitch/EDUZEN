---
title: Guide de Correction des Requêtes N1
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔧 Guide de Correction des Requêtes N+1

## 🎯 Problème

Les requêtes N+1 se produisent quand on fait une requête principale, puis N requêtes supplémentaires pour chaque résultat. Par exemple :

```typescript
// ❌ MAUVAIS : Requête N+1
const students = await supabase.from('students').select('*').eq('organization_id', orgId)
for (const student of students.data) {
  const class = await supabase.from('classes').select('*').eq('id', student.class_id).single()
  // N requêtes pour N étudiants
}
```

## ✅ Solution : Utiliser les Jointures Supabase

Supabase permet de faire des jointures directement dans la requête :

```typescript
// ✅ BON : Une seule requête avec jointure
const { data } = await supabase
  .from('students')
  .select('*, classes(*)') // Jointure automatique
  .eq('organization_id', orgId)
```

---

## 📋 Exemples de Corrections

### Exemple 1 : Students avec Classes

**AVANT (N+1) :**
```typescript
async getAll(organizationId: string) {
  const { data: students } = await this.supabase
    .from('students')
    .select('*')
    .eq('organization_id', organizationId)

  // ❌ N requêtes supplémentaires
  for (const student of students || []) {
    if (student.class_id) {
      const { data: class } = await this.supabase
        .from('classes')
        .select('*')
        .eq('id', student.class_id)
        .single()
      student.class = class
    }
  }

  return students
}
```

**APRÈS (Jointure) :**
```typescript
async getAll(organizationId: string) {
  const { data, error } = await this.supabase
    .from('students')
    .select('*, classes(*)') // ✅ Jointure en une requête
    .eq('organization_id', organizationId)

  if (error) throw error
  return data
}
```

### Exemple 2 : Invoices avec Students et Payments

**AVANT (N+1) :**
```typescript
async getAll(organizationId: string) {
  const { data: invoices } = await this.supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', organizationId)

  // ❌ N requêtes pour students
  for (const invoice of invoices || []) {
    const { data: student } = await this.supabase
      .from('students')
      .select('*')
      .eq('id', invoice.student_id)
      .single()
    invoice.student = student

    // ❌ N requêtes pour payments
    const { data: payments } = await this.supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoice.id)
    invoice.payments = payments
  }

  return invoices
}
```

**APRÈS (Jointures multiples) :**
```typescript
async getAll(organizationId: string) {
  const { data, error } = await this.supabase
    .from('invoices')
    .select('*, students(*), payments(*)') // ✅ Toutes les jointures en une requête
    .eq('organization_id', organizationId)

  if (error) throw error
  return data
}
```

### Exemple 3 : Attendance avec Students, Classes, Sessions

**AVANT (N+1) :**
```typescript
async getAll(organizationId: string) {
  const { data: attendance } = await this.supabase
    .from('attendance')
    .select('*')
    .eq('organization_id', organizationId)

  // ❌ N requêtes pour chaque relation
  for (const record of attendance || []) {
    if (record.student_id) {
      const { data: student } = await this.supabase
        .from('students')
        .select('*')
        .eq('id', record.student_id)
        .single()
      record.student = student
    }
    // ... même chose pour classes et sessions
  }

  return attendance
}
```

**APRÈS (Jointures multiples) :**
```typescript
async getAll(organizationId: string) {
  const { data, error } = await this.supabase
    .from('attendance')
    .select('*, students(*), classes(*), sessions(*)') // ✅ Toutes les jointures
    .eq('organization_id', organizationId)

  if (error) throw error
  return data
}
```

---

## 🔍 Comment Identifier les Requêtes N+1

1. **Ouvrir les DevTools → Network**
2. **Filtrer par "Fetch/XHR"**
3. **Charger une page avec une liste**
4. **Compter les requêtes** : Si vous voyez beaucoup de requêtes similaires (ex: 50 requêtes pour 50 étudiants), c'est probablement N+1

### Exemple de Pattern N+1 Détecté

```
GET /rest/v1/students?organization_id=eq.xxx
GET /rest/v1/classes?id=eq.xxx  ← Requête 1
GET /rest/v1/classes?id=eq.yyy  ← Requête 2
GET /rest/v1/classes?id=eq.zzz  ← Requête 3
... (N requêtes)
```

**Devrait être :**
```
GET /rest/v1/students?select=*,classes(*)&organization_id=eq.xxx
```

---

## 📝 Checklist de Correction

Pour chaque service, vérifiez :

- [ ] Les méthodes `getAll()` utilisent des jointures (`select('*, relation(*)')`)
- [ ] Les méthodes `getById()` utilisent des jointures si nécessaire
- [ ] Pas de boucles `for` ou `map` avec des requêtes Supabase à l'intérieur
- [ ] Les relations sont chargées en une seule requête
- [ ] Les requêtes sont testées dans les DevTools Network

---

## 🎯 Services à Corriger en Priorité

1. **StudentService** - `getAll()` avec `classes(*)`
2. **InvoiceService** - `getAll()` avec `students(*), payments(*)`
3. **AttendanceService** - `getAll()` avec `students(*), classes(*), sessions(*)`
4. **PaymentService** - `getAll()` avec `invoices(*), students(*)`
5. **SessionService** - `getAll()` avec `programs(*), classes(*)`

---

## 💡 Bonnes Pratiques

1. **Toujours utiliser des jointures** pour les relations
2. **Limiter les champs** si nécessaire : `select('id, name, classes(id, name)')`
3. **Éviter les jointures profondes** : `select('*, students(*, classes(*))')` peut être lent
4. **Utiliser `maybeSingle()`** pour les relations optionnelles
5. **Tester les performances** avec des datasets réalistes

---

## 🔧 Outils de Détection

### Supabase Dashboard
- Aller dans "Database" → "Logs"
- Filtrer par "SELECT"
- Identifier les requêtes répétitives

### React Query DevTools
- Installer `@tanstack/react-query-devtools`
- Observer les requêtes dans le DevTools
- Identifier les requêtes multiples pour la même ressource

---

## ✅ Exemple Complet Corrigé

```typescript
// ✅ Service corrigé avec jointures
export class StudentService {
  private supabase = createClient()

  async getAll(organizationId: string, filters?: {
    classId?: string
    status?: Student['status']
  }) {
    let query = this.supabase
      .from('students')
      .select('*, classes(id, name, level)') // ✅ Jointure
      .eq('organization_id', organizationId)

    if (filters?.classId) {
      query = query.eq('class_id', filters.classId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query.order('last_name', { ascending: true })

    if (error) {
      throw errorHandler.handleError(error, {
        organizationId,
        operation: 'getAll',
      })
    }

    return data || []
  }
}
```

---

## 🚀 Impact Performance

**Avant (N+1) :**
- 100 étudiants = 101 requêtes (1 + 100)
- Temps : ~2-5 secondes

**Après (Jointure) :**
- 100 étudiants = 1 requête
- Temps : ~200-500ms

**Gain : 10x plus rapide !** 🚀---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.