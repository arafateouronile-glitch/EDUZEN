#!/bin/bash

# Script pour relever toutes les erreurs TypeScript

echo "🔍 Vérification TypeScript en cours..."
echo ""

# Options pour éviter les problèmes de mémoire
export NODE_OPTIONS='--max-old-space-size=8192'

# Générer le fichier d'erreurs
npx tsc --noEmit --pretty false 2>&1 | tee typescript-errors.txt

ERROR_COUNT=$(grep -c "^app/" typescript-errors.txt || echo "0")

echo ""
echo "=========================================="
echo "📊 RÉSUMÉ"
echo "=========================================="
echo ""
echo "✅ Total d'erreurs trouvées: $ERROR_COUNT"
echo ""
echo "📈 Types d'erreurs les plus fréquents:"
grep -o "error TS[0-9]*" typescript-errors.txt | sort | uniq -c | sort -rn | head -10 | awk '{printf "   TS%s: %d erreurs\n", substr($2, 9), $1}'
echo ""
echo "📁 Fichiers avec le plus d'erreurs:"
grep "^app/" typescript-errors.txt | cut -d'(' -f1 | sort | uniq -c | sort -rn | head -15 | awk '{printf "   %s: %d erreurs\n", $2, $1}'
echo ""
echo "📄 Fichier complet: typescript-errors.txt"
echo ""

if [ "$ERROR_COUNT" -eq 0 ]; then
  echo "✅ Aucune erreur TypeScript trouvée !"
  exit 0
else
  echo "❌ $ERROR_COUNT erreurs trouvées. Consultez typescript-errors.txt pour plus de détails."
  exit 1
fi
