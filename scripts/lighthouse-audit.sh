#!/bin/bash

# ============================================================================
# Script d'audit Lighthouse - EDUZEN
# ============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
URL=${1:-http://localhost:3001}
OUTPUT_DIR="./lighthouse-reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo -e "${BLUE}🔍 Audit Lighthouse de $URL${NC}"
echo ""

# Créer le dossier de sortie
mkdir -p "$OUTPUT_DIR"

# Déterminer la commande Lighthouse à utiliser
if command -v lighthouse &> /dev/null; then
  LIGHTHOUSE_CMD="lighthouse"
  echo -e "${GREEN}✅ Lighthouse détecté${NC}"
else
  echo -e "${YELLOW}⚠️  Lighthouse n'est pas installé globalement, utilisation de npx...${NC}"
  LIGHTHOUSE_CMD="npx --yes lighthouse"
fi

echo -e "${BLUE}📊 Exécution de l'audit sur $URL...${NC}"
echo ""

# Exécuter Lighthouse
$LIGHTHOUSE_CMD "$URL" \
  --output html,json \
  --output-path "$OUTPUT_DIR/lighthouse-report-$TIMESTAMP" \
  --only-categories=performance,seo,accessibility,best-practices \
  --chrome-flags="--headless" \
  --quiet \
  --no-enable-error-reporting

# Extraire les scores
JSON_FILE="$OUTPUT_DIR/lighthouse-report-$TIMESTAMP.report.json"
ABSOLUTE_JSON_FILE="$(pwd)/$JSON_FILE"

if [ -f "$JSON_FILE" ]; then
  echo ""
  echo -e "${GREEN}✅ Audit terminé !${NC}"
  echo ""
  echo -e "${BLUE}📊 Scores :${NC}"
  
  # Extraire les scores avec gestion d'erreur (utiliser le chemin absolu)
  PERFORMANCE=$(node -e "try { const report = require('$ABSOLUTE_JSON_FILE'); console.log(Math.round((report.categories.performance?.score || 0) * 100)); } catch(e) { console.log('0'); }" 2>/dev/null || echo "0")
  SEO=$(node -e "try { const report = require('$ABSOLUTE_JSON_FILE'); console.log(Math.round((report.categories.seo?.score || 0) * 100)); } catch(e) { console.log('0'); }" 2>/dev/null || echo "0")
  ACCESSIBILITY=$(node -e "try { const report = require('$ABSOLUTE_JSON_FILE'); console.log(Math.round((report.categories.accessibility?.score || 0) * 100)); } catch(e) { console.log('0'); }" 2>/dev/null || echo "0")
  BEST_PRACTICES=$(node -e "try { const report = require('$ABSOLUTE_JSON_FILE'); console.log(Math.round((report.categories['best-practices']?.score || 0) * 100)); } catch(e) { console.log('0'); }" 2>/dev/null || echo "0")
  
  echo "  Performance:     $PERFORMANCE/100"
  echo "  SEO:             $SEO/100"
  echo "  Accessibilité:   $ACCESSIBILITY/100"
  echo "  Bonnes pratiques: $BEST_PRACTICES/100"
  echo ""
  
  # Vérifier les scores
  if [ "$PERFORMANCE" -lt 90 ]; then
    echo -e "${YELLOW}⚠️  Performance < 90${NC}"
  fi
  if [ "$SEO" -lt 90 ]; then
    echo -e "${YELLOW}⚠️  SEO < 90${NC}"
  fi
  if [ "$ACCESSIBILITY" -lt 90 ]; then
    echo -e "${YELLOW}⚠️  Accessibilité < 90${NC}"
  fi
  if [ "$BEST_PRACTICES" -lt 90 ]; then
    echo -e "${YELLOW}⚠️  Bonnes pratiques < 90${NC}"
  fi
fi

echo ""
echo -e "${GREEN}📁 Rapports générés dans :${NC}"
HTML_FILE="$OUTPUT_DIR/lighthouse-report-$TIMESTAMP.report.html"
echo "  HTML: $HTML_FILE"
echo "  JSON: $JSON_FILE"
echo ""

# Ouvrir automatiquement le rapport HTML (Mac/Linux)
if [ -f "$HTML_FILE" ]; then
  echo -e "${BLUE}💡 Ouvrir le rapport HTML ? (o/n)${NC}"
  read -t 3 -n 1 REPLY || REPLY=""
  if [[ $REPLY =~ ^[OoYy]$ ]] || [ -z "$REPLY" ]; then
    if command -v open &> /dev/null; then
      # Mac
      open "$HTML_FILE"
    elif command -v xdg-open &> /dev/null; then
      # Linux
      xdg-open "$HTML_FILE"
    elif command -v start &> /dev/null; then
      # Windows (Git Bash)
      start "$HTML_FILE"
    else
      echo -e "${YELLOW}⚠️  Ouvrir manuellement : $HTML_FILE${NC}"
    fi
  fi
fi

