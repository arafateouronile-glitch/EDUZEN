/**
 * Traitement de l'intégration API pour enrichir les variables
 */

/**
 * Enrichit les variables avec des données externes via API
 */
export function enrichVariablesWithExternalData(
  variables: Record<string, unknown>,
  _documentId?: string,
  _organizationId?: string
): Promise<Record<string, unknown>> {
  return Promise.resolve(variables)
}
