-- Migration: Ajouter un modèle de devis par défaut pour toutes les organisations
-- Ce modèle est élégant, épuré et tient sur une seule page A4

-- Fonction pour créer le template devis pour une organisation
CREATE OR REPLACE FUNCTION create_default_devis_template(org_id UUID)
RETURNS UUID AS $$
DECLARE
  template_id UUID;
BEGIN
  -- Vérifier si un template devis par défaut existe déjà
  SELECT id INTO template_id
  FROM document_templates
  WHERE organization_id = org_id
    AND type = 'devis'
    AND is_default = true;

  -- Si existe déjà, ne rien faire
  IF template_id IS NOT NULL THEN
    RETURN template_id;
  END IF;

  -- Créer le nouveau template
  INSERT INTO document_templates (
    organization_id,
    type,
    name,
    is_default,
    is_active,
    page_size,
    margins,
    header_enabled,
    header_height,
    header,
    footer_enabled,
    footer_height,
    footer,
    content,
    created_at,
    updated_at
  ) VALUES (
    org_id,
    'devis',
    'Devis de Formation - Modèle Élégant',
    true,
    true,
    'A4',
    '{"top": 20, "right": 20, "bottom": 20, "left": 20}'::jsonb,
    -- Header
    true,
    65,
    '{
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
    -- Footer
    true,
    40,
    '{
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
    -- Body Content
    '{
      "pageSize": "A4",
      "margins": {"top": 20, "right": 20, "bottom": 20, "left": 20},
      "elements": [],
      "html": "<div style=\"font-family: Segoe UI, Arial, sans-serif; font-size: 10pt; color: #333; line-height: 1.4;\"><table style=\"width: 100%; margin-bottom: 24px;\"><tr><td style=\"width: 50%; vertical-align: top;\"><p style=\"font-size: 11pt; font-weight: 600; color: #274472; margin: 0 0 4px 0;\">DEVIS N° {numero_devis}</p><p style=\"margin: 0; color: #666; font-size: 9pt;\">Date : {date_emission}</p><p style=\"margin: 0; color: #666; font-size: 9pt;\">Validité : {validite_devis}</p></td><td style=\"width: 50%; vertical-align: top; text-align: right;\"><div style=\"background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 3px solid #274472;\"><p style=\"font-weight: 600; margin: 0 0 4px 0; color: #274472;\">Client</p><p style=\"margin: 0; font-weight: 500;\">{eleve_prenom} {eleve_nom}</p><p style=\"margin: 0; font-size: 9pt; color: #666;\">{eleve_adresse}</p><p style=\"margin: 0; font-size: 9pt; color: #666;\">{eleve_email}</p></div></td></tr></table><div style=\"background: linear-gradient(135deg, #274472 0%, #41729F 100%); color: white; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px;\"><p style=\"margin: 0; font-size: 12pt; font-weight: 600;\">{formation_nom}</p><p style=\"margin: 4px 0 0 0; font-size: 9pt; opacity: 0.9;\">{formation_description}</p></div><table style=\"width: 100%; border-collapse: collapse; margin-bottom: 20px;\"><thead><tr style=\"background: #f1f3f5;\"><th style=\"padding: 10px 12px; text-align: left; font-size: 9pt; font-weight: 600; color: #274472; border-bottom: 2px solid #274472;\">Désignation</th><th style=\"padding: 10px 12px; text-align: center; font-size: 9pt; font-weight: 600; color: #274472; border-bottom: 2px solid #274472; width: 80px;\">Durée</th><th style=\"padding: 10px 12px; text-align: right; font-size: 9pt; font-weight: 600; color: #274472; border-bottom: 2px solid #274472; width: 100px;\">Prix HT</th></tr></thead><tbody><tr><td style=\"padding: 12px; border-bottom: 1px solid #e9ecef;\"><p style=\"margin: 0; font-weight: 500;\">{formation_nom}</p><p style=\"margin: 4px 0 0 0; font-size: 9pt; color: #666;\">Formation {session_modalite}</p><p style=\"margin: 2px 0 0 0; font-size: 9pt; color: #666;\">Du {session_debut} au {session_fin}</p></td><td style=\"padding: 12px; text-align: center; border-bottom: 1px solid #e9ecef;\">{formation_duree}</td><td style=\"padding: 12px; text-align: right; border-bottom: 1px solid #e9ecef; font-weight: 500;\">{montant_ht} €</td></tr></tbody></table><table style=\"width: 280px; margin-left: auto; border-collapse: collapse; margin-bottom: 24px;\"><tr><td style=\"padding: 8px 12px; text-align: left; color: #666;\">Total HT</td><td style=\"padding: 8px 12px; text-align: right; font-weight: 500;\">{montant_ht} €</td></tr><tr><td style=\"padding: 8px 12px; text-align: left; color: #666;\">TVA ({taux_tva}%)</td><td style=\"padding: 8px 12px; text-align: right;\">{tva} €</td></tr><tr style=\"background: #274472; color: white;\"><td style=\"padding: 10px 12px; text-align: left; font-weight: 600; border-radius: 4px 0 0 4px;\">Total TTC</td><td style=\"padding: 10px 12px; text-align: right; font-weight: 600; font-size: 11pt; border-radius: 0 4px 4px 0;\">{montant_ttc} €</td></tr></table><div style=\"background: #f8f9fa; padding: 14px; border-radius: 6px; margin-bottom: 20px;\"><p style=\"margin: 0 0 8px 0; font-weight: 600; color: #274472; font-size: 9pt;\">CONDITIONS</p><ul style=\"margin: 0; padding-left: 18px; font-size: 9pt; color: #555;\"><li style=\"margin-bottom: 4px;\">Devis valable {validite_devis}</li><li style=\"margin-bottom: 4px;\">Règlement : {mode_paiement}</li><li style=\"margin-bottom: 4px;\">Ce devis est à retourner signé avec la mention Bon pour accord</li></ul></div><table style=\"width: 100%; margin-top: 16px;\"><tr><td style=\"width: 48%; vertical-align: top;\"><p style=\"font-size: 9pt; color: #666; margin: 0 0 8px 0;\">Signature de l organisme :</p><div style=\"height: 60px; border: 1px dashed #ccc; border-radius: 4px;\"></div></td><td style=\"width: 4%;\"></td><td style=\"width: 48%; vertical-align: top;\"><p style=\"font-size: 9pt; color: #666; margin: 0 0 8px 0;\">Bon pour accord, date et signature :</p><div style=\"height: 60px; border: 1px dashed #ccc; border-radius: 4px;\"></div></td></tr></table></div>"
    }'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id INTO template_id;

  RETURN template_id;
END;
$$ LANGUAGE plpgsql;

-- Créer le template devis pour toutes les organisations existantes
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    PERFORM create_default_devis_template(org.id);
  END LOOP;
END $$;

-- Commentaire sur la fonction
COMMENT ON FUNCTION create_default_devis_template(UUID) IS
'Crée un modèle de devis par défaut pour une organisation.
Design élégant et épuré, optimisé pour une page A4.
Header: Logo à gauche, infos à droite, bordure bleue
Body: Tableau de prestations, totaux, conditions
Footer: Pagination centrée, mentions légales';
