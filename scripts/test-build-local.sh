#!/bin/bash

# Script pour tester le build localement avant de pousser vers Vercel
# Utilisation: ./scripts/test-build-local.sh

echo "🔨 Test du build local (identique à Vercel)..."
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
  echo "❌ Erreur: package.json non trouvé. Lancez ce script depuis la racine du projet."
  exit 1
fi

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
  echo "📦 Installation des dépendances..."
  npm install
fi

# Lancer le build
echo "🏗️  Lancement du build..."
npm run build

# Vérifier le code de retour
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Build réussi ! Vous pouvez maintenant pousser vers GitHub/Vercel."
  exit 0
else
  echo ""
  echo "❌ Build échoué. Corrigez les erreurs avant de pousser."
  exit 1
fi
