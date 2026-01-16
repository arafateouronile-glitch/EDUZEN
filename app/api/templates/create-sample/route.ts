import { NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, Header, Footer, HeadingLevel, convertMillimetersToTwip } from 'docx'
import { createClient } from '@/lib/supabase/server'

/**
 * API Route pour créer un template DOCX exemple
 * GET /api/templates/create-sample?type=convention
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'convention'

  try {
    let doc: Document

    if (type === 'convention') {
      doc = createConventionTemplate()
    } else if (type === 'facture') {
      doc = createFactureTemplate()
    } else {
      return NextResponse.json({ error: 'Type inconnu' }, { status: 400 })
    }

    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="template_${type}.docx"`,
      },
    })
  } catch (error) {
    console.error('Erreur création template:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

function createConventionTemplate(): Document {
  return new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Arial',
            size: 22,
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(25),
              right: convertMillimetersToTwip(25),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: '[LOGO]', size: 20, color: '999999' })],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [new TextRun({ text: '{organisme_nom}', bold: true, size: 24 })],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [new TextRun({ text: '{organisme_adresse}', size: 20 })],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [new TextRun({ text: 'SIRET : {organisme_siret}', size: 20 })],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [new TextRun({ text: 'N° DA : {organisme_numero_da}', size: 20 })],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: '{organisme_nom} - SIRET : {organisme_siret}', size: 18, color: '666666' }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Titre
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 400 },
            children: [
              new TextRun({
                text: 'CONVENTION DE FORMATION PROFESSIONNELLE',
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: 'Article L6353-1 et suivants du Code du Travail',
                italics: true,
                size: 22,
              }),
            ],
          }),

          // Entre les parties
          new Paragraph({
            spacing: { before: 300, after: 200 },
            children: [new TextRun({ text: 'Entre les soussignés :', bold: true, size: 24 })],
          }),

          // L'organisme
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "L'organisme de formation ", size: 22 }),
              new TextRun({ text: '{organisme_nom}', bold: true, size: 22 }),
              new TextRun({ text: ', sis {organisme_adresse}', size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'SIRET : {organisme_siret} - N° de déclaration d\'activité : {organisme_numero_da}', size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'Ci-après dénommé « l\'Organisme de formation »', italics: true, size: 22 }),
            ],
          }),

          // Et
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [new TextRun({ text: 'ET', bold: true, size: 24 })],
          }),

          // Le client
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'M./Mme ', size: 22 }),
              new TextRun({ text: '{eleve_prenom} {eleve_nom}', bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'Demeurant : {eleve_adresse}, {eleve_code_postal} {eleve_ville}', size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'Email : {eleve_email} - Tél : {eleve_telephone}', size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({ text: 'Ci-après dénommé(e) « le Client »', italics: true, size: 22 }),
            ],
          }),

          // Il a été convenu
          new Paragraph({
            spacing: { before: 300, after: 300 },
            children: [
              new TextRun({ text: 'Il a été convenu ce qui suit :', bold: true, size: 24 }),
            ],
          }),

          // Article 1
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'ARTICLE 1 – OBJET', bold: true, size: 24 })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'La présente convention a pour objet la réalisation de l\'action de formation suivante : ', size: 22 }),
              new TextRun({ text: '{formation_nom}', bold: true, size: 22 }),
            ],
          }),

          // Article 2
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'ARTICLE 2 – DURÉE ET DATES', bold: true, size: 24 })],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'Durée totale : ', size: 22 }),
              new TextRun({ text: '{session_duree_heures} heures', bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'Du ', size: 22 }),
              new TextRun({ text: '{session_debut_formate}', bold: true, size: 22 }),
              new TextRun({ text: ' au ', size: 22 }),
              new TextRun({ text: '{session_fin_formate}', bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'Lieu de formation : {session_lieu}', size: 22 }),
            ],
          }),

          // Article 3
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'ARTICLE 3 – COÛT DE LA FORMATION', bold: true, size: 24 })],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'Montant HT : ', size: 22 }),
              new TextRun({ text: '{montant_ht_formate}', bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'TVA non applicable, article 293 B du CGI', italics: true, size: 20 }),
            ],
          }),

          // Article 4
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'ARTICLE 4 – MODALITÉS DE PAIEMENT', bold: true, size: 24 })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'Le règlement sera effectué selon les modalités suivantes : {mode_paiement}', size: 22 }),
            ],
          }),

          // Signatures
          new Paragraph({
            spacing: { before: 600, after: 200 },
            children: [
              new TextRun({ text: 'Fait à {organisme_ville}, le {date_generation}', size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'En deux exemplaires originaux.', size: 22 }),
            ],
          }),

          // Tableau des signatures
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 400 },
                        children: [new TextRun({ text: 'Pour l\'Organisme de formation', bold: true, size: 22 })],
                      }),
                      new Paragraph({
                        spacing: { before: 100 },
                        children: [new TextRun({ text: '(Signature et cachet)', italics: true, size: 20 })],
                      }),
                      new Paragraph({ children: [] }),
                      new Paragraph({ children: [] }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 400 },
                        children: [new TextRun({ text: 'Le Client', bold: true, size: 22 })],
                      }),
                      new Paragraph({
                        spacing: { before: 100 },
                        children: [new TextRun({ text: '(Signature précédée de "Lu et approuvé")', italics: true, size: 20 })],
                      }),
                      new Paragraph({ children: [] }),
                      new Paragraph({ children: [] }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  })
}

function createFactureTemplate(): Document {
  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(15),
              bottom: convertMillimetersToTwip(15),
              left: convertMillimetersToTwip(20),
              right: convertMillimetersToTwip(20),
            },
          },
        },
        children: [
          // En-tête avec logo et infos
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: '[LOGO]', size: 20, color: '999999' })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [new TextRun({ text: '{organisme_nom}', bold: true, size: 28 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [new TextRun({ text: '{organisme_adresse}', size: 20 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [new TextRun({ text: 'SIRET : {organisme_siret}', size: 20 })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Titre FACTURE
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 200 },
            children: [
              new TextRun({ text: 'FACTURE N° ', bold: true, size: 36 }),
              new TextRun({ text: '{numero_facture}', bold: true, size: 36, color: '2563EB' }),
            ],
          }),

          // Date et échéance
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({ text: 'Date : {date_facture_formate}', size: 22 }),
              new TextRun({ text: '  |  ', size: 22 }),
              new TextRun({ text: 'Échéance : {date_echeance_formate}', size: 22 }),
            ],
          }),

          // Client
          new Paragraph({
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'FACTURÉ À :', bold: true, size: 24 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '{eleve_prenom} {eleve_nom}', bold: true, size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '{eleve_adresse}', size: 22 })],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [new TextRun({ text: '{eleve_code_postal} {eleve_ville}', size: 22 })],
          }),

          // Formation
          new Paragraph({
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'DÉSIGNATION', bold: true, size: 24 })],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'Formation : ', size: 22 }),
              new TextRun({ text: '{formation_nom}', bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Session : {session_nom}', size: 22 })],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [new TextRun({ text: 'Du {session_debut_formate} au {session_fin_formate}', size: 22 })],
          }),

          // Montants
          new Table({
            width: { size: 50, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Montant HT', bold: true, size: 22 })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '{montant_ht_formate}', size: 22 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'TVA', size: 22 })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Non applicable', italics: true, size: 22 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: 'F3F4F6' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL À PAYER', bold: true, size: 24 })] })],
                  }),
                  new TableCell({
                    shading: { fill: 'F3F4F6' },
                    children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '{montant_ht_formate}', bold: true, size: 24, color: '2563EB' })] })],
                  }),
                ],
              }),
            ],
          }),

          // Mentions légales
          new Paragraph({
            spacing: { before: 400 },
            children: [new TextRun({ text: 'TVA non applicable, art. 293B du CGI', italics: true, size: 18, color: '666666' })],
          }),
          new Paragraph({
            children: [new TextRun({ text: 'N° SIRET : {organisme_siret} • Déclaration d\'activité : {organisme_numero_da}', size: 18, color: '666666' })],
          }),
        ],
      },
    ],
  })
}
