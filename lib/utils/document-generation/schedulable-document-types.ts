/**
 * Types de modèles de documents joignables à un envoi programmé
 * (email_schedules) : documents nominatifs générés pour chaque apprenant à
 * partir de ses données et de celles de la session.
 *
 * Exclus : ceux qui exigent une autre source (facture, devis), un autre
 * destinataire (formateur, jury) ou qui sont collectifs (émargement).
 */

import type { DocumentType } from '@/lib/types/document-templates'

const NON_SCHEDULABLE_DOCUMENT_TYPES: ReadonlySet<DocumentType> = new Set<DocumentType>([
  'facture',
  'devis',
  'convention_formateur',
  'ordre_de_mission',
  'attestation_defraiement',
  'emargement',
  'formulaire_inscription',
])

export function isSchedulableDocumentType(type: string | null | undefined): type is DocumentType {
  return !!type && !NON_SCHEDULABLE_DOCUMENT_TYPES.has(type as DocumentType)
}

/** Nom du fichier joint : convocation_DUPONT_Marie.pdf */
export function scheduledDocumentFilename(
  type: string,
  student: { first_name?: string | null; last_name?: string | null }
): string {
  const clean = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9-]+/g, '_')
      .replace(/^_+|_+$/g, '')
  const parts = [type, (student.last_name ?? '').toUpperCase(), student.first_name ?? ''].map(clean).filter(Boolean)
  return `${parts.join('_') || 'document'}.pdf`
}
