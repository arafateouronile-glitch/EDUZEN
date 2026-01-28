-- Migration: Standardiser l'en-tête et le pied de page pour TOUS les templates de documents
-- Utilise le même format que la facture pour une cohérence visuelle

-- Mettre à jour TOUS les templates par défaut avec le même header/footer
UPDATE document_templates
SET
  header_enabled = true,
  header_height = 65,
  header = '{
    "enabled": true,
    "height": 65,
    "layout": "professional",
    "backgroundColor": {
      "type": "solid",
      "color": "#ffffff"
    },
    "border": {
      "bottom": {
        "enabled": true,
        "color": "#274472",
        "width": 2,
        "style": "solid"
      }
    },
    "elements": [],
    "repeatOnAllPages": true
  }'::jsonb,
  footer_enabled = true,
  footer_height = 40,
  footer = '{
    "enabled": true,
    "height": 40,
    "layout": "professional",
    "backgroundColor": "#f8f9fa",
    "border": {
      "top": {
        "enabled": true,
        "color": "#e9ecef",
        "width": 1,
        "style": "solid"
      }
    },
    "pagination": {
      "enabled": true,
      "format": "Page X sur Y",
      "position": "center",
      "style": {
        "fontSize": 8,
        "color": "#666666",
        "fontWeight": "normal"
      }
    },
    "elements": [],
    "repeatOnAllPages": true
  }'::jsonb,
  updated_at = NOW()
WHERE is_default = true;

-- Afficher le nombre de templates mis à jour
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Nombre de templates mis à jour avec header/footer standardisé: %', updated_count;
END $$;

-- Commentaire
COMMENT ON TABLE document_templates IS
'Tous les templates par défaut utilisent le même header/footer standardisé:
- Header: 65px, fond blanc, bordure bas #274472 2px solid
- Footer: 40px, fond #f8f9fa, bordure haut #e9ecef 1px, pagination "Page X sur Y" centrée';
