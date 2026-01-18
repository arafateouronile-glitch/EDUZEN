# Fix : JavaScript heap out of memory lors du build

## Problème

Lors du build local (`npm run build`), vous pouvez rencontrer l'erreur :

```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

## Cause

TypeScript utilise beaucoup de mémoire lors de la compilation d'un grand projet Next.js. La limite par défaut de Node.js (~2 GB) peut ne pas être suffisante.

## Solution Appliquée

Le script `build` dans `package.json` a été modifié pour augmenter la limite de mémoire :

```json
"build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
```

Cela augmente la limite à **4 GB** (4096 MB).

## Options Alternatives

### Option 1 : Variable d'environnement (Recommandé pour Vercel)

Si vous avez des problèmes sur Vercel, ajoutez cette variable d'environnement :

```
NODE_OPTIONS=--max-old-space-size=4096
```

### Option 2 : Augmenter encore plus (si nécessaire)

Si 4 GB ne suffit pas, vous pouvez augmenter à 8 GB :

```json
"build": "NODE_OPTIONS='--max-old-space-size=8192' next build"
```

⚠️ **Attention** : Vérifiez que votre machine a assez de RAM disponible.

### Option 3 : Script séparé pour build avec plus de mémoire

Créer un script séparé dans `package.json` :

```json
"build:large": "NODE_OPTIONS='--max-old-space-size=8192' next build"
```

## Vérification

Pour vérifier que le fix fonctionne :

```bash
npm run build
```

Le build devrait maintenant réussir sans erreur de mémoire.

## Sur Vercel

Vercel utilise généralement plus de mémoire que le local, donc cette erreur est moins courante. Si vous avez des problèmes sur Vercel :

1. **Vérifier** la variable d'environnement `NODE_OPTIONS` dans Vercel Dashboard
2. **Augmenter** le plan Vercel si nécessaire (Pro ou Enterprise ont plus de mémoire)
