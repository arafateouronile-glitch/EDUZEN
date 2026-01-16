---
title: Guide de Publication - SDK JavaScriptTypeScript
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Guide de Publication - SDK JavaScript/TypeScript

## Prérequis

1. Compte npm avec accès au scope `@eduzen`
2. Authentification npm configurée

## Étapes de Publication

### 1. Préparer la publication

```bash
# Installer les dépendances
npm install

# Exécuter les tests
npm test

# Build le package
npm run build

# Vérifier le contenu du package
npm pack --dry-run
```

### 2. Vérifier la version

Mettre à jour la version dans `package.json` selon [Semantic Versioning](https://semver.org/):
- `1.0.1` - Patch (bug fixes)
- `1.1.0` - Minor (nouvelles fonctionnalités)
- `2.0.0` - Major (breaking changes)

### 3. Publier

```bash
# Publier sur npm
npm publish --access public

# Ou publier sur npm avec tag
npm publish --access public --tag beta  # pour version beta
npm publish --access public --tag latest  # pour version stable (défaut)
```

### 4. Vérifier la publication

```bash
# Vérifier que le package est disponible
npm view @eduzen/sdk

# Installer depuis npm
npm install @eduzen/sdk
```

## Commandes Utiles

```bash
# Lancer les tests
npm test

# Lancer les tests avec coverage
npm test -- --coverage

# Build
npm run build

# Vérifier le package avant publication
npm pack
```

## Notes

- Le package est publié avec le scope `@eduzen`
- L'accès public est requis pour les scopes npm
- Toujours tester avant de publier
- Suivre Semantic Versioning pour les versions---

**Document EDUZEN** | [Retour à la documentation principale](../../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.