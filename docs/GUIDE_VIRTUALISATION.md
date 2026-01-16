---
title: Guide - Virtualisation des Listes
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 📊 Guide - Virtualisation des Listes

**Date :** 2024-12-03  
**Objectif :** Optimiser les performances des listes longues

---

## 📋 Listes à Virtualiser

### 1. ✅ Étudiants (`app/(dashboard)/dashboard/students/page.tsx`)
- **Taille actuelle :** Pagination côté client (12 items/page)
- **Problème :** Si beaucoup d'étudiants, le rendu initial peut être lent
- **Solution :** Virtualiser avec `@tanstack/react-virtual`

### 2. ⏳ Sessions (`app/(dashboard)/dashboard/sessions/page.tsx`)
- **Taille :** Variable selon l'organisation
- **Solution :** Virtualiser si >50 items

### 3. ⏳ Paiements (`app/(dashboard)/dashboard/payments/page.tsx`)
- **Taille :** Peut être très longue
- **Solution :** Virtualiser avec pagination serveur

---

## 🎯 Implémentation

### Installation

```bash
npm install @tanstack/react-virtual
```

### Exemple : Liste des Étudiants

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

const parentRef = useRef<HTMLDivElement>(null)

const virtualizer = useVirtualizer({
  count: students.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 200, // Hauteur estimée d'un item
  overscan: 5, // Nombre d'items à rendre en dehors de la vue
})

return (
  <div ref={parentRef} className="h-[600px] overflow-auto">
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const student = students[virtualItem.index]
        return (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <StudentCard student={student} />
          </div>
        )
      })}
    </div>
  </div>
)
```

---

## ✅ Checklist

- [ ] Installer `@tanstack/react-virtual`
- [ ] Virtualiser la liste des étudiants
- [ ] Virtualiser la liste des sessions
- [ ] Virtualiser la liste des paiements
- [ ] Tester les performances
- [ ] Vérifier le scroll et l'interaction

---

**Statut :** Guide créé, à implémenter---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.