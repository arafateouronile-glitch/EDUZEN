#!/bin/bash

# Script pour exécuter l'audit Lighthouse Phase 9
# Compare les résultats avec l'audit initial

set -e

echo "🔍 Exécution de l'audit Lighthouse Phase 9..."
echo ""

# Vérifier que le serveur est en cours d'exécution
if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
  echo "❌ Erreur: Le serveur n'est pas en cours d'exécution"
  echo "   Lancez 'npm run dev' dans un autre terminal"
  exit 1
fi

echo "✅ Serveur détecté sur http://localhost:3001"
echo ""

# Créer le dossier de rapports s'il n'existe pas
mkdir -p lighthouse-reports

# Déterminer la commande Lighthouse à utiliser
if command -v lighthouse &> /dev/null; then
  LIGHTHOUSE_CMD="lighthouse"
  echo "✅ Lighthouse détecté"
elif command -v lhci &> /dev/null; then
  LIGHTHOUSE_CMD="lhci autorun --collect.url=http://localhost:3001/dashboard --collect.numberOfRuns=1"
  echo "✅ Lighthouse CI détecté (utilise lhci)"
else
  echo "⚠️  Lighthouse CLI n'est pas installé globalement"
  echo "   Utilisation de npx (pas d'installation nécessaire)"
  LIGHTHOUSE_CMD="npx --yes lighthouse"
fi

echo "📊 Audit de la page dashboard..."
echo "   URL: http://localhost:3001/dashboard"
echo ""

# Audit avec métriques détaillées
$LIGHTHOUSE_CMD http://localhost:3001/dashboard \
  --output=html,json \
  --output-path=./lighthouse-reports/dashboard-phase9 \
  --chrome-flags="--headless" \
  --only-categories=performance \
  --quiet

echo ""
echo "✅ Audit terminé!"
echo ""
echo "📄 Rapports générés:"
echo "   • HTML: ./lighthouse-reports/dashboard-phase9.html"
echo "   • JSON: ./lighthouse-reports/dashboard-phase9.json"
echo ""
echo "📊 Métriques à comparer:"
echo "   • LCP: Avant 37.7s → Objectif < 2.5s"
echo "   • TBT: Avant 5.97s → Objectif < 200ms"
echo "   • CLS: Objectif < 0.1"
echo "   • FID: Objectif < 100ms"
echo "   • Performance Score: Avant 40/100 → Objectif > 90/100"
echo ""
echo "💡 Ouvrez le rapport HTML pour voir les détails complets"
