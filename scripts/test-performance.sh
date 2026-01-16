#!/bin/bash

# Script de test de performance pour détecter les requêtes N+1
# Utilise curl pour tester les endpoints et compter les requêtes

echo "🧪 Test de Performance - Détection Requêtes N+1"
echo "================================================"
echo ""

BASE_URL="${BASE_URL:-http://localhost:3001}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour tester un endpoint
test_endpoint() {
  local endpoint=$1
  local method=${2:-GET}
  local data=${3:-}
  
  echo -n "Testing $method $endpoint... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $AUTH_TOKEN" "$BASE_URL$endpoint" 2>&1)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -H "Authorization: Bearer $AUTH_TOKEN" -d "$data" "$BASE_URL$endpoint" 2>&1)
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP $http_code)"
    return 0
  else
    echo -e "${RED}✗${NC} (HTTP $http_code)"
    echo "  Response: $body"
    return 1
  fi
}

# Fonction pour compter les requêtes Supabase dans les logs
count_supabase_requests() {
  echo ""
  echo "📊 Pour analyser les requêtes N+1 :"
  echo "1. Ouvrez les DevTools (F12)"
  echo "2. Allez dans l'onglet Network"
  echo "3. Filtrez par 'supabase' ou 'rest/v1'"
  echo "4. Rechargez la page testée"
  echo "5. Comptez les requêtes :"
  echo "   - ✅ 1 requête = Pas de N+1"
  echo "   - ⚠️  N+1 requêtes = Problème N+1 détecté"
  echo ""
}

echo "🔍 Tests des Endpoints Critiques"
echo "--------------------------------"
echo ""

# Test 1: Dashboard (devrait charger avec jointures)
echo "1. Dashboard principal"
test_endpoint "/dashboard" "GET"

# Test 2: Liste des étudiants
echo "2. Liste des étudiants"
test_endpoint "/dashboard/students" "GET"

# Test 3: Liste des factures
echo "3. Liste des factures"
test_endpoint "/dashboard/payments" "GET"

# Test 4: Liste des présences
echo "4. Liste des présences"
test_endpoint "/dashboard/attendance" "GET"

# Test 5: Liste des sessions
echo "5. Liste des sessions"
test_endpoint "/dashboard/sessions" "GET"

echo ""
count_supabase_requests

echo "✅ Tests terminés"
echo ""
echo "💡 Conseils :"
echo "- Vérifiez les DevTools Network pour chaque endpoint"
echo "- Recherchez les patterns de requêtes répétitives"
echo "- Utilisez React Query DevTools pour voir les requêtes en cache"
echo ""





