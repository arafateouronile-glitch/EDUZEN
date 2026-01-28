#!/bin/bash

# Script amélioré pour remplacer automatiquement les console.log par logger structuré
# Usage: ./scripts/replace-console-logs-complete.sh [directory]
# Exemple: ./scripts/replace-console-logs-complete.sh app/api

set -e

# Couleurs pour l'output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Répertoire à traiter (par défaut: app/api)
TARGET_DIR="${1:-app/api}"
LOGGER_IMPORT='import { logger, sanitizeError } from '\''@/lib/utils/logger'\'''

# Compteurs
TOTAL_FILES=0
PROCESSED_FILES=0
SKIPPED_FILES=0

echo "🔍 Recherche de console.* dans: $TARGET_DIR"
echo ""

# Fonction pour vérifier si le logger est déjà importé
has_logger_import() {
  local file=$1
  grep -q "from '@/lib/utils/logger'" "$file" 2>/dev/null || grep -q 'from "@/lib/utils/logger"' "$file" 2>/dev/null
}

# Fonction pour ajouter l'import du logger
add_logger_import() {
  local file=$1
  
  # Vérifier si c'est un fichier TypeScript/TSX
  if [[ ! "$file" =~ \.(ts|tsx)$ ]]; then
    return
  fi
  
  # Trouver la ligne du dernier import
  local last_import_line=$(grep -n "^import" "$file" 2>/dev/null | tail -1 | cut -d: -f1)
  
  if [ -z "$last_import_line" ]; then
    # Pas d'import, trouver la première ligne non-vide après 'use client' ou 'use server'
    local use_directive_line=$(grep -n -E "^('use client'|'use server')" "$file" 2>/dev/null | head -1 | cut -d: -f1)
    if [ -n "$use_directive_line" ]; then
      # Insérer après 'use client'/'use server'
      sed -i '' "${use_directive_line}a\\
$LOGGER_IMPORT
" "$file"
    else
      # Trouver la première ligne de code (pas commentaire, pas vide)
      local first_code_line=$(grep -n -E "^(export|const|function|type|interface|let|var|class)" "$file" 2>/dev/null | head -1 | cut -d: -f1)
      if [ -z "$first_code_line" ]; then
        first_code_line=1
      fi
      # Insérer avant la première ligne de code
      sed -i '' "${first_code_line}i\\
$LOGGER_IMPORT
\\
" "$file"
    fi
  else
    # Ajouter après le dernier import
    sed -i '' "${last_import_line}a\\
$LOGGER_IMPORT
" "$file"
  fi
}

# Fonction pour remplacer console.* par logger.*
replace_console_logs() {
  local file=$1
  
  # Sauvegarder le contenu original pour vérification
  local original_content=$(cat "$file")
  
  # console.error -> logger.error (garde le même niveau)
  sed -i '' 's/console\.error(/logger.error(/g' "$file"
  
  # console.warn -> logger.warn
  sed -i '' 's/console\.warn(/logger.warn(/g' "$file"
  
  # console.info -> logger.info
  sed -i '' 's/console\.info(/logger.info(/g' "$file"
  
  # console.debug -> logger.debug
  sed -i '' 's/console\.debug(/logger.debug(/g' "$file"
  
  # console.log -> logger.debug (par défaut, peut nécessiter ajustement manuel)
  # Pour les routes API, on préfère logger.info pour les logs importants
  if [[ "$file" =~ /api/ ]]; then
    # Dans les routes API, console.log devient logger.info (plus visible)
    sed -i '' 's/console\.log(/logger.info(/g' "$file"
  else
    # Ailleurs, console.log devient logger.debug
    sed -i '' 's/console\.log(/logger.debug(/g' "$file"
  fi
}

# Traiter un fichier
process_file() {
  local file=$1
  TOTAL_FILES=$((TOTAL_FILES + 1))
  
  if ! grep -q "console\.\(log\|warn\|error\|info\|debug\)" "$file" 2>/dev/null; then
    return
  fi
  
  echo -e "${YELLOW}Traitement de: $file${NC}"
  
  # Compter les occurrences
  local count=$(grep -c "console\.\(log\|warn\|error\|info\|debug\)" "$file" 2>/dev/null || echo "0")
  echo "  → $count occurrence(s) trouvée(s)"
  
  # Ajouter l'import si nécessaire
  if ! has_logger_import "$file"; then
    echo "  → Ajout de l'import logger"
    add_logger_import "$file"
  else
    echo "  → Import logger déjà présent"
  fi
  
  # Remplacer les console.*
  echo "  → Remplacement des console.*"
  replace_console_logs "$file"
  
  PROCESSED_FILES=$((PROCESSED_FILES + 1))
  echo -e "  ${GREEN}✅ Fait${NC}"
  echo ""
}

# Traiter tous les fichiers .ts et .tsx dans le répertoire cible
if [ ! -d "$TARGET_DIR" ]; then
  echo -e "${RED}❌ Répertoire non trouvé: $TARGET_DIR${NC}"
  exit 1
fi

echo "📁 Traitement des fichiers dans: $TARGET_DIR"
echo ""

# Traiter les fichiers
find "$TARGET_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
  process_file "$file"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Traitement terminé${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Statistiques:"
echo "   • Fichiers traités: $PROCESSED_FILES"
echo ""
echo -e "${YELLOW}⚠️  ATTENTION:${NC}"
echo "   • Vérifiez manuellement que les remplacements sont corrects"
echo "   • Certains console.log peuvent nécessiter logger.info au lieu de logger.debug"
echo "   • Vérifiez que les imports sont corrects"
echo "   • Testez les fonctionnalités modifiées"
echo ""
echo "💡 Pour vérifier les changements:"
echo "   git diff $TARGET_DIR"
echo ""
