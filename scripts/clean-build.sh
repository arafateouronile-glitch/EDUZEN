#!/bin/bash

# Script de nettoyage pour accélérer le build

echo "🧹 Nettoyage en cours..."

# 1. Supprimer le cache Next.js
echo "  → Suppression de .next/"
rm -rf .next
echo "    ✓ Cache Next.js supprimé"

# 2. Supprimer les dossiers de tests
echo "  → Suppression des dossiers de tests"
rm -rf playwright-report test-results test-output
echo "    ✓ Dossiers de tests supprimés"

# 3. Supprimer les fichiers de build TypeScript
echo "  → Suppression des fichiers de build TypeScript"
rm -f .next/cache/tsconfig.tsbuildinfo tsconfig.tsbuildinfo
find . -name "*.tsbuildinfo" -delete 2>/dev/null
echo "    ✓ Fichiers TypeScript supprimés"

# 4. Nettoyer le cache npm (optionnel, peut être long)
if [ "$1" == "--full" ]; then
  echo "  → Nettoyage du cache npm (peut prendre du temps)..."
  npm cache clean --force
  echo "    ✓ Cache npm nettoyé"
fi

# 5. Supprimer les logs
echo "  → Suppression des logs"
find . -name "*.log" -type f -delete 2>/dev/null
echo "    ✓ Logs supprimés"

echo ""
echo "✅ Nettoyage terminé !"
echo ""
echo "💡 Pour un nettoyage complet (incluant npm cache):"
echo "   ./scripts/clean-build.sh --full"
echo ""
echo "📊 Espace libéré:"
du -sh .next node_modules 2>/dev/null || echo "  .next: supprimé"
echo ""
