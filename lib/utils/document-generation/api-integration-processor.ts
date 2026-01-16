/**
 * Traitement de l'intégration API pour enrichir les variables
 */

/**
 * Enrichit les variables avec des données externes via API
 */
export function enrichVariablesWithExternalData(
  variables: Record<string, any>,
  documentId?: string,
  organizationId?: string
): Promise<Record<string, any>> {
  // Pour l'instant, retourner les variables telles quelles
  // L'enrichissement via API peut être implémenté plus tard si nécessaire
  return Promise.resolve(variables)
}
