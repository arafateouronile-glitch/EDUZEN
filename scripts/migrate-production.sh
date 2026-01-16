#!/bin/bash

# ============================================
# Script de Migration Supabase Production
# ============================================
# 
# Ce script applique toutes les migrations
# à la base de données de production Supabase
#
# USAGE:
#   ./scripts/migrate-production.sh
#
# PRÉREQUIS:
#   - Supabase CLI installé: npm install -g supabase
#   - Variable DATABASE_URL configurée
#   - Accès à la base de production
#
# ============================================

set -e  # Arrêter en cas d'erreur

echo "🚀 Migration Supabase Production"
echo "================================"
echo ""

# Vérifier que DATABASE_URL est définie
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Erreur: DATABASE_URL n'est pas définie"
  echo "   Configurez-la dans votre environnement ou .env.production"
  exit 1
fi

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
  echo "❌ Erreur: Supabase CLI n'est pas installé"
  echo "   Installez-le avec: npm install -g supabase"
  exit 1
fi

echo "📋 Liste des migrations à appliquer:"
ls -1 supabase/migrations/*.sql | wc -l | xargs echo "   Nombre de fichiers:"

echo ""
read -p "⚠️  Êtes-vous sûr de vouloir appliquer les migrations en PRODUCTION ? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Migration annulée"
  exit 0
fi

echo ""
echo "🔄 Application des migrations..."

# Appliquer les migrations via Supabase CLI
# Note: Si vous utilisez directement psql, utilisez:
# psql $DATABASE_URL -f supabase/migrations/XXXXX.sql

# Méthode 1: Via Supabase CLI (recommandé)
if [ -n "$SUPABASE_PROJECT_ID" ]; then
  echo "   Utilisation de Supabase CLI avec projet ID: $SUPABASE_PROJECT_ID"
  supabase db push --db-url "$DATABASE_URL" --project-id "$SUPABASE_PROJECT_ID"
else
  echo "   Utilisation de Supabase CLI avec DATABASE_URL"
  supabase db push --db-url "$DATABASE_URL"
fi

# Méthode 2: Via psql directement (alternative)
# for migration in supabase/migrations/*.sql; do
#   echo "   Application de: $(basename $migration)"
#   psql "$DATABASE_URL" -f "$migration"
# done

echo ""
echo "✅ Migrations appliquées avec succès"
echo ""
echo "📊 Prochaines étapes:"
echo "   1. Vérifier les tables créées"
echo "   2. Vérifier que RLS est activé"
echo "   3. Exécuter: ./scripts/verify-rls-production.sh"
echo ""
