/**
 * Traitement des variables imbriquées dans les templates
 */

import type { DocumentVariables } from '@/lib/types/document-templates'

/** Valeurs possibles après aplatissement */
type FlatValue = string | number | boolean | undefined

/**
 * Aplatit les variables imbriquées en une structure plate
 * Par exemple : { user: { name: 'John' } } devient { 'user.name': 'John' }
 */
export function flattenVariables(variables: DocumentVariables): Record<string, FlatValue> {
  const flattened: Record<string, FlatValue> = {}

  function flatten(obj: Record<string, unknown>, prefix = ''): void {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const newKey = prefix ? `${prefix}.${key}` : key
        const value = obj[key]
        if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          flatten(value as Record<string, unknown>, newKey)
        } else {
          flattened[newKey] = value as FlatValue
        }
      }
    }
  }

  flatten(variables as unknown as Record<string, unknown>)
  return flattened
}

/**
 * Traite les variables imbriquées dans le contenu HTML
 * Remplace les références comme {user.name} par leurs valeurs
 */
export function processNestedVariables(
  html: string,
  variables: Record<string, string | number | boolean | undefined>
): string {
  let result = html

  for (const key in variables) {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      const value = variables[key]
      if (value !== null && value !== undefined) {
        // Remplacer {object.property} ou {object_property}
        const regex = new RegExp(`\\{${key.replace(/\./g, '\\.')}\\}`, 'g')
        result = result.replace(regex, String(value))
      }
    }
  }
  
  return result
}
