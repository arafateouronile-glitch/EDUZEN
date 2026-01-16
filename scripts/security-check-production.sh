#!/bin/bash

# ============================================
# Vérification Sécurité Production
# ============================================
# 
# Vérifie les aspects de sécurité critiques
# pour la production
#
# USAGE:
#   ./scripts/security-check-production.sh
#
# ============================================

set -e

echo "🔒 Vérification Sécurité Production"
echo "===================================="
echo ""

FAILED=0

# Vérifier HTTPS
echo "1. HTTPS"
if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
  echo "   ⚠️  NEXT_PUBLIC_APP_URL non définie"
else
  if [[ "$NEXT_PUBLIC_APP_URL" == https://* ]]; then
    echo "   ✅ HTTPS activé"
  else
    echo "   ❌ HTTPS non activé"
    FAILED=$((FAILED + 1))
  fi
fi

# Vérifier les variables d'environnement critiques
echo ""
echo "2. Variables d'environnement"
REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "NEXTAUTH_SECRET"
  "NEXTAUTH_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "   ❌ $var non définie"
    FAILED=$((FAILED + 1))
  else
    echo "   ✅ $var définie"
  fi
done

# Vérifier npm audit
echo ""
echo "3. Vulnérabilités npm"
if npm audit --production --audit-level=high 2>/dev/null | grep -q "found"; then
  echo "   ⚠️  Vulnérabilités détectées"
  echo "   Exécutez: npm audit"
else
  echo "   ✅ Aucune vulnérabilité critique"
fi

# Vérifier les secrets dans le code
echo ""
echo "4. Secrets dans le code"
if grep -r "password.*=.*['\"].*[a-zA-Z0-9]{8,}" --include="*.ts" --include="*.tsx" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".next" | head -5; then
  echo "   ⚠️  Possibles secrets détectés (vérifiez manuellement)"
else
  echo "   ✅ Aucun secret évident détecté"
fi

# Vérifier RLS (si DATABASE_URL disponible)
echo ""
echo "5. Row Level Security (RLS)"
if [ ! -z "$DATABASE_URL" ] && [ -f "scripts/verify-rls-production.sh" ]; then
  echo "   Exécution de la vérification RLS..."
  if ./scripts/verify-rls-production.sh 2>/dev/null; then
    echo "   ✅ RLS vérifié"
  else
    echo "   ⚠️  Problèmes RLS détectés"
  fi
else
  echo "   ⚠️  Vérification RLS non disponible (DATABASE_URL manquante)"
fi

# Résumé
echo ""
echo "📊 Résultats:"

if [ $FAILED -eq 0 ]; then
  echo "   ✅ Toutes les vérifications de sécurité sont passées"
  echo ""
  echo "✅ Vérification sécurité réussie"
  exit 0
else
  echo "   ❌ $FAILED vérification(s) échouée(s)"
  echo ""
  echo "❌ Vérification sécurité échouée"
  exit 1
fi
