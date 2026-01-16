---
title: Exemple dUtilisation du Hook Debounce
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🎯 Exemple d'Utilisation du Hook Debounce

## 📋 Hook Disponible

Le hook `useDebounce` est disponible dans `lib/hooks/use-debounce.ts`

---

## 🔍 Exemple 1 : Debounce d'une Valeur

### Cas d'usage : Recherche d'étudiants

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { useQuery } from '@tanstack/react-query'
import { studentService } from '@/lib/services/student.service'

export function StudentSearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 500) // 500ms de délai

  // La requête ne sera exécutée que 500ms après la dernière frappe
  const { data: students, isLoading } = useQuery({
    queryKey: ['students', 'search', debouncedSearchTerm],
    queryFn: () => studentService.getAll(organizationId, { search: debouncedSearchTerm }),
    enabled: debouncedSearchTerm.length >= 2, // Minimum 2 caractères
  })

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Rechercher un étudiant..."
      />
      {isLoading && <p>Recherche en cours...</p>}
      {students && (
        <ul>
          {students.map((student) => (
            <li key={student.id}>{student.first_name} {student.last_name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## 🔍 Exemple 2 : Debounce d'un Callback

### Cas d'usage : Recherche avec callback personnalisé

```tsx
'use client'

import { useState } from 'react'
import { useDebouncedCallback } from '@/lib/hooks/use-debounce'

export function SearchWithCallback() {
  const [searchTerm, setSearchTerm] = useState('')

  const handleSearch = (term: string) => {
    console.log('Recherche:', term)
    // Effectuer la recherche
    performSearch(term)
  }

  const debouncedSearch = useDebouncedCallback(handleSearch, 500)

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => {
        setSearchTerm(e.target.value)
        debouncedSearch(e.target.value) // Appel debouncé
      }}
      placeholder="Rechercher..."
    />
  )
}
```

---

## 📊 Comparaison Avant/Après

### ❌ AVANT (Sans Debounce)

```tsx
// Une requête à chaque frappe = 10 requêtes pour "étudiant"
<input onChange={(e) => {
  performSearch(e.target.value) // Requête immédiate
}} />
```

**Problèmes :**
- 10 requêtes pour un mot de 10 lettres
- Surcharge du serveur
- Expérience utilisateur dégradée

### ✅ APRÈS (Avec Debounce)

```tsx
// Une seule requête après 500ms d'inactivité
const debouncedSearch = useDebounce(searchTerm, 500)
useEffect(() => {
  performSearch(debouncedSearch) // Une seule requête
}, [debouncedSearch])
```

**Avantages :**
- 1 seule requête par recherche
- Réduction de la charge serveur
- Meilleure expérience utilisateur

---

## 🎯 Pages à Optimiser

### Priorité 1 : Pages avec Recherche
- [ ] `/dashboard/students` - Recherche d'étudiants
- [ ] `/dashboard/payments` - Recherche de paiements
- [ ] `/dashboard/invoices` - Recherche de factures
- [ ] `/dashboard/sessions` - Recherche de sessions

### Priorité 2 : Pages avec Filtres
- [ ] `/dashboard/attendance` - Filtres de présence
- [ ] `/dashboard/programs` - Filtres de programmes
- [ ] `/dashboard/documents` - Filtres de documents

---

## ⚙️ Configuration

### Délais Recommandés

- **Recherche texte** : 300-500ms
- **Filtres** : 200-300ms
- **Validation formulaire** : 500-1000ms
- **Auto-save** : 1000-2000ms

### Exemple de Configuration

```tsx
// Recherche rapide
const debouncedSearch = useDebounce(searchTerm, 300)

// Filtres
const debouncedFilter = useDebounce(filterValue, 200)

// Auto-save
const debouncedSave = useDebounce(formData, 1000)
```

---

## 📝 Notes

- Le debounce ne s'applique qu'aux valeurs/callbacks, pas aux requêtes React Query
- Utiliser `enabled` dans `useQuery` pour éviter les requêtes inutiles
- Tester avec différents délais pour trouver le meilleur compromis---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.