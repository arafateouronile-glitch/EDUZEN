/**
 * Script de génération des templates DOCX natifs
 * 
 * Ces templates sont utilisés par docxtemplater pour une génération Word fidèle.
 * Ils reprennent exactement la structure des templates HTML.
 * 
 * Usage: npx ts-node scripts/generate-docx-templates.ts
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  convertMillimetersToTwip,
  HeadingLevel,
  ShadingType,
  VerticalAlign,
  ImageRun,
  TableLayoutType,
} from 'docx'
import * as fs from 'fs'
import * as path from 'path'

// ============================================
// STYLES COMMUNS
// ============================================

const COLORS = {
  primary: '1E3A5F',      // Bleu foncé
  secondary: '2563EB',    // Bleu
  text: '1A1A1A',         // Noir
  textLight: '666666',    // Gris
  textMuted: '64748B',    // Gris clair
  border: 'E2E8F0',       // Bordure grise
  bgLight: 'F8FAFC',      // Fond clair
  warning: 'F59E0B',      // Orange
  success: '10B981',      // Vert
  danger: 'DC2626',       // Rouge
}

const FONTS = {
  main: 'Times New Roman',
  size: {
    small: 14,    // 7pt
    normal: 20,   // 10pt
    medium: 22,   // 11pt
    large: 24,    // 12pt
    title: 32,    // 16pt
    huge: 40,     // 20pt
  }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function createHeader(): Header {
  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NIL },
          bottom: { style: BorderStyle.NIL },
          left: { style: BorderStyle.NIL },
          right: { style: BorderStyle.NIL },
          insideHorizontal: { style: BorderStyle.NIL },
          insideVertical: { style: BorderStyle.NIL },
        },
        rows: [
          new TableRow({
            children: [
              // Colonne gauche - Informations école
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NIL },
                  bottom: { style: BorderStyle.NIL },
                  left: { style: BorderStyle.NIL },
                  right: { style: BorderStyle.NIL },
                },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: '{ecole_nom}',
                        bold: true,
                        size: 15,
                        font: FONTS.main,
                        color: COLORS.text,
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: '{ecole_adresse}',
                        size: 15,
                        font: FONTS.main,
                        color: COLORS.textLight,
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: '{ecole_code_postal} {ecole_ville}',
                        size: 15,
                        font: FONTS.main,
                        color: COLORS.textLight,
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Email : {ecole_email}',
                        size: 15,
                        font: FONTS.main,
                        color: COLORS.textLight,
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Tel : {ecole_telephone}',
                        size: 15,
                        font: FONTS.main,
                        color: COLORS.textLight,
                      }),
                    ],
                  }),
                ],
              }),
              // Colonne droite - Logo (placeholder)
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NIL },
                  bottom: { style: BorderStyle.NIL },
                  left: { style: BorderStyle.NIL },
                  right: { style: BorderStyle.NIL },
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: '[LOGO]',
                        size: 20,
                        font: FONTS.main,
                        color: COLORS.textMuted,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

function createFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: '{ecole_nom} | {ecole_adresse} {ecole_ville} {ecole_code_postal} | Numéro SIRET: {ecole_siret}',
            size: 14,
            font: FONTS.main,
            color: COLORS.text,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "Numéro de déclaration d'activité: {ecole_numero_declaration} (auprès du préfet de région de: {ecole_region})",
            size: 14,
            font: FONTS.main,
            color: COLORS.textLight,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "Cet enregistrement ne vaut pas l'agrément de l'État.",
            size: 14,
            font: FONTS.main,
            color: COLORS.textMuted,
            italics: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100 },
        children: [
          new TextRun({
            text: 'Page ',
            size: 14,
            font: FONTS.main,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 14,
            font: FONTS.main,
          }),
          new TextRun({
            text: ' / ',
            size: 14,
            font: FONTS.main,
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 14,
            font: FONTS.main,
          }),
        ],
      }),
    ],
  })
}

// ============================================
// TEMPLATE FACTURE
// ============================================

function createFactureTemplate(): Document {
  return new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertMillimetersToTwip(20),
            bottom: convertMillimetersToTwip(20),
            left: convertMillimetersToTwip(20),
            right: convertMillimetersToTwip(20),
          },
        },
      },
      headers: {
        default: createHeader(),
      },
      footers: {
        default: createFooter(),
      },
      children: [
        // Titre FACTURE
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: 'FACTURE',
              bold: true,
              size: 32,
              font: FONTS.main,
              color: COLORS.primary,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'N° {numero_facture}',
              bold: true,
              size: 20,
              font: FONTS.main,
              color: COLORS.primary,
            }),
          ],
        }),
        
        // Dates
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 100 },
          children: [
            new TextRun({
              text: "Date d'émission : {date_emission}",
              size: 16,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: 'Échéance : {date_echeance}',
              size: 16,
              font: FONTS.main,
              color: COLORS.danger,
            }),
          ],
        }),
        
        // Séparateur
        new Paragraph({
          spacing: { before: 200, after: 200 },
          border: {
            bottom: { color: COLORS.secondary, size: 6, style: BorderStyle.SINGLE },
          },
          children: [],
        }),
        
        // Bloc Client
        new Paragraph({
          spacing: { before: 100 },
          children: [
            new TextRun({
              text: 'FACTURÉ À',
              bold: true,
              size: 14,
              font: FONTS.main,
              color: COLORS.textMuted,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '{eleve_prenom} {eleve_nom}',
              bold: true,
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '{eleve_adresse}',
              size: 16,
              font: FONTS.main,
              color: COLORS.textLight,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '{eleve_code_postal} {eleve_ville}',
              size: 16,
              font: FONTS.main,
              color: COLORS.textLight,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '{eleve_email} | {eleve_telephone}',
              size: 14,
              font: FONTS.main,
              color: COLORS.textLight,
            }),
          ],
        }),
        
        // Référence client
        new Paragraph({
          spacing: { before: 200 },
          children: [
            new TextRun({
              text: 'Référence client : N° {eleve_numero}',
              size: 18,
              font: FONTS.main,
              color: COLORS.secondary,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Formation : {formation_nom}',
              size: 16,
              font: FONTS.main,
              color: COLORS.secondary,
            }),
          ],
        }),
        
        // Tableau des prestations
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // En-tête
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({
                  shading: { fill: COLORS.primary, type: ShadingType.SOLID, color: COLORS.primary },
                  children: [new Paragraph({
                    children: [new TextRun({ text: 'Description', bold: true, size: 16, color: 'FFFFFF', font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  width: { size: 10, type: WidthType.PERCENTAGE },
                  shading: { fill: COLORS.primary, type: ShadingType.SOLID, color: COLORS.primary },
                  children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Qté', bold: true, size: 16, color: 'FFFFFF', font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  shading: { fill: COLORS.primary, type: ShadingType.SOLID, color: COLORS.primary },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: 'P.U. HT', bold: true, size: 16, color: 'FFFFFF', font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  shading: { fill: COLORS.primary, type: ShadingType.SOLID, color: COLORS.primary },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: 'Total HT', bold: true, size: 16, color: 'FFFFFF', font: FONTS.main })],
                  })],
                }),
              ],
            }),
            // Ligne de prestation
            new TableRow({
              children: [
                new TableCell({
                  borders: {
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
                    left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
                  },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: '{formation_nom}', bold: true, size: 18, font: FONTS.main })],
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: '{session_debut} → {session_fin} | {formation_duree}', size: 14, color: COLORS.textMuted, font: FONTS.main })],
                    }),
                  ],
                }),
                new TableCell({
                  borders: {
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
                  },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '1', size: 16, font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  borders: {
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
                  },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: '{montant_ht} €', size: 16, font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  borders: {
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
                    right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
                  },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: '{montant_ht} €', bold: true, size: 16, font: FONTS.main })],
                  })],
                }),
              ],
            }),
          ],
        }),
        
        // Bloc Totaux
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        new Table({
          width: { size: 50, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          float: {
            horizontalAnchor: 'margin',
            relativeHorizontalPosition: 'right',
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: 'Sous-total HT', size: 16, color: COLORS.textMuted, font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: '{montant_ht} €', bold: true, size: 16, font: FONTS.main })],
                  })],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: 'TVA ({taux_tva}%)', size: 16, color: COLORS.textMuted, font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: '{tva} €', size: 16, font: FONTS.main })],
                  })],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: COLORS.primary, type: ShadingType.SOLID, color: COLORS.primary },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: 'TOTAL TTC', bold: true, size: 18, color: 'FFFFFF', font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  shading: { fill: COLORS.primary, type: ShadingType.SOLID, color: COLORS.primary },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: '{montant_ttc} €', bold: true, size: 20, color: 'FFFFFF', font: FONTS.main })],
                  })],
                }),
              ],
            }),
          ],
        }),
        
        // Montant en lettres
        new Paragraph({
          spacing: { before: 400 },
          children: [
            new TextRun({
              text: 'Arrêté à la somme de : ',
              size: 16,
              font: FONTS.main,
              color: COLORS.success,
            }),
            new TextRun({
              text: '{montant_lettres}',
              italics: true,
              size: 16,
              font: FONTS.main,
              color: COLORS.success,
            }),
          ],
        }),
        
        // Paiement
        new Paragraph({
          spacing: { before: 300 },
          children: [
            new TextRun({
              text: 'PAIEMENT',
              bold: true,
              size: 16,
              font: FONTS.main,
              color: COLORS.warning,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Mode : {mode_paiement}',
              size: 16,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'IBAN : {iban}',
              size: 16,
              font: FONTS.main,
            }),
          ],
        }),
        
        // Mentions légales
        new Paragraph({
          spacing: { before: 300 },
          alignment: AlignmentType.CENTER,
          shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
          children: [
            new TextRun({
              text: 'TVA non applicable (art. 293B CGI) • SIRET: {ecole_siret} • Déclaration: {ecole_numero_declaration}',
              size: 14,
              font: FONTS.main,
              color: COLORS.textMuted,
            }),
          ],
        }),
      ],
    }],
  })
}

// ============================================
// TEMPLATE DEVIS
// ============================================

function createDevisTemplate(): Document {
  return new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertMillimetersToTwip(20),
            bottom: convertMillimetersToTwip(20),
            left: convertMillimetersToTwip(20),
            right: convertMillimetersToTwip(20),
          },
        },
      },
      headers: {
        default: createHeader(),
      },
      footers: {
        default: createFooter(),
      },
      children: [
        // Titre DEVIS
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: 'DEVIS',
              bold: true,
              size: 40,
              font: FONTS.main,
              color: COLORS.text,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'N° {numero_devis}',
              size: 24,
              font: FONTS.main,
              color: COLORS.textLight,
            }),
          ],
        }),
        
        // Dates
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 100 },
          children: [
            new TextRun({
              text: "Date d'émission : {date_emission}",
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: "Valable jusqu'au : {validite_devis}",
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        
        // Séparateur
        new Paragraph({
          spacing: { before: 200, after: 200 },
          border: {
            bottom: { color: COLORS.border, size: 1, style: BorderStyle.SINGLE },
          },
          children: [],
        }),
        
        // Bloc Client
        new Paragraph({
          shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
          border: {
            left: { color: COLORS.text, size: 24, style: BorderStyle.SINGLE },
          },
          spacing: { before: 100 },
          children: [
            new TextRun({
              text: 'DEVIS POUR :',
              bold: true,
              size: 18,
              font: FONTS.main,
              color: COLORS.textMuted,
            }),
          ],
        }),
        new Paragraph({
          shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
          border: {
            left: { color: COLORS.text, size: 24, style: BorderStyle.SINGLE },
          },
          children: [
            new TextRun({
              text: '{eleve_nom} {eleve_prenom}',
              bold: true,
              size: 22,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
          border: {
            left: { color: COLORS.text, size: 24, style: BorderStyle.SINGLE },
          },
          children: [
            new TextRun({
              text: '{eleve_adresse}',
              size: 20,
              font: FONTS.main,
              color: COLORS.textLight,
            }),
          ],
        }),
        new Paragraph({
          shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
          border: {
            left: { color: COLORS.text, size: 24, style: BorderStyle.SINGLE },
          },
          children: [
            new TextRun({
              text: 'Tél : {eleve_telephone} | Email : {eleve_email}',
              size: 20,
              font: FONTS.main,
              color: COLORS.textLight,
            }),
          ],
        }),
        
        // Objet du devis
        new Paragraph({
          spacing: { before: 300 },
          children: [
            new TextRun({
              text: 'Objet : Devis pour la formation "{formation_nom}"',
              bold: true,
              size: 22,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: '{formation_description}',
              size: 20,
              font: FONTS.main,
              color: COLORS.textLight,
            }),
          ],
        }),
        
        // Tableau des prestations
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // En-tête
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({
                  shading: { fill: COLORS.text, type: ShadingType.SOLID, color: COLORS.text },
                  children: [new Paragraph({
                    children: [new TextRun({ text: 'Description de la formation', bold: true, size: 20, color: 'FFFFFF', font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  shading: { fill: COLORS.text, type: ShadingType.SOLID, color: COLORS.text },
                  children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Durée', bold: true, size: 20, color: 'FFFFFF', font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  shading: { fill: COLORS.text, type: ShadingType.SOLID, color: COLORS.text },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: 'Prix HT', bold: true, size: 20, color: 'FFFFFF', font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  shading: { fill: COLORS.text, type: ShadingType.SOLID, color: COLORS.text },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: 'Montant HT', bold: true, size: 20, color: 'FFFFFF', font: FONTS.main })],
                  })],
                }),
              ],
            }),
            // Ligne de prestation
            new TableRow({
              children: [
                new TableCell({
                  borders: {
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
                  },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: '{formation_nom}', bold: true, size: 20, font: FONTS.main })],
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: 'Période : {session_debut} au {session_fin}', size: 18, color: COLORS.textLight, font: FONTS.main })],
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: 'Lieu : {session_lieu}', size: 18, color: COLORS.textLight, font: FONTS.main })],
                    }),
                  ],
                }),
                new TableCell({
                  borders: {
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
                  },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '{formation_duree}', size: 20, font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  borders: {
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
                  },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: '{montant_ht} €', size: 20, font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  borders: {
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
                  },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: '{montant_ht} €', bold: true, size: 20, font: FONTS.main })],
                  })],
                }),
              ],
            }),
          ],
        }),
        
        // Bloc Totaux
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        new Table({
          width: { size: 40, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          float: {
            horizontalAnchor: 'margin',
            relativeHorizontalPosition: 'right',
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: 'Sous-total HT :', size: 20, font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: '{montant_ht} €', bold: true, size: 20, font: FONTS.main })],
                  })],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: 'TVA ({taux_tva}%) :', size: 20, font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: '{tva} €', size: 20, font: FONTS.main })],
                  })],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: COLORS.text, type: ShadingType.SOLID, color: COLORS.text },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: 'TOTAL TTC :', bold: true, size: 24, color: 'FFFFFF', font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  shading: { fill: COLORS.text, type: ShadingType.SOLID, color: COLORS.text },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: '{montant_ttc} €', bold: true, size: 24, color: 'FFFFFF', font: FONTS.main })],
                  })],
                }),
              ],
            }),
          ],
        }),
        
        // Conditions
        new Paragraph({
          spacing: { before: 400 },
          children: [
            new TextRun({
              text: 'Conditions et validité du devis',
              bold: true,
              size: 20,
              font: FONTS.main,
              color: COLORS.warning,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• Ce devis est valable jusqu\'au {validite_devis}',
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• Modalités de paiement : {mode_paiement}',
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• La réservation est définitive après acceptation écrite du présent devis',
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        
        // Acceptation
        new Paragraph({
          spacing: { before: 300 },
          children: [
            new TextRun({
              text: 'Pour accepter ce devis :',
              bold: true,
              size: 20,
              font: FONTS.main,
              color: COLORS.success,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Veuillez retourner ce document signé par courrier, email ({ecole_email}) ou directement à notre secrétariat avant le {validite_devis}.',
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        
        // Signatures
        new Paragraph({
          spacing: { before: 600 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'Fait à {ecole_ville}, le {date_jour}',
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({ spacing: { before: 400 }, children: [] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NIL },
            bottom: { style: BorderStyle.NIL },
            left: { style: BorderStyle.NIL },
            right: { style: BorderStyle.NIL },
            insideHorizontal: { style: BorderStyle.NIL },
            insideVertical: { style: BorderStyle.NIL },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.NIL },
                    bottom: { style: BorderStyle.NIL },
                    left: { style: BorderStyle.NIL },
                    right: { style: BorderStyle.NIL },
                  },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: "L'Organisme de Formation", bold: true, size: 20, font: FONTS.main })],
                    }),
                    new Paragraph({ spacing: { before: 600 }, children: [] }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: '{ecole_nom}', size: 20, font: FONTS.main })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      border: { top: { color: COLORS.text, size: 1, style: BorderStyle.SINGLE } },
                      children: [new TextRun({ text: 'Signature', size: 18, color: COLORS.textLight, font: FONTS.main })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.NIL },
                    bottom: { style: BorderStyle.NIL },
                    left: { style: BorderStyle.NIL },
                    right: { style: BorderStyle.NIL },
                  },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'Le Client (Bon pour accord)', bold: true, size: 20, font: FONTS.main })],
                    }),
                    new Paragraph({ spacing: { before: 600 }, children: [] }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: '{eleve_nom} {eleve_prenom}', size: 20, font: FONTS.main })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      border: { top: { color: COLORS.text, size: 1, style: BorderStyle.SINGLE } },
                      children: [new TextRun({ text: 'Signature', size: 18, color: COLORS.textLight, font: FONTS.main })],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }],
  })
}

// ============================================
// TEMPLATE CONVENTION (simplifié)
// ============================================

function createConventionTemplate(): Document {
  return new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertMillimetersToTwip(20),
            bottom: convertMillimetersToTwip(20),
            left: convertMillimetersToTwip(20),
            right: convertMillimetersToTwip(20),
          },
        },
      },
      headers: {
        default: createHeader(),
      },
      footers: {
        default: createFooter(),
      },
      children: [
        // Titre
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: 'Contrat de formation professionnelle',
              bold: true,
              size: 32,
              font: FONTS.main,
              color: COLORS.text,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [
            new TextRun({
              text: '(Article L. 6353-1 du Code du Travail Décret N° 2018-1341 du 28 décembre 2018)',
              italics: true,
              size: 18,
              font: FONTS.main,
              color: COLORS.textLight,
            }),
          ],
        }),
        
        // Entre les soussignés
        new Paragraph({
          children: [
            new TextRun({
              text: "Entre l'organisme de formation : ",
              size: 22,
              font: FONTS.main,
            }),
            new TextRun({
              text: '{ecole_nom}',
              bold: true,
              size: 22,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'immatriculée au RCS sous le numéro {ecole_siret}',
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Dont le siège social est situé {ecole_adresse} {ecole_code_postal} {ecole_ville}.',
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 200 },
          children: [
            new TextRun({
              text: 'Représentée aux fins des présentes par {ecole_representant} en sa qualité de représentant.',
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Déclaration d'activité n°{ecole_numero_declaration} auprès de la préfecture de la région {ecole_region}.",
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 200 },
          children: [
            new TextRun({
              text: 'Ci-après dénommée « l\'Organisme de Formation »',
              bold: true,
              italics: true,
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 300 },
          children: [
            new TextRun({
              text: "D'une part",
              bold: true,
              size: 22,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 300 },
          children: [
            new TextRun({
              text: 'Et {eleve_prenom} {eleve_nom}',
              bold: true,
              size: 22,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 200 },
          children: [
            new TextRun({
              text: 'Ci-après dénommé(e) « le Bénéficiaire »',
              bold: true,
              italics: true,
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 300 },
          children: [
            new TextRun({
              text: "D'autre part",
              bold: true,
              size: 22,
              font: FONTS.main,
            }),
          ],
        }),
        
        // Article 1
        new Paragraph({
          spacing: { before: 400 },
          children: [
            new TextRun({
              text: '1. Objet du contrat',
              bold: true,
              size: 24,
              font: FONTS.main,
              color: COLORS.text,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 100 },
          children: [
            new TextRun({
              text: "Aux termes du présent contrat, l'Organisme de Formation s'engage à organiser l'action de formation suivante :",
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 100 },
          children: [
            new TextRun({
              text: '{formation_nom} DU {session_debut} au {session_fin}',
              bold: true,
              size: 22,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 200 },
          children: [
            new TextRun({
              text: 'Objectifs : {formation_objectifs}',
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Durée : {formation_duree}',
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Lieu de la formation : {session_lieu}',
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        
        // Article 3 - Prix
        new Paragraph({
          spacing: { before: 400 },
          children: [
            new TextRun({
              text: '3. Prix de la formation',
              bold: true,
              size: 24,
              font: FONTS.main,
              color: COLORS.text,
            }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
                  children: [new Paragraph({
                    children: [new TextRun({ text: 'Description', bold: true, size: 20, font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  shading: { fill: COLORS.bgLight, type: ShadingType.SOLID, color: COLORS.bgLight },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: 'Prix', bold: true, size: 20, font: FONTS.main })],
                  })],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: 'Formation', size: 20, font: FONTS.main })],
                  })],
                }),
                new TableCell({
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: '{montant_ttc}€', size: 20, font: FONTS.main })],
                  })],
                }),
              ],
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 100 },
          children: [
            new TextRun({
              text: "L'organisme de formation atteste être exonéré de TVA.",
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'TOTAL NET DE TAXES : {montant_ttc}€',
              bold: true,
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        
        // Signatures
        new Paragraph({
          spacing: { before: 600 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'Document réalisé en 2 exemplaires à {ecole_ville}, le {date_jour}.',
              size: 20,
              font: FONTS.main,
            }),
          ],
        }),
        new Paragraph({ spacing: { before: 400 }, children: [] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NIL },
            bottom: { style: BorderStyle.NIL },
            left: { style: BorderStyle.NIL },
            right: { style: BorderStyle.NIL },
            insideHorizontal: { style: BorderStyle.NIL },
            insideVertical: { style: BorderStyle.NIL },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.NIL },
                    bottom: { style: BorderStyle.NIL },
                    left: { style: BorderStyle.NIL },
                    right: { style: BorderStyle.NIL },
                  },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: "Pour l'Organisme de Formation", bold: true, size: 20, font: FONTS.main })],
                    }),
                    new Paragraph({ spacing: { before: 600 }, children: [] }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: '{ecole_nom}', size: 20, font: FONTS.main })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      border: { top: { color: COLORS.text, size: 1, style: BorderStyle.SINGLE } },
                      children: [new TextRun({ text: 'Signature', size: 18, color: COLORS.textLight, font: FONTS.main })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.NIL },
                    bottom: { style: BorderStyle.NIL },
                    left: { style: BorderStyle.NIL },
                    right: { style: BorderStyle.NIL },
                  },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'Pour le Bénéficiaire', bold: true, size: 20, font: FONTS.main })],
                    }),
                    new Paragraph({ spacing: { before: 600 }, children: [] }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: '{eleve_nom} {eleve_prenom}', size: 20, font: FONTS.main })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      border: { top: { color: COLORS.text, size: 1, style: BorderStyle.SINGLE } },
                      children: [new TextRun({ text: 'Signature', size: 18, color: COLORS.textLight, font: FONTS.main })],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }],
  })
}

// ============================================
// GÉNÉRATION DES FICHIERS
// ============================================

async function main() {
  console.log('🚀 Génération des templates DOCX natifs...\n')
  
  // Créer le dossier de sortie
  const outputDir = path.join(process.cwd(), 'public', 'docx-templates')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  const templates = [
    { name: 'facture', generator: createFactureTemplate },
    { name: 'devis', generator: createDevisTemplate },
    { name: 'convention', generator: createConventionTemplate },
  ]
  
  for (const template of templates) {
    console.log(`📄 Génération du template: ${template.name}...`)
    
    try {
      const doc = template.generator()
      const buffer = await Packer.toBuffer(doc)
      const outputPath = path.join(outputDir, `template_${template.name}.docx`)
      fs.writeFileSync(outputPath, buffer)
      console.log(`   ✅ Créé: ${outputPath}`)
    } catch (error) {
      console.error(`   ❌ Erreur: ${error}`)
    }
  }
  
  console.log('\n✨ Génération terminée!')
  console.log('\nProchaines étapes:')
  console.log('1. Ouvrez les fichiers .docx dans Word pour vérifier le rendu')
  console.log('2. Ajustez si nécessaire (polices, marges, etc.)')
  console.log('3. Uploadez les templates via l\'interface DocxTemplateUploader')
  console.log('   ou utilisez l\'API /api/documents/upload-docx-template')
}

main().catch(console.error)
