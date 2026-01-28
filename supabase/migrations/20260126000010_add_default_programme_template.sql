-- Migration: Ajouter un modèle de programme de formation par défaut
-- Design épuré, professionnel et conforme aux exigences Qualiopi

-- Fonction pour créer le template programme pour une organisation
CREATE OR REPLACE FUNCTION create_default_programme_template(org_id UUID)
RETURNS UUID AS $$
DECLARE
  template_id UUID;
BEGIN
  -- Vérifier si un template programme par défaut existe déjà
  SELECT id INTO template_id
  FROM document_templates
  WHERE organization_id = org_id
    AND type = 'programme'
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
    'programme',
    'Programme de Formation - Modèle Professionnel',
    true,
    true,
    'A4',
    '{"top": 20, "right": 20, "bottom": 20, "left": 20}'::jsonb,
    -- Header identique à la facture
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
    -- Footer identique à la facture
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
    -- Body Content - Programme de formation complet
    '{
      "pageSize": "A4",
      "margins": {"top": 20, "right": 20, "bottom": 20, "left": 20},
      "elements": [],
      "html": "<div style=\"font-family: Segoe UI, Arial, sans-serif; font-size: 10pt; color: #333; line-height: 1.5;\"><!-- Titre principal --><div style=\"text-align: center; margin-bottom: 24px;\"><p style=\"font-size: 11pt; font-weight: 600; color: #274472; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;\">Programme de Formation</p><div style=\"background: linear-gradient(135deg, #274472 0%, #41729F 100%); color: white; padding: 16px 24px; border-radius: 8px; margin-top: 12px;\"><p style=\"margin: 0; font-size: 14pt; font-weight: 600;\">{formation_nom}</p><p style=\"margin: 6px 0 0 0; font-size: 10pt; opacity: 0.9;\">{formation_subtitle}</p></div></div><!-- Informations clés en 3 colonnes --><table style=\"width: 100%; margin-bottom: 20px; border-collapse: collapse;\"><tr><td style=\"width: 33%; padding: 12px; background: #f8f9fa; border-radius: 6px 0 0 6px; text-align: center;\"><p style=\"margin: 0; font-size: 8pt; color: #666; text-transform: uppercase;\">Durée</p><p style=\"margin: 4px 0 0 0; font-size: 11pt; font-weight: 600; color: #274472;\">{formation_duree}</p></td><td style=\"width: 33%; padding: 12px; background: #f8f9fa; text-align: center; border-left: 2px solid #fff; border-right: 2px solid #fff;\"><p style=\"margin: 0; font-size: 8pt; color: #666; text-transform: uppercase;\">Modalité</p><p style=\"margin: 4px 0 0 0; font-size: 11pt; font-weight: 600; color: #274472;\">{session_modalite}</p></td><td style=\"width: 33%; padding: 12px; background: #f8f9fa; border-radius: 0 6px 6px 0; text-align: center;\"><p style=\"margin: 0; font-size: 8pt; color: #666; text-transform: uppercase;\">Tarif</p><p style=\"margin: 4px 0 0 0; font-size: 11pt; font-weight: 600; color: #274472;\">{formation_prix} {formation_devise}</p></td></tr></table><!-- Section: Objectifs pédagogiques --><div style=\"margin-bottom: 18px;\"><div style=\"display: flex; align-items: center; margin-bottom: 10px;\"><div style=\"width: 4px; height: 20px; background: #274472; border-radius: 2px; margin-right: 10px;\"></div><p style=\"margin: 0; font-size: 11pt; font-weight: 600; color: #274472;\">Objectifs pédagogiques</p></div><div style=\"padding-left: 14px; border-left: 2px solid #e9ecef;\">{formation_objectifs}</div></div><!-- Section: Public visé et prérequis --><table style=\"width: 100%; margin-bottom: 18px; border-collapse: collapse;\"><tr><td style=\"width: 50%; vertical-align: top; padding-right: 10px;\"><div style=\"display: flex; align-items: center; margin-bottom: 10px;\"><div style=\"width: 4px; height: 20px; background: #41729F; border-radius: 2px; margin-right: 10px;\"></div><p style=\"margin: 0; font-size: 11pt; font-weight: 600; color: #274472;\">Public visé</p></div><div style=\"padding-left: 14px; border-left: 2px solid #e9ecef; font-size: 9pt;\">{formation_public}</div></td><td style=\"width: 50%; vertical-align: top; padding-left: 10px;\"><div style=\"display: flex; align-items: center; margin-bottom: 10px;\"><div style=\"width: 4px; height: 20px; background: #41729F; border-radius: 2px; margin-right: 10px;\"></div><p style=\"margin: 0; font-size: 11pt; font-weight: 600; color: #274472;\">Prérequis</p></div><div style=\"padding-left: 14px; border-left: 2px solid #e9ecef; font-size: 9pt;\">{formation_prerequis}</div></td></tr></table><!-- Section: Contenu de la formation --><div style=\"margin-bottom: 18px;\"><div style=\"display: flex; align-items: center; margin-bottom: 10px;\"><div style=\"width: 4px; height: 20px; background: #274472; border-radius: 2px; margin-right: 10px;\"></div><p style=\"margin: 0; font-size: 11pt; font-weight: 600; color: #274472;\">Contenu de la formation</p></div><div style=\"background: #fafbfc; padding: 14px; border-radius: 6px; border: 1px solid #e9ecef;\">{formation_contenu}</div></div><!-- Section: Moyens et méthodes pédagogiques --><div style=\"margin-bottom: 18px;\"><div style=\"display: flex; align-items: center; margin-bottom: 10px;\"><div style=\"width: 4px; height: 20px; background: #41729F; border-radius: 2px; margin-right: 10px;\"></div><p style=\"margin: 0; font-size: 11pt; font-weight: 600; color: #274472;\">Moyens et méthodes pédagogiques</p></div><div style=\"padding-left: 14px; border-left: 2px solid #e9ecef; font-size: 9pt;\">{formation_moyens_pedagogiques}</div></div><!-- Section: Modalités d''évaluation --><div style=\"margin-bottom: 18px;\"><div style=\"display: flex; align-items: center; margin-bottom: 10px;\"><div style=\"width: 4px; height: 20px; background: #274472; border-radius: 2px; margin-right: 10px;\"></div><p style=\"margin: 0; font-size: 11pt; font-weight: 600; color: #274472;\">Modalités d''évaluation</p></div><div style=\"padding-left: 14px; border-left: 2px solid #e9ecef; font-size: 9pt;\">{formation_evaluation}</div></div><!-- Section: Certification (si applicable) --><div style=\"margin-bottom: 18px;\"><div style=\"display: flex; align-items: center; margin-bottom: 10px;\"><div style=\"width: 4px; height: 20px; background: #41729F; border-radius: 2px; margin-right: 10px;\"></div><p style=\"margin: 0; font-size: 11pt; font-weight: 600; color: #274472;\">Certification délivrée</p></div><div style=\"padding-left: 14px; border-left: 2px solid #e9ecef; font-size: 9pt;\">{formation_certification}</div></div><!-- Section: Accessibilité --><div style=\"background: #f0f7ff; padding: 14px; border-radius: 6px; margin-bottom: 18px; border-left: 3px solid #274472;\"><p style=\"margin: 0 0 6px 0; font-size: 10pt; font-weight: 600; color: #274472;\">Accessibilité</p><p style=\"margin: 0; font-size: 9pt; color: #555;\">{formation_accessibilite}</p></div><!-- Informations pratiques --><div style=\"background: #f8f9fa; padding: 14px; border-radius: 6px; margin-bottom: 16px;\"><p style=\"margin: 0 0 10px 0; font-size: 10pt; font-weight: 600; color: #274472;\">Informations pratiques</p><table style=\"width: 100%; font-size: 9pt;\"><tr><td style=\"padding: 4px 0; color: #666;\">Lieu :</td><td style=\"padding: 4px 0;\">{session_lieu}</td></tr><tr><td style=\"padding: 4px 0; color: #666;\">Dates :</td><td style=\"padding: 4px 0;\">Du {session_debut} au {session_fin}</td></tr><tr><td style=\"padding: 4px 0; color: #666;\">Horaires :</td><td style=\"padding: 4px 0;\">{session_horaires}</td></tr><tr><td style=\"padding: 4px 0; color: #666;\">Effectif max :</td><td style=\"padding: 4px 0;\">{session_capacite} participants</td></tr></table></div><!-- Contact --><div style=\"text-align: center; padding: 14px; border-top: 1px solid #e9ecef;\"><p style=\"margin: 0 0 6px 0; font-size: 9pt; color: #666;\">Pour toute information ou inscription</p><p style=\"margin: 0; font-size: 10pt; font-weight: 500; color: #274472;\">{ecole_telephone} | {ecole_email}</p><p style=\"margin: 6px 0 0 0; font-size: 8pt; color: #888;\">{ecole_nom} - {ecole_adresse}</p><p style=\"margin: 4px 0 0 0; font-size: 8pt; color: #888;\">N° de déclaration d''activité : {ecole_numero_declaration}</p></div></div>"
    }'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id INTO template_id;

  RETURN template_id;
END;
$$ LANGUAGE plpgsql;

-- Créer le template programme pour toutes les organisations existantes qui n'en ont pas
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    PERFORM create_default_programme_template(org.id);
  END LOOP;
END $$;

-- Commentaire sur la fonction
COMMENT ON FUNCTION create_default_programme_template(UUID) IS
'Crée un modèle de programme de formation par défaut pour une organisation.
Design épuré et professionnel, conforme Qualiopi.
Sections incluses:
- Titre et informations clés (durée, modalité, tarif)
- Objectifs pédagogiques
- Public visé et prérequis
- Contenu de la formation
- Moyens et méthodes pédagogiques
- Modalités d''évaluation
- Certification délivrée
- Accessibilité (handicap)
- Informations pratiques (lieu, dates, horaires, effectif)
- Contact et mentions légales';
