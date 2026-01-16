# 🖼️ Guide de création de l'image Open Graph

## Vue d'ensemble

L'image Open Graph est utilisée lorsqu'un lien vers votre site est partagé sur les réseaux sociaux (Facebook, Twitter, LinkedIn, etc.).

## Spécifications techniques

- **Dimensions :** 1200 x 630 pixels (ratio 1.91:1)
- **Format recommandé :** JPG ou PNG
- **Taille fichier :** < 300 KB (idéalement < 150 KB)
- **Fichier :** `public/og-image.jpg` ou `public/og-image.png`

## Contenu suggéré

### Éléments à inclure

1. **Logo EDUZEN** (en haut à gauche ou centré)
2. **Titre principal** : "EDUZEN"
3. **Sous-titre** : "Gestion Scolaire pour l'Afrique"
4. **Tagline** : "Solution SaaS complète pour digitaliser la gestion des établissements d'enseignement"
5. **Couleurs de marque** : Bleu (#2563EB, #3B82F6)

### Design recommandé

- Fond dégradé bleu (couleurs de marque)
- Texte blanc ou clair pour contraste
- Style moderne et professionnel
- Pas trop de texte (lisibilité importante)

## Outils de création

### Option 1 : Canva (Recommandé - Gratuit)

1. Aller sur https://www.canva.com/
2. Créer un design personnalisé : 1200 x 630 px
3. Utiliser les couleurs de marque (#2563EB, #3B82F6)
4. Ajouter le logo et le texte
5. Télécharger en JPG haute qualité
6. Renommer en `og-image.jpg`
7. Placer dans `public/og-image.jpg`

### Option 2 : Figma

1. Créer un frame 1200 x 630 px
2. Ajouter les éléments de design
3. Export en PNG ou JPG
4. Optimiser avec [TinyPNG](https://tinypng.com/)
5. Placer dans `public/og-image.jpg`

### Option 3 : Outil en ligne

- [og-image.vercel.app](https://og-image.vercel.app/)
- [Bannerbear](https://www.bannerbear.com/)

### Option 4 : Script Node.js (Automatique)

Créer un script pour générer automatiquement l'image.

## Fichier placeholder actuel

Un fichier SVG placeholder a été créé : `public/og-image.svg`

**Pour remplacer par une image JPG/PNG :**

1. Créer votre image `og-image.jpg` (1200x630px)
2. Placer dans `public/og-image.jpg`
3. Mettre à jour `app/layout.tsx` :
   ```tsx
   images: [
     {
       url: '/og-image.jpg', // Remplacé
       width: 1200,
       height: 630,
       alt: 'eduzen - Gestion Scolaire pour l\'Afrique',
     },
   ],
   ```

## Vérification

### Tester l'image Open Graph

1. **Facebook Debugger :**
   - https://developers.facebook.com/tools/debug/
   - Entrer votre URL
   - Vérifier l'aperçu

2. **Twitter Card Validator :**
   - https://cards-dev.twitter.com/validator
   - Entrer votre URL
   - Vérifier l'aperçu

3. **LinkedIn Post Inspector :**
   - https://www.linkedin.com/post-inspector/
   - Entrer votre URL

### Commandes

```bash
# Vérifier que l'image existe
ls -lh public/og-image.*

# Vérifier la taille
file public/og-image.jpg

# Optimiser avec ImageOptim (Mac) ou similar
# ou utiliser TinyPNG en ligne
```

## Template de design

**Zone de texte suggérée :**
- Position : Centré verticalement, légèrement décalé à gauche
- Largeur max : 900px
- Titre : 72px, bold, blanc
- Sous-titre : 36px, regular, blanc (opacity 0.9)
- Description : 24px, regular, blanc (opacity 0.8)

**Éléments décoratifs :**
- Cercles/éléments géométriques légers en arrière-plan
- Opacité faible pour ne pas distraire

## Notes importantes

- ✅ L'image doit être lisible même en miniature
- ✅ Éviter les petits textes qui ne seront pas lisibles
- ✅ Utiliser des couleurs contrastées
- ✅ Tester sur différentes plateformes
- ✅ Optimiser la taille pour le chargement rapide

## Alternative : Génération dynamique

Next.js permet de générer des images OG dynamiquement via `opengraph-image.tsx` dans chaque route, mais pour la page d'accueil, une image statique est suffisante.


