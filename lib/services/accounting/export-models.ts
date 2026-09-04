/**
 * Modèles (profils) d'export comptable proposés avant génération du fichier
 * dans Réglages → Comptabilité. Les écritures sont toujours calculées de la
 * même façon (`fec-export.service.ts`) ; seul le formatage de sortie change
 * (séparateur, présence d'une ligne d'en-tête, extension).
 *
 * `fulll_custom` encode la convention rapportée par la doc d'aide de l'import
 * personnalisé Fulll (point-virgule, sans en-tête) — NON vérifiée en conditions
 * réelles (accès partenaire Fulll requis pour confirmer). À tester avec le
 * cabinet comptable du client avant d'en faire une promesse produit.
 */

export type FecExportModelId = 'fec_legal' | 'fulll_custom'

export interface FecExportModel {
  id: FecExportModelId
  /** Nom affiché dans le sélecteur */
  label: string
  /** Explication affichée sous le sélecteur */
  description: string
  /** Séparateur de champs */
  separator: string
  /** Ligne d'en-tête (noms de colonnes) incluse ou non */
  includeHeader: boolean
  /** Préfixe du nom de fichier généré (ex: "FEC_...", "FULLL_...") */
  filePrefix: string
  /** Extension du fichier généré (sans le point) */
  fileExtension: 'txt' | 'csv'
  /** true si ce modèle n'est pas vérifié contre une source officielle */
  unverified?: boolean
}

export const FEC_EXPORT_MODELS: FecExportModel[] = [
  {
    id: 'fec_legal',
    label: 'FEC standard (légal)',
    description:
      "Format réglementaire français (18 colonnes, séparateur « | », ligne d'en-tête). À transmettre à votre expert-comptable ou à l'administration fiscale en cas de contrôle.",
    separator: '|',
    includeHeader: true,
    filePrefix: 'FEC',
    fileExtension: 'txt',
  },
  {
    id: 'fulll_custom',
    label: 'Fulll (import personnalisé)',
    description:
      "Mêmes écritures, mise en forme pour l'import personnalisé Fulll (point-virgule, sans ligne d'en-tête). Non vérifié en conditions réelles — testez avec votre cabinet comptable avant un usage régulier.",
    separator: ';',
    includeHeader: false,
    filePrefix: 'FULLL',
    fileExtension: 'csv',
    unverified: true,
  },
]

export const DEFAULT_FEC_EXPORT_MODEL: FecExportModelId = 'fec_legal'

export function getFecExportModel(id?: string | null): FecExportModel {
  return FEC_EXPORT_MODELS.find((m) => m.id === id) ?? FEC_EXPORT_MODELS[0]
}
