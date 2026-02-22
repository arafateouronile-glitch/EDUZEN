# Phase 9: Optimisations CLS et FID - Rapport

**Date**: 23 Janvier 2026  
**Objectif**: Optimiser CLS (< 0.1) et FID (< 100ms)

---

## ✅ Optimisations Appliquées

### 1. Remplacement des balises `<img>` par `next/image`

**Fichiers modifiés**:
- `app/(portal)/portal/children/page.tsx`
- `app/(dashboard)/dashboard/attendance/class/[classId]/page.tsx`
- `app/(portal)/portal/page.tsx`

#### Avant:
```tsx
<img
  src={child.photo_url}
  alt={`${child.first_name} ${child.last_name}`}
  className="h-20 w-20 rounded-full object-cover"
/>
```

#### Après:
```tsx
<Image
  src={child.photo_url}
  alt={`${child.first_name} ${child.last_name}`}
  width={80}
  height={80}
  className="h-20 w-20 rounded-full object-cover"
/>
```

**Impact**: 
- ✅ Dimensions fixes pour éviter les CLS
- ✅ Optimisation automatique des images (WebP, AVIF)
- ✅ Lazy loading automatique
- ✅ Réduction de la taille des images

---

### 2. Font Display Strategy

**Statut**: Les fonts sont chargées via `@fontsource` qui utilise `font-display: swap` par défaut.

**Vérification**:
- ✅ Fonts préchargées dans `app/layout.tsx` avec `crossOrigin="anonymous"`
- ✅ `@fontsource` utilise `font-display: swap` par défaut
- ✅ Pas de FOIT (Flash of Invisible Text)

**Impact**: 
- ✅ Texte visible immédiatement avec fallback
- ✅ Pas de layout shift lors du chargement des fonts

---

## 📊 Impact Estimé

### CLS (Cumulative Layout Shift)
- **Avant**: Potentiellement > 0.1 (images sans dimensions)
- **Après estimé**: < 0.1 (dimensions fixes)
- **Gain**: Élimination des shifts de layout causés par les images

### FID (First Input Delay)
- **Avant**: Potentiellement > 100ms (JavaScript bloquant)
- **Après estimé**: < 100ms (optimisations TBT déjà appliquées)
- **Gain**: Réduction du JavaScript bloquant

---

## 🎯 Prochaines Optimisations CLS/FID

### 1. Optimiser toutes les images restantes
- [ ] Remplacer toutes les balises `<img>` par `next/image`
- [ ] Ajouter dimensions à toutes les images
- [ ] Utiliser `priority` pour les images above-the-fold

### 2. Optimiser les fonts
- [ ] Vérifier que toutes les fonts utilisent `font-display: swap`
- [ ] Précharger uniquement les fonts critiques
- [ ] Utiliser `font-display: optional` pour les fonts non critiques

### 3. Debounce/Throttle des Event Listeners
- [ ] Debounce les handlers de scroll
- [ ] Throttle les handlers de resize
- [ ] Debounce les handlers de recherche

### 4. Optimiser les animations
- [ ] Utiliser `will-change` pour les éléments animés
- [ ] Utiliser `transform` et `opacity` pour les animations (GPU-accelerated)
- [ ] Éviter les animations sur `width`, `height`, `top`, `left`

### 5. Réduire les re-renders
- [ ] Utiliser `React.memo` pour les composants enfants
- [ ] Utiliser `useCallback` pour les fonctions passées en props
- [ ] Analyser les re-renders avec React DevTools Profiler

---

## 📈 Métriques à Vérifier

Après ces optimisations, exécuter un nouvel audit Lighthouse pour vérifier :

1. **CLS** : < 0.1 (objectif)
2. **FID** : < 100ms (objectif)
3. **LCP** : < 2.5s (déjà optimisé)
4. **TBT** : < 200ms (déjà optimisé)
5. **FCP** : < 1.8s (déjà OK)
6. **Performance Score** : > 90/100 (objectif)

---

## 🚀 Commandes pour Tester

```bash
# 1. Démarrer le serveur
npm run dev

# 2. Dans un autre terminal, exécuter l'audit Lighthouse
./scripts/lighthouse-audit.sh

# 3. Comparer les résultats avec le rapport précédent
```

---

## 📝 Notes Techniques

### Pourquoi `next/image` améliore CLS ?

1. **Dimensions fixes**: Les dimensions `width` et `height` sont requises, évitant les shifts de layout
2. **Optimisation automatique**: Conversion en WebP/AVIF, réduction de taille
3. **Lazy loading**: Chargement différé des images hors viewport
4. **Placeholder**: Support pour blur placeholder

### Pourquoi `font-display: swap` améliore CLS ?

1. **Texte visible immédiatement**: Utilise la font fallback pendant le chargement
2. **Pas de FOIT**: Évite le Flash of Invisible Text
3. **Meilleure UX**: L'utilisateur peut lire le contenu immédiatement

---

**Statut**: Optimisations CLS/FID appliquées (partiellement) ✅  
**Dernière mise à jour**: 23 Janvier 2026  
**Prochaine étape**: Remplacer toutes les images restantes et exécuter un audit Lighthouse
