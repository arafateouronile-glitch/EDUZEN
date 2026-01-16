/**
 * Utilitaires pour mettre en évidence (highlight) du texte dans les résultats de recherche
 */

/**
 * Met en évidence les correspondances dans un texte
 * @param text Le texte à mettre en évidence
 * @param query La requête de recherche
 * @returns Un tableau de fragments (texte normal ou texte en évidence)
 */
export function highlightText(text: string, query: string): Array<{ text: string; highlight: boolean }> {
  if (!query || !text) {
    return [{ text, highlight: false }]
  }

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const parts: Array<{ text: string; highlight: boolean }> = []
  let lastIndex = 0

  // Trouver toutes les occurrences de la requête
  let index = lowerText.indexOf(lowerQuery, lastIndex)
  
  while (index !== -1) {
    // Ajouter le texte avant la correspondance
    if (index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, index),
        highlight: false,
      })
    }

    // Ajouter le texte en évidence
    parts.push({
      text: text.substring(index, index + query.length),
      highlight: true,
    })

    lastIndex = index + query.length
    index = lowerText.indexOf(lowerQuery, lastIndex)
  }

  // Ajouter le reste du texte
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      highlight: false,
    })
  }

  return parts.length > 0 ? parts : [{ text, highlight: false }]
}

/**
 * Met en évidence les correspondances dans plusieurs champs d'un objet
 * @param obj L'objet contenant les champs à rechercher
 * @param query La requête de recherche
 * @param fields Les champs à rechercher
 * @returns L'objet avec les champs mis en évidence
 */
export function highlightFields<T extends Record<string, any>>(
  obj: T,
  query: string,
  fields: (keyof T)[]
): Record<string, Array<{ text: string; highlight: boolean }>> {
  const result: Record<string, Array<{ text: string; highlight: boolean }>> = {}

  for (const field of fields) {
    const value = obj[field]
    if (typeof value === 'string') {
      result[field as string] = highlightText(value, query)
    } else {
      result[field as string] = [{ text: String(value || ''), highlight: false }]
    }
  }

  return result
}



