---
title: Guide de Publication des SDK EDUZEN
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 📦 Guide de Publication des SDK EDUZEN

**Date :** 2024-12-03

---

## 📋 Vue d'ensemble

Ce guide explique comment publier les SDK EDUZEN sur npm (JavaScript/TypeScript) et PyPI (Python).

---

## 🟢 SDK JavaScript/TypeScript

### Prérequis

- Compte npm avec accès au scope `@eduzen`
- Node.js 18+ et npm installés
- Authentification npm configurée

### Étapes de Publication

1. **Préparer la publication**
   ```bash
   cd sdk/javascript
   npm install
   npm test
   npm run build
   ```

2. **Vérifier la version**
   - Mettre à jour `version` dans `package.json`
   - Suivre [Semantic Versioning](https://semver.org/)

3. **Publier**
   ```bash
   npm publish --access public
   ```

4. **Vérifier**
   ```bash
   npm view @eduzen/sdk
   npm install @eduzen/sdk
   ```

### Commandes Utiles

```bash
# Tests
npm test
npm test -- --coverage

# Build
npm run build

# Vérifier le package
npm pack --dry-run
```

### Installation

```bash
npm install @eduzen/sdk
```

---

## 🐍 SDK Python

### Prérequis

- Compte PyPI (https://pypi.org)
- Compte TestPyPI pour les tests (https://test.pypi.org)
- `twine` et `build` installés : `pip install twine build`

### Étapes de Publication

1. **Préparer la publication**
   ```bash
   cd sdk/python
   pip install -e ".[dev]"
   python -m pytest tests/
   rm -rf dist/ build/ *.egg-info
   ```

2. **Vérifier la version**
   - Mettre à jour `version` dans `setup.py`
   - Suivre [Semantic Versioning](https://semver.org/)

3. **Créer la distribution**
   ```bash
   python -m build
   twine check dist/*
   ```

4. **Tester sur TestPyPI**
   ```bash
   # Configurer ~/.pypirc (voir .pypirc.example)
   twine upload --repository pypitest dist/*
   pip install --index-url https://test.pypi.org/simple/ eduzen-sdk
   ```

5. **Publier sur PyPI**
   ```bash
   twine upload --repository pypi dist/*
   ```

6. **Vérifier**
   ```bash
   pip install eduzen-sdk
   ```

### Configuration .pypirc

Créer `~/.pypirc` :

```ini
[distutils]
index-servers =
    pypi
    pypitest

[pypi]
repository = https://upload.pypi.org/legacy/
username = your-username
password = your-password

[pypitest]
repository = https://test.pypi.org/legacy/
username = your-username
password = your-password
```

### Installation

```bash
pip install eduzen-sdk
```

---

## 📝 Semantic Versioning

Suivre [SemVer](https://semver.org/) :

- **MAJOR** (2.0.0) : Breaking changes
- **MINOR** (1.1.0) : Nouvelles fonctionnalités (backward compatible)
- **PATCH** (1.0.1) : Bug fixes (backward compatible)

### Exemples

- `1.0.0` → `1.0.1` : Correction d'un bug
- `1.0.1` → `1.1.0` : Ajout de nouvelles méthodes
- `1.1.0` → `2.0.0` : Changement de l'API (breaking changes)

---

## ✅ Checklist de Publication

### Avant Publication

- [ ] Tous les tests passent
- [ ] Build réussi sans erreurs
- [ ] Version mise à jour
- [ ] README à jour
- [ ] Changelog mis à jour (si applicable)
- [ ] Documentation à jour

### Publication npm

- [ ] `npm test` passe
- [ ] `npm run build` réussit
- [ ] `npm pack --dry-run` vérifié
- [ ] `npm publish --access public` exécuté
- [ ] Package vérifié sur npm

### Publication PyPI

- [ ] Tests passent (`pytest`)
- [ ] `python -m build` réussit
- [ ] `twine check dist/*` passe
- [ ] Testé sur TestPyPI
- [ ] `twine upload` exécuté
- [ ] Package vérifié sur PyPI

---

## 🔗 Liens Utiles

- [npm Documentation](https://docs.npmjs.com/)
- [PyPI Documentation](https://pypi.org/help/)
- [Semantic Versioning](https://semver.org/)
- [Twine Documentation](https://twine.readthedocs.io/)

---

**Dernière mise à jour :** 2024-12-03---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.