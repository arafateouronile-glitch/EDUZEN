---
title: Guide de Test des Performances avec DevTools Network
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🧪 Guide de Test des Performances avec DevTools Network

## 🎯 Objectif

Détecter les problèmes de performance, notamment les requêtes N+1, en utilisant les DevTools du navigateur.

---

## 📋 Étapes Détaillées

### 1. Ouvrir les DevTools

**Chrome/Edge :**
- `F12` ou `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
- Ou clic droit → "Inspecter"

**Firefox :**
- `F12` ou `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)

---

### 2. Aller dans l'onglet Network

1. Cliquer sur l'onglet **"Network"** dans les DevTools
2. Vérifier que l'enregistrement est activé (bouton rouge)

---

### 3. Filtrer les Requêtes Supabase

**Méthode 1 : Filtre par texte**
- Dans la barre de filtre, taper : `supabase` ou `rest/v1`
- Seules les requêtes Supabase s'afficheront

**Méthode 2 : Filtre par domaine**
- Cliquer sur le filtre "Domain"
- Sélectionner votre domaine Supabase (ex: `*.supabase.co`)

---

### 4. Recharger la Page

- Appuyer sur `F5` ou `Cmd+R` / `Ctrl+R`
- Ou cliquer sur le bouton de rechargement

---

### 5. Analyser les Requêtes

### ✅ BON : Une seule requête avec jointures

```
GET /rest/v1/students?select=*,classes(name),users(full_name)&organization_id=eq.xxx
```

**Caractéristiques :**
- 1 seule requête pour charger une liste
- `select` contient des jointures (`*,relation(*)`)
- Temps de réponse < 500ms

### ❌ MAUVAIS : Requêtes N+1

```
GET /rest/v1/students?organization_id=eq.xxx
GET /rest/v1/classes?id=eq.xxx  ← Requête 1
GET /rest/v1/classes?id=eq.yyy  ← Requête 2
GET /rest/v1/classes?id=eq.zzz  ← Requête 3
... (N requêtes)
```

**Caractéristiques :**
- 1 requête principale + N requêtes supplémentaires
- Requêtes séquentielles (une après l'autre)
- Temps total > 2 secondes

---

## 📊 Exemple Concret

### Page : `/dashboard/students`

**AVANT (N+1 détecté) :**
```
1. GET /rest/v1/students?organization_id=eq.org-1 (200ms)
2. GET /rest/v1/classes?id=eq.class-1 (150ms)
3. GET /rest/v1/classes?id=eq.class-2 (150ms)
4. GET /rest/v1/classes?id=eq.class-3 (150ms)
...
Total: 200ms + (N × 150ms) = 2+ secondes pour 10 étudiants
```

**APRÈS (Corrigé) :**
```
1. GET /rest/v1/students?select=*,classes(name)&organization_id=eq.org-1 (300ms)
Total: 300ms pour 10 étudiants
```

**Gain :** 85% de réduction du temps de chargement

---

## 🔍 Signaux d'Alerte

### ⚠️ Requêtes N+1 Détectées Si :

1. **Plus de 10 requêtes** pour charger une liste de 10 items
2. **Requêtes séquentielles** : Une requête après l'autre
3. **Temps de chargement > 2 secondes** pour une liste simple
4. **Pattern répétitif** : Même requête avec différents IDs

### 📈 Métriques à Surveiller

- **Nombre de requêtes** : Devrait être ≤ nombre d'items + 1
- **Temps total** : Devrait être < 1 seconde pour une liste
- **Taille de réponse** : Devrait être < 500KB pour 50 items
- **Requêtes en parallèle** : Devrait être > 1 (requêtes simultanées)

---

## 🛠️ Outils Avancés

### Chrome DevTools - Performance Tab

1. Ouvrir l'onglet **"Performance"**
2. Cliquer sur **"Record"**
3. Recharger la page
4. Arrêter l'enregistrement
5. Analyser le **"Flame Chart"**

**Ce qu'il faut chercher :**
- Blocs rouges (longues opérations)
- Requêtes qui se chevauchent
- Temps d'attente entre requêtes

### React Query DevTools

1. Installer : `npm install @tanstack/react-query-devtools`
2. Ajouter dans `app/providers.tsx` :
```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<ReactQueryDevtools initialIsOpen={false} />
```

3. Ouvrir React Query DevTools
4. Vérifier les requêtes en cache
5. Identifier les requêtes multiples

---

## 📝 Checklist de Vérification

Pour chaque page testée :

- [ ] **Nombre de requêtes** : Compté dans DevTools Network
- [ ] **Requêtes avec jointures** : Vérifié que `select=*,relation(*)` est utilisé
- [ ] **Temps de chargement** : < 1 seconde pour une liste de 50 items
- [ ] **Pas de requêtes répétitives** : Pas de pattern N+1
- [ ] **Cache React Query** : Vérifié que les données sont mises en cache
- [ ] **Requêtes en parallèle** : Plusieurs requêtes simultanées (bon signe)

---

## 🚨 Exemple de Rapport

```
Page: /dashboard/students
Date: 2024-12-03
Requêtes détectées: 51
  - 1 requête principale: GET /rest/v1/students
  - 50 requêtes supplémentaires: GET /rest/v1/classes?id=eq.xxx
Statut: ❌ N+1 DÉTECTÉ
Temps total: 2.3 secondes
Correction: Ajouter select('*, classes(*)') dans StudentService.getAll()
```

**Après correction :**
```
Page: /dashboard/students
Date: 2024-12-03
Requêtes détectées: 1
  - 1 requête avec jointure: GET /rest/v1/students?select=*,classes(*)
Statut: ✅ CORRIGÉ
Temps total: 234ms
Gain: 90% de réduction
```

---

## ✅ Pages à Tester

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

## 💡 Conseils

1. **Tester avec des données réelles** : Plus il y a de données, plus les problèmes N+1 sont visibles
2. **Tester plusieurs fois** : Les requêtes peuvent être mises en cache
3. **Vider le cache** : Utiliser "Disable cache" dans DevTools
4. **Tester en navigation** : Passer d'une page à l'autre
5. **Surveiller les requêtes en temps réel** : Garder DevTools ouvert pendant l'utilisation

---

## 📚 Ressources

- [Chrome DevTools Documentation](https://developer.chrome.com/docs/devtools/)
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)
- [Supabase Query Optimization](https://supabase.com/docs/guides/api/rest/query-optimization)---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.