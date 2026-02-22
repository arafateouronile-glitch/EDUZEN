/**
 * Générateur HTML pour documents
 */

import type { DocumentTemplate, DocumentVariables } from '@/lib/types/document-templates'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { evaluateConditionalContent } from './conditional-processor'
import { processLoops } from './loop-processor'
import { processCalculatedVariables } from './calculated-variables'
import { processDynamicTables } from './dynamic-table-processor'
import { processElementVisibility } from './element-visibility-processor'
import { processNestedVariables, flattenVariables } from './nested-variables-processor'
import { processDynamicHyperlinks } from './dynamic-hyperlinks-processor'
import { processSignatures } from './signature-processor'
import { processAttachments } from './attachment-processor'
import { processFormFields } from './form-field-processor'
import { enrichVariablesWithExternalData } from './api-integration-processor'
import { sanitizeDocumentTemplate } from '@/lib/utils/sanitize-html'
// Note: getGlobalDocumentLayout est importé dynamiquement pour éviter les erreurs côté client

/**
 * Génère un en-tête professionnel basé sur les informations de l'organisation
 * Style Premium inspiré de INSSI FORMATION :
 * - Informations de l'organisme à gauche
 * - Logo à droite
 * - Ligne de séparation en bas (2px solid noir)
 */
function generateProfessionalHeader(variables: Record<string, any>): string {
  const orgName = variables.ecole_nom || variables.organization_name || ''
  const orgAddress = variables.ecole_adresse || variables.organization_address || ''
  const orgPostalCode = variables.ecole_code_postal || ''
  const orgCity = variables.ecole_ville || ''
  const orgEmail = variables.ecole_email || variables.organization_email || ''
  const orgPhone = variables.ecole_telephone || variables.organization_phone || ''
  const orgLogo = variables.ecole_logo || variables.organization_logo || ''

  return `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 0 0 15px 0; border-bottom: 2px solid #1A1A1A; margin-bottom: 20px;">
      <div style="flex: 1;">
        <p style="font-weight: bold; font-size: 14pt; margin: 0; color: #1A1A1A; line-height: 1.3;">${orgName}</p>
        ${orgAddress ? `<p style="font-size: 9pt; color: #666; margin: 4px 0 0 0; line-height: 1.4;">${orgAddress}</p>` : ''}
        ${(orgPostalCode || orgCity) ? `<p style="font-size: 9pt; color: #666; margin: 2px 0; line-height: 1.4;">${orgPostalCode} ${orgCity}</p>` : ''}
        ${orgEmail ? `<p style="font-size: 9pt; color: #666; margin: 2px 0; line-height: 1.4;">Email : ${orgEmail}</p>` : ''}
        ${orgPhone ? `<p style="font-size: 9pt; color: #666; margin: 2px 0; line-height: 1.4;">Tel : ${orgPhone}</p>` : ''}
      </div>
      ${orgLogo ? `
      <div style="text-align: right; min-width: 100px;">
        <img src="${orgLogo}" alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" />
      </div>
      ` : ''}
    </div>
  `
}

/**
 * Génère un bas de page professionnel basé sur les informations de l'organisation
 * Style Premium inspiré de INSSI FORMATION :
 * - Nom | Adresse | SIRET sur une ligne centrale
 * - Numéro de déclaration d'activité
 * - Mention légale en italique
 * - Pagination à droite
 */
function generateProfessionalFooter(variables: Record<string, any>, pageNumber?: number, totalPages?: number): string {
  const orgName = variables.ecole_nom || variables.organization_name || ''
  const orgAddress = variables.ecole_adresse || variables.organization_address || ''
  const orgCity = variables.ecole_ville || ''
  const orgPostalCode = variables.ecole_code_postal || ''
  const orgSiret = variables.ecole_siret || variables.organization_siret || ''
  const orgDeclaration = variables.ecole_numero_declaration || variables.organization_declaration_number || ''
  const orgRegion = variables.ecole_region || ''

  // Construire la ligne principale avec séparateurs
  const mainLineParts = [
    orgName,
    orgAddress ? `${orgAddress} ${orgCity} ${orgPostalCode}`.trim() : '',
    orgSiret ? `Numéro SIRET : ${orgSiret}` : '',
  ].filter(Boolean)
  
  const mainLine = mainLineParts.join(' | ')

  // Pagination
  const pageInfo = (pageNumber !== undefined && totalPages !== undefined) 
    ? `Page ${pageNumber} / ${totalPages}`
    : 'Page {numero_page} / {total_pages}'

  return `
    <div style="border-top: 1px solid #E5E7EB; padding: 12px 0 8px 0; margin-top: 25px; background-color: #FAFAFA;">
      <p style="font-size: 9pt; color: #1A1A1A; margin: 0; text-align: center; font-weight: 500; line-height: 1.4;">
        ${mainLine}
      </p>
      ${orgDeclaration ? `
      <p style="font-size: 8pt; color: #666; margin: 4px 0 0 0; text-align: center; line-height: 1.3;">
        Numéro de déclaration d'activité : ${orgDeclaration} ${orgRegion ? `<em>(auprès du préfet de région de : ${orgRegion})</em>` : '<em>(auprès du préfet de région de : )</em>'}
      </p>
      <p style="font-size: 8pt; color: #888; font-style: italic; margin: 3px 0 0 0; text-align: center; line-height: 1.3;">
        Cet enregistrement ne vaut pas l'agrément de l'État.
      </p>
      ` : ''}
      <p style="font-size: 9pt; color: #666; margin: 8px 0 0 0; text-align: right; font-weight: 500;">
        ${pageInfo}
      </p>
    </div>
  `
}

/**
 * Convertit une URL d'image en base64 (pour Puppeteer/PDF)
 * Cette fonction est asynchrone et doit être appelée côté serveur
 */
async function convertImageUrlToBase64(imageUrl: string): Promise<string | null> {
  try {
    // Si c'est déjà une data URL, la retourner telle quelle
    if (imageUrl.startsWith('data:')) {
      return imageUrl
    }
    
    if (!imageUrl || !imageUrl.trim()) {
      logger.warn(`[convertImageUrlToBase64] URL vide`)
      return null
    }
    
    // Télécharger l'image avec timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 secondes de timeout
    
    try {
      const response = await fetch(imageUrl, {
        headers: {
          'Accept': 'image/*',
        },
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        logger.warn(`[convertImageUrlToBase64] Échec du téléchargement: ${response.status} ${response.statusText}`)
        return null
      }
      
      // Convertir en buffer puis en base64
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = buffer.toString('base64')
      
      // Déterminer le type MIME
      const contentType = response.headers.get('content-type') || 'image/png'
      
      const dataUrl = `data:${contentType};base64,${base64}`
      return dataUrl
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        logger.error(`[convertImageUrlToBase64] Timeout lors du téléchargement`)
      } else {
        logger.error(`[convertImageUrlToBase64] Erreur fetch:`, fetchError)
      }
      return null
    }
  } catch (error) {
    logger.error(`[convertImageUrlToBase64] Erreur lors de la conversion:`, error)
    return null
  }
}

// Fonction pour traiter les logos (doit être appelée AVANT replaceVariablesInHTML)
// NOTE: Cette fonction est maintenant asynchrone pour convertir les URLs en base64
async function processLogos(html: string, variables: Record<string, any>): Promise<string> {
  if (!html || typeof html !== 'string') {
    return html
  }
  
  let result = html
  const logoKeys = ['ecole_logo', 'organization_logo']
  
  // ÉTAPE 1: Si le header contient déjà l'URL comme texte (au lieu de data-logo-var),
  // la remplacer par une balise img avec data-logo-var AVANT de traiter les balises existantes
  logoKeys.forEach((key) => {
    const logoValue = variables[key] && String(variables[key]).trim() ? String(variables[key]) : null
    if (logoValue && logoValue.includes('supabase.co')) {
      // Chercher si l'URL apparaît comme texte dans le HTML (pas dans un attribut src ou href)
      // Utiliser un regex simple qui trouve l'URL et vérifie le contexte
      const escapedUrl = logoValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      
      // Pattern: URL qui n'est pas précédée par src=" ou href=" et qui n'est pas dans une balise avec src
      // On va utiliser une approche en deux passes : d'abord trouver, puis remplacer
      let foundTextUrl = false
      const urlRegex = new RegExp(escapedUrl, 'gi')
      const matches = [...result.matchAll(urlRegex)]
      
      // Traiter les matches en ordre inverse pour éviter les problèmes d'offset
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i]
        if (!match.index) continue
        
        const offset = match.index
        const before = result.substring(Math.max(0, offset - 150), offset)
        const after = result.substring(offset + logoValue.length, Math.min(result.length, offset + logoValue.length + 50))
        
        // Vérifier si on est dans un attribut src="..." ou href="..."
        const isInSrc = before.match(/src\s*=\s*"[^"]*$/)
        const isInHref = before.match(/href\s*=\s*"[^"]*$/)
        const isInImgTag = before.match(/<img[^>]*$/)
        
        // Si l'URL n'est PAS dans un attribut src/href mais est dans une balise img, c'est OK
        // Si l'URL est complètement en dehors d'une balise img, la remplacer
        if (!isInSrc && !isInHref) {
          // Vérifier si on est dans une balise img existante (peut-être avec un src vide)
          if (isInImgTag) {
            // On est dans une balise img mais pas dans src, peut-être que le src est manquant
            // Ne rien faire, on va le traiter dans l'étape suivante
            continue
          } else {
            // L'URL est comme texte pur, la remplacer par une balise img
            foundTextUrl = true
            result = result.substring(0, offset) + 
                     `<img alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" data-logo-var="{${key}}" />` + 
                     result.substring(offset + logoValue.length)
          }
        }
      }
      
      if (foundTextUrl) {
        logger.debug(`[processLogos] ✅ URLs textuelles remplacées par des balises img avec data-logo-var`)
      }
    }
  })
  
  // Traiter chaque logo de manière asynchrone
  // Vérifier aussi les variantes de noms de variables
  const allLogoKeys = [...logoKeys, 'organisation_logo']
  
  for (const key of allLogoKeys) {
    const logoValue = variables[key] && String(variables[key]).trim() ? String(variables[key]) : null
    
    if (logoValue) {
      // Remplacer le src des images avec data-logo-var="{ecole_logo}" ou data-logo-var="{organization_logo}"
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      
      // Chercher toutes les occurrences de data-logo-var avec la variable
      // Pattern flexible : cherche data-logo-var="{ecole_logo}" n'importe où dans la balise img
      // Essayer plusieurs patterns pour être sûr de trouver la balise
      const patterns = [
        // Pattern 1: data-logo-var="{ecole_logo}" avec attributs avant et après
        `<img([^>]*?)data-logo-var\\s*=\\s*"\\{${escapedKey}\\}"([^>]*?)>`,
        // Pattern 2: data-logo-var="{ecole_logo}" avec espace optionnel avant data-logo-var
        `<img([^>]*?)\\s+data-logo-var\\s*=\\s*"\\{${escapedKey}\\}"([^>]*?)>`,
        // Pattern 3: data-logo-var="{ecole_logo}" avec attributs dans n'importe quel ordre
        `<img[^>]*?data-logo-var\\s*=\\s*"\\{${escapedKey}\\}"[^>]*?>`,
      ]
      
      let found = false
      for (const pattern of patterns) {
        const regex = new RegExp(pattern, 'gi')
        const testMatches = result.match(regex)
        if (testMatches && testMatches.length > 0) {
          found = true
          break
        }
      }
      
      if (!found) {
        // Normal si le template n'utilise pas cette variable de logo
      }
      
      // Utiliser le pattern le plus simple et flexible
      // Pattern: <img ... data-logo-var="{ecole_logo}" ... >
      const regex = new RegExp(`<img([^>]*?)data-logo-var\\s*=\\s*"\\{${escapedKey}\\}"([^>]*?)>`, 'gi')
      
      // Convertir l'URL en base64 pour éviter les problèmes CORS avec Puppeteer
      let logoSrc = logoValue
      if (logoValue && (logoValue.includes('supabase.co') || logoValue.startsWith('http'))) {
        try {
          const base64Image = await convertImageUrlToBase64(logoValue)
          if (base64Image) {
            logoSrc = base64Image
          } else {
            logger.warn(`[processLogos] ⚠️ Échec de la conversion en base64, utilisation de l'URL originale`)
            // Essayer quand même avec l'URL originale, Puppeteer pourra peut-être la charger
          }
        } catch (error) {
          logger.error(`[processLogos] ❌ Erreur lors de la conversion en base64:`, error)
          // En cas d'erreur, utiliser l'URL originale
        }
      }
      
      result = result.replace(
        regex,
        (match, before, after) => {
          // Extraire tous les attributs existants sauf src et data-logo-var
          const allAttrs = (before + ' ' + after).trim()
          
          // Extraire le style existant
          const styleMatch = match.match(/style\s*=\s*"([^"]*)"/)
          const existingStyle = styleMatch ? styleMatch[1] : ''
          
          // Extraire l'alt existant ou utiliser "Logo" par défaut
          const altMatch = match.match(/alt\s*=\s*"([^"]*)"/)
          const altValue = altMatch ? altMatch[1] : 'Logo'
          
          // Supprimer src et data-logo-var des attributs existants
          let cleanedAttrs = allAttrs
            .replace(/\s+src\s*=\s*"[^"]*"/g, '')
            .replace(/\s+data-logo-var\s*=\s*"[^"]*"/g, '')
            .trim()
          
          // Construire la nouvelle balise img avec le src du logo (base64 ou URL)
          const newImg = `<img src="${logoSrc}" alt="${altValue}"${cleanedAttrs ? ' ' + cleanedAttrs : ''} style="${existingStyle}">`
          return newImg
        }
      )
    } else {
      // Si pas de logo, masquer l'image
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      result = result.replace(
        new RegExp(`<img([^>]*?)data-logo-var\\s*=\\s*"\\{${escapedKey}\\}"([^>]*?)>`, 'gi'),
        (match, before, after) => {
          const styleMatch = match.match(/style\s*=\s*"([^"]*)"/)
          const existingStyle = styleMatch ? styleMatch[1] : ''
          return `<img${before} data-logo-var="{${key}}"${after} style="${existingStyle}; display: none;">`
        }
      )
    }
  }
  
  // Supprimer les occurrences textuelles de l'URL du logo (qui ne sont pas dans un attribut src)
  // Cela évite que l'URL apparaisse comme texte dans le document
  logoKeys.forEach(key => {
    const logoValue = variables[key]
    if (logoValue && typeof logoValue === 'string' && logoValue.trim()) {
      // Échapper l'URL pour le regex
      const escapedUrl = logoValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      
      // Chercher l'URL qui n'est PAS dans un attribut src d'une balise img
      // Pattern: URL qui n'est pas précédée par src=" et qui n'est pas dans une balise img avec src
      const textUrlPattern = new RegExp(`(?!<img[^>]*src\\s*=\\s*"[^"]*${escapedUrl}[^"]*"[^>]*>)${escapedUrl}(?![^<]*</img>)`, 'gi')
      
      // Remplacer les occurrences textuelles par une chaîne vide
      result = result.replace(textUrlPattern, (match, offset) => {
        // Vérifier le contexte pour s'assurer qu'on n'est pas dans un attribut src
        const before = result.substring(Math.max(0, offset - 50), offset)
        const after = result.substring(offset + match.length, Math.min(result.length, offset + match.length + 50))
        const context = before + match + after
        
        // Si on trouve "src=" avant l'URL dans le contexte, ne pas supprimer
        if (context.match(/src\s*=\s*"[^"]*$/)) {
          return match
        }
        return ''
      })
    }
  })
  
  return result
}

// Fonction pour remplacer les variables dans le HTML
function replaceVariablesInHTML(html: string, variables: Record<string, any>): string {
  // Note: Les conditionnels sont déjà traités dans generateHTML avant l'appel à cette fonction
  let result = html
  
  // Traiter les QR codes avec variables dynamiques
  // Remplacer les images avec classe qr-code-dynamic
  result = result.replace(/<img([^>]*?)class="qr-code-dynamic"([^>]*?)data-qr-data="([^"]*)"([^>]*?)>/g, (match, before, middle, data, after) => {
    let processedData = data
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      processedData = processedData.replace(regex, String(value))
    })
    // Extraire la taille depuis le style
    const sizeMatch = match.match(/max-width:\s*(\d+)px/)
    const size = sizeMatch ? sizeMatch[1] : '200'
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(processedData)}`
    return `<img${before}${middle}src="${qrCodeUrl}" data-qr-data="${processedData}"${after}>`
  })
  
  // Traiter les codes-barres avec variables dynamiques
  result = result.replace(/<img([^>]*?)class="barcode-dynamic"([^>]*?)data-barcode-data="([^"]*)"([^>]*?)data-barcode-type="([^"]*)"([^>]*?)>/g, (match, before, middle1, data, middle2, type, after) => {
    let processedData = data
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      processedData = processedData.replace(regex, String(value))
    })
    // Extraire la largeur et hauteur depuis le style
    const widthMatch = match.match(/max-width:\s*(\d+)px/)
    const heightMatch = match.match(/height:\s*(\d+)px/)
    const width = widthMatch ? widthMatch[1] : '200'
    const height = heightMatch ? heightMatch[1] : '50'
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(processedData)}&code=${type}&dpi=96&dataseparator=`
    return `<img${before}${middle1}src="${barcodeUrl}" data-barcode-data="${processedData}"${middle2}data-barcode-type="${type}"${after}>`
  })
  
  // Les logos sont maintenant traités dans processLogos AVANT l'appel à cette fonction
  
  // Remplacer les variables restantes dans le texte
  // Utiliser un ordre de remplacement pour éviter les conflits
  // D'abord les variables longues, puis les courtes
  // EXCLURE COMPLÈTEMENT les variables de logo car elles sont déjà traitées dans processLogos
  const logoKeys = ['ecole_logo', 'organization_logo', 'organisation_logo']
  // Variables autorisées à injecter du HTML brut (généré côté serveur/app)
  // Exemple: lignes de modules (tableaux) pour devis/factures, lignes étudiants pour rapports.
  const rawHtmlKeys = ['modules_lignes', 'modules_lignes_facture', 'students_table_rows']
  const sortedKeys = Object.keys(variables)
    .filter(key => !logoKeys.includes(key)) // Exclure les variables de logo
    .sort((a, b) => b.length - a.length)
  
  sortedKeys.forEach((key) => {
    const value = variables[key]
    
    // Remplacer {variable} dans le HTML même si la valeur est null/undefined (remplacer par chaîne vide)
    // Utiliser un pattern qui ne capture que les variables complètes (pas dans les mots)
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\{${escapedKey}\\}`, 'g')
    const replacement = (value === null || value === undefined)
      ? ''
      : rawHtmlKeys.includes(key)
        ? sanitizeDocumentTemplate(String(value))
        : String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;')
    
    // Remplacer toutes les occurrences sauf celles dans data-logo-var
    result = result.replace(regex, (match, offset) => {
      // Vérifier le contexte autour de la correspondance
      const before = result.substring(Math.max(0, offset - 100), offset)
      const after = result.substring(offset + match.length, Math.min(result.length, offset + match.length + 100))
      
      // Si on trouve "data-logo-var" dans le contexte avant ou après, ne pas remplacer
      if (before.includes('data-logo-var') || after.includes('data-logo-var')) {
        return match
      }
      
      return replacement
    })
  })
  
  // Étape finale : supprimer toutes les balises {variable} restantes qui n'ont pas été remplacées
  // Cela garantit qu'aucune balise ne reste dans le document final
  result = result.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g, (match) => {
    // Vérifier si c'est une balise conditionnelle (IF, ELSE, ENDIF)
    const variableName = match.slice(1, -1)
    if (variableName === 'IF' || variableName === 'ELSE' || variableName === 'ENDIF') {
      return match
    }
    // Supprimer toutes les autres balises non remplacées
    return ''
  })
  
  // Nettoyer les conditionnels JSX mal formés qui pourraient rester
  // Supprimer les patterns {variable && qui n'ont pas été traités
  result = result.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\s+&&\s+[^}]*\}/g, '')
  
  return result
}

export interface HTMLGenerationResult {
  html: string
  pageCount: number
}

/**
 * Génère un document HTML à partir d'un template
 */
export async function generateHTML(
  template: DocumentTemplate,
  variables: DocumentVariables,
  documentId?: string,
  organizationId?: string
): Promise<HTMLGenerationResult> {
  try {
    logger.debug('[HTML Generator] Début génération', { template: template.name, type: template.type })
    
    // Récupérer le contenu HTML du template
  // Le contenu peut être dans content.html ou content.elements[0].content ou content.elements[0].html
  // Ou le template.content peut être directement une chaîne
  let content = ''
  if (template.content) {
    // Si template.content est directement une chaîne
    if (typeof template.content === 'string') {
      content = template.content
    } else {
      const contentData = template.content as any
      logger.debug('[HTML Generator] Template content structure:', {
        hasHtml: !!contentData.html,
        htmlLength: contentData.html?.length || 0,
        hasElements: !!contentData.elements,
        elementsCount: contentData.elements?.length || 0,
      })
      
      if (contentData.html) {
        content = contentData.html
      } else if (contentData.elements && Array.isArray(contentData.elements) && contentData.elements.length > 0) {
        // Si le contenu est dans les éléments, extraire le HTML de chaque élément
        // Le contenu peut être dans el.content ou el.html selon la structure du template
        content = contentData.elements
          .map((el: any) => {
            return el.content || el.html || el.text || el.value || ''
          })
          .filter((c: string) => c && c.trim())
          .join('\n')
        
        // Si toujours vide après extraction, logger la structure complète pour déboguer
        if (!content || content.trim().length === 0) {
          logger.warn('[HTML Generator] Content still empty after extraction', { fullElements: JSON.stringify(contentData.elements, null, 2) })
        }
      }
    }
  } else {
    logger.warn('[HTML Generator] Template content is null or undefined')
  }
  
  // Si le contenu est toujours vide, utiliser une chaîne vide par défaut
  if (!content || content.trim().length === 0) {
    logger.warn('[HTML Generator] Template content is empty after extraction', {
      template: {
        id: template.id,
        type: template.type,
        name: template.name,
      },
    })
    content = ''
  }
  
  // Aplatir les variables imbriquées pour compatibilité (nécessaire pour générer l'en-tête/bas de page)
  const flattenedVariablesForHeaderFooter = flattenVariables(variables)
  
  // Récupérer le layout global si disponible, sinon utiliser le template spécifique
  let headerContent = (template.header as any)?.content || ''
  // FORCER l'utilisation du footer propre avec uniquement les 3 lignes essentielles
  // Ignorer complètement le footer du template en base de données pour éviter le contenu parasité
  let footerContent = `
    <div style="border-top: 1px solid #E5E7EB; padding: 12px 0 8px 0; margin-top: 25px; background-color: #FAFAFA;">
      <p style="font-size: 9pt; color: #1A1A1A; margin: 0; text-align: center; font-weight: 500; line-height: 1.4;">
        {ecole_nom} | {ecole_adresse} {ecole_ville} {ecole_code_postal} | Numéro SIRET: {ecole_siret}
      </p>
      <p style="font-size: 8pt; color: #666; margin: 4px 0 0 0; text-align: center; line-height: 1.3;">
        Numéro de déclaration d'activité: {ecole_numero_declaration} <em>(auprès du préfet de région de: {ecole_region})</em>
      </p>
      <p style="font-size: 8pt; color: #888; font-style: italic; margin: 3px 0 0 0; text-align: center; line-height: 1.3;">
        Cet enregistrement ne vaut pas l'agrément de l'État.
      </p>
    </div>
  `
  
  let headerEnabled = template.header_enabled ?? true
  let footerEnabled = template.footer_enabled ?? true
  let headerHeight = (template.header as any)?.height || template.header_height || 30
  let footerHeight = (template.footer as any)?.height || template.footer_height || 20
  // Header uniquement sur la première page, footer sur toutes les pages
  let headerRepeatOnAllPages = false
  let footerRepeatOnAllPages = true

  // Sanitisation anti-XSS avant envoi à Gotenberg/Puppeteer (audit pré-lancement)
  content = sanitizeDocumentTemplate(content)
  headerContent = sanitizeDocumentTemplate(headerContent)
  footerContent = sanitizeDocumentTemplate(footerContent)
  
  // Note: Le layout global est désactivé pour éviter les erreurs d'import côté client
  // Cette fonctionnalité peut être réactivée si nécessaire en créant une API route dédiée
  // if (organizationId && typeof window === 'undefined') {
  //   try {
  //     const module = await import('@/lib/services/global-document-layout.service')
  //     const service = module.globalDocumentLayoutService
  //     const globalLayout = await service.getActiveLayout(organizationId) as any
  //     if (globalLayout) {
  //       if (globalLayout.header_enabled && globalLayout.header_content) {
  //         headerContent = globalLayout.header_content
  //         headerEnabled = true
  //         headerHeight = globalLayout.header_height
  //         if (globalLayout.header_logo_url) {
  //           headerContent = `<img src="${globalLayout.header_logo_url}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;" />${headerContent}`
  //         }
  //         if (globalLayout.header_image_url) {
  //           headerContent = `${headerContent}<img src="${globalLayout.header_image_url}" alt="Header Image" style="max-width: 100%; margin-top: 10px;" />`
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     logger.warn('Erreur lors de la récupération du layout global:', error)
  //   }
  // }

  // Si l'en-tête est vide ou désactivé mais qu'on veut un en-tête par défaut, générer un en-tête professionnel
  if (headerEnabled && (!headerContent || headerContent.trim().length === 0)) {
    headerContent = generateProfessionalHeader(flattenedVariablesForHeaderFooter)
  }

  // Le footer est déjà défini proprement ci-dessus avec uniquement les 3 lignes essentielles
  // Pas besoin de générer un footer par défaut

  // Aplatir les variables imbriquées pour compatibilité
  const flattenedVariables = flattenVariables(variables)

  // Traiter dans l'ordre : logos -> tableaux dynamiques -> boucles -> conditions -> visibilité -> variables calculées -> variables imbriquées -> remplacement de variables
  let processedHeader = headerContent
  let processedContent = content
  let processedFooter = footerContent

  // 0. NETTOYAGE PRÉLIMINAIRE : Remplacer {ecole_logo} et autres variables de logo par des balises img AVANT le traitement
  // Remplacer {ecole_logo}, {organization_logo}, {organisation_logo} par des balises img avec data-logo-var
  // Seulement si la variable existe et n'est pas vide
  const logoVariablePatterns = ['ecole_logo', 'organization_logo', 'organisation_logo']
  logoVariablePatterns.forEach(key => {
    const pattern = new RegExp(`\\{${key}\\}`, 'g')
    if (processedHeader.includes(`{${key}}`)) {
      const logoValue = flattenedVariables[key]
      if (logoValue && String(logoValue).trim()) {
        processedHeader = processedHeader.replace(
          pattern,
          `<img alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" data-logo-var="{${key}}" />`
        )
      } else {
        processedHeader = processedHeader.replace(pattern, '')
      }
    }
  })
  
  const logoUrlPatterns = ['ecole_logo', 'organization_logo', 'organisation_logo'].map(key => {
    const logoValue = flattenedVariables[key]
    return logoValue && typeof logoValue === 'string' && logoValue.includes('supabase.co') ? { key, url: logoValue } : null
  }).filter(Boolean) as Array<{key: string, url: string}>
  
  logoUrlPatterns.forEach(({ key, url }) => {
    // Chercher toutes les occurrences de l'URL dans le header (pas dans un attribut src)
    let searchIndex = 0
    const urlLength = url.length
    const replacements: Array<{start: number, end: number, key: string}> = []
    
    while ((searchIndex = processedHeader.indexOf(url, searchIndex)) !== -1) {
      const before = processedHeader.substring(Math.max(0, searchIndex - 300), searchIndex)
      const after = processedHeader.substring(searchIndex + urlLength, Math.min(processedHeader.length, searchIndex + urlLength + 100))
      
      // Vérifier si on est dans un attribut src="..." ou href="..."
      const isInSrc = /src\s*=\s*"[^"]*$/.test(before)
      const isInHref = /href\s*=\s*"[^"]*$/.test(before)
      
      if (!isInSrc && !isInHref) {
        replacements.push({ start: searchIndex, end: searchIndex + urlLength, key })
      }
      
      searchIndex += urlLength
    }
    
    // Remplacer les URLs en ordre inverse (pour éviter les problèmes d'offset)
    for (let i = replacements.length - 1; i >= 0; i--) {
      const { start, end, key: logoKey } = replacements[i]
      // Remplacer l'URL par une balise img avec data-logo-var
      const imgTag = `<img alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" data-logo-var="{${logoKey}}" />`
      processedHeader = processedHeader.substring(0, start) + imgTag + processedHeader.substring(end)
    }
  })
  
  // 0.5. Traiter les logos (remplacer data-logo-var par le src de l'image en base64)
  try {
    processedHeader = await processLogos(processedHeader, flattenedVariables)
  } catch (logoError) {
    logger.error('[HTML Generator] Erreur lors du traitement des logos dans le header:', logoError)
    // Continuer même si le traitement du logo échoue
    if (logoError instanceof Error) {
      logger.error('[HTML Generator] Message:', logoError.message)
      logger.error('[HTML Generator] Stack:', logoError.stack)
    }
  }
  try {
    processedContent = await processLogos(processedContent, flattenedVariables)
  } catch (logoError) {
    logger.error('[HTML Generator] Erreur lors du traitement des logos dans le content:', logoError)
  }
  try {
    processedFooter = await processLogos(processedFooter, flattenedVariables)
  } catch (logoError) {
    logger.error('[HTML Generator] Erreur lors du traitement des logos dans le footer:', logoError)
  }

  // 1. Traiter les tableaux dynamiques (doit être avant les boucles pour éviter les conflits)
  processedHeader = processDynamicTables(processedHeader, flattenedVariables)
  processedContent = processDynamicTables(processedContent, flattenedVariables)
  processedFooter = processDynamicTables(processedFooter, flattenedVariables)

  // 2. Traiter les boucles (FOR/WHILE)
  processedHeader = processLoops(processedHeader, flattenedVariables)
  processedContent = processLoops(processedContent, flattenedVariables)
  processedFooter = processLoops(processedFooter, flattenedVariables)

  // 3. Traiter les conditions (IF/ELSE)
  processedHeader = evaluateConditionalContent(processedHeader, flattenedVariables)
  processedContent = evaluateConditionalContent(processedContent, flattenedVariables)
  processedFooter = evaluateConditionalContent(processedFooter, flattenedVariables)

  // 4. Traiter la visibilité conditionnelle (SHOW_IF/HIDE_IF)
  processedHeader = processElementVisibility(processedHeader, flattenedVariables)
  processedContent = processElementVisibility(processedContent, flattenedVariables)
  processedFooter = processElementVisibility(processedFooter, flattenedVariables)

  // 5. Traiter les variables calculées (SUM, AVERAGE, etc.)
  processedHeader = processCalculatedVariables(processedHeader, flattenedVariables)
  processedContent = processCalculatedVariables(processedContent, flattenedVariables)
  processedFooter = processCalculatedVariables(processedFooter, flattenedVariables)

  // 6. Traiter les variables imbriquées (object.property, array[index])
  processedHeader = processNestedVariables(processedHeader, flattenedVariables)
  processedContent = processNestedVariables(processedContent, flattenedVariables)
  processedFooter = processNestedVariables(processedFooter, flattenedVariables)

  // 7. Traiter les liens hypertextes dynamiques (LINK, EMAIL, PHONE, SMS)
  processedHeader = processDynamicHyperlinks(processedHeader, flattenedVariables)
  processedContent = processDynamicHyperlinks(processedContent, flattenedVariables)
  processedFooter = processDynamicHyperlinks(processedFooter, flattenedVariables)

  // 8. Traiter les signatures électroniques
  processedHeader = await processSignatures(processedHeader, flattenedVariables, documentId)
  processedContent = await processSignatures(processedContent, flattenedVariables, documentId)
  processedFooter = await processSignatures(processedFooter, flattenedVariables, documentId)

  // 9. Traiter les pièces jointes dynamiques
  processedHeader = await processAttachments(processedHeader, flattenedVariables, documentId)
  processedContent = await processAttachments(processedContent, flattenedVariables, documentId)
  processedFooter = await processAttachments(processedFooter, flattenedVariables, documentId)

  // 10. Remplacer les variables simples
  processedHeader = replaceVariablesInHTML(processedHeader, flattenedVariables)
  processedContent = replaceVariablesInHTML(processedContent, flattenedVariables)
  processedFooter = replaceVariablesInHTML(processedFooter, flattenedVariables)
  
  // 10.5. Nettoyage final : supprimer toutes les balises {variable} restantes qui n'ont pas été remplacées
  // Cela garantit qu'aucune balise ne reste dans le document final
  const cleanRemainingTags = (html: string): string => {
    return html.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g, (match) => {
      // Vérifier si c'est une balise conditionnelle (IF, ELSE, ENDIF)
      const variableName = match.slice(1, -1)
      if (variableName === 'IF' || variableName === 'ELSE' || variableName === 'ENDIF') {
        return match
      }
      // Supprimer toutes les autres balises non remplacées
      return ''
    })
  }
  
  processedHeader = cleanRemainingTags(processedHeader)
  processedContent = cleanRemainingTags(processedContent)
  processedFooter = cleanRemainingTags(processedFooter)

  // 11. Traiter les champs de formulaire interactifs (doit être après le remplacement des variables)
  processedHeader = processFormFields(processedHeader, flattenedVariables)
  processedContent = processFormFields(processedContent, flattenedVariables)
  processedFooter = processFormFields(processedFooter, flattenedVariables)
  
  // 12. FORCER le footer propre : reconstruire systématiquement avec uniquement les 3 lignes essentielles
  // FAIRE CELA EN DERNIER pour éviter que tout traitement ultérieur n'ajoute du contenu indésirable
  // Ignorer complètement tout contenu du template ou du globalLayout qui pourrait être parasité
  processedFooter = `
    <div style="padding: 12px 0 8px 0; margin-top: 25px; background-color: #FAFAFA; font-family: 'Times New Roman', Times, serif;">
      <p style="font-size: 8pt; font-family: 'Times New Roman', Times, serif; color: #1A1A1A; margin: 0; text-align: center; font-weight: 500; line-height: 1.4;">
        ${flattenedVariables.ecole_nom || flattenedVariables.organization_name || ''} | ${flattenedVariables.ecole_adresse || flattenedVariables.organization_address || ''} ${flattenedVariables.ecole_ville || ''} ${flattenedVariables.ecole_code_postal || ''} | Numéro SIRET: ${flattenedVariables.ecole_siret || ''}
      </p>
      <p style="font-size: 8pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 4px 0 0 0; text-align: center; line-height: 1.3;">
        Numéro de déclaration d'activité: ${flattenedVariables.ecole_numero_declaration || ''} <em>(auprès du préfet de région de: ${flattenedVariables.ecole_region || ''})</em>
      </p>
      <p style="font-size: 8pt; font-family: 'Times New Roman', Times, serif; color: #888; font-style: italic; margin: 3px 0 0 0; text-align: center; line-height: 1.3;">
        Cet enregistrement ne vaut pas l'agrément de l'État.
      </p>
    </div>
  `

  // Construire le HTML complet avec styles optimisés pour PDF
  const pageSize = (template.content as any)?.pageSize || template.page_size || 'A4'
  // Marges fixes strictes : 20mm de chaque côté pour un rendu professionnel et symétrique
  const defaultMargins = { top: 20, right: 20, bottom: 20, left: 20 }
  const margins = template.margins || defaultMargins
  
  // S'assurer que toutes les marges sont définies (forcer à 20mm pour la symétrie)
  const finalMargins = {
    top: margins.top ?? defaultMargins.top,
    right: 20, // Force 20mm à droite pour symétrie
    bottom: margins.bottom ?? defaultMargins.bottom,
    left: 20, // Force 20mm à gauche pour symétrie
  }
  
  // Convertir les marges en pixels (1mm ≈ 3.78px à 96 DPI)
  const marginTopPx = finalMargins.top * 3.78
  const marginBottomPx = finalMargins.bottom * 3.78
  const marginLeftPx = finalMargins.left * 3.78
  const marginRightPx = finalMargins.right * 3.78
  
  // Convertir les hauteurs d'en-tête et de pied de page en pixels
  const headerHeightPx = headerHeight * 3.78
  const footerHeightPx = footerHeight * 3.78
  
  // Dimensions A4 en pixels (210mm x 297mm à 96 DPI)
  const pageWidthPx = 794 // 210mm
  const pageHeightPx = 1123 // 297mm
  
  // Largeur du conteneur central : A4 (210mm) - marges gauche (20mm) - marges droite (20mm) = 170mm
  // En pixels : 170mm * 3.78 = 642.6px (arrondi à 643px pour précision)
  // Cette largeur fixe garantit un centrage parfait avec margin: 0 auto
  const contentWidthPx = Math.round(170 * 3.78) // 643px exactement
  
  // Calculer la hauteur disponible pour le contenu
  // Si le header ne se répète pas sur toutes les pages, il n'occupe de l'espace que sur la première page
  // Le header est dans la marge via @top-center, donc le contenu commence juste après (sans marge supplémentaire)
  const contentTopPxFirstPage = headerEnabled ? headerHeightPx : marginTopPx
  const contentBottomPx = footerEnabled ? (marginBottomPx + footerHeightPx + 5) : marginBottomPx
  const contentHeightPx = pageHeightPx - contentTopPxFirstPage - contentBottomPx

  const { APP_URLS } = await import('@/lib/config/app-config')
  const pagedScriptUrl = `${APP_URLS.getBaseUrl()}/paged.polyfill.js`

  const fullHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.name || 'Document'}</title>
  <script src="${pagedScriptUrl}"></script>
  <style>
    /* Paged.js - Définition de la page physique A4 avec marges fixes strictes */
    @page {
      size: A4;
      margin-top: ${finalMargins.top}mm;
      margin-bottom: ${footerEnabled ? footerHeight + 5 : finalMargins.bottom}mm;
      margin-left: ${finalMargins.left}mm;
      margin-right: ${finalMargins.right}mm;
      
      /* Footer sur toutes les pages */
      ${footerEnabled ? `@bottom-center {
        content: element(footerEnv);
      }` : ''}
    }
    @page:first {
      margin-top: ${headerEnabled ? headerHeight : finalMargins.top}mm;
      margin-bottom: ${footerEnabled ? footerHeight + 5 : finalMargins.bottom}mm;
      margin-left: ${finalMargins.left}mm;
      margin-right: ${finalMargins.right}mm;
      
      /* Header uniquement sur la première page */
      ${headerEnabled ? `@top-center {
        content: element(headerEnv);
      }` : ''}
      ${footerEnabled ? `@bottom-center {
        content: element(footerEnv);
      }` : ''}
    }
    
    /* Style de l'En-tête HTML - Extrait du flux normal */
    ${headerEnabled ? `.document-header {
      position: running(headerEnv);
      width: 100%;
      background: #ffffff;
      padding: 0;
      margin: 0;
      box-sizing: border-box;
      font-size: ${(template.font_size || 10) * 0.85}pt;
      line-height: 1.2;
    }` : ''}
    
    /* Style du Pied de page HTML - Extrait du flux normal */
    ${footerEnabled ? `.document-footer {
      position: running(footerEnv);
      width: 100%;
      background: #ffffff;
      padding: 5px 0;
      margin: 0;
      box-sizing: border-box;
      font-size: ${(template.font_size || 10) * 0.85}pt;
      line-height: 1.2;
      text-align: center;
      border-top: 1px solid #E5E7EB;
    }` : ''}
    
    /* Le contenu principal */
    .document-content {
      font-family: 'Arial', sans-serif;
      line-height: 1.5;
      padding: 0;
      margin: 0;
      width: 100%;
      box-sizing: border-box;
      ${headerEnabled ? `margin-top: 0 !important;` : ''}
    }
    
    /* Styles existants */
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: auto;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: ${template.font_size || 10}pt;
      line-height: 1.4;
      color: #000;
      background: #ffffff;
      min-height: ${pageHeightPx}px;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box;
    }
    /* Conteneur principal : occupe toute la largeur disponible (les marges sont gérées par @page) */
    .document-container {
      width: 100%;
      max-width: 100%;
      min-height: ${pageHeightPx}px;
      height: auto;
      background: #ffffff;
      position: relative;
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      overflow: visible;
    }
    .header * {
      max-height: ${headerHeightPx - 10}px !important;
      overflow: visible !important;
    }
    .header img {
      max-height: ${headerHeightPx * 0.6}px !important;
      width: auto !important;
    }
    /* Note: Le header sera visible uniquement sur la première page lors de la génération PDF
       si repeatOnAllPages est false, car html2canvas capture le document en une seule fois */
    .content {
      position: relative;
      top: auto;
      bottom: auto;
      width: 100%;
      max-width: 100%;
      min-height: ${contentHeightPx}px;
      max-height: none;
      background: #ffffff;
      overflow: visible;
      padding: 0 0 ${footerEnabled ? (footerHeightPx + marginBottomPx + 20) : 20}px 0;
      margin-top: ${headerEnabled ? 0 : marginTopPx}px;
      margin-left: 0;
      margin-right: 0;
      margin-bottom: 0;
      box-sizing: border-box;
      z-index: 1;
    }
    .footer * {
      max-height: ${footerHeightPx - 10}px !important;
      overflow: visible !important;
    }
    .footer img {
      max-height: ${footerHeightPx * 0.6}px !important;
      width: auto !important;
    }
    /* Styles pour les tableaux */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      table-layout: auto;
      border-spacing: 0;
      font-size: ${(template.font_size || 10) * 0.9}pt;
    }
    table th, table td {
      padding: 4px 6px;
      text-align: left;
      word-wrap: break-word;
      overflow-wrap: break-word;
      vertical-align: top;
    }
    /* Bordures par défaut uniquement si aucune bordure personnalisée n'est définie */
    table th:not([data-border-top]):not([style*="border"]),
    table td:not([data-border-top]):not([style*="border"]) {
      border: 1px solid #000;
    }
    /* Respecter les bordures invisibles (none, 0px) */
    table th[data-border-top="none"], table td[data-border-top="none"],
    table th[data-border-top="0px"], table td[data-border-top="0px"],
    table th[style*="border-top: none"], table td[style*="border-top: none"],
    table th[style*="border-width: 0"], table td[style*="border-width: 0"],
    table th[style*="border-style: none"], table td[style*="border-style: none"],
    table th[style*="border-style: initial"], table td[style*="border-style: initial"] {
      border-top: none !important;
    }
    table th[data-border-bottom="none"], table td[data-border-bottom="none"],
    table th[data-border-bottom="0px"], table td[data-border-bottom="0px"] {
      border-bottom: none !important;
    }
    table th[data-border-left="none"], table td[data-border-left="none"],
    table th[data-border-left="0px"], table td[data-border-left="0px"] {
      border-left: none !important;
    }
    table th[data-border-right="none"], table td[data-border-right="none"],
    table th[data-border-right="0px"], table td[data-border-right="0px"] {
      border-right: none !important;
    }
    /* Gérer les cellules avec toutes les bordures désactivées */
    table th[style*="border-width: 0px"], table td[style*="border-width: 0px"],
    table th[style*="border-width:0"], table td[style*="border-width:0"] {
      border: none !important;
    }
    table th[style*="border: none"], table td[style*="border: none"],
    table th[style*="border:none"], table td[style*="border:none"] {
      border: none !important;
    }
    table th {
      font-weight: bold;
      font-size: ${(template.font_size || 10) * 0.9}pt;
    }
    /* Images */
    img {
      max-width: 100%;
      height: auto;
      display: block;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
    /* Préserver les flexbox */
    [style*="display: flex"], [style*="display:flex"] {
      display: flex !important;
    }
    /* Préserver les gradients et couleurs */
    [style*="gradient"], [style*="background"] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    /* Assurer que les bordures sont visibles (sauf si explicitement masquées) */
    [style*="border"]:not([style*="border: none"]):not([style*="border-width: 0"]):not([style*="border-style: none"]):not([style*="border-style: initial"]) {
      border-style: solid;
    }
    /* Préserver les espacements */
    p, div, span {
      margin: 0;
      padding: 0;
    }
    p {
      margin-bottom: 0.5em;
      font-size: ${template.font_size || 10}pt;
      line-height: 1.4;
    }
    h1 {
      font-size: ${(template.font_size || 10) * 1.6}pt;
      line-height: 1.3;
      margin-bottom: 8px;
      margin-top: 12px;
    }
    h2 {
      font-size: ${(template.font_size || 10) * 1.4}pt;
      line-height: 1.3;
      margin-bottom: 6px;
      margin-top: 10px;
    }
    h3 {
      font-size: ${(template.font_size || 10) * 1.2}pt;
      line-height: 1.3;
      margin-bottom: 4px;
      margin-top: 8px;
    }
    /* Surlignage - préserver les couleurs de fond du texte */
    mark, mark[style] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      padding: 0 2px;
      border-radius: 2px;
    }
    /* Alignement justifié */
    [style*="text-align: justify"], [style*="text-align:justify"] {
      text-align: justify !important;
      text-justify: inter-word;
    }
    /* Interligne personnalisée */
    [style*="line-height"] {
      line-height: inherit !important;
    }
    /* Cellules de tableau avec couleurs */
    td[style*="background-color"], th[style*="background-color"],
    td[data-background-color], th[data-background-color] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    /* Bordures de cellules personnalisées */
    td[style*="border-color"], th[style*="border-color"],
    td[data-border-color], th[data-border-color] {
      border-style: solid !important;
    }
    /* Retrait de paragraphe */
    [style*="text-indent"] {
      text-indent: inherit !important;
    }
    /* Marges de paragraphe */
    [style*="margin-top"], [style*="margin-bottom"] {
      margin-top: inherit !important;
      margin-bottom: inherit !important;
    }
    /* Réduire les espacements généraux */
    .header {
      margin-bottom: 12px !important;
    }
    .footer {
      padding-top: 12px !important;
    }
    /* Header uniquement sur la première page si repeatOnAllPages est false */
    .header-first-page-only {
      display: block !important;
    }
    /* Footer toujours visible sur toutes les pages */
    .footer {
      display: block !important;
    }
  </style>
</head>
<body>
  <div class="document-container" id="${documentId || `${template.type}-document`}">
    ${headerEnabled ? `<header class="document-header">${processedHeader}</header>` : ''}
    ${footerEnabled && processedFooter ? `<footer class="document-footer">${processedFooter}</footer>` : ''}
    <main class="document-content">
      <div class="content">
        ${processedContent}
      </div>
    </main>
  </div>
  <script>
    // Attendre que Paged.js ait fini le calcul du rendu
    if (typeof window !== 'undefined' && window.PagedPolyfill) {
      window.addEventListener('pagedjsReady', function() {
        window.pagedjs_finished = true;
      });
    }
  </script>
</body>
</html>
  `.trim()

    // Estimer le nombre de pages (approximatif)
    const pageCount = Math.max(1, Math.ceil(processedContent.length / 3000))

    logger.debug('[HTML Generator] HTML généré', { lengthKo: Math.round(fullHTML.length / 1024), pages: pageCount })

    return {
      html: fullHTML,
      pageCount,
    }
  } catch (error) {
    logger.error('[HTML Generator] ❌ ERREUR lors de la génération HTML:', error)
    if (error instanceof Error) {
      logger.error('[HTML Generator] Message:', error.message)
      logger.error('[HTML Generator] Stack:', error.stack)
      logger.error('[HTML Generator] Name:', error.name)
    }
    // Logger aussi le template et les variables pour déboguer
    logger.error('[HTML Generator] Template info:', {
      id: template?.id,
      type: template?.type,
      name: template?.name,
      headerLength: template?.header ? (typeof (template.header as any) === 'string' ? (template.header as any).length : JSON.stringify(template.header as any).length) : 0,
    })
    logger.error('[HTML Generator] Variables keys:', Object.keys(variables || {}).slice(0, 20))
    throw error
  }
}



