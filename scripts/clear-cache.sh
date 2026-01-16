#!/bin/bash

# Script pour vider tous les caches et forcer un rechargement complet

echo "🧹 Nettoyage des caches..."

# Supprimer le cache Next.js
echo "📦 Suppression du cache Next.js..."
rm -rf .next

# Supprimer le cache node_modules
echo "📦 Suppression du cache node_modules..."
rm -rf node_modules/.cache

# Supprimer les fichiers de build
echo "📦 Suppression des fichiers de build..."
rm -rf .next/cache

echo "✅ Caches supprimés avec succès!"
echo ""
echo "📝 Instructions pour vider le cache du navigateur:"
echo "   1. Ouvrez les DevTools (F12)"
echo "   2. Clic droit sur le bouton de rechargement"
echo "   3. Sélectionnez 'Vider le cache et effectuer une actualisation forcée'"
echo ""
echo "   OU utilisez le raccourci clavier:"
echo "   - Chrome/Edge: Ctrl+Shift+R (Windows/Linux) ou Cmd+Shift+R (Mac)"
echo "   - Firefox: Ctrl+F5 (Windows/Linux) ou Cmd+Shift+R (Mac)"
echo ""
echo "🔄 Redémarrez ensuite le serveur avec: npm run dev"




