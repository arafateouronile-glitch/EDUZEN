# 🔍 Guide d'Audit Lighthouse - Performance, SEO, Accessibilité

## Vue d'ensemble

Lighthouse est un outil open-source de Google qui permet d'auditer la performance, le SEO, l'accessibilité, les bonnes pratiques et le PWA de votre application web.

## 🚀 Méthodes d'exécution

### Méthode 1 : Chrome DevTools (Recommandé)

1. **Ouvrir Chrome DevTools**
   - `Cmd + Option + I` (Mac) ou `F12` (Windows/Linux)
   - Ou clic droit → Inspecter

2. **Onglet Lighthouse**
   - Cliquer sur l'onglet "Lighthouse"
   - Sélectionner les catégories :
     - ✅ Performance
     - ✅ SEO (Référencement)
     - ✅ Accessibilité
     - ✅ Bonnes pratiques
     - ✅ PWA (optionnel)

3. **Mode de test**
   - **Navigation** : Audit complet de la page
   - **Timespan** : Audit d'une période d'interaction
   - **Snapshot** : Audit de l'état actuel

4. **Exécuter**
   - Cliquer sur "Analyser la page"
   - Attendre la fin de l'analyse (30-60 secondes)

### Méthode 2 : Extension Chrome Lighthouse

1. Installer l'extension depuis Chrome Web Store
2. Cliquer sur l'icône Lighthouse
3. Sélectionner les catégories et exécuter

### Méthode 3 : Ligne de commande (CI/CD)

```bash
# Installer Lighthouse CLI
npm install -g lighthouse

# Exécuter un audit
lighthouse http://localhost:3001 --view --output html --output-path ./lighthouse-report.html

# Options spécifiques
lighthouse http://localhost:3001 \
  --only-categories=performance,seo,accessibility \
  --view \
  --output html,json \
  --output-path ./lighthouse-report
```

### Méthode 4 : PageSpeed Insights (Production)

1. Aller sur https://pagespeed.web.dev/
2. Entrer l'URL de votre site
3. Cliquer sur "Analyser"
4. Obtenir un rapport détaillé

## 📊 Scores cibles pour la production

### Performance
- **Excellent :** ≥ 90
- **Bon :** 75-89
- **À améliorer :** 50-74
- **Faible :** < 50

### SEO
- **Excellent :** ≥ 90
- **Bon :** 75-89
- **À améliorer :** 50-74

### Accessibilité
- **Excellent :** ≥ 90
- **Bon :** 75-89
- **À améliorer :** 50-74

### Bonnes pratiques
- **Excellent :** ≥ 90
- **Bon :** 75-89

## 🎯 Performance - Optimisations

### 1. Métriques Core Web Vitals

**LCP (Largest Contentful Paint)** - < 2.5s
- Optimiser les images (utiliser `next/image`)
- Utiliser CDN pour les assets
- Optimiser le rendu serveur

**FID (First Input Delay)** - < 100ms
- Réduire le JavaScript bloquant
- Code splitting
- Lazy loading

**CLS (Cumulative Layout Shift)** - < 0.1
- Définir dimensions des images/vidéos
- Réserver l'espace pour les composants dynamiques
- Éviter les insertions de contenu au-dessus du contenu existant

### 2. Optimisations Next.js

**Vérifier :**
- [ ] `swcMinify: true` dans `next.config.js` ✅ (déjà fait)
- [ ] Images optimisées avec `next/image`
- [ ] Fonts optimisées (préchargement)
- [ ] Code splitting automatique
- [ ] Lazy loading des composants

**Commandes de vérification :**
```bash
# Analyser le bundle
npm install @next/bundle-analyzer
ANALYZE=true npm run build
```

### 3. Optimisations spécifiques

**Images :**
```tsx
// ✅ Bon
import Image from 'next/image'
<Image src="/hero.jpg" width={800} height={600} alt="Hero" />

// ❌ À éviter
<img src="/hero.jpg" alt="Hero" />
```

**Composants lourds :**
```tsx
// Lazy loading
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false // Si pas nécessaire côté serveur
})
```

**Fonts :**
```tsx
// ✅ Déjà configuré dans app/layout.tsx
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // ✅ Bon
})
```

## 🔍 SEO - Optimisations

### 1. Métadonnées de base

**Vérifier dans `app/layout.tsx` :**
- [x] `title` présent ✅
- [x] `description` présent ✅
- [x] `keywords` présents ✅
- [ ] `openGraph` (à ajouter)
- [ ] `twitter` (à ajouter)
- [ ] `robots.txt` (à créer)
- [ ] `sitemap.xml` (à créer)

### 2. Améliorations recommandées

**Ajouter Open Graph :**
```tsx
export const metadata: Metadata = {
  title: "eduzen - Gestion Scolaire pour l'Afrique",
  description: "Solution SaaS complète...",
  openGraph: {
    title: "eduzen - Gestion Scolaire pour l'Afrique",
    description: "Solution SaaS complète...",
    url: 'https://your-domain.com',
    siteName: 'eduzen',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'eduzen',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eduzen - Gestion Scolaire pour l\'Afrique',
    description: 'Solution SaaS complète...',
    images: ['/og-image.jpg'],
  },
}
```

**Créer `public/robots.txt` :**
```txt
User-agent: *
Allow: /

# Sitemap
Sitemap: https://your-domain.com/sitemap.xml

# Exclure les pages admin
Disallow: /dashboard/
Disallow: /api/
```

**Créer `app/sitemap.ts` (Next.js 13+):**
```tsx
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://your-domain.com'
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/formations`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Ajouter d'autres URLs importantes
  ]
}
```

### 3. Structure HTML sémantique

**Vérifier :**
- [ ] Utilisation de `<header>`, `<main>`, `<footer>`
- [ ] Titres hiérarchiques (`h1` → `h2` → `h3`)
- [ ] Un seul `h1` par page
- [ ] Attributs `alt` sur toutes les images
- [ ] Attributs `lang` sur `<html>`

### 4. URLs propres

**Vérifier :**
- [ ] URLs lisibles (pas d'IDs techniques)
- [ ] Pas de caractères spéciaux
- [ ] Structure logique
- [ ] Canoniques configurées

## ♿ Accessibilité - Optimisations

### 1. Contraste de couleurs

**WCAG AA minimum :**
- Texte normal : ratio 4.5:1
- Texte large : ratio 3:1

**Vérifier avec :**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- DevTools → Lighthouse → Accessibilité

### 2. Navigation au clavier

**Vérifier :**
- [ ] Tous les éléments interactifs accessibles au clavier
- [ ] Ordre de tabulation logique
- [ ] Focus visible
- [ ] Pas de piège de focus
- [ ] Skip links pour navigation rapide

**Ajouter skip link :**
```tsx
// Dans app/layout.tsx
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white"
>
  Aller au contenu principal
</a>
```

### 3. Attributs ARIA

**Vérifier :**
- [ ] `aria-label` sur boutons iconiques
- [ ] `aria-labelledby` pour éléments complexes
- [ ] `role` approprié
- [ ] `aria-hidden="true"` pour éléments décoratifs
- [ ] États ARIA (`aria-expanded`, `aria-checked`, etc.)

**Exemples :**
```tsx
// ✅ Bon
<button aria-label="Fermer la modal">
  <X className="w-4 h-4" />
</button>

// ✅ Menu déroulant
<button 
  aria-expanded={isOpen}
  aria-haspopup="true"
  aria-controls="menu-id"
>
  Menu
</button>
```

### 4. Formulaires accessibles

**Vérifier :**
- [ ] Labels associés aux inputs (`<label>` ou `aria-label`)
- [ ] Messages d'erreur associés (`aria-describedby`)
- [ ] États de validation annoncés
- [ ] `required` annoncé aux lecteurs d'écran

```tsx
// ✅ Bon
<label htmlFor="email">Email</label>
<input 
  id="email" 
  type="email" 
  required
  aria-invalid={hasError}
  aria-describedby={hasError ? "email-error" : undefined}
/>
{hasError && (
  <span id="email-error" role="alert">
    Email invalide
  </span>
)}
```

### 5. Images

**Vérifier :**
- [ ] Toutes les images ont `alt`
- [ ] `alt` descriptif (pas vide, pas redondant)
- [ ] Images décoratives avec `alt=""`

```tsx
// ✅ Bon
<Image src="/logo.png" alt="Logo eduzen" />

// ✅ Décoratif
<img src="/decorative-line.png" alt="" aria-hidden="true" />
```

## 📱 PWA (Progressive Web App)

### Vérifications

- [ ] `manifest.json` présent ✅ (déjà dans le code)
- [ ] Service Worker configuré
- [ ] Icônes multiples tailles
- [ ] Mode hors ligne fonctionne
- [ ] Installable sur mobile

**Vérifier `public/manifest.json` :**
```json
{
  "name": "eduzen",
  "short_name": "eduzen",
  "description": "Gestion Scolaire pour l'Afrique",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563EB",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 🔧 Script d'audit automatisé

Créer `scripts/lighthouse-audit.sh` :

```bash
#!/bin/bash

# Installer Lighthouse si nécessaire
if ! command -v lighthouse &> /dev/null; then
  npm install -g lighthouse
fi

URL=${1:-http://localhost:3001}
OUTPUT_DIR="./lighthouse-reports"

mkdir -p $OUTPUT_DIR

echo "🔍 Audit Lighthouse de $URL..."

lighthouse $URL \
  --view \
  --output html,json \
  --output-path $OUTPUT_DIR/report \
  --only-categories=performance,seo,accessibility,best-practices \
  --chrome-flags="--headless"

echo "✅ Rapport généré dans $OUTPUT_DIR/"
```

## ✅ Checklist complète

### Performance
- [ ] Score ≥ 90
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Images optimisées
- [ ] Code splitting activé
- [ ] Lazy loading configuré

### SEO
- [ ] Score ≥ 90
- [ ] Métadonnées complètes
- [ ] Open Graph configuré
- [ ] Twitter Cards configurées
- [ ] robots.txt présent
- [ ] sitemap.xml présent
- [ ] URLs propres
- [ ] Structure HTML sémantique

### Accessibilité
- [ ] Score ≥ 90
- [ ] Contraste suffisant
- [ ] Navigation clavier fonctionne
- [ ] Attributs ARIA présents
- [ ] Formulaires accessibles
- [ ] Images avec alt
- [ ] Focus visible

### Bonnes pratiques
- [ ] Score ≥ 90
- [ ] HTTPS activé
- [ ] Pas de console.log en prod
- [ ] Pas de dépendances vulnérables
- [ ] Headers sécurité configurés

## 📝 Template de rapport d'audit

**Date :** ___________

**URL testée :** ___________

**Résultats :**

| Catégorie | Score | Statut |
|-----------|-------|--------|
| Performance | ___/100 | ✅/⚠️/❌ |
| SEO | ___/100 | ✅/⚠️/❌ |
| Accessibilité | ___/100 | ✅/⚠️/❌ |
| Bonnes pratiques | ___/100 | ✅/⚠️/❌ |

**Problèmes identifiés :**
1. ___________
2. ___________
3. ___________

**Actions correctives :**
1. ___________
2. ___________
3. ___________

## 🔗 Ressources

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WAVE Accessibility Tool](https://wave.webaim.org/)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)


