/**
 * Système de mise en page Premium pour les documents générés
 * Inspiré du design INSSI FORMATION - Style professionnel et cohérent
 * 
 * Ce module fournit des layouts d'en-tête et de pied de page réutilisables
 * pour tous les types de documents de l'application.
 */

import type { DocumentVariables } from '@/lib/types/document-templates'

/**
 * Configuration du layout premium
 */
export interface PremiumLayoutConfig {
  // Couleur principale de l'organisation (pour les accents)
  primaryColor?: string
  // Couleur secondaire (pour le texte moins important)
  secondaryColor?: string
  // Afficher le logo
  showLogo?: boolean
  // Position du logo: 'left' | 'right'
  logoPosition?: 'left' | 'right'
  // Afficher la numérotation des pages
  showPageNumbers?: boolean
  // Format de pagination
  paginationFormat?: string
  // Afficher la mention légale dans le footer
  showLegalMention?: boolean
  // Afficher la date de génération
  showGenerationDate?: boolean
}

const defaultConfig: PremiumLayoutConfig = {
  primaryColor: '#1A1A1A',
  secondaryColor: '#666666',
  showLogo: true,
  logoPosition: 'right',
  showPageNumbers: true,
  paginationFormat: 'Page {numero_page} / {total_pages}',
  showLegalMention: true,
  showGenerationDate: true,
}

/**
 * Génère le header premium style INSSI FORMATION
 * - Informations de l'organisation à gauche
 * - Logo à droite
 * - Ligne de séparation en bas
 */
export function generatePremiumHeader(
  variables: DocumentVariables,
  config: PremiumLayoutConfig = {}
): string {
  const cfg = { ...defaultConfig, ...config }
  
  const logoSection = cfg.showLogo && variables.ecole_logo 
    ? `<img src="${variables.ecole_logo}" alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" />`
    : ''

  const leftContent = `
    <div style="flex: 1;">
      <p style="font-weight: bold; font-size: 14pt; margin: 0; color: ${cfg.primaryColor}; line-height: 1.3;">
        ${variables.ecole_nom || 'Nom de l\'établissement'}
      </p>
      <p style="font-size: 9pt; color: ${cfg.secondaryColor}; margin: 3px 0 0 0; line-height: 1.4;">
        ${variables.ecole_adresse || ''}
      </p>
      <p style="font-size: 9pt; color: ${cfg.secondaryColor}; margin: 1px 0; line-height: 1.4;">
        ${variables.ecole_code_postal || ''} ${variables.ecole_ville || ''}
      </p>
      <p style="font-size: 9pt; color: ${cfg.secondaryColor}; margin: 1px 0; line-height: 1.4;">
        Email : ${variables.ecole_email || ''}
      </p>
      <p style="font-size: 9pt; color: ${cfg.secondaryColor}; margin: 1px 0; line-height: 1.4;">
        Tel : ${variables.ecole_telephone || ''}
      </p>
    </div>
  `

  const rightContent = cfg.logoPosition === 'right' && logoSection
    ? `<div style="text-align: right; min-width: 100px;">${logoSection}</div>`
    : ''

  const leftLogoContent = cfg.logoPosition === 'left' && logoSection
    ? `<div style="margin-right: 20px;">${logoSection}</div>`
    : ''

  return `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding: 15px 25px; border-bottom: 2px solid ${cfg.primaryColor};">
      ${leftLogoContent}
      ${leftContent}
      ${rightContent}
    </div>
  `
}

/**
 * Génère le footer premium style INSSI FORMATION
 * - Nom de l'organisation | Adresse | SIRET
 * - Numéro de déclaration d'activité
 * - Mention légale en italique
 * - Numéro de page
 */
export function generatePremiumFooter(
  variables: DocumentVariables,
  config: PremiumLayoutConfig = {}
): string {
  const cfg = { ...defaultConfig, ...config }
  
  // Ligne principale avec infos
  const mainLine = [
    variables.ecole_nom,
    variables.ecole_adresse ? `${variables.ecole_adresse} ${variables.ecole_ville || ''} ${variables.ecole_code_postal || ''}` : '',
    variables.ecole_siret ? `Numéro SIRET : ${variables.ecole_siret}` : '',
  ].filter(Boolean).join(' | ')

  // Ligne de déclaration d'activité
  const declarationLine = variables.ecole_numero_declaration
    ? `Numéro de déclaration d'activité : ${variables.ecole_numero_declaration} <em>(auprès du préfet de région de : ${variables.ecole_region || ''})</em>`
    : ''

  // Mention légale
  const legalMention = cfg.showLegalMention
    ? `<p style="font-size: 8pt; color: #888; font-style: italic; margin: 3px 0 0 0; line-height: 1.3;">
        Cet enregistrement ne vaut pas l'agrément de l'État.
      </p>`
    : ''

  // Pagination
  const pagination = cfg.showPageNumbers
    ? `<p style="font-size: 9pt; color: ${cfg.secondaryColor}; margin: 8px 0 0 0; text-align: right; font-weight: 500;">
        Page <span class="page-number">{numero_page}</span> / <span class="total-pages">{total_pages}</span>
      </p>`
    : ''

  return `
    <div style="border-top: 1px solid #E5E7EB; padding: 12px 25px 10px 25px; margin-top: 20px; background-color: #FAFAFA;">
      <p style="font-size: 9pt; color: ${cfg.primaryColor}; margin: 0; text-align: center; font-weight: 500; line-height: 1.4;">
        ${mainLine}
      </p>
      ${declarationLine ? `
        <p style="font-size: 8pt; color: ${cfg.secondaryColor}; margin: 4px 0 0 0; text-align: center; line-height: 1.3;">
          ${declarationLine}
        </p>
      ` : ''}
      ${legalMention}
      ${pagination}
    </div>
  `
}

/**
 * Génère un document complet avec layout premium
 * Encapsule le contenu du corps avec header et footer premium
 */
export function wrapWithPremiumLayout(
  bodyContent: string,
  variables: DocumentVariables,
  config: PremiumLayoutConfig = {}
): string {
  const header = generatePremiumHeader(variables, config)
  const footer = generatePremiumFooter(variables, config)
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #1A1A1A;
          margin: 0;
          padding: 0;
        }
        
        .document-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          display: flex;
          flex-direction: column;
        }
        
        .document-header {
          flex-shrink: 0;
        }
        
        .document-body {
          flex: 1;
          padding: 15px 25px 20px 25px;
        }
        
        .document-footer {
          flex-shrink: 0;
        }
        
        /* Styles pour le contenu */
        h1 {
          font-size: 16pt;
          font-weight: bold;
          color: #1A1A1A;
          margin: 0 0 15px 0;
          text-align: center;
        }
        
        h2 {
          font-size: 12pt;
          font-weight: bold;
          color: #1A1A1A;
          margin: 20px 0 10px 0;
          padding-bottom: 5px;
          border-bottom: 1px solid #E5E7EB;
        }
        
        h3 {
          font-size: 11pt;
          font-weight: bold;
          color: #333;
          margin: 15px 0 8px 0;
        }
        
        p {
          margin: 6px 0;
          text-align: justify;
        }
        
        strong {
          font-weight: 600;
        }
        
        .section {
          margin-bottom: 20px;
        }
        
        .info-box {
          padding: 12px 15px;
          background-color: #F9FAFB;
          border-left: 3px solid #1A1A1A;
          margin: 15px 0;
        }
        
        .highlight-box {
          padding: 12px 15px;
          background-color: #F0F9FF;
          border-left: 3px solid #0EA5E9;
          margin: 15px 0;
        }
        
        .warning-box {
          padding: 12px 15px;
          background-color: #FEF3C7;
          border-left: 3px solid #F59E0B;
          margin: 15px 0;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 10pt;
        }
        
        table th {
          background-color: #F3F4F6;
          padding: 8px 10px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #E5E7EB;
        }
        
        table td {
          padding: 8px 10px;
          border: 1px solid #E5E7EB;
        }
        
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          padding-top: 20px;
        }
        
        .signature-box {
          width: 45%;
          text-align: center;
        }
        
        .signature-line {
          border-top: 1px solid #1A1A1A;
          margin-top: 50px;
          padding-top: 8px;
          font-size: 10pt;
        }
        
        .centered {
          text-align: center;
        }
        
        .right-aligned {
          text-align: right;
        }
        
        .small-text {
          font-size: 9pt;
          color: #666;
        }
        
        .italic {
          font-style: italic;
        }
        
        @media print {
          .document-page {
            page-break-after: always;
          }
          
          .document-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="document-page">
        <div class="document-header">
          ${header}
        </div>
        <div class="document-body">
          ${bodyContent}
        </div>
        <div class="document-footer">
          ${footer}
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Génère le titre du document avec sous-titre légal
 */
export function generateDocumentTitle(
  title: string,
  subtitle?: string,
  variables?: DocumentVariables
): string {
  return `
    <div style="text-align: center; margin-bottom: 25px;">
      <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
        ${title}
      </h1>
      ${subtitle ? `
        <p style="font-size: 9pt; color: #666; margin: 0; font-style: italic;">
          ${subtitle}
        </p>
      ` : ''}
    </div>
  `
}

/**
 * Génère une section "Entre les soussignés" pour les contrats
 */
export function generatePartiesSection(
  variables: DocumentVariables
): string {
  return `
    <div class="section">
      <p style="font-weight: bold; margin-bottom: 15px;">Entre l'organisme de formation : ${variables.ecole_nom || ''}</p>
      <p style="margin-left: 20px;">immatriculée au RCS de sous le numéro ${variables.ecole_siret || ''}</p>
      <p style="margin-left: 20px;">Dont le siège social est situé ${variables.ecole_adresse || ''} ${variables.ecole_code_postal || ''} ${variables.ecole_ville || ''}.</p>
      
      ${variables.ecole_representant ? `
        <p style="margin: 12px 0 0 0;">
          Représentée aux fins des présentes par ${variables.ecole_representant} en sa qualité de représentant, dûment habilité(e).
        </p>
      ` : ''}
      
      ${variables.ecole_numero_declaration ? `
        <p style="margin: 5px 0 0 0;">
          Déclaration d'activité n°${variables.ecole_numero_declaration} auprès de la préfecture de la région${variables.ecole_region ? ` ${variables.ecole_region}` : ''}.
        </p>
      ` : ''}
      
      <p style="margin: 15px 0 5px 0; font-weight: bold; font-style: italic;">
        Ci-après dénommée « l'Organisme de Formation »
      </p>
      
      <p style="margin: 20px 0 10px 0; font-weight: bold;">D'une part</p>
      
      <p style="margin: 20px 0 10px 0; font-weight: bold;">Et ${variables.eleve_prenom || ''} ${variables.eleve_nom || ''}</p>
      
      ${variables.eleve_adresse ? `
        <p style="margin-left: 20px;">Adresse : ${variables.eleve_adresse}</p>
      ` : ''}
      
      ${variables.eleve_telephone ? `
        <p style="margin-left: 20px;">Téléphone : ${variables.eleve_telephone}</p>
      ` : ''}
      
      ${variables.eleve_email ? `
        <p style="margin-left: 20px;">Email : ${variables.eleve_email}</p>
      ` : ''}
      
      <p style="margin: 15px 0 5px 0; font-weight: bold; font-style: italic;">
        Ci-après dénommée « le Bénéficiaire »
      </p>
      
      <p style="margin: 20px 0 10px 0; font-weight: bold;">D'autre part</p>
      
      <p style="margin: 20px 0; font-style: italic;">
        Ci-après individuellement ou collectivement désigné(s) la ou les « Partie(s) »
      </p>
    </div>
  `
}

/**
 * Génère une section de signatures
 */
export function generateSignatureSection(
  leftTitle: string,
  leftName: string,
  rightTitle: string,
  rightName: string,
  location?: string,
  date?: string
): string {
  return `
    <div style="margin-top: 40px;">
      ${location || date ? `
        <p style="text-align: center; margin-bottom: 25px;">
          ${location ? `Fait à ${location}` : ''}${location && date ? ', ' : ''}${date ? `le ${date}` : ''}
        </p>
      ` : ''}
      
      <div style="display: flex; justify-content: space-between;">
        <div style="width: 45%; text-align: center;">
          <p style="font-weight: bold; margin-bottom: 50px;">${leftTitle}</p>
          <p style="margin-bottom: 8px;">${leftName}</p>
          <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 8px;">
            <p style="font-size: 9pt; color: #666;">Signature</p>
          </div>
        </div>
        <div style="width: 45%; text-align: center;">
          <p style="font-weight: bold; margin-bottom: 50px;">${rightTitle}</p>
          <p style="margin-bottom: 8px;">${rightName}</p>
          <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 8px;">
            <p style="font-size: 9pt; color: #666;">Signature</p>
          </div>
        </div>
      </div>
    </div>
  `
}

/**
 * Génère un article numéroté (pour les contrats)
 */
export function generateArticle(
  number: number | string,
  title: string,
  content: string
): string {
  return `
    <div class="section" style="margin-bottom: 20px;">
      <h2 style="font-size: 12pt; font-weight: bold; margin-bottom: 10px; color: #1A1A1A;">
        ${typeof number === 'number' ? `${number}. ` : `${number} `}${title}
      </h2>
      <div style="padding-left: 0;">
        ${content}
      </div>
    </div>
  `
}

/**
 * Génère un tableau simple
 */
export function generateSimpleTable(
  headers: string[],
  rows: string[][]
): string {
  return `
    <table>
      <thead>
        <tr>
          ${headers.map(h => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${row.map(cell => `<td>${cell}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

export default {
  generatePremiumHeader,
  generatePremiumFooter,
  wrapWithPremiumLayout,
  generateDocumentTitle,
  generatePartiesSection,
  generateSignatureSection,
  generateArticle,
  generateSimpleTable,
}



