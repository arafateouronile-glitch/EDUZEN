---
title: Guide de Remplacement des any par Types Stricts
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔧 Guide de Remplacement des `any` par Types Stricts

## 🎯 Objectif

Remplacer tous les `any` par des types TypeScript stricts pour améliorer la sécurité de type et la maintenabilité.

## 📊 État Actuel

- **280 occurrences** de `any` identifiées dans les services
- **32 fichiers** concernés

## 🔍 Types de Remplacements

### 1. Paramètres de Fonction

**AVANT :**
```typescript
function processData(data: any) {
  // ...
}
```

**APRÈS :**
```typescript
interface ProcessDataInput {
  id: string
  name: string
  value: number
}

function processData(data: ProcessDataInput) {
  // ...
}
```

### 2. Retours de Fonction

**AVANT :**
```typescript
function getData(): any {
  return { id: '1', name: 'Test' }
}
```

**APRÈS :**
```typescript
interface Data {
  id: string
  name: string
}

function getData(): Data {
  return { id: '1', name: 'Test' }
}
```

### 3. Types Supabase

**AVANT :**
```typescript
const { data } = await supabase
  .from('invoices')
  .insert(invoice as any)
```

**APRÈS :**
```typescript
import type { TableInsert } from '@/lib/types/supabase-helpers'

const { data } = await supabase
  .from('invoices')
  .insert(invoice as InvoiceInsert)
```

### 4. Types d'Erreur

**AVANT :**
```typescript
catch (error: any) {
  console.log(error.message)
}
```

**APRÈS :**
```typescript
catch (error: unknown) {
  if (error instanceof Error) {
    console.log(error.message)
  }
}
```

### 5. Types d'Objets Dynamiques

**AVANT :**
```typescript
const config: any = {
  api: { url: '...' },
  auth: { secret: '...' }
}
```

**APRÈS :**
```typescript
interface Config {
  api: { url: string }
  auth: { secret: string }
}

const config: Config = {
  api: { url: '...' },
  auth: { secret: '...' }
}
```

---

## 📋 Checklist par Fichier

### Services Critiques (Priorité 1)
- [ ] `lib/services/invoice.service.ts` - Remplacer `(invoice as any)`
- [ ] `lib/services/attendance.service.ts` - Remplacer `(attendance as any)`
- [ ] `lib/services/payment.service.ts` - Vérifier tous les types
- [ ] `lib/services/student.service.ts` - Vérifier tous les types

### Services avec Beaucoup de `any` (Priorité 2)
- [ ] `lib/services/accounting.service.ts` - 24 occurrences
- [ ] `lib/services/mobile-money.service.ts` - 24 occurrences
- [ ] `lib/services/user-management.service.ts` - 21 occurrences
- [ ] `lib/services/template-security.service.ts` - 33 occurrences
- [ ] `lib/services/document-template.service.ts` - 18 occurrences

### Autres Services (Priorité 3)
- [ ] Tous les autres services avec `any`

---

## 🛠️ Outils

### ESLint Rule
Ajouter dans `.eslintrc.json` :
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

### Script de Détection
```bash
# Trouver tous les `any`
grep -r "\\bany\\b" lib/services --include="*.ts"
```

---

## ✅ Exemple Complet

**AVANT :**
```typescript
export class InvoiceService {
  async create(invoice: InvoiceInsert) {
    let invoiceNumber = (invoice as any).invoice_number
    if (!invoiceNumber || invoiceNumber.trim() === '') {
      invoiceNumber = await this.generateInvoiceNumber(
        invoice.organization_id!,
        (invoice as any).document_type || 'invoice'
      )
    }

    const { data, error } = await this.supabase
      .from('invoices')
      .insert({
        ...invoice,
        invoice_number: invoiceNumber,
      } as any)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
```

**APRÈS :**
```typescript
interface InvoiceWithNumber extends InvoiceInsert {
  invoice_number?: string
  document_type?: 'quote' | 'invoice'
}

export class InvoiceService {
  async create(invoice: InvoiceInsert) {
    const invoiceData = invoice as InvoiceWithNumber
    let invoiceNumber = invoiceData.invoice_number
    if (!invoiceNumber || invoiceNumber.trim() === '') {
      invoiceNumber = await this.generateInvoiceNumber(
        invoice.organization_id!,
        invoiceData.document_type || 'invoice'
      )
    }

    const { data, error } = await this.supabase
      .from('invoices')
      .insert({
        ...invoice,
        invoice_number: invoiceNumber,
      } as InvoiceInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
```

---

## 🚀 Plan d'Action

1. **Phase 1** : Services critiques (4 services)
2. **Phase 2** : Services avec beaucoup de `any` (5 services)
3. **Phase 3** : Autres services (23 services)
4. **Phase 4** : Vérification et tests

---

## 📝 Notes

- Utiliser `unknown` au lieu de `any` quand le type est vraiment inconnu
- Créer des interfaces/types pour chaque structure de données
- Utiliser les types Supabase générés (`TableInsert`, `TableUpdate`, etc.)
- Tester après chaque remplacement pour éviter les régressions---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.