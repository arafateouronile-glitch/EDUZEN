#!/bin/bash

# Script pour publier les SDK npm et PyPI
# Usage: ./scripts/publish-sdk.sh [npm|pypi|both]

set -e

PUBLISH_TYPE=${1:-both}

echo "🚀 Publication des SDK EDUZEN"
echo "=============================="

# Fonction pour publier sur npm
publish_npm() {
  echo ""
  echo "📦 Publication sur npm..."
  echo "-------------------------"
  
  cd sdk/javascript
  
  # Vérifier l'authentification
  if ! npm whoami &> /dev/null; then
    echo "❌ Erreur: Vous n'êtes pas authentifié sur npm"
    echo "   Exécutez: npm login"
    exit 1
  fi
  
  # Vérifier le build
  echo "🔨 Vérification du build..."
  npm run build
  
  # Vérifier le package
  echo "📋 Vérification du package..."
  npm pack --dry-run
  
  # Demander confirmation
  read -p "Publier sur npm ? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm publish --access public
    echo "✅ Publication npm réussie !"
  else
    echo "❌ Publication npm annulée"
  fi
  
  cd ../..
}

# Fonction pour publier sur PyPI
publish_pypi() {
  echo ""
  echo "🐍 Publication sur PyPI..."
  echo "--------------------------"
  
  cd sdk/python
  
  # Vérifier que build et twine sont installés
  if ! command -v python &> /dev/null; then
    echo "❌ Erreur: Python n'est pas installé"
    exit 1
  fi
  
  if ! python -m pip show build &> /dev/null; then
    echo "📦 Installation de build..."
    python -m pip install build
  fi
  
  if ! python -m pip show twine &> /dev/null; then
    echo "📦 Installation de twine..."
    python -m pip install twine
  fi
  
  # Créer la distribution
  echo "🔨 Création de la distribution..."
  python -m build
  
  # Vérifier
  echo "📋 Vérification du package..."
  twine check dist/*
  
  # Demander confirmation
  read -p "Publier sur PyPI ? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    twine upload dist/*
    echo "✅ Publication PyPI réussie !"
  else
    echo "❌ Publication PyPI annulée"
  fi
  
  cd ../..
}

# Exécution
case $PUBLISH_TYPE in
  npm)
    publish_npm
    ;;
  pypi)
    publish_pypi
    ;;
  both)
    publish_npm
    publish_pypi
    ;;
  *)
    echo "Usage: $0 [npm|pypi|both]"
    exit 1
    ;;
esac

echo ""
echo "✅ Publication terminée !"





