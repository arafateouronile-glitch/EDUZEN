/**
 * Générateur de numéros uniques pour factures, étudiants, etc.
 * 
 * Réduit la duplication de code pour la génération de numéros
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { errorHandler } from '@/lib/errors'

export interface GenerateUniqueNumberOptions {
  prefix: string
  orgCode: string
  year?: string
  padding?: number
  fieldName?: string
}

/**
 * Génère un numéro unique pour une table
 */
export async function generateUniqueNumber(
  supabase: SupabaseClient,
  table: string,
  organizationId: string,
  options: GenerateUniqueNumberOptions
): Promise<string> {
  try {
    const year = options.year || new Date().getFullYear().toString().slice(-2)
    const padding = options.padding || 6
    const fieldName = options.fieldName || 'number'
    const pattern = `${options.prefix}-${options.orgCode}-${year}-%`

    const { data: lastRecord, error } = await supabase
      .from(table)
      .select(fieldName)
      .eq('organization_id', organizationId)
      .like(fieldName, pattern)
      .order(fieldName, { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      throw errorHandler.handleError(error, {
        operation: 'generateUniqueNumber',
        table,
        organizationId,
      })
    }

    let sequence = 1
    if (lastRecord?.[fieldName]) {
      const parts = String(lastRecord[fieldName]).split('-')
      const lastSequence = parseInt(parts[parts.length - 1] || '0', 10)
      sequence = lastSequence + 1
    }

    return `${options.prefix}-${options.orgCode}-${year}-${String(sequence).padStart(padding, '0')}`
  } catch (error) {
    throw errorHandler.handleError(error, {
      operation: 'generateUniqueNumber',
      table,
      organizationId,
    })
  }
}





