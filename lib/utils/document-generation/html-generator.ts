/**
 * Générateur HTML pour documents
 */

import type {
  DocumentContent,
  DocumentTemplate,
  DocumentVariables,
  HeaderConfig,
  FooterConfig,
  TemplateElement,
} from '@/lib/types/document-templates'
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
import { sanitizeDocumentTemplate, escapeHtml } from '@/lib/utils/sanitize-html'
// Note: getGlobalDocumentLayout est importé dynamiquement pour éviter les erreurs côté client

/**
 * Génère un en-tête professionnel basé sur les informations de l'organisation
 * Style Premium inspiré de INSSI FORMATION :
 * - Informations de l'organisme à gauche
 * - Logo à droite
 * - Ligne de séparation en bas (2px solid noir)
 */
/** Map de variables (DocumentVariables ou sortie de flattenVariables) */
type VariablesMap = Record<string, string | number | boolean | undefined>

function generateProfessionalHeader(variables: VariablesMap): string {
  const str = (v: string | number | boolean | undefined) => String(v ?? '')
  const orgName = escapeHtml(str(variables.ecole_nom || variables.organization_name))
  const orgAddress = escapeHtml(str(variables.ecole_adresse || variables.organization_address))
  const orgPostalCode = escapeHtml(str(variables.ecole_code_postal))
  const orgCity = escapeHtml(str(variables.ecole_ville))
  const orgEmail = escapeHtml(str(variables.ecole_email || variables.organization_email))
  const orgPhone = escapeHtml(str(variables.ecole_telephone || variables.organization_phone))
  const orgLogo = str(variables.ecole_logo || variables.organization_logo)

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
        <img src="${escapeHtml(orgLogo)}" alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" />
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
function generateProfessionalFooter(variables: VariablesMap, pageNumber?: number, totalPages?: number): string {
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
async function processLogos(html: string, variables: VariablesMap): Promise<string> {
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
          const cleanedAttrs = allAttrs
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
function replaceVariablesInHTML(html: string, variables: VariablesMap): string {
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
  // Exemple: lignes de modules (tableaux) pour devis/factures, champs rich-text TipTap des programmes.
  const rawHtmlKeys = [
    'modules_lignes', 'modules_lignes_facture', 'students_table_rows',
    // Champs rich-text des programmes (stockés en HTML par TipTap)
    'programme_objectifs', 'programme_profil_apprenants', 'programme_public_concerne',
    'programme_contenu', 'programme_suivi_execution', 'programme_modalites_certification',
    'programme_certification', 'programme_qualite', 'programme_description',
    'programme_methodes_pedagogiques', 'programme_prerequis', 'programme_accessibilite',
    'programme_domaines_competences',
    // Champs rich-text des formations
    'formation_objectifs', 'formation_contenu', 'formation_qualite_et_resultats',
  ]
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
  headerHtml?: string
  footerHtml?: string
  margins: { top: number; right: number; bottom: number; left: number }
  headerHeight: number
  footerHeight: number
  headerEnabled: boolean
  footerEnabled: boolean
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
      const contentData = template.content as DocumentContent
      logger.debug('[HTML Generator] Template content structure:', {
        hasHtml: !!contentData.html,
        htmlLength: contentData.html?.length || 0,
        hasElements: !!contentData.elements,
        elementsCount: contentData.elements?.length || 0,
      })

      if (contentData.html) {
        content = contentData.html
      } else if (contentData.elements?.length) {
        type ElementWithContent = TemplateElement & { html?: string; text?: string; value?: string }
        content = contentData.elements
          .map((el: ElementWithContent) => {
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

  // Utiliser le template TEL QU'IL EST configuré dans la base de données.
  // Fallback sur les modèles prédéfinis uniquement si le contenu DB est vide.
  const rawType = (template.type ?? '').toString().toLowerCase()
  const normalizedType: import('@/lib/types/document-templates').DocumentType =
    rawType === 'quote' ? 'devis'
    : rawType === 'invoice' ? 'facture'
    : (rawType as import('@/lib/types/document-templates').DocumentType)

  if (!content || content.trim().length === 0) {
    try {
      const { getDefaultTemplateContent } = await import('@/lib/utils/document-template-defaults')
      const defaultForType = getDefaultTemplateContent(normalizedType)
      if (defaultForType?.bodyContent?.trim()) {
        content = defaultForType.bodyContent
        logger.debug('[HTML Generator] Fallback sur template prédéfini (contenu DB vide)', { type: normalizedType })
      }
    } catch { /* ignore */ }
  }

  type HeaderFooterWithContent = (HeaderConfig | FooterConfig) & { content?: string }
  let headerContent = (template.header as HeaderFooterWithContent | null)?.content || ''
  let footerContent = (template.footer as HeaderFooterWithContent | null)?.content || ''

  // Fallback sur les modèles prédéfinis si header/footer vides
  if (!headerContent.trim() || !footerContent.trim()) {
    try {
      const { getDefaultTemplateContent } = await import('@/lib/utils/document-template-defaults')
      const defaultForType = getDefaultTemplateContent(normalizedType)
      if (!headerContent.trim() && defaultForType?.headerContent?.trim()) {
        headerContent = defaultForType.headerContent
      }
      if (!footerContent.trim() && defaultForType?.footerContent?.trim()) {
        footerContent = defaultForType.footerContent
      }
    } catch { /* ignore */ }
  }

  // Si toujours pas de footer, utiliser un footer par défaut avec variables
  if (!footerContent.trim()) {
    footerContent = `
      <p style="font-size: 7pt; color: #1A1A1A; margin: 0; text-align: center; line-height: 1.3;">
        {ecole_nom} | {ecole_adresse} {ecole_ville} {ecole_code_postal} | SIRET: {ecole_siret}
      </p>
      <p style="font-size: 6.5pt; color: #666; margin: 2px 0 0 0; text-align: center; line-height: 1.2;">
        Déclaration d'activité: {ecole_numero_declaration} <em>(préfet de région: {ecole_region})</em> — Cet enregistrement ne vaut pas agrément de l'État.
      </p>
    `
  }

  // Utiliser les paramètres du template tels que configurés
  const headerEnabled = template.header_enabled ?? true
  const footerEnabled = template.footer_enabled ?? true
  const headerHeight = (template.header as HeaderFooterWithContent | null)?.height ?? template.header_height ?? 30
  const footerHeight = (template.footer as HeaderFooterWithContent | null)?.height ?? template.footer_height ?? 20
  const templateMargins = template.margins || { top: 20, right: 20, bottom: 20, left: 20 }

  // Si l'en-tête est vide mais activé, générer un en-tête professionnel
  const flattenedVariablesForHeaderFooter = flattenVariables(variables)
  if (headerEnabled && (!headerContent || headerContent.trim().length === 0)) {
    headerContent = generateProfessionalHeader(flattenedVariablesForHeaderFooter)
  }

  // Pas de sanitisation côté serveur (Puppeteer) : DOMPurify/JSDOM vide le HTML

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
  
  const fontSize = template.font_size || 10

  // Tout dans le body : header + contenu + footer avec flexbox pour positionner le footer en bas
  const fullHTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${template.name || 'Document'}</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body {
    margin: 0; padding: 0; width: 100%;
    font-family: 'Times New Roman', Times, serif;
    font-size: ${fontSize}pt; line-height: 1.4;
    color: #000; background: #fff;
  }
  .page-wrapper {
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 1px);
  }
  .doc-header {
    flex-shrink: 0;
    padding-bottom: 8px;
    margin-bottom: 10px;
    border-bottom: 1px solid #999;
  }
  .doc-content {
    flex: 1;
  }
  .doc-footer {
    flex-shrink: 0;
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid #999;
  }
  table { width: 100%; border-collapse: collapse; table-layout: auto; border-spacing: 0; }
  table th, table td { padding: 4px 6px; text-align: left; vertical-align: top; }
  img { max-width: 100%; height: auto; }
  h1 { font-size: ${fontSize * 1.4}pt; margin: 0 0 8px 0; }
  h2 { font-size: ${fontSize * 1.2}pt; margin: 0 0 6px 0; }
  h3 { font-size: ${fontSize * 1.1}pt; margin: 0 0 4px 0; }
  p { margin: 0 0 4px 0; }
</style>
</head>
<body>
<div class="page-wrapper">
  ${headerEnabled && processedHeader ? `<div class="doc-header">${processedHeader}</div>` : ''}
  <div class="doc-content">${processedContent}</div>
  ${footerEnabled && processedFooter ? `<div class="doc-footer">${processedFooter}</div>` : ''}
</div>
</body>
</html>`.trim()

    const pageCount = Math.max(1, Math.ceil(processedContent.length / 3000))
    logger.debug('[HTML Generator] HTML généré', { lengthKo: Math.round(fullHTML.length / 1024), pages: pageCount })

    return {
      html: fullHTML,
      pageCount,
      headerHtml: processedHeader,
      footerHtml: processedFooter,
      margins: templateMargins,
      headerHeight,
      footerHeight,
      headerEnabled,
      footerEnabled,
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
      headerLength: template?.header ? JSON.stringify(template.header).length : 0,
    })
    logger.error('[HTML Generator] Variables keys:', Object.keys(variables || {}).slice(0, 20))
    throw error
  }
}



