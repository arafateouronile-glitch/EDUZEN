---
title: Guide de Publication npm et PyPI
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 📦 Guide de Publication npm et PyPI

**Date :** 2024-12-03  
**Statut :** SDK prêts pour publication

---

## 📋 Prérequis

### npm
1. Compte npm (https://www.npmjs.com/signup)
2. Accès au scope `@eduzen` (ou créer un compte organisation)
3. `npm` installé (v7+)

### PyPI
1. Compte PyPI (https://pypi.org/account/register/)
2. Compte TestPyPI (https://test.pypi.org/account/register/) - optionnel pour tests
3. `python` 3.8+ installé
4. `pip` installé
5. `build` et `twine` installés

---

## 🚀 Publication npm

### 1. Authentification

```bash
cd sdk/javascript

# Se connecter à npm
npm login

# Vérifier l'authentification
npm whoami
```

### 2. Vérification avant publication

```bash
# Vérifier le build
npm run build

# Vérifier le contenu du package
npm pack --dry-run

# Vérifier les fichiers inclus
npm pack
tar -tzf eduzen-sdk-1.0.0.tgz
```

### 3. Publication

```bash
# Publier sur npm
npm publish --access public

# Ou publier une version spécifique
npm version patch  # 1.0.0 -> 1.0.1
npm publish --access public
```

### 4. Vérification après publication

```bash
# Vérifier que le package est disponible
npm view @eduzen/sdk

# Installer depuis npm
npm install @eduzen/sdk

# Tester l'installation
node -e "const client = require('@eduzen/sdk'); console.log(client);"
```

### 5. Mise à jour de version

```bash
# Version patch (1.0.0 -> 1.0.1)
npm version patch

# Version minor (1.0.0 -> 1.1.0)
npm version minor

# Version major (1.0.0 -> 2.0.0)
npm version major

# Puis publier
npm publish --access public
```

---

## 🐍 Publication PyPI

### 1. Installation des outils

```bash
pip install build twine
```

### 2. Configuration PyPI

Créer `~/.pypirc` (ou utiliser les variables d'environnement) :

```ini
[distutils]
index-servers =
    pypi
    pypitest

[pypi]
username = __token__
password = pypi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

[pypitest]
repository = https://test.pypi.org/legacy/
username = __token__
password = pypi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Note :** Utiliser un token API PyPI (https://pypi.org/manage/account/token/)

### 3. Vérification avant publication

```bash
cd sdk/python

# Créer la distribution
python -m build

# Vérifier les fichiers
twine check dist/*

# Vérifier le contenu
ls -la dist/
```

### 4. Test sur TestPyPI (recommandé)

```bash
# Publier sur TestPyPI
twine upload --repository pypitest dist/*

# Installer depuis TestPyPI pour tester
pip install --index-url https://test.pypi.org/simple/ eduzen-sdk
```

### 5. Publication sur PyPI

```bash
# Publier sur PyPI
twine upload --repository pypi dist/*

# Ou utiliser la configuration par défaut
twine upload dist/*
```

### 6. Vérification après publication

```bash
# Vérifier que le package est disponible
pip search eduzen-sdk  # Si disponible
# Ou visiter https://pypi.org/project/eduzen-sdk/

# Installer depuis PyPI
pip install eduzen-sdk

# Tester l'installation
python -c "import eduzen; print(eduzen.__version__)"
```

### 7. Mise à jour de version

Modifier `setup.py` :

```python
setup(
    name="eduzen-sdk",
    version="1.0.1",  # Mettre à jour ici
    # ...
)
```

Puis :

```bash
# Reconstruire
python -m build

# Publier
twine upload dist/*
```

---

## 🔐 Sécurité

### npm
- Utiliser `npm login` (pas de mot de passe en clair)
- Activer 2FA sur le compte npm
- Utiliser des tokens d'authentification pour CI/CD

### PyPI
- Utiliser des tokens API (pas de mot de passe)
- Activer 2FA sur le compte PyPI
- Utiliser des tokens séparés pour TestPyPI et PyPI

---

## 📝 Checklist de Publication

### npm
- [ ] `npm login` effectué
- [ ] `npm run build` réussi
- [ ] `npm pack --dry-run` vérifié
- [ ] Version dans `package.json` correcte
- [ ] `npm publish --access public` exécuté
- [ ] Package visible sur npmjs.com
- [ ] Installation testée

### PyPI
- [ ] Token API PyPI créé
- [ ] `build` et `twine` installés
- [ ] `python -m build` réussi
- [ ] `twine check dist/*` réussi
- [ ] Test sur TestPyPI (optionnel)
- [ ] `twine upload dist/*` exécuté
- [ ] Package visible sur pypi.org
- [ ] Installation testée

---

## 🐛 Dépannage

### npm
- **Erreur `ENEEDAUTH`** : Exécuter `npm login`
- **Erreur `EPUBLISHCONFLICT`** : Version déjà publiée, incrémenter la version
- **Erreur de scope** : Vérifier l'accès au scope `@eduzen`

### PyPI
- **Erreur d'authentification** : Vérifier le token dans `~/.pypirc`
- **Erreur de version** : Version déjà publiée, incrémenter dans `setup.py`
- **Erreur de build** : Vérifier `setup.py` et les dépendances

---

## 📚 Ressources

- [npm Documentation](https://docs.npmjs.com/)
- [PyPI Documentation](https://packaging.python.org/)
- [Twine Documentation](https://twine.readthedocs.io/)

---

**Note :** La publication nécessite une authentification manuelle. Ce guide fournit les étapes nécessaires.---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.