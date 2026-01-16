---
title: Guide de Publication - SDK Python
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Guide de Publication - SDK Python

## Prérequis

1. Compte PyPI (https://pypi.org)
2. Compte TestPyPI pour les tests (https://test.pypi.org)
3. `twine` installé : `pip install twine build`

## Étapes de Publication

### 1. Préparer la publication

```bash
# Installer les dépendances de développement
pip install -e ".[dev]"

# Exécuter les tests
python -m pytest tests/

# Nettoyer les anciennes distributions
rm -rf dist/ build/ *.egg-info
```

### 2. Vérifier la version

Mettre à jour la version dans `setup.py` selon [Semantic Versioning](https://semver.org/):
- `1.0.1` - Patch (bug fixes)
- `1.1.0` - Minor (nouvelles fonctionnalités)
- `2.0.0` - Major (breaking changes)

### 3. Créer la distribution

```bash
# Créer les distributions (source et wheel)
python -m build

# Vérifier les fichiers créés
ls -la dist/
```

### 4. Tester sur TestPyPI

```bash
# Configurer .pypirc (copier depuis .pypirc.example)
cp .pypirc.example ~/.pypirc
# Éditer ~/.pypirc avec vos credentials

# Publier sur TestPyPI
twine upload --repository pypitest dist/*

# Tester l'installation depuis TestPyPI
pip install --index-url https://test.pypi.org/simple/ eduzen-sdk
```

### 5. Publier sur PyPI

```bash
# Publier sur PyPI
twine upload --repository pypi dist/*

# Ou utiliser directement
twine upload dist/*
```

### 6. Vérifier la publication

```bash
# Vérifier que le package est disponible
pip search eduzen-sdk  # Si disponible
# Ou vérifier sur https://pypi.org/project/eduzen-sdk/

# Installer depuis PyPI
pip install eduzen-sdk
```

## Commandes Utiles

```bash
# Lancer les tests
python -m pytest tests/

# Lancer les tests avec coverage
python -m pytest tests/ --cov=eduzen --cov-report=html

# Créer la distribution
python -m build

# Vérifier la distribution
twine check dist/*

# Nettoyer
rm -rf dist/ build/ *.egg-info
```

## Configuration .pypirc

Créer `~/.pypirc` avec le contenu suivant :

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

## Notes

- Toujours tester sur TestPyPI avant de publier sur PyPI
- Utiliser `twine` pour la publication (plus sécurisé que `setup.py upload`)
- Vérifier les fichiers avec `twine check` avant publication
- Suivre Semantic Versioning pour les versions---

**Document EDUZEN** | [Retour à la documentation principale](../../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.