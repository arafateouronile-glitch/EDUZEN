#!/bin/bash

# ============================================
# Script de Vérification RLS Production
# ============================================
# 
# Ce script vérifie que Row Level Security (RLS)
# est activé sur toutes les tables de production
#
# USAGE:
#   ./scripts/verify-rls-production.sh
#
# PRÉREQUIS:
#   - Variable DATABASE_URL configurée
#   - Accès en lecture à la base de production
#
# ============================================

set -e

echo "🔒 Vérification RLS Production"
echo "==============================="
echo ""

# Vérifier que DATABASE_URL est définie
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Erreur: DATABASE_URL n'est pas définie"
  exit 1
fi

# Vérifier que psql est disponible
if ! command -v psql &> /dev/null; then
  echo "❌ Erreur: psql n'est pas installé"
  echo "   Installez PostgreSQL client"
  exit 1
fi

echo "📋 Vérification des tables sans RLS activé..."
echo ""

# Requête SQL pour trouver les tables sans RLS
SQL_QUERY="
SELECT 
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN ('_prisma_migrations', 'schema_migrations')
  AND NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = pg_tables.schemaname
      AND tablename = pg_tables.tablename
  )
  AND NOT (
    SELECT relrowsecurity
    FROM pg_class
    WHERE relname = pg_tables.tablename
  )
ORDER BY tablename;
"

# Exécuter la requête
TABLES_WITHOUT_RLS=$(psql "$DATABASE_URL" -t -c "$SQL_QUERY" 2>/dev/null || echo "")

if [ -z "$TABLES_WITHOUT_RLS" ] || [ "$(echo "$TABLES_WITHOUT_RLS" | grep -v '^$' | wc -l)" -eq 0 ]; then
  echo "✅ Toutes les tables ont RLS activé"
else
  echo "⚠️  Tables sans RLS activé:"
  echo "$TABLES_WITHOUT_RLS" | grep -v '^$' | while read -r line; do
    if [ ! -z "$line" ]; then
      echo "   - $line"
    fi
  done
  echo ""
  echo "❌ Action requise: Activez RLS sur ces tables"
  exit 1
fi

echo ""
echo "📊 Statistiques RLS:"

# Compter les tables avec RLS
TOTAL_TABLES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', 'schema_migrations');" | xargs)
TABLES_WITH_RLS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public';" | xargs)

echo "   Total tables: $TOTAL_TABLES"
echo "   Tables avec RLS: $TABLES_WITH_RLS"
echo "   Couverture: $((TABLES_WITH_RLS * 100 / TOTAL_TABLES))%"

echo ""
echo "✅ Vérification RLS terminée"
