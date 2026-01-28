-- Migration: REMPLACER le modèle de convocation par un format lettre classique
-- Design épuré et élégant, format courrier professionnel

-- Mettre à jour tous les templates convocation par défaut existants
UPDATE document_templates
SET
  name = 'Convocation de Formation',
  page_size = 'A4',
  margins = '{"top": 25, "right": 25, "bottom": 25, "left": 25}'::jsonb,
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
  content = '{
    "pageSize": "A4",
    "margins": {"top": 25, "right": 25, "bottom": 25, "left": 25},
    "elements": [],
    "html": "<div style=\"font-family: Georgia, Times New Roman, serif; font-size: 11pt; color: #333; line-height: 1.6;\"><table style=\"width: 100%; margin-bottom: 30px;\"><tr><td style=\"vertical-align: top; width: 50%;\"></td><td style=\"vertical-align: top; width: 50%; text-align: right;\"><p style=\"margin: 0; font-size: 10pt; color: #555;\">{eleve_prenom} {eleve_nom}</p><p style=\"margin: 0; font-size: 10pt; color: #555;\">{eleve_adresse}</p><p style=\"margin: 0; font-size: 10pt; color: #555;\">{eleve_email}</p></td></tr></table><p style=\"text-align: right; margin-bottom: 30px; font-size: 10pt; color: #666;\">{ecole_ville}, le {date_emission}</p><p style=\"text-align: center; font-size: 14pt; font-weight: bold; color: #274472; margin: 30px 0; text-transform: uppercase; letter-spacing: 2px;\">Convocation à une action de formation</p><p style=\"margin-bottom: 20px;\">Madame, Monsieur,</p><p style=\"margin-bottom: 20px; text-align: justify;\">Nous avons le plaisir de vous informer que votre inscription à la formation ci-dessous a été validée. En conséquence, nous vous prions de bien vouloir vous présenter aux dates et lieu indiqués.</p><table style=\"width: 100%; margin: 25px 0; border-collapse: collapse;\"><tr><td style=\"padding: 8px 0; width: 160px; font-weight: bold; color: #274472; vertical-align: top;\">Intitulé de la formation</td><td style=\"padding: 8px 0; border-bottom: 1px dotted #ccc;\">{formation_nom}</td></tr><tr><td style=\"padding: 8px 0; font-weight: bold; color: #274472; vertical-align: top;\">Dates</td><td style=\"padding: 8px 0; border-bottom: 1px dotted #ccc;\">Du {session_debut} au {session_fin}</td></tr><tr><td style=\"padding: 8px 0; font-weight: bold; color: #274472; vertical-align: top;\">Horaires</td><td style=\"padding: 8px 0; border-bottom: 1px dotted #ccc;\">{session_horaires}</td></tr><tr><td style=\"padding: 8px 0; font-weight: bold; color: #274472; vertical-align: top;\">Durée</td><td style=\"padding: 8px 0; border-bottom: 1px dotted #ccc;\">{formation_duree}</td></tr><tr><td style=\"padding: 8px 0; font-weight: bold; color: #274472; vertical-align: top;\">Lieu</td><td style=\"padding: 8px 0; border-bottom: 1px dotted #ccc;\">{session_lieu}</td></tr><tr><td style=\"padding: 8px 0; font-weight: bold; color: #274472; vertical-align: top;\">Modalité</td><td style=\"padding: 8px 0; border-bottom: 1px dotted #ccc;\">{session_modalite}</td></tr></table><p style=\"margin: 20px 0; font-weight: bold; color: #274472;\">Documents à présenter le jour de la formation :</p><ul style=\"margin: 0 0 20px 0; padding-left: 20px;\"><li style=\"margin-bottom: 6px;\">La présente convocation</li><li style=\"margin-bottom: 6px;\">Une pièce d identité en cours de validité</li></ul><p style=\"margin-bottom: 20px; text-align: justify;\">Nous vous remercions de bien vouloir confirmer votre présence par retour de courrier ou par email à l adresse {ecole_email}.</p><p style=\"margin-bottom: 20px; text-align: justify;\">Dans l attente de vous accueillir, nous vous prions d agréer, Madame, Monsieur, l expression de nos salutations distinguées.</p><table style=\"width: 100%; margin-top: 40px;\"><tr><td style=\"width: 50%;\"></td><td style=\"width: 50%; text-align: center;\"><p style=\"margin: 0 0 10px 0; font-size: 10pt; color: #666;\">Pour {ecole_nom}</p><div style=\"height: 60px;\"></div><p style=\"margin: 0; font-size: 10pt; color: #666; border-top: 1px solid #ccc; padding-top: 5px;\">{ecole_representant}</p></td></tr></table></div>"
  }'::jsonb,
  updated_at = NOW()
WHERE type = 'convocation' AND is_default = true;

-- Afficher le nombre de templates mis à jour
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Nombre de templates convocation mis à jour: %', updated_count;
END $$;
