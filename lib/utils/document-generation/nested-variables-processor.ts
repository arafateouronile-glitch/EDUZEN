/**
 * Traitement des variables imbriquées dans les templates
 */

import type { DocumentVariables } from '@/lib/types/document-templates'

/**
 * Aplatit les variables imbriquées en une structure plate
 * Par exemple : { user: { name: 'John' } } devient { 'user.name': 'John' }
 */
export function flattenVariables(variables: DocumentVariables): Record<string, any> {
  const flattened: Record<string, any> = {}
  
  function flatten(obj: any, prefix = ''): void {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key
        const value = obj[key]
        
        if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          // Récursivement aplatir les objets imbriqués
          flatten(value, newKey)
        } else {
          // Ajouter la valeur aplatie
          flattened[newKey] = value
        }
      }
    }
  }
  
  flatten(variables)
  return flattened
}

/**
 * Traite les variables imbriquées dans le contenu HTML
 * Remplace les références comme {user.name} par leurs valeurs
 */
export function processNestedVariables(
  html: string,
  variables: Record<string, any>
): string {
  let result = html
  
  // Remplacer les variables imbriquées au format {object.property}
  for (const key in variables) {
    if (variables.hasOwnProperty(key)) {
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
