#!/bin/bash
set -e

WP_PATH=/var/www/html
WP_URL="http://localhost:8080"
WP_ADMIN_USER="admin"
WP_ADMIN_PASS="admin"
WP_ADMIN_EMAIL="admin@eduzen.test"

echo "⏳ En attente de la base de données..."
until php -r "
  \$c = @mysqli_connect('db', 'wordpress', 'wordpress', 'wordpress');
  exit(\$c ? 0 : 1);
" 2>/dev/null; do
  sleep 3
done

echo "✅ Base de données accessible."

if wp core is-installed --path="$WP_PATH" 2>/dev/null; then
  echo "ℹ️  WordPress déjà installé."
else
  echo "📦 Installation de WordPress..."
  wp core install \
    --path="$WP_PATH" \
    --url="$WP_URL" \
    --title="EDUZEN Test Site" \
    --admin_user="$WP_ADMIN_USER" \
    --admin_password="$WP_ADMIN_PASS" \
    --admin_email="$WP_ADMIN_EMAIL" \
    --skip-email
fi

echo "🔌 Activation du plugin EDUZEN..."
wp plugin activate eduzen --path="$WP_PATH"

echo "📄 Création des pages de test..."

create_page() {
  local title="$1"
  local content="$2"
  local slug="$3"

  if wp post list --path="$WP_PATH" --post_type=page --name="$slug" --field=ID --quiet 2>/dev/null | grep -q .; then
    echo "   → '$title' déjà existante."
  else
    wp post create \
      --path="$WP_PATH" \
      --post_type=page \
      --post_title="$title" \
      --post_name="$slug" \
      --post_content="$content" \
      --post_status=publish \
      --porcelain
    echo "   → '$title' créée."
  fi
}

create_page "Nos Programmes" \
  '[eduzen_programs limit="6" columns="3"]' \
  "nos-programmes"

create_page "Sessions de Formation" \
  '[eduzen_sessions limit="6" columns="2"]' \
  "sessions-de-formation"

create_page "Notre Catalogue" \
  '[eduzen_formations limit="9" columns="3"]' \
  "notre-catalogue"

create_page "Test EDUZEN Complet" \
  '<h2>Programmes</h2>[eduzen_programs limit="3" columns="3"]<h2>Sessions</h2>[eduzen_sessions limit="4" columns="2"]<h2>Formations</h2>[eduzen_formations limit="3" columns="3"]' \
  "test-eduzen-complet"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup terminé !"
echo ""
echo "  WordPress :  http://localhost:8080"
echo "  Admin WP :   http://localhost:8080/wp-admin"
echo "  Login :      $WP_ADMIN_USER / $WP_ADMIN_PASS"
echo "  Plugin :     Réglages → EDUZEN → entre ta clé API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Pages de test :"
echo "    http://localhost:8080/nos-programmes/"
echo "    http://localhost:8080/sessions-de-formation/"
echo "    http://localhost:8080/notre-catalogue/"
echo "    http://localhost:8080/test-eduzen-complet/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
