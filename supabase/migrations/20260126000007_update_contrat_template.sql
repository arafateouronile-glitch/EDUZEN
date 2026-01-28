-- Migration: Créer/Mettre à jour le modèle de contrat de formation
-- Contrat entre l'organisme de formation et l'apprenant (personne physique)
-- Différent de la convention qui est avec une entreprise/personne morale

-- Mettre à jour tous les templates contrat par défaut existants
UPDATE document_templates
SET
  name = 'Contrat de Formation Professionnelle',
  page_size = 'A4',
  margins = '{"top": 20, "right": 20, "bottom": 20, "left": 20}'::jsonb,
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
    "margins": {"top": 20, "right": 20, "bottom": 20, "left": 20},
    "elements": [],
    "html": "<div style=\"font-family: Georgia, Times New Roman, serif; font-size: 10pt; color: #333; line-height: 1.5;\"><p style=\"text-align: center; font-size: 14pt; font-weight: bold; color: #274472; margin: 0 0 25px 0; text-transform: uppercase; letter-spacing: 2px;\">Contrat de Formation Professionnelle</p><p style=\"text-align: center; font-size: 9pt; color: #666; margin-bottom: 25px;\">Articles L.6353-3 à L.6353-7 du Code du travail</p><p style=\"font-weight: bold; color: #274472; margin: 20px 0 10px 0;\">ENTRE LES SOUSSIGNÉS :</p><div style=\"background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 3px solid #274472;\"><p style=\"margin: 0 0 5px 0; font-weight: bold;\">L Organisme de Formation :</p><p style=\"margin: 0;\">{ecole_nom}</p><p style=\"margin: 0; font-size: 9pt; color: #555;\">{ecole_adresse}, {ecole_code_postal} {ecole_ville}</p><p style=\"margin: 0; font-size: 9pt; color: #555;\">SIRET : {ecole_siret}</p><p style=\"margin: 0; font-size: 9pt; color: #555;\">N° de déclaration d activité : {ecole_numero_declaration}</p><p style=\"margin: 0; font-size: 9pt; color: #555;\">Représenté par : {ecole_representant}</p><p style=\"margin: 5px 0 0 0; font-size: 9pt;\">Ci-après dénommé « l Organisme »</p></div><div style=\"background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 3px solid #274472;\"><p style=\"margin: 0 0 5px 0; font-weight: bold;\">Le Stagiaire :</p><p style=\"margin: 0;\">{eleve_prenom} {eleve_nom}</p><p style=\"margin: 0; font-size: 9pt; color: #555;\">Né(e) le : {eleve_date_naissance}</p><p style=\"margin: 0; font-size: 9pt; color: #555;\">Adresse : {eleve_adresse}</p><p style=\"margin: 0; font-size: 9pt; color: #555;\">Email : {eleve_email} - Tél : {eleve_telephone}</p><p style=\"margin: 5px 0 0 0; font-size: 9pt;\">Ci-après dénommé « le Stagiaire »</p></div><p style=\"font-weight: bold; color: #274472; margin: 20px 0 10px 0;\">ARTICLE 1 - OBJET DU CONTRAT</p><p style=\"text-align: justify;\">Le présent contrat a pour objet la réalisation de l action de formation suivante :</p><table style=\"width: 100%; margin: 15px 0; border-collapse: collapse;\"><tr><td style=\"padding: 6px 0; width: 140px; font-weight: bold; color: #274472; vertical-align: top; font-size: 9pt;\">Intitulé</td><td style=\"padding: 6px 0; border-bottom: 1px dotted #ccc;\">{formation_nom}</td></tr><tr><td style=\"padding: 6px 0; font-weight: bold; color: #274472; vertical-align: top; font-size: 9pt;\">Objectifs</td><td style=\"padding: 6px 0; border-bottom: 1px dotted #ccc; font-size: 9pt;\">{formation_objectifs}</td></tr><tr><td style=\"padding: 6px 0; font-weight: bold; color: #274472; vertical-align: top; font-size: 9pt;\">Programme</td><td style=\"padding: 6px 0; border-bottom: 1px dotted #ccc; font-size: 9pt;\">{formation_description}</td></tr><tr><td style=\"padding: 6px 0; font-weight: bold; color: #274472; vertical-align: top; font-size: 9pt;\">Durée totale</td><td style=\"padding: 6px 0; border-bottom: 1px dotted #ccc;\">{formation_duree}</td></tr><tr><td style=\"padding: 6px 0; font-weight: bold; color: #274472; vertical-align: top; font-size: 9pt;\">Dates</td><td style=\"padding: 6px 0; border-bottom: 1px dotted #ccc;\">Du {session_debut} au {session_fin}</td></tr><tr><td style=\"padding: 6px 0; font-weight: bold; color: #274472; vertical-align: top; font-size: 9pt;\">Horaires</td><td style=\"padding: 6px 0; border-bottom: 1px dotted #ccc;\">{session_horaires}</td></tr><tr><td style=\"padding: 6px 0; font-weight: bold; color: #274472; vertical-align: top; font-size: 9pt;\">Lieu</td><td style=\"padding: 6px 0; border-bottom: 1px dotted #ccc;\">{session_lieu}</td></tr><tr><td style=\"padding: 6px 0; font-weight: bold; color: #274472; vertical-align: top; font-size: 9pt;\">Modalité</td><td style=\"padding: 6px 0; border-bottom: 1px dotted #ccc;\">{session_modalite}</td></tr></table><p style=\"font-weight: bold; color: #274472; margin: 20px 0 10px 0;\">ARTICLE 2 - PRIX ET MODALITÉS DE PAIEMENT</p><table style=\"width: 300px; margin: 10px 0; border-collapse: collapse;\"><tr><td style=\"padding: 6px 10px; font-size: 9pt;\">Prix HT</td><td style=\"padding: 6px 10px; text-align: right; font-weight: 500;\">{montant_ht} €</td></tr><tr><td style=\"padding: 6px 10px; font-size: 9pt;\">TVA ({taux_tva}%)</td><td style=\"padding: 6px 10px; text-align: right;\">{tva} €</td></tr><tr style=\"background: #274472; color: white;\"><td style=\"padding: 8px 10px; font-weight: bold; border-radius: 4px 0 0 4px;\">Prix TTC</td><td style=\"padding: 8px 10px; text-align: right; font-weight: bold; border-radius: 0 4px 4px 0;\">{montant_ttc} €</td></tr></table><p style=\"font-size: 9pt; text-align: justify;\">Le règlement s effectue selon les modalités suivantes : {mode_paiement}. En cas d échelonnement, un échéancier sera annexé au présent contrat.</p><p style=\"font-weight: bold; color: #274472; margin: 20px 0 10px 0;\">ARTICLE 3 - DÉLAI DE RÉTRACTATION</p><p style=\"font-size: 9pt; text-align: justify;\">Conformément à l article L.6353-5 du Code du travail, le Stagiaire dispose d un délai de rétractation de <strong>14 jours calendaires</strong> à compter de la signature du présent contrat. Durant ce délai, aucune somme ne peut être exigée. Passé ce délai, le contrat devient définitif.</p><p style=\"font-weight: bold; color: #274472; margin: 20px 0 10px 0;\">ARTICLE 4 - INTERRUPTION DE LA FORMATION</p><p style=\"font-size: 9pt; text-align: justify;\">En cas d interruption de la formation par le Stagiaire pour un motif légitime (force majeure, maladie), seules les heures effectivement réalisées seront facturées. En cas d abandon sans motif légitime, l intégralité du prix reste due.</p><p style=\"font-weight: bold; color: #274472; margin: 20px 0 10px 0;\">ARTICLE 5 - OBLIGATIONS DES PARTIES</p><p style=\"font-size: 9pt; text-align: justify;\"><strong>L Organisme s engage à :</strong> dispenser la formation avec diligence, mettre à disposition les moyens pédagogiques nécessaires, délivrer une attestation de fin de formation.</p><p style=\"font-size: 9pt; text-align: justify;\"><strong>Le Stagiaire s engage à :</strong> suivre la formation avec assiduité, respecter le règlement intérieur, régler le prix convenu.</p><p style=\"font-weight: bold; color: #274472; margin: 20px 0 10px 0;\">ARTICLE 6 - LITIGES</p><p style=\"font-size: 9pt; text-align: justify;\">En cas de litige, les parties s efforceront de trouver une solution amiable. À défaut, le litige sera soumis aux tribunaux compétents.</p><p style=\"margin: 25px 0 10px 0; font-size: 9pt; color: #666;\">Fait en deux exemplaires originaux, à {ecole_ville}, le {date_emission}</p><table style=\"width: 100%; margin-top: 20px;\"><tr><td style=\"width: 48%; vertical-align: top;\"><p style=\"font-size: 9pt; color: #666; margin: 0 0 5px 0;\">Pour l Organisme de Formation</p><p style=\"font-size: 8pt; color: #888; margin: 0 0 5px 0;\">Lu et approuvé, signature :</p><div style=\"height: 50px; border: 1px dashed #ccc; border-radius: 4px;\"></div><p style=\"font-size: 8pt; margin: 5px 0 0 0;\">{ecole_representant}</p></td><td style=\"width: 4%;\"></td><td style=\"width: 48%; vertical-align: top;\"><p style=\"font-size: 9pt; color: #666; margin: 0 0 5px 0;\">Le Stagiaire</p><p style=\"font-size: 8pt; color: #888; margin: 0 0 5px 0;\">Lu et approuvé, signature précédée de la mention manuscrite « Bon pour accord » :</p><div style=\"height: 50px; border: 1px dashed #ccc; border-radius: 4px;\"></div><p style=\"font-size: 8pt; margin: 5px 0 0 0;\">{eleve_prenom} {eleve_nom}</p></td></tr></table></div>"
  }'::jsonb,
  updated_at = NOW()
WHERE type = 'contrat' AND is_default = true;

-- Afficher le nombre de templates mis à jour
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Nombre de templates contrat mis à jour: %', updated_count;
END $$;
