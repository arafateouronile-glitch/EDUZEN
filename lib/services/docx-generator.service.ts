import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { DocumentVariables } from '@/lib/types/document-templates'

/**
 * Service de génération de documents Word avec docxtemplater
 * 
 * Cette approche utilise des templates Word natifs (.docx) avec des balises {variable}
 * pour une fidélité parfaite au design du template.
 * 
 * Avantages:
 * - Fidélité parfaite au template Word original
 * - Support natif des tableaux, images, styles
 * - Templates modifiables par l'utilisateur sans code
 * - Solution mature et stable (utilisée en production)
 * 
 * @see https://docxtemplater.com/
 */
class DocxGeneratorService {
  
  /**
   * Génère un document Word à partir d'un template DOCX et des variables
   * 
   * @param templateBuffer - Buffer du fichier template .docx
   * @param variables - Variables à injecter dans le template
   * @returns Buffer du document Word généré
   */
  async generateFromTemplate(
    templateBuffer: Buffer | ArrayBuffer,
    variables: DocumentVariables
  ): Promise<Buffer> {
    try {
      // 1. Convertir en Buffer si nécessaire
      const buffer = templateBuffer instanceof Buffer 
        ? templateBuffer 
        : Buffer.from(templateBuffer)
      
      // 2. Décompresser le fichier .docx (qui est un ZIP)
      const zip = new PizZip(buffer)
      
      // 3. Créer l'instance docxtemplater avec les options optimales
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true, // Permet de boucler sur les paragraphes
        linebreaks: true, // Gère les retours à la ligne dans les variables
        delimiters: {
          start: '{',
          end: '}',
        },
      })

      // 4. Préparer les données pour docxtemplater
      const templateData = this.prepareVariables(variables)

      // 5. Remplacer les balises dans le template
      doc.render(templateData)

      // 6. Générer le document final
      const outputBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      })

      console.log('[DocxGenerator] ✅ Document généré avec succès')
      return outputBuffer as Buffer
    } catch (error: any) {
      console.error('[DocxGenerator] ❌ Erreur lors de la génération:', error)
      
      // Gestion des erreurs spécifiques à docxtemplater
      if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors
          .map((e: any) => e.message)
          .join(', ')
        throw new Error(`Erreur docxtemplater: ${errorMessages}`)
      }
      
      throw error
    }
  }

  /**
   * Génère un document Word à partir d'une URL de template
   * 
   * @param templateUrl - URL du fichier template .docx
   * @param variables - Variables à injecter dans le template
   * @returns Buffer du document Word généré
   */
  async generateFromUrl(
    templateUrl: string,
    variables: DocumentVariables
  ): Promise<Buffer> {
    try {
      // Télécharger le template
      const response = await fetch(templateUrl)
      if (!response.ok) {
        throw new Error(`Impossible de télécharger le template: ${response.statusText}`)
      }
      
      const templateBuffer = await response.arrayBuffer()
      return this.generateFromTemplate(Buffer.from(templateBuffer), variables)
    } catch (error) {
      console.error('[DocxGenerator] ❌ Erreur lors du téléchargement du template:', error)
      throw error
    }
  }

  /**
   * Prépare les variables pour docxtemplater
   * Formate les dates, gère les tableaux, etc.
   */
  private prepareVariables(variables: DocumentVariables): Record<string, any> {
    const prepared: Record<string, any> = {}
    
    // Copier toutes les variables existantes
    for (const [key, value] of Object.entries(variables)) {
      if (value === null || value === undefined) {
        prepared[key] = ''
      } else if (value instanceof Date) {
        prepared[key] = this.formatDate(value.toISOString())
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Aplatir les objets imbriqués
        for (const [subKey, subValue] of Object.entries(value)) {
          prepared[`${key}_${subKey}`] = subValue ?? ''
        }
        // Garder aussi l'objet complet pour les boucles
        prepared[key] = value
      } else {
        prepared[key] = value
      }
    }
    
    // Ajouter des variables calculées courantes
    prepared.date_generation = this.formatDate(new Date().toISOString())
    prepared.annee_courante = new Date().getFullYear().toString()
    
    // Formater les montants si présents
    if (variables.montant_ht !== undefined) {
      prepared.montant_ht_formate = this.formatCurrency(Number(variables.montant_ht) || 0)
    }
    if (variables.montant_ttc !== undefined) {
      prepared.montant_ttc_formate = this.formatCurrency(Number(variables.montant_ttc) || 0)
    }
    if (variables.montant !== undefined) {
      prepared.montant_formate = this.formatCurrency(Number(variables.montant) || 0)
    }
    
    // Formater les dates si présentes
    const dateFields = [
      'session_debut', 'session_fin', 'date_debut', 'date_fin',
      'date_signature', 'date_naissance', 'eleve_date_naissance'
    ]
    for (const field of dateFields) {
      if (variables[field as keyof DocumentVariables]) {
        const dateValue = variables[field as keyof DocumentVariables]
        if (typeof dateValue === 'string') {
          prepared[`${field}_formate`] = this.formatDate(dateValue)
        }
      }
    }
    
    return prepared
  }

  /**
   * Formate une date au format français
   * Exemple: "16 Janvier 2026"
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return dateString
      }
      return format(date, 'd MMMM yyyy', { locale: fr })
    } catch (error) {
      console.error('[DocxGenerator] Erreur de formatage de date:', error)
      return dateString
    }
  }

  /**
   * Formate un montant en devise
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }
}

// Instance singleton (non exportée, utilisée en interne)
const docxGeneratorService = new DocxGeneratorService()

/**
 * Fonction utilitaire pour générer un document Word depuis un template stocké dans Supabase
 */
export async function generateWordFromStoredTemplate(
  templateUrl: string,
  variables: DocumentVariables
): Promise<Buffer> {
  return docxGeneratorService.generateFromUrl(templateUrl, variables)
}

/**
 * Fonction utilitaire pour générer un document Word depuis un buffer de template
 */
export async function generateWordFromBuffer(
  templateBuffer: Buffer | ArrayBuffer,
  variables: DocumentVariables
): Promise<Buffer> {
  return docxGeneratorService.generateFromTemplate(
    templateBuffer instanceof Buffer ? templateBuffer : Buffer.from(templateBuffer),
    variables
  )
}

/**
 * Fonction principale pour générer un document Word depuis un template DOCX
 * Utilisée par l'API route
 */
export async function generateDocxFromTemplate(
  templateUrl: string,
  variables: DocumentVariables
): Promise<Buffer> {
  return docxGeneratorService.generateFromUrl(templateUrl, variables)
}
