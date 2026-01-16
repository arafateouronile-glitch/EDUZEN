---
title: Guide de Test des Performances - Détection Requêtes N1
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🧪 Guide de Test des Performances - Détection Requêtes N+1

## 🎯 Objectif

Détecter et corriger les problèmes de requêtes N+1 qui ralentissent l'application.

---

## 🔍 Méthode 1 : DevTools Network

### Étapes

1. **Ouvrir les DevTools** (F12)
2. **Aller dans l'onglet Network**
3. **Filtrer par "supabase" ou "rest/v1"**
4. **Recharger la page** (F5)
5. **Analyser les requêtes**

### Ce qu'il faut chercher

**✅ BON : Une seule requête avec jointures**
```
GET /rest/v1/students?select=*,classes(*)&organization_id=eq.xxx
```

**❌ MAUVAIS : N+1 requêtes**
```
GET /rest/v1/students?organization_id=eq.xxx
GET /rest/v1/classes?id=eq.xxx  ← Requête 1
GET /rest/v1/classes?id=eq.yyy  ← Requête 2
GET /rest/v1/classes?id=eq.zzz  ← Requête 3
... (N requêtes)
```

---

## 🔍 Méthode 2 : React Query DevTools

### Installation

```bash
npm install @tanstack/react-query-devtools
```

### Utilisation

```typescript
// app/providers.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### Analyser

1. Ouvrir React Query DevTools
2. Vérifier les requêtes en cache
3. Identifier les requêtes multiples pour la même ressource

---

## 🔍 Méthode 3 : Script de Test

### Utilisation

```bash
# Tester avec le script
chmod +x scripts/test-performance.sh
./scripts/test-performance.sh

# Ou avec variables d'environnement
BASE_URL=http://localhost:3001 AUTH_TOKEN=your_token ./scripts/test-performance.sh
```

---

## 📊 Pages à Tester

### Priorité 1 : Pages avec Listes
- [ ] `/dashboard/students` - Liste des étudiants
- [ ] `/dashboard/payments` - Liste des paiements
- [ ] `/dashboard/attendance` - Liste des présences
- [ ] `/dashboard/sessions` - Liste des sessions
- [ ] `/dashboard/invoices` - Liste des factures

### Priorité 2 : Pages avec Relations
- [ ] `/dashboard/students/[id]` - Détail étudiant
- [ ] `/dashboard/payments/[id]` - Détail paiement
- [ ] `/dashboard/attendance/[id]` - Détail présence

### Priorité 3 : Dashboard Principal
- [ ] `/dashboard` - Tableau de bord avec statistiques

---

## ✅ Checklist de Vérification

Pour chaque page testée :

- [ ] **Nombre de requêtes** : Compté dans DevTools Network
- [ ] **Requêtes avec jointures** : Vérifié que `select=*,relation(*)` est utilisé
- [ ] **Temps de chargement** : < 1 seconde pour une liste de 50 items
- [ ] **Pas de requêtes répétitives** : Pas de pattern N+1
- [ ] **Cache React Query** : Vérifié que les données sont mises en cache

---

## 🚨 Signaux d'Alerte

### Requêtes N+1 Détectées Si :

1. **Plus de 10 requêtes** pour charger une liste de 10 items
2. **Requêtes séquentielles** : Une requête après l'autre au lieu d'une seule
3. **Temps de chargement > 2 secondes** pour une liste simple
4. **Pattern répétitif** : Même requête avec différents IDs

---

## 🔧 Correction

Si N+1 détecté :

1. **Identifier le service** responsable
2. **Ajouter les jointures** : `select('*, relation(*)')`
3. **Tester à nouveau** : Vérifier que c'est corrigé
4. **Documenter** : Noter la correction

---

## 📈 Métriques Cibles

- **Temps de chargement** : < 500ms pour une liste
- **Nombre de requêtes** : 1 requête par liste
- **Taille de réponse** : < 500KB pour une liste de 50 items
- **Cache hit rate** : > 80% pour les requêtes répétées

---

## 🛠️ Outils Recommandés

1. **Chrome DevTools** - Network tab
2. **React Query DevTools** - Query inspector
3. **Supabase Dashboard** - Query logs
4. **Lighthouse** - Performance audit

---

## 📝 Exemple de Rapport

```
Page: /dashboard/students
Requêtes détectées: 51
  - 1 requête principale: GET /rest/v1/students
  - 50 requêtes supplémentaires: GET /rest/v1/classes?id=eq.xxx
Statut: ❌ N+1 DÉTECTÉ
Correction: Ajouter select('*, classes(*)') dans StudentService.getAll()
```

---

## ✅ Après Correction

```
Page: /dashboard/students
Requêtes détectées: 1
  - 1 requête avec jointure: GET /rest/v1/students?select=*,classes(*)
Statut: ✅ CORRIGÉ
Temps de chargement: 234ms
```---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.