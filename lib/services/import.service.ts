import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { z } from 'zod'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * Schémas de validation pour l'importation
 */
const StudentImportSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est requis'),
  last_name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  student_number: z.string().optional(),
  status: z.enum(['active', 'inactive', 'graduated', 'suspended']).optional().default('active'),
})

export type StudentImportRow = z.infer<typeof StudentImportSchema>

export interface ImportMapping {
  sourceColumn: string
  targetField: keyof StudentImportRow
  confidence: number // 0-1, confiance dans le mapping automatique
}

export interface ImportResult {
  success: boolean
  totalRows: number
  importedRows: number
  errors: Array<{
    row: number
    data: Record<string, any>
    errors: string[]
  }>
  warnings: Array<{
    row: number
    message: string
  }>
}

/**
 * Service d'importation avec validation intelligente
 */
export class ImportService {
  private supabase: SupabaseClient<any>

  constructor(supabaseClient?: SupabaseClient<any>) {
    this.supabase = supabaseClient || createClient()
  }

  /**
   * Détecte automatiquement le mapping des colonnes
   */
  detectColumnMapping(headers: string[]): ImportMapping[] {
    const mappings: ImportMapping[] = []
    
    // Dictionnaire de correspondances possibles
    // Note: Utilisation de `as any` pour permettre les mappings flexibles
    const fieldMappings: Record<string, string[]> = {
      first_name: ['first_name', 'prenom', 'prénom', 'nom', 'name', 'firstname'],
      last_name: ['last_name', 'nom', 'name', 'lastname', 'surname'],
      email: ['email', 'mail', 'e-mail', 'courriel', 'email_address'],
      phone: ['phone', 'téléphone', 'telephone', 'tel', 'mobile', 'portable'],
      date_of_birth: ['date_of_birth', 'date_naissance', 'birthdate', 'dob', 'date naissance'],
      address: ['address', 'adresse', 'street', 'rue'],
      city: ['city', 'ville'],
      postal_code: ['postal_code', 'code_postal', 'zip', 'cp'],
      country: ['country', 'pays'],
      student_number: ['student_number', 'numero_etudiant', 'num_etudiant', 'student_id', 'id'],
      status: ['status', 'statut', 'etat', 'state'],
    } as Record<string, string[]>

    headers.forEach((header) => {
      const normalizedHeader = header.toLowerCase().trim()
      
      // Chercher la correspondance la plus probable
      let bestMatch: { field: keyof StudentImportRow; confidence: number } | null = null
      
      for (const [field, possibleNames] of Object.entries(fieldMappings)) {
        for (const possibleName of possibleNames) {
          const similarity = this.calculateSimilarity(normalizedHeader, possibleName.toLowerCase())
          if (similarity > 0.7) {
            if (!bestMatch || similarity > bestMatch.confidence) {
              bestMatch = {
                field: field as keyof StudentImportRow,
                confidence: similarity,
              }
            }
          }
        }
      }

      if (bestMatch) {
        mappings.push({
          sourceColumn: header,
          targetField: bestMatch.field,
          confidence: bestMatch.confidence,
        })
      }
    })

    return mappings
  }

  /**
   * Calcule la similarité entre deux chaînes (algorithme de Levenshtein simplifié)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    // Vérifier si l'une contient l'autre
    if (longer.includes(shorter)) return 0.9
    
    // Distance de Levenshtein simplifiée
    const distance = this.levenshteinDistance(str1, str2)
    return 1 - distance / longer.length
  }

  /**
   * Calcule la distance de Levenshtein entre deux chaînes
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * Parse un fichier CSV/Excel et retourne les données brutes
   */
  async parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n').filter(line => line.trim())
          
          if (lines.length === 0) {
            reject(new Error('Le fichier est vide'))
            return
          }

          // Détecter le séparateur (virgule, point-virgule, tabulation)
          const firstLine = lines[0]
          let separator = ','
          if (firstLine.includes(';')) separator = ';'
          else if (firstLine.includes('\t')) separator = '\t'

          // Parser les en-têtes
          const headers = firstLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ''))
          
          // Parser les lignes
          const rows: Record<string, any>[] = []
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(separator).map(v => v.trim().replace(/^"|"$/g, ''))
            const row: Record<string, any> = {}
            headers.forEach((header, index) => {
              row[header] = values[index] || ''
            })
            rows.push(row)
          }

          resolve({ headers, rows })
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'))
      reader.readAsText(file)
    })
  }

  /**
   * Importe des étudiants avec validation en temps réel
   */
  async importStudents(
    organizationId: string,
    rows: Record<string, any>[],
    mapping: ImportMapping[]
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalRows: rows.length,
      importedRows: 0,
      errors: [],
      warnings: [],
    }

    // Créer un dictionnaire de mapping pour accès rapide
    const mappingDict = new Map<string, keyof StudentImportRow>()
    mapping.forEach(m => {
      mappingDict.set(m.sourceColumn, m.targetField)
    })

    // Traiter chaque ligne
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // +2 car ligne 1 = headers, ligne 2 = première donnée

      try {
        // Mapper les données selon le mapping fourni
        const mappedData: Record<string, any> = {}
        mapping.forEach(m => {
          const value = row[m.sourceColumn]
          if (value !== undefined && value !== null && value !== '') {
            mappedData[m.targetField] = value
          }
        })

        // Valider avec Zod
        const validationResult = StudentImportSchema.safeParse(mappedData)
        
        if (!validationResult.success) {
          result.errors.push({
            row: rowNumber,
            data: mappedData,
            errors: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          })
          result.success = false
          continue
        }

        // Vérifier si l'email existe déjà (si fourni)
        if (validationResult.data.email) {
          const { data: existing } = await this.supabase
            .from('students')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('email', validationResult.data.email)
            .maybeSingle()

          if (existing) {
            result.warnings.push({
              row: rowNumber,
              message: `L'email ${validationResult.data.email} existe déjà. L'étudiant sera ignoré.`,
            })
            continue
          }
        }

        // Créer l'étudiant
        const { error: insertError } = await this.supabase
          .from('students')
          .insert({
            organization_id: organizationId,
            ...validationResult.data,
            status: validationResult.data.status || 'active',
          })

        if (insertError) {
          result.errors.push({
            row: rowNumber,
            data: mappedData,
            errors: [insertError.message],
          })
          result.success = false
        } else {
          result.importedRows++
        }
      } catch (error) {
        result.errors.push({
          row: rowNumber,
          data: row,
          errors: [error instanceof Error ? error.message : 'Erreur inconnue'],
        })
        result.success = false
      }
    }

    logger.info('ImportService - Import terminé', {
      organizationId,
      totalRows: result.totalRows,
      importedRows: result.importedRows,
      errorsCount: result.errors.length,
    })

    return result
  }
}

export const importService = new ImportService()
