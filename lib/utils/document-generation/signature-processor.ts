/**
 * Traitement des signatures dans les templates
 * 
 * Ce fichier doit être utilisé uniquement côté serveur (API routes)
 */

'use server'

import { logger } from '@/lib/utils/logger'

// Import conditionnel pour éviter les erreurs côté serveur
// Le signatureService utilise createClient() côté client, donc on l'importe dynamiquement
let signatureService: any = null
async function getSignatureService() {
  if (typeof window !== 'undefined') {
    // Côté client
    if (!signatureService) {
      const module = await import('@/lib/services/signature.service')
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      signatureService = new module.SignatureService(supabase)
    }
    return signatureService
  } else {
    // Côté serveur - utiliser le client serveur directement
    // Import dynamique pour éviter que Next.js bundler essaie de bundler next/headers côté client
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      return {
        getSignaturesByDocument: async (documentId: string) => {
          const { data, error } = await supabase
            .from('document_signatures')
            .select(`
              *,
              signer:users!document_signatures_signer_id_fkey(id, full_name, email, role)
            `)
            .eq('document_id', documentId)
            .eq('status', 'signed')
            .order('signed_at', { ascending: true })
          if (error) throw error
          return data || []
        },
      }
    } catch (error) {
      // Si l'import échoue (par exemple côté client), retourner un service vide
      console.warn('Impossible d\'importer createClient côté serveur:', error)
      return {
        getSignaturesByDocument: async () => [],
      }
    }
  }
}

/**
 * Interface pour une zone de signature dans un document
 */
export interface SignatureField {
  id: string
  type: 'signature' | 'initials' | 'date' | 'text'
  label?: string
  required?: boolean
  signerRole?: string
  signerEmail?: string
  width?: number
  height?: number
  page?: number
}

/**
 * Traite les zones de signature dans le contenu HTML
 * Recherche les balises <signature-field> et les remplace par:
 * - Les signatures réelles si disponibles (documentId fourni)
 * - Des zones vides à remplir si pas encore signées
 *
 * Format supporté:
 * <signature-field
 *   id="unique-id"
 *   type="signature|initials|date|text"
 *   label="Signature du formateur"
 *   required="true|false"
 *   signer-role="trainer|student|admin"
 *   signer-email="email@example.com"
 *   width="200"
 *   height="80"
 *   page="1"
 * />
 */
export async function processSignatures(
  html: string,
  variables: Record<string, any> = {},
  documentId?: string
): Promise<string> {
  try {
    // Regex pour trouver toutes les balises signature-field
    const signatureFieldRegex = /<signature-field\s+([^>]*?)\/>/gi

    // Extraire toutes les balises
    const matches = Array.from(html.matchAll(signatureFieldRegex))

    if (matches.length === 0) {
      return html
    }

    // Charger les signatures existantes si documentId est fourni
    let existingSignatures: any[] = []
    if (documentId) {
      try {
        const service = await getSignatureService()
        existingSignatures = await service.getSignaturesByDocument(documentId)
      } catch (error) {
        logger.warn('Erreur lors du chargement des signatures', {
          documentId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Traiter chaque balise
    let processedHtml = html
    for (const match of matches) {
      const fullTag = match[0]
      const attributes = match[1]

      // Parser les attributs
      const field = parseSignatureFieldAttributes(attributes)

      // Chercher une signature correspondante
      const existingSignature = existingSignatures.find(sig => {
        // Correspondance par rôle ou email
        if (field.signerRole && sig.signer_role === field.signerRole) return true
        if (field.signerEmail && sig.signer_email === field.signerEmail) return true
        return false
      })

      // Générer le HTML de remplacement
      const replacementHtml = existingSignature
        ? generateSignedFieldHtml(existingSignature, field)
        : generateEmptyFieldHtml(field, variables)

      processedHtml = processedHtml.replace(fullTag, replacementHtml)
    }

    return processedHtml
  } catch (error) {
    logger.error('Erreur lors du traitement des signatures', error instanceof Error ? error : new Error(String(error)), {
      documentId,
    })
    // En cas d'erreur, retourner le HTML original
    return html
  }
}

/**
 * Parse les attributs d'une balise signature-field
 */
function parseSignatureFieldAttributes(attributesString: string): SignatureField {
  const attrs: Record<string, string> = {}

  // Regex pour extraire les attributs
  const attrRegex = /(\w+(?:-\w+)*)="([^"]*?)"|(\w+(?:-\w+)*)='([^']*?)'|(\w+(?:-\w+)*)=(\S+)/g

  let attrMatch
  while ((attrMatch = attrRegex.exec(attributesString)) !== null) {
    const key = attrMatch[1] || attrMatch[3] || attrMatch[5]
    const value = attrMatch[2] || attrMatch[4] || attrMatch[6]
    if (key && value) {
      attrs[key] = value
    }
  }

  return {
    id: attrs.id || `signature-${Date.now()}`,
    type: (attrs.type as any) || 'signature',
    label: attrs.label,
    required: attrs.required === 'true',
    signerRole: attrs['signer-role'],
    signerEmail: attrs['signer-email'],
    width: attrs.width ? parseInt(attrs.width) : 200,
    height: attrs.height ? parseInt(attrs.height) : 80,
    page: attrs.page ? parseInt(attrs.page) : 1,
  }
}

/**
 * Génère le HTML pour une zone de signature remplie
 */
function generateSignedFieldHtml(signature: any, field: SignatureField): string {
  const width = field.width || 200
  const height = field.height || 80

  if (field.type === 'date') {
    const signedDate = signature.signed_at
      ? new Date(signature.signed_at).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : ''
    return `
      <div class="signature-field signed" style="display: inline-block; margin: 10px 0;">
        ${field.label ? `<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${field.label}</p>` : ''}
        <div style="border: 1px solid #10b981; border-radius: 4px; padding: 8px 12px; background-color: #f0fdf4; display: inline-block;">
          <p style="margin: 0; font-size: 11pt; color: #047857; font-weight: 500;">${signedDate}</p>
        </div>
      </div>
    `
  }

  if (field.type === 'text' && signature.comment) {
    return `
      <div class="signature-field signed" style="display: inline-block; margin: 10px 0;">
        ${field.label ? `<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${field.label}</p>` : ''}
        <div style="border: 1px solid #10b981; border-radius: 4px; padding: 8px 12px; background-color: #f0fdf4; display: inline-block; min-width: ${width}px;">
          <p style="margin: 0; font-size: 11pt; color: #047857;">${signature.comment}</p>
        </div>
      </div>
    `
  }

  // Pour signature et initials, afficher l'image
  return `
    <div class="signature-field signed" style="display: inline-block; margin: 10px 0;">
      ${field.label ? `<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${field.label}</p>` : ''}
      <div style="border: 1px solid #10b981; border-radius: 4px; padding: 8px; background-color: #f0fdf4; display: inline-block;">
        <img
          src="${signature.signature_data}"
          alt="Signature de ${signature.signer_name || 'utilisateur'}"
          style="max-width: ${width}px; max-height: ${height}px; display: block;"
        />
        <p style="margin: 8px 0 0 0; font-size: 9pt; color: #047857; text-align: center;">
          Signé par ${signature.signer_name || 'utilisateur'} le ${new Date(signature.signed_at).toLocaleDateString('fr-FR')}
        </p>
      </div>
    </div>
  `
}

/**
 * Génère le HTML pour une zone de signature vide
 */
function generateEmptyFieldHtml(field: SignatureField, variables: Record<string, any>): string {
  const width = field.width || 200
  const height = field.height || 80

  // Vérifier si une variable contient déjà la signature
  const variableKey = field.id.replace(/-/g, '_')
  const signatureFromVariable = variables[variableKey] || variables[`signature_${variableKey}`]

  if (signatureFromVariable && typeof signatureFromVariable === 'string') {
    // Si la variable contient une image en base64 ou une URL
    if (signatureFromVariable.startsWith('data:image') || signatureFromVariable.startsWith('http')) {
      return `
        <div class="signature-field filled-from-variable" style="display: inline-block; margin: 10px 0;">
          ${field.label ? `<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${field.label}</p>` : ''}
          <div style="border: 1px solid #3b82f6; border-radius: 4px; padding: 8px; background-color: #eff6ff; display: inline-block;">
            <img
              src="${signatureFromVariable}"
              alt="${field.label || 'Signature'}"
              style="max-width: ${width}px; max-height: ${height}px; display: block;"
            />
          </div>
        </div>
      `
    }
    // Sinon, afficher comme texte
    return `
      <div class="signature-field filled-from-variable" style="display: inline-block; margin: 10px 0;">
        ${field.label ? `<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${field.label}</p>` : ''}
        <div style="border: 1px solid #3b82f6; border-radius: 4px; padding: 8px 12px; background-color: #eff6ff; display: inline-block; min-width: ${width}px;">
          <p style="margin: 0; font-size: 11pt; color: #1e40af;">${signatureFromVariable}</p>
        </div>
      </div>
    `
  }

  // Zone vide à remplir
  if (field.type === 'date') {
    return `
      <div class="signature-field empty" style="display: inline-block; margin: 10px 0;">
        ${field.label ? `<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${field.label}${field.required ? ' <span style="color: #ef4444;">*</span>' : ''}</p>` : ''}
        <div style="border: 2px dashed #d1d5db; border-radius: 4px; padding: 8px 12px; background-color: #f9fafb; display: inline-block; min-width: 150px;">
          <p style="margin: 0; font-size: 10pt; color: #9ca3af; text-align: center;">Date à remplir</p>
        </div>
      </div>
    `
  }

  if (field.type === 'text') {
    return `
      <div class="signature-field empty" style="display: inline-block; margin: 10px 0; width: 100%; max-width: 400px;">
        ${field.label ? `<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${field.label}${field.required ? ' <span style="color: #ef4444;">*</span>' : ''}</p>` : ''}
        <div style="border: 2px dashed #d1d5db; border-radius: 4px; padding: 12px; background-color: #f9fafb; min-height: 60px;">
          <p style="margin: 0; font-size: 10pt; color: #9ca3af;">Texte à remplir</p>
        </div>
      </div>
    `
  }

  // Signature ou initials
  return `
    <div class="signature-field empty" style="display: inline-block; margin: 10px 0;">
      ${field.label ? `<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${field.label}${field.required ? ' <span style="color: #ef4444;">*</span>' : ''}</p>` : ''}
      <div style="border: 2px dashed #d1d5db; border-radius: 4px; padding: 12px; background-color: #f9fafb; width: ${width}px; height: ${height}px; display: flex; align-items: center; justify-content: center;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" style="opacity: 0.5;">
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          <path d="M3 20.05V5.5a2.5 2.5 0 0 1 5 0V20.05" />
          <path d="M7 13.5h9.5" />
          <path d="M20 20.5V10.5a2.5 2.5 0 0 0-5 0V20.5" />
        </svg>
      </div>
      ${field.signerRole || field.signerEmail ? `<p style="margin: 5px 0 0 0; font-size: 9pt; color: #6b7280;">${field.signerRole || field.signerEmail}</p>` : ''}
    </div>
  `
}
