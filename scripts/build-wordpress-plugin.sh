#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$SCRIPT_DIR/../wordpress-plugin/eduzen"
OUTPUT_DIR="$SCRIPT_DIR/../public/downloads"
OUTPUT="$OUTPUT_DIR/eduzen-wordpress-plugin.zip"

if [ ! -d "$PLUGIN_DIR" ]; then
  echo "Erreur : dossier plugin introuvable : $PLUGIN_DIR"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Supprimer l'ancien ZIP s'il existe
rm -f "$OUTPUT"

cd "$SCRIPT_DIR/../wordpress-plugin"
zip -r "$OUTPUT" eduzen/ \
  --exclude "*.DS_Store" \
  --exclude "*/.gitkeep" \
  --exclude "*/__MACOSX/*"

echo "✓ Plugin généré : $OUTPUT"
echo "  Taille : $(du -sh "$OUTPUT" | cut -f1)"
