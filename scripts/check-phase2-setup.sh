#!/bin/bash

# Script de vérification de la configuration Phase 2
# Usage: ./scripts/check-phase2-setup.sh

echo "🔍 Vérification de la configuration Phase 2..."
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
PASSED=0
FAILED=0
WARNINGS=0

# Fonction pour vérifier une condition
check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $2${NC}"
        ((FAILED++))
    fi
}

# Fonction pour un avertissement
warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

echo "📋 Vérification des fichiers de configuration..."
echo ""

# Vérifier vercel.json
if [ -f "vercel.json" ]; then
    check 0 "vercel.json existe"
else
    check 1 "vercel.json manquant"
fi

# Vérifier les workflows GitHub Actions
if [ -f ".github/workflows/deploy-production.yml" ]; then
    check 0 "Workflow deploy-production.yml existe"
else
    check 1 "Workflow deploy-production.yml manquant"
fi

if [ -f ".github/workflows/test.yml" ]; then
    check 0 "Workflow test.yml existe"
else
    check 1 "Workflow test.yml manquant"
fi

if [ -f ".github/workflows/build.yml" ]; then
    check 0 "Workflow build.yml existe"
else
    check 1 "Workflow build.yml manquant"
fi

# Vérifier les migrations Supabase
if [ -d "supabase/migrations" ]; then
    MIGRATION_COUNT=$(find supabase/migrations -name "*.sql" | wc -l)
    if [ $MIGRATION_COUNT -gt 0 ]; then
        check 0 "Migrations Supabase trouvées ($MIGRATION_COUNT fichiers)"
    else
        check 1 "Aucune migration Supabase trouvée"
    fi
else
    check 1 "Dossier supabase/migrations manquant"
fi

# Vérifier la configuration Sentry
if [ -f "sentry.client.config.ts" ]; then
    check 0 "sentry.client.config.ts existe"
else
    warn "sentry.client.config.ts manquant (optionnel)"
fi

if [ -f "sentry.server.config.ts" ]; then
    check 0 "sentry.server.config.ts existe"
else
    warn "sentry.server.config.ts manquant (optionnel)"
fi

echo ""
echo "📝 Vérification des variables d'environnement nécessaires..."
echo ""

# Vérifier .env.example ou .env.local
if [ -f ".env.example" ] || [ -f ".env.local" ]; then
    check 0 "Fichier .env trouvé"
    
    # Vérifier les variables importantes
    if [ -f ".env.example" ]; then
        ENV_FILE=".env.example"
    else
        ENV_FILE=".env.local"
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" "$ENV_FILE"; then
        check 0 "NEXT_PUBLIC_SUPABASE_URL défini"
    else
        warn "NEXT_PUBLIC_SUPABASE_URL non trouvé dans $ENV_FILE"
    fi
    
    if grep -q "SUPABASE_SERVICE_ROLE_KEY" "$ENV_FILE"; then
        check 0 "SUPABASE_SERVICE_ROLE_KEY défini"
    else
        warn "SUPABASE_SERVICE_ROLE_KEY non trouvé dans $ENV_FILE"
    fi
else
    warn "Aucun fichier .env trouvé (normal si vous utilisez uniquement les variables Vercel)"
fi

echo ""
echo "📚 Vérification de la documentation..."
echo ""

# Vérifier les guides
if [ -f "docs/PRODUCTION_SETUP.md" ]; then
    check 0 "docs/PRODUCTION_SETUP.md existe"
else
    check 1 "docs/PRODUCTION_SETUP.md manquant"
fi

if [ -f "docs/SUPABASE_PRODUCTION_MIGRATION.md" ]; then
    check 0 "docs/SUPABASE_PRODUCTION_MIGRATION.md existe"
else
    check 1 "docs/SUPABASE_PRODUCTION_MIGRATION.md manquant"
fi

if [ -f "docs/GUIDE_ACTIONS_MANUELLES_PHASE2.md" ]; then
    check 0 "docs/GUIDE_ACTIONS_MANUELLES_PHASE2.md existe"
else
    check 1 "docs/GUIDE_ACTIONS_MANUELLES_PHASE2.md manquant"
fi

echo ""
echo "📊 Résumé..."
echo ""

echo -e "${GREEN}✅ Réussis: $PASSED${NC}"
echo -e "${RED}❌ Échecs: $FAILED${NC}"
echo -e "${YELLOW}⚠️  Avertissements: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Tous les fichiers de configuration sont présents !${NC}"
    echo ""
    echo "📋 Prochaines étapes :"
    echo "   1. Suivre docs/GUIDE_ACTIONS_MANUELLES_PHASE2.md"
    echo "   2. Créer les projets Vercel, Supabase, Sentry"
    echo "   3. Configurer les variables d'environnement"
    echo "   4. Appliquer les migrations Supabase"
    exit 0
else
    echo -e "${RED}⚠️  Certains fichiers manquent. Veuillez les créer avant de continuer.${NC}"
    exit 1
fi
