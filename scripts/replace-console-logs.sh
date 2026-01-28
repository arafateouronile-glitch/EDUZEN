#!/bin/bash

# Script pour remplacer automatiquement les console.log par logger structuré
# Usage: ./scripts/replace-console-logs.sh

SERVICES_DIR="lib/services"
LOGGER_IMPORT='import { logger, sanitizeError } from '\''@/lib/utils/logger'\'''

# Fonction pour vérifier si le logger est déjà importé
has_logger_import() {
  local file=$1
  grep -q "from '@/lib/utils/logger'" "$file" || grep -q 'from "@/lib/utils/logger"' "$file"
}

# Fonction pour ajouter l'import du logger
add_logger_import() {
  local file=$1
  local first_import_line=$(grep -n "^import" "$file" | head -1 | cut -d: -f1)
  
  if [ -z "$first_import_line" ]; then
    # Pas d'import, ajouter au début
    sed -i '' "1i\\
$LOGGER_IMPORT
" "$file"
  else
    # Ajouter après le dernier import
    local last_import_line=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
    sed -i '' "${last_import_line}a\\
$LOGGER_IMPORT
" "$file"
  fi
}

# Remplacer console.log par logger.info/debug
replace_console_logs() {
  local file=$1
  
  # console.log -> logger.debug (par défaut, peut être ajusté manuellement)
  sed -i '' 's/console\.log(/logger.debug(/g' "$file"
  
  # console.warn -> logger.warn
  sed -i '' 's/console\.warn(/logger.warn(/g' "$file"
  
  # console.error -> logger.error
  sed -i '' 's/console\.error(/logger.error(/g' "$file"
  
  # console.info -> logger.info
  sed -i '' 's/console\.info(/logger.info(/g' "$file"
  
  # console.debug -> logger.debug
  sed -i '' 's/console\.debug(/logger.debug(/g' "$file"
}

# Traiter tous les fichiers .ts dans lib/services
find "$SERVICES_DIR" -name "*.ts" -type f | while read file; do
  if grep -q "console\.\(log\|warn\|error\|info\|debug\)" "$file"; then
    echo "Traitement de: $file"
    
    # Ajouter l'import si nécessaire
    if ! has_logger_import "$file"; then
      echo "  → Ajout de l'import logger"
      add_logger_import "$file"
    fi
    
    # Remplacer les console.*
    echo "  → Remplacement des console.*"
    replace_console_logs "$file"
    
    echo "  ✅ Fait"
  fi
done

echo ""
echo "⚠️  ATTENTION: Ce script fait des remplacements automatiques."
echo "   Vérifiez manuellement que les remplacements sont corrects."
echo "   Certains console.log peuvent nécessiter logger.info au lieu de logger.debug."
