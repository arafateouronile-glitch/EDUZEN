# 🎯 Actions prioritaires - Amélioration Lighthouse

**Basé sur l'audit du 9 janvier 2025**  
**Scores actuels :** Performance 57/100 | Accessibilité 82/100

## 🔴 PRIORITÉ 1 : Performance - Problèmes critiques

### 1. ❌ **Unused JavaScript (Score: 0/1)** - ÉCONOMIE: 2700ms

**Problème :** 2.7 secondes de JavaScript inutilisé chargé.

**Actions :**
```bash
# Installer bundle analyzer
npm install --save-dev @next/bundle-analyzer
```

**Fichier : `next.config.js`**
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // ... config existante
})
```

**Analyser le bundle :**
```bash
ANALYZE=true npm run build
```

**Solutions :**
- ✅ Lazy load les composants lourds (charts, éditeurs)
- ✅ Utiliser `dynamic` imports pour les composants conditionnels
- ✅ Split les routes avec `next/dynamic`
- ✅ Vérifier les imports inutiles

### 2. ⚠️ **Render-blocking resources (Score: 0.5/1)**

**Problème :** Ressources qui bloquent le rendu initial.

**Cause probable :** Fonts Google via `@import` dans `globals.css`

**Solution immédiate :**

**Fichier : `app/globals.css`** - Supprimer ces lignes :
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
```

**Fichier : `app/layout.tsx`** - Ajouter :
```typescript
import { Inter, Space_Grotesk } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900']
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700']
})

// Dans le className du body
className={cn(inter.variable, spaceGrotesk.variable, ...)}
```

**Impact estimé :** ⭐⭐⭐⭐⭐ Gain de 1-2 secondes sur LCP

### 3. ⚠️ **Unminified JavaScript (Score: 0.5/1)**

**Problème :** JavaScript non minifié en développement (normal).

**Solution :** Vérifier que la production minifie correctement :
```bash
npm run build
# Vérifier que les fichiers .js sont minifiés dans .next/static
```

Si le problème persiste en production :
```javascript
// next.config.js
module.exports = {
  swcMinify: true, // Déjà activé normalement
  compress: true,
}
```

### 4. ❌ **LCP (Largest Contentful Paint) : 4.8s** - Objectif: < 2.5s

**Problème majeur :** Le contenu principal prend 4.8s à charger (presque 2x l'objectif).

**Causes probables :**
- Fonts bloquantes (voir point 2)
- Images non optimisées
- JavaScript trop lourd
- Pas de preload sur les ressources critiques

**Actions :**

#### a) Optimiser les images du LCP
```typescript
// Utiliser next/image pour toutes les images
import Image from 'next/image'

<Image
  src="/hero-image.jpg"
  alt="Hero"
  priority // Pour l'image LCP
  width={1200}
  height={600}
  quality={85}
/>
```

#### b) Preload les ressources critiques
```typescript
// app/layout.tsx
<Head>
  <link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
</Head>
```

#### c) Lazy load les composants non critiques
```typescript
// Exemple : Charts lourds
import dynamic from 'next/dynamic'

const Chart = dynamic(() => import('@/components/charts/chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false // Si le composant n'a pas besoin de SSR
})
```

## 🟡 PRIORITÉ 2 : Accessibilité (82/100)

### Problèmes identifiés (à vérifier dans le rapport HTML)

Ouvrir le rapport HTML pour voir les détails :
```bash
open ./lighthouse-reports/lighthouse-report-20260109-131634.report.html
```

**Actions générales :**

### 1. Vérifier les contrastes de couleurs

**Outil :** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

**Exemples à vérifier :**
- Texte sur fond bleu (`--brand-blue-primary`)
- Texte sur fond cyan (`--brand-cyan-primary`)
- Texte secondaire (`--text-secondary`)
- États disabled (`--text-disabled`)

**Solution :** Ajuster les couleurs pour avoir un ratio ≥ 4.5:1

### 2. Ajouter les attributs ARIA manquants

**Vérifier :**
- Boutons icon-only ont `aria-label`
- Menus déroulants ont `aria-expanded`
- Éléments actifs ont `aria-current`
- Modals ont `aria-labelledby` et `aria-describedby`

**Exemple :**
```tsx
<button aria-label="Fermer le menu">
  <XIcon />
</button>

<div role="dialog" aria-labelledby="modal-title" aria-describedby="modal-desc">
  <h2 id="modal-title">Titre</h2>
  <p id="modal-desc">Description</p>
</div>
```

### 3. Améliorer la navigation clavier

**Vérifier :**
- Tous les éléments interactifs sont accessibles avec Tab
- L'ordre de tabulation est logique
- Les focus states sont visibles (ne pas désactiver `outline` sans alternative)
- Les modals capturent le focus (focus trap)

**Exemple :**
```css
/* Ne pas faire ça */
button:focus {
  outline: none; /* ❌ Mauvais */
}

/* Faire ça */
button:focus-visible {
  outline: 2px solid var(--brand-blue-primary);
  outline-offset: 2px;
}
```

### 4. Labels sur les formulaires

**Vérifier :**
- Tous les inputs ont un `<label>` associé
- Les labels sont liés avec `htmlFor` et `id`

**Exemple :**
```tsx
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// OU
<label>
  Email
  <input type="email" />
</label>
```

## 📋 Checklist d'actions (par ordre de priorité)

### 🔴 Critique (Faire en premier)

- [ ] **Remplacer fonts Google @import par next/font/google**
  - Fichier : `app/globals.css` + `app/layout.tsx`
  - Temps : 30 minutes
  - Impact : ⭐⭐⭐⭐⭐ (Économie: 1-2s sur LCP)

- [ ] **Analyser et réduire unused JavaScript**
  - Installer bundle analyzer
  - Identifier les imports inutiles
  - Lazy load les composants lourds
  - Temps : 2-3 heures
  - Impact : ⭐⭐⭐⭐⭐ (Économie: 2.7s)

- [ ] **Optimiser l'image LCP**
  - Utiliser `next/image` avec `priority`
  - Preload si nécessaire
  - Temps : 1 heure
  - Impact : ⭐⭐⭐⭐ (Économie: 0.5-1s)

### 🟡 Important (Faire ensuite)

- [ ] **Vérifier les contrastes de couleurs**
  - Utiliser WebAIM Contrast Checker
  - Corriger les problèmes identifiés
  - Temps : 1-2 heures
  - Impact : ⭐⭐⭐⭐

- [ ] **Ajouter les attributs ARIA manquants**
  - Audit des composants
  - Ajouter aria-label, aria-expanded, etc.
  - Temps : 2-3 heures
  - Impact : ⭐⭐⭐

- [ ] **Améliorer la navigation clavier**
  - Vérifier l'ordre de tabulation
  - Améliorer les focus states
  - Focus trap sur les modals
  - Temps : 2-3 heures
  - Impact : ⭐⭐⭐

- [ ] **Vérifier les labels sur les formulaires**
  - Audit de tous les formulaires
  - Ajouter les labels manquants
  - Temps : 1 heure
  - Impact : ⭐⭐⭐

### 🟢 Nice to have (Optimisations supplémentaires)

- [ ] **Configurer le cache des assets**
  - Headers de cache dans `next.config.js`
  - Temps : 30 minutes
  - Impact : ⭐⭐

- [ ] **Optimiser le DOM size** (483 éléments - OK mais à surveiller)
  - Paginer les listes longues
  - Virtualiser les tableaux
  - Temps : 2-3 heures
  - Impact : ⭐⭐

## 🎯 Objectifs après corrections

| Métrique | Actuel | Objectif | Priorité |
|----------|--------|----------|----------|
| **Performance** | 57/100 | **≥ 85/100** | 🔴 |
| **LCP** | 4.8s | **< 2.5s** | 🔴 |
| **Accessibilité** | 82/100 | **≥ 90/100** | 🟡 |

## 🚀 Commandes utiles

```bash
# Réexécuter l'audit après corrections
./scripts/lighthouse-audit.sh

# Analyser le bundle
ANALYZE=true npm run build

# Vérifier les types (pour éviter les erreurs)
npm run type-check

# Build de production (pour tester la minification)
npm run build
npm run start
```

## 📊 Suivi des améliorations

Après chaque correction, réexécuter l'audit :

```bash
./scripts/lighthouse-audit.sh
```

Comparer les scores et métriques avec le rapport précédent pour mesurer l'amélioration.

---

**Document créé le :** 9 janvier 2025  
**Prochain audit recommandé :** Après corrections prioritaires


