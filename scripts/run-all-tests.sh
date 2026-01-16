#!/bin/bash

# ============================================================================
# Script d'exécution de tous les tests - EDUZEN
# ============================================================================

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Exécution des tests EDUZEN${NC}"
echo ""

# ============================================================================
# 1. Tests unitaires
# ============================================================================
echo -e "${BLUE}📦 Tests unitaires (Vitest)...${NC}"
if npm test -- --run; then
    echo -e "${GREEN}✅ Tests unitaires: PASSÉS${NC}"
else
    echo -e "${RED}❌ Tests unitaires: ÉCHOUÉS${NC}"
    exit 1
fi
echo ""

# ============================================================================
# 2. Tests d'intégration
# ============================================================================
echo -e "${BLUE}🔄 Tests d'intégration...${NC}"
if npm run test:integration; then
    echo -e "${GREEN}✅ Tests d'intégration: PASSÉS${NC}"
else
    echo -e "${YELLOW}⚠️  Tests d'intégration: Certains ont échoué${NC}"
fi
echo ""

# ============================================================================
# 3. Couverture de code
# ============================================================================
echo -e "${BLUE}📊 Génération du rapport de couverture...${NC}"
npm run test:coverage
echo -e "${GREEN}✅ Rapport de couverture généré${NC}"
echo ""

# ============================================================================
# 4. Tests E2E (optionnel - nécessite serveur démarré)
# ============================================================================
read -p "Voulez-vous exécuter les tests E2E ? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Assurez-vous que le serveur dev est démarré (npm run dev)${NC}"
    read -p "Appuyez sur Entrée pour continuer..."
    
    echo -e "${BLUE}🎭 Tests E2E (Playwright)...${NC}"
    if npm run test:e2e; then
        echo -e "${GREEN}✅ Tests E2E: PASSÉS${NC}"
    else
        echo -e "${YELLOW}⚠️  Tests E2E: Certains ont échoué${NC}"
    fi
    echo ""
fi

# ============================================================================
# Résumé
# ============================================================================
echo -e "${GREEN}✅ Exécution des tests terminée${NC}"
echo ""
echo "📊 Rapports disponibles :"
echo "  - Couverture: coverage/index.html"
echo "  - E2E: playwright-report/index.html"


