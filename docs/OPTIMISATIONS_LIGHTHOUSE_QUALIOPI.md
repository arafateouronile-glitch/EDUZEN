# Optimisations Lighthouse - Page Qualiopi

## Date : 23 janvier 2026
## Page analysée : `/dashboard/qualiopi`

## Résultats initiaux Lighthouse

### Performance : 0.76
- **FCP** : 0.4s ✅ (excellent)
- **LCP** : 0.5s ✅ (excellent)
- **Speed Index** : 2.0s ⚠️ (score 0.63 - à améliorer)
- **TBT** : 460ms ⚠️ (score 0.33 - à améliorer)
- **Max Potential FID** : 330ms ⚠️ (score 0.28 - à améliorer)
- **TTI** : 2.1s ✅ (score 0.94 - bon)

### Accessibilité : 0.98
- ✅ La plupart des critères sont respectés
- ⚠️ **Manque un repère `<main>`** (corrigé)

### Bonnes pratiques : 0.96
- ✅ Configuration HTTPS
- ⚠️ 1 erreur console (extension Chrome - non critique)

### SEO : 0.66
- ⚠️ **Page bloquée par robots.txt** (intentionnel pour pages privées)

## Problèmes identifiés

### 1. Temps de réponse serveur élevé (685ms)
**Impact** : Score 0, économies estimées : 590ms

**Causes** :
- Page entièrement client-side (`'use client'`)
- Génération du HTML initial par Next.js
- Requêtes API multiples au chargement

**Solutions appliquées** :
- ✅ Optimisation des requêtes React Query avec `staleTime` et `gcTime`
- ✅ Lazy loading du composant `ContextualFAQ`
- ✅ Ajout de métadonnées dynamiques (titre de page)

**Solutions recommandées** :
- [ ] Créer une version hybride avec Server Components pour le contenu statique
- [ ] Implémenter un système de cache pour les données Qualiopi
- [ ] Utiliser `next/dynamic` pour charger les composants lourds de manière différée

### 2. Total Blocking Time élevé (465ms)
**Impact** : Score 0.33, économies estimées : 450ms

**Causes** :
- Trop de JavaScript exécuté sur le thread principal
- 2 080 Kio de JavaScript inutilisé
- 6 tâches longues détectées (>50ms)

**Solutions appliquées** :
- ✅ Lazy loading du composant `ContextualFAQ` avec `dynamic`
- ✅ Optimisation des requêtes pour réduire les appels API

**Solutions recommandées** :
- [ ] Code splitting plus agressif pour les composants non critiques
- [ ] Utiliser `React.memo` pour éviter les re-renders inutiles
- [ ] Déboguer et optimiser les 6 tâches longues identifiées :
  - `node_modules_next_dist_client_17643121._.js` (334ms)
  - Page principale (214ms)
  - Extensions Chrome (114ms, 110ms, 94ms, 72ms)

### 3. JavaScript inutilisé (2 080 Kio)
**Impact** : Économies estimées : 2 080 Kio

**Causes** :
- Extensions Chrome chargent beaucoup de code
- Bibliothèques complètes chargées mais partiellement utilisées
- Code non minifié en développement

**Solutions recommandées** :
- [ ] Analyser le bundle avec `@next/bundle-analyzer`
- [ ] Utiliser des imports ciblés au lieu d'imports globaux
- [ ] Tree-shaking plus agressif
- [ ] En production, le code sera minifié automatiquement

### 4. CSS inutilisé (209 Kio)
**Impact** : Économies estimées : 209 Kio

**Solutions recommandées** :
- [ ] Utiliser PurgeCSS ou équivalent pour supprimer le CSS inutilisé
- [ ] Vérifier que Tailwind purge correctement les classes non utilisées

### 5. Accessibilité - Repère `<main>` manquant
**Impact** : Score 0.98 → 1.0 (corrigé)

**Solution appliquée** :
- ✅ Ajout d'un élément `<main>` explicite dans la page
- ✅ Ajout d'attributs ARIA (`aria-live`, `aria-label`, `aria-hidden`)

### 6. SEO - Page bloquée par robots.txt
**Impact** : Score 0.66

**Note** : C'est **intentionnel** et **correct** pour une page dashboard privée nécessitant une authentification. Les pages `/dashboard/` ne doivent pas être indexées par les moteurs de recherche.

**Configuration actuelle** :
```typescript
disallow: ['/dashboard/', '/portal/', '/learner/', '/api/', '/auth/']
```

**Recommandation** : Aucune action nécessaire. C'est une bonne pratique de sécurité.

## Optimisations appliquées

### ✅ 1. Accessibilité
- Ajout d'un élément `<main>` explicite
- Ajout d'attributs ARIA pour améliorer l'accessibilité
- Ajout de `role="region"` et `aria-label` pour les sections importantes

### ✅ 2. Performance des requêtes
- Configuration de `staleTime: 5 minutes` pour les requêtes React Query
- Configuration de `gcTime: 30 minutes` pour le cache
- Réduction des appels API inutiles

### ✅ 3. Lazy loading
- Chargement différé du composant `ContextualFAQ` avec `next/dynamic`
- Utilisation de `Suspense` pour le chargement progressif

### ✅ 4. Métadonnées SEO
- Mise à jour dynamique du titre de la page
- Structure sémantique améliorée

## Recommandations supplémentaires

### Priorité Haute

1. **Optimiser le temps de réponse serveur**
   - Créer un composant Server Component pour le header et les métadonnées
   - Implémenter un système de cache pour les données Qualiopi
   - Utiliser `generateStaticParams` si possible pour certaines données

2. **Réduire le TBT**
   - Analyser et optimiser les 6 tâches longues identifiées
   - Utiliser `React.memo` pour les composants de statistiques
   - Implémenter le code splitting pour les composants non critiques

3. **Réduire le JavaScript inutilisé**
   - Analyser le bundle avec `npm run build` et `ANALYZE=true`
   - Utiliser des imports ciblés (ex: `import { Card } from '@/components/ui/card'` au lieu d'imports globaux)
   - Vérifier que les extensions Chrome ne chargent pas de code inutile en production

### Priorité Moyenne

4. **Optimiser les images et polices**
   - Utiliser `next/image` pour toutes les images
   - Précharger les polices critiques
   - Utiliser `font-display: swap` pour les polices web

5. **Améliorer le cache**
   - Configurer des en-têtes de cache appropriés pour les assets statiques
   - Utiliser Service Worker pour le cache offline (déjà implémenté)

### Priorité Basse

6. **Monitoring continu**
   - Configurer Lighthouse CI pour surveiller les performances
   - Ajouter des métriques de performance en production
   - Créer des alertes pour les régressions de performance

## Métriques cibles

| Métrique | Actuel | Cible | Amélioration |
|----------|--------|-------|--------------|
| Performance | 0.76 | 0.90+ | +18% |
| TBT | 465ms | <200ms | -57% |
| Speed Index | 2.0s | <1.5s | -25% |
| Accessibilité | 0.98 | 1.0 | +2% |
| SEO | 0.66 | 0.66 | - (intentionnel) |

## Fichiers modifiés

- `app/(dashboard)/dashboard/qualiopi/page.tsx`
  - Ajout d'un élément `<main>`
  - Optimisation des requêtes React Query
  - Lazy loading du composant `ContextualFAQ`
  - Ajout d'attributs ARIA
  - Mise à jour dynamique du titre

## Prochaines étapes

1. ✅ Optimisations de base appliquées
2. ⏳ Analyser le bundle avec `ANALYZE=true`
3. ⏳ Optimiser les tâches longues identifiées
4. ⏳ Implémenter le code splitting pour les composants non critiques
5. ⏳ Créer une version hybride Server/Client Components si possible

## Notes importantes

- Les extensions Chrome impactent significativement les performances (483ms de temps CPU)
- Le temps de réponse serveur de 685ms est principalement dû au fait que la page est entièrement client-side
- Le blocage par robots.txt est intentionnel et correct pour les pages privées
- En production, le code sera minifié automatiquement, réduisant la taille du bundle
