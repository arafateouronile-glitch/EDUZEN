/**
 * Traitement des pièces jointes dans les templates
 */

/**
 * Traite les pièces jointes dans le contenu HTML
 */
export async function processAttachments(
  html: string,
  variables: Record<string, any> = {},
  documentId?: string
): Promise<string> {
  // Pour l'instant, retourner le HTML tel quel
  // Le traitement des pièces jointes peut être implémenté plus tard si nécessaire
  return html
}
