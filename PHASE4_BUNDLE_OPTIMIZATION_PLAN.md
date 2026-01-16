# 📦 Plan d'Optimisation des Bundles

**Date** : 14 Janvier 2026

---

## 📊 Analyse des Bundles

### Bibliothèques Lourdes Identifiées

1. **framer-motion** (~50KB) - Utilisé dans 77+ fichiers
   - Landing page : Hero, Features, BentoShowcase, etc.
   - Dashboard : Sidebar, Charts, UI components
   - **Impact** : Bloque LCP sur la page d'accueil

2. **@tanstack/react-query** (~40KB) - Utilisé dans 219+ fichiers
   - Utilisé partout dans le dashboard
   - **Impact** : Bundle principal lourd

3. **react-scroll-parallax** (~30KB) - Utilisé dans ParallaxProvider
   - **Impact** : Déjà lazy loaded ✅

4. **@tiptap/** (multiple extensions) - Éditeur de documents
   - **Impact** : Bundle lourd mais utilisé uniquement dans document-editor

5. **@react-pdf/renderer** - Génération PDF
   - **Impact** : Bundle lourd mais utilisé uniquement pour PDF

---

## 🎯 Optimisations Prioritaires

### Phase 1 : Tree-shaking framer-motion (Impact élevé)

**Problème** : `framer-motion` est importé en entier même si on n'utilise que quelques composants.

**Solution** :
1. Créer un wrapper `components/ui/motion.tsx` pour centraliser les imports
2. Utiliser des imports nommés spécifiques au lieu de `import { motion }`
3. Lazy load les composants dashboard qui utilisent framer-motion

### Phase 2 : Code Splitting Dashboard (Impact élevé)

**Problème** : Tous les composants dashboard sont chargés même si non utilisés.

**Solution** :
1. Lazy load les pages dashboard non-critiques
2. Lazy load les composants lourds (charts, editors)

### Phase 3 : Optimiser React Query (Impact moyen)

**Problème** : React Query est dans le bundle principal.

**Solution** :
1. Vérifier si on peut utiliser des imports dynamiques
2. Optimiser la configuration (déjà fait ✅)

---

## 🔧 Implémentation

### Étape 1 : Créer un wrapper motion optimisé

```typescript
// components/ui/motion.tsx
// Imports spécifiques pour tree-shaking
export { motion, AnimatePresence, useInView, useMotionValue, useTransform, useSpring } from 'framer-motion'
```

### Étape 2 : Lazy load composants dashboard lourds

- Charts (PremiumLineChart, PremiumBarChart, etc.)
- Document editor
- Calendar view

### Étape 3 : Optimiser imports framer-motion

Remplacer :
```typescript
import { motion } from 'framer-motion'
```

Par :
```typescript
import { motion } from '@/components/ui/motion'
```

---

## 📈 Résultats Attendus

- **Bundle principal** : -100KB à -200KB
- **LCP** : -1s à -2s
- **TBT** : -500ms à -1000ms
- **Unused JavaScript** : -200KB à -400KB

---

## ✅ Actions Immédiates

1. ✅ Analyser les bundles existants
2. ⏭️ Créer wrapper motion optimisé
3. ⏭️ Lazy load composants dashboard
4. ⏭️ Optimiser imports framer-motion
5. ⏭️ Relancer audit Lighthouse
