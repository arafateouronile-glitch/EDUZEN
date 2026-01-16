#!/bin/bash

# Script pour remplacer les imports framer-motion par le wrapper optimisé
# Usage: ./scripts/optimize-framer-motion-imports.sh

echo "🔄 Optimisation des imports framer-motion..."

# Trouver tous les fichiers qui importent framer-motion
FILES=$(find app components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec grep -l "from ['\"]framer-motion['\"]" {} \;)

COUNT=0
for file in $FILES; do
  # Ignorer les fichiers déjà optimisés (qui utilisent le wrapper)
  if grep -q "from '@/components/ui/motion'" "$file" 2>/dev/null; then
    continue
  fi
  
  # Remplacer les imports
  sed -i '' "s/from ['\"]framer-motion['\"]/from '@\/components\/ui\/motion'/g" "$file"
  
  # Remplacer les imports avec des accolades multiples
  sed -i '' "s/from ['\"]framer-motion['\"]/from '@\/components\/ui\/motion'/g" "$file"
  
  COUNT=$((COUNT + 1))
  echo "✅ Optimisé: $file"
done

echo "✨ $COUNT fichiers optimisés"
