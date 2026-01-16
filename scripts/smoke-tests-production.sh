#!/bin/bash

# ============================================
# Smoke Tests Production
# ============================================
# 
# Tests de base pour vérifier que l'application
# fonctionne correctement en production
#
# USAGE:
#   ./scripts/smoke-tests-production.sh
#
# PRÉREQUIS:
#   - Variable NEXT_PUBLIC_APP_URL configurée
#   - Application déployée et accessible
#
# ============================================

set -e

echo "🧪 Smoke Tests Production"
echo "========================"
echo ""

# Vérifier que NEXT_PUBLIC_APP_URL est définie
if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
  echo "❌ Erreur: NEXT_PUBLIC_APP_URL n'est pas définie"
  exit 1
fi

APP_URL="${NEXT_PUBLIC_APP_URL%/}"  # Retirer le slash final

echo "🌐 URL de l'application: $APP_URL"
echo ""

# Fonction pour tester une URL
test_url() {
  local url=$1
  local description=$2
  
  echo -n "   Test: $description... "
  
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
  
  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 400 ]; then
    echo "✅ ($HTTP_CODE)"
    return 0
  else
    echo "❌ ($HTTP_CODE)"
    return 1
  fi
}

# Tests
FAILED=0

echo "📋 Tests de base:"
echo ""

# Test 1: Page d'accueil
if ! test_url "$APP_URL" "Page d'accueil"; then
  FAILED=$((FAILED + 1))
fi

# Test 2: Page de connexion
if ! test_url "$APP_URL/auth/login" "Page de connexion"; then
  FAILED=$((FAILED + 1))
fi

# Test 3: Page CGU
if ! test_url "$APP_URL/legal/terms" "CGU"; then
  FAILED=$((FAILED + 1))
fi

# Test 4: Page Privacy
if ! test_url "$APP_URL/legal/privacy" "Privacy Policy"; then
  FAILED=$((FAILED + 1))
fi

# Test 5: API Health Check (si disponible)
if ! test_url "$APP_URL/api/health" "API Health Check"; then
  echo "   ⚠️  API Health Check non disponible (optionnel)"
fi

# Test 6: Vérifier HTTPS
echo -n "   Test: HTTPS activé... "
if [[ "$APP_URL" == https://* ]]; then
  echo "✅"
else
  echo "❌ (HTTP non sécurisé)"
  FAILED=$((FAILED + 1))
fi

# Test 7: Vérifier les headers de sécurité
echo -n "   Test: Headers de sécurité... "
HEADERS=$(curl -s -I --max-time 10 "$APP_URL" | grep -i "x-frame-options\|x-content-type-options\|strict-transport-security" || echo "")
if [ ! -z "$HEADERS" ]; then
  echo "✅"
else
  echo "⚠️  (Headers non détectés)"
fi

echo ""
echo "📊 Résultats:"

if [ $FAILED -eq 0 ]; then
  echo "   ✅ Tous les tests sont passés"
  echo ""
  echo "✅ Smoke tests réussis"
  exit 0
else
  echo "   ❌ $FAILED test(s) échoué(s)"
  echo ""
  echo "❌ Smoke tests échoués"
  exit 1
fi
