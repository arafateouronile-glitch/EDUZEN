# EduZen - Vidéo de Présentation Motion Design

Projet Remotion pour créer des vidéos de présentation professionnelles pour EduZen.

## 🎬 Compositions disponibles

| Composition | Format | Durée | Usage |
|-------------|--------|-------|-------|
| `EduZenVideo` | 1920×1080 (16:9) | 60s | YouTube, Site web, Présentations |
| `EduZenVideoSquare` | 1080×1080 (1:1) | 30s | Instagram Feed, LinkedIn, Facebook |
| `EduZenVideoVertical` | 1080×1920 (9:16) | 15s | Stories, Reels, TikTok, YouTube Shorts |

## 🎨 Design System

La vidéo reprend exactement l'identité visuelle de l'application EduZen :

### Couleurs
```css
--brand-blue: #335ACF      /* Bleu Royal - couleur principale */
--brand-cyan: #34B9EE      /* Cyan Vibrant - couleur secondaire */
--gradient: linear-gradient(135deg, #335ACF → #34B9EE)
```

### Typographie
- **Titres** : Space Grotesk (Bold/Black)
- **Textes** : Inter (Regular/Medium)

### Effets visuels
- Glass morphism avec backdrop blur
- Gradients animés
- Shadows premium
- Animations spring fluides

## 🚀 Installation

```bash
# Naviguer dans le dossier remotion
cd remotion

# Installer les dépendances
npm install
```

## 📺 Prévisualisation

```bash
# Lancer le studio Remotion
npm start
```

Le studio s'ouvre sur `http://localhost:3000` où tu peux :
- Prévisualiser chaque composition
- Modifier les paramètres en temps réel
- Exporter en différents formats

## 🎥 Export des vidéos

### Export individuel

```bash
# Vidéo principale (YouTube, Site web)
npm run build

# Version carrée (Instagram, LinkedIn)
npm run build:square

# Version verticale (Stories, Reels)
npm run build:vertical
```

### Export tous les formats

```bash
npm run build:all
```

### Export personnalisé

```bash
# Exporter avec codec spécifique
npx remotion render EduZenVideo --codec=h264-mkv out/video.mkv

# Exporter en GIF (pour aperçus)
npx remotion render EduZenVideo --codec=gif out/preview.gif

# Exporter avec qualité spécifique
npx remotion render EduZenVideo --crf=18 out/hq-video.mp4
```

## 📁 Structure du projet

```
remotion/
├── src/
│   ├── EduZenVideo.tsx        # Vidéo 16:9 (60s)
│   ├── EduZenVideoSquare.tsx  # Vidéo 1:1 (30s)
│   ├── EduZenVideoVertical.tsx # Vidéo 9:16 (15s)
│   ├── Root.tsx               # Configuration compositions
│   └── index.ts               # Exports
├── out/                       # Fichiers exportés
├── remotion.config.ts         # Configuration Remotion
├── package.json
├── tsconfig.json
└── README.md
```

## 🎭 Structure des scènes

### EduZenVideo (60s)
1. **Intro** (0-3s) - Logo + Tagline
2. **Problème** (3-9s) - Pain points des OF
3. **Solution** (9-15s) - Présentation EduZen
4. **Features Part 1** (15-30s) - 3 fonctionnalités clés
5. **Features Part 2** (30-40s) - 3 fonctionnalités supplémentaires
6. **Social Proof** (40-48s) - Statistiques et confiance
7. **CTA** (48-60s) - Call-to-action final

### EduZenVideoSquare (30s)
1. **Intro** (0-5s) - Logo + Headline
2. **Features** (5-15s) - Liste des fonctionnalités
3. **Stats** (15-23s) - Chiffres clés
4. **CTA** (23-30s) - Call-to-action

### EduZenVideoVertical (15s)
1. **Hook** (0-4s) - Accroche rapide
2. **Features** (4-10s) - Fonctionnalités en rafale
3. **CTA** (10-15s) - Call-to-action express

## 🎵 Ajouter de la musique

Pour ajouter une bande sonore, importe un fichier audio :

```tsx
import { Audio } from 'remotion';

// Dans ton composant
<Audio src={staticFile('audio/background-music.mp3')} volume={0.3} />
```

Place le fichier audio dans `public/audio/`.

## 🔧 Personnalisation

### Modifier les couleurs

Édite les constantes `COLORS` et `GRADIENTS` dans chaque fichier de composition.

### Modifier les textes

Les textes sont définis directement dans les composants `Scene1`, `Scene2`, etc.

### Modifier les animations

Les animations utilisent `spring()` et `interpolate()` de Remotion :

```tsx
const scale = spring({
  frame: frame - delay,
  fps: 30,
  config: { damping: 12, stiffness: 100 },
});
```

## 📤 Déploiement

### Sur YouTube
- Utiliser `EduZenVideo` (1920×1080)
- Format recommandé : MP4 H.264

### Sur Instagram
- **Feed** : `EduZenVideoSquare` (1080×1080)
- **Stories/Reels** : `EduZenVideoVertical` (1080×1920)

### Sur LinkedIn
- `EduZenVideoSquare` ou `EduZenVideo`
- Durée max recommandée : 30s

### Sur TikTok
- `EduZenVideoVertical` (1080×1920)
- Durée : 15s parfait pour l'algorithme

## 🆘 Troubleshooting

### Erreur de rendu
```bash
# Nettoyer le cache
rm -rf node_modules/.cache
npm run build
```

### Lenteur du studio
```bash
# Réduire la qualité de prévisualisation
npm start -- --quality=50
```

### Problème de polices
Les polices Google sont chargées automatiquement via `@remotion/google-fonts`.

---

**Créé avec ❤️ pour EduZen**
