#!/bin/bash

# Script de vérification de la configuration production
# Usage: ./scripts/verify-production-setup.sh

set -e

echo "🔍 Vérification de la configuration production..."
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
PASSED=0
FAILED=0
WARNINGS=0

check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $1${NC}"
        ((FAILED++))
    fi
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

# 1. Vérifier Node.js
echo "📦 Vérification des dépendances..."
node --version > /dev/null 2>&1
check "Node.js installé"

npm --version > /dev/null 2>&1
check "npm installé"

# 2. Vérifier les fichiers de configuration
echo ""
echo "📄 Vérification des fichiers de configuration..."

[ -f "package.json" ] && check "package.json existe" || warn "package.json manquant"
[ -f "next.config.js" ] && check "next.config.js existe" || warn "next.config.js manquant"
[ -f "vercel.json" ] && check "vercel.json existe" || warn "vercel.json manquant"
[ -f "tsconfig.json" ] && check "tsconfig.json existe" || warn "tsconfig.json manquant"

# 3. Vérifier les workflows GitHub Actions
echo ""
echo "🔄 Vérification des workflows GitHub Actions..."

[ -f ".github/workflows/test.yml" ] && check "Workflow tests existe" || warn "Workflow tests manquant"
[ -f ".github/workflows/build.yml" ] && check "Workflow build existe" || warn "Workflow build manquant"
[ -f ".github/workflows/deploy-production.yml" ] && check "Workflow deploy existe" || warn "Workflow deploy manquant"

# 4. Vérifier les migrations Supabase
echo ""
echo "🗄️  Vérification des migrations Supabase..."

if [ -d "supabase/migrations" ]; then
    MIGRATION_COUNT=$(find supabase/migrations -name "*.sql" | wc -l | tr -d ' ')
    if [ $MIGRATION_COUNT -gt 0 ]; then
        check "$MIGRATION_COUNT migrations trouvées"
    else
        warn "Aucune migration trouvée"
    fi
else
    warn "Dossier supabase/migrations manquant"
fi

# 5. Vérifier TypeScript
echo ""
echo "📝 Vérification TypeScript..."

if command -v npx &> /dev/null; then
    npx tsc --noEmit > /dev/null 2>&1
    check "TypeScript compile sans erreurs"
else
    warn "npx non disponible"
fi

# 6. Vérifier le build
echo ""
echo "🏗️  Vérification du build..."

if [ -f ".next" ] || [ -d ".next" ]; then
    warn "Dossier .next existe (build précédent)"
else
    echo "ℹ️  Aucun build précédent trouvé (normal si premier build)"
fi

# 7. Résumé
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RÉSUMÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Réussis: $PASSED${NC}"
echo -e "${RED}❌ Échecs: $FAILED${NC}"
echo -e "${YELLOW}⚠️  Avertissements: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Configuration production prête !${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Des problèmes ont été détectés. Veuillez les corriger avant le déploiement.${NC}"
    exit 1
fi
