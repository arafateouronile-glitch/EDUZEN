/**
 * Utilitaire pour parser les fichiers XML du catalogue CPF/EDOF
 * Format EDOF (Espace des Organismes de Formation)
 */

import { XMLParser, XMLValidator } from 'fast-xml-parser'

export interface EDOFTraining {
  // Identifiants
  actionCode?: string // Code de l'action de formation
  rncpCode?: string // Code RNCP si applicable
  
  // Informations générales
  title: string // Titre de la formation
  description?: string
  objectives?: string // Objectifs pédagogiques
  prerequisites?: string // Prérequis
  
  // Durée et modalités
  durationHours?: number // Durée en heures
  durationDays?: number // Durée en jours
  modality?: string // Modalité (présentiel, distanciel, mixte)
  location?: string // Lieu de formation
  
  // Prix et financement
  price?: number // Prix TTC
  currency?: string // Devise (EUR par défaut)
  cpfFundingRate?: number // Taux de financement CPF (0-100)
  
  // Certification
  certificationLevel?: string // Niveau de certification (ex: Niveau 3, 4, 5)
  certificationType?: string // Type de certification
  
  // Public et effectifs
  targetAudience?: string // Public visé
  maxLearners?: number // Nombre maximum de stagiaires
  
  // Dates
  eligibilityStartDate?: string // Date de début d'éligibilité
  eligibilityEndDate?: string // Date de fin d'éligibilité
  
  // Métadonnées
  metadata?: Record<string, unknown>
}

export interface EDOFParsedData {
  trainings: EDOFTraining[]
  metadata?: {
    providerName?: string
    siretNumber?: string
    exportDate?: string
    version?: string
  }
  errors?: string[]
}

/**
 * Parse un fichier XML EDOF et retourne les données structurées
 */
export function parseEDOFXML(xmlContent: string): EDOFParsedData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    trimValues: true,
  })

  // Valider le XML d'abord
  const validationResult = XMLValidator.validate(xmlContent)
  if (validationResult !== true) {
    throw new Error(`XML invalide: ${validationResult.err?.msg || 'Format non reconnu'}`)
  }

  try {
    const jsonData = parser.parse(xmlContent)
    
    // Le format XML EDOF peut varier, on essaie plusieurs structures possibles
    const trainings = extractTrainings(jsonData)
    
    const metadata = extractMetadata(jsonData)
    
    return {
      trainings,
      metadata,
    }
  } catch (error) {
    throw new Error(`Erreur lors du parsing XML: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Extrait les formations depuis l'objet JSON parsé
 * Gère plusieurs formats XML possibles
 */
function extractTrainings(data: any): EDOFTraining[] {
  const trainings: EDOFTraining[] = []

  // Format 1: data.catalogue.actions.action (format standard EDOF)
  if (data.catalogue?.actions?.action) {
    const actions = Array.isArray(data.catalogue.actions.action)
      ? data.catalogue.actions.action
      : [data.catalogue.actions.action]

    for (const action of actions) {
      trainings.push(parseAction(action))
    }
  }
  // Format 2: data.actions.action
  else if (data.actions?.action) {
    const actions = Array.isArray(data.actions.action)
      ? data.actions.action
      : [data.actions.action]

    for (const action of actions) {
      trainings.push(parseAction(action))
    }
  }
  // Format 3: data.action (array direct)
  else if (Array.isArray(data.action)) {
    for (const action of data.action) {
      trainings.push(parseAction(action))
    }
  }
  // Format 4: data.action (single object)
  else if (data.action) {
    trainings.push(parseAction(data.action))
  }
  // Format 5: data.formations.formation (format alternatif)
  else if (data.formations?.formation) {
    const formations = Array.isArray(data.formations.formation)
      ? data.formations.formation
      : [data.formations.formation]

    for (const formation of formations) {
      trainings.push(parseFormation(formation))
    }
  }

  return trainings
}

/**
 * Parse une action de formation au format EDOF standard
 */
function parseAction(action: any): EDOFTraining {
  return {
    // Identifiants
    actionCode: action['@_code'] || action.code || action.numeroAction,
    rncpCode: action.rncp?.code || action.codeRNCP || action.rncpCode,
    
    // Informations générales
    title: action.intitule || action.titre || action.libelle || action.title || '',
    description: action.description || action.descriptif || action.presentation,
    objectives: action.objectifs || action.objectifsPedagogiques,
    prerequisites: action.prerequis || action.preRequis,
    
    // Durée et modalités
    durationHours: parseNumber(action.duree?.heures || action.dureeHeures || action.durationHours),
    durationDays: parseNumber(action.duree?.jours || action.dureeJours || action.durationDays),
    modality: action.modalite || action.modalites?.enseignement || action.modality,
    location: action.lieu || action.lieuFormation || action.location,
    
    // Prix et financement
    price: parseNumber(action.tarif?.ttc || action.prix || action.price || action.montant),
    currency: action.tarif?.devise || action.currency || 'EUR',
    cpfFundingRate: parseNumber(action.tauxFinancementCPF || action.fundingRate || 100),
    
    // Certification
    certificationLevel: action.niveau || action.niveauCertification || action.certificationLevel,
    certificationType: action.typeCertification || action.certificationType,
    
    // Public et effectifs
    targetAudience: action.publicVise || action.public || action.targetAudience,
    maxLearners: parseNumber(action.effectifMax || action.maxLearners || action.nbStagiairesMax),
    
    // Dates
    eligibilityStartDate: action.dateDebutEligibilite || action.eligibilityStartDate,
    eligibilityEndDate: action.dateFinEligibilite || action.eligibilityEndDate,
    
    // Métadonnées (conserver toutes les données originales pour référence)
    metadata: action,
  }
}

/**
 * Parse une formation au format alternatif
 */
function parseFormation(formation: any): EDOFTraining {
  return {
    actionCode: formation.code || formation.id,
    title: formation.titre || formation.nom || formation.title || '',
    description: formation.description || formation.descriptif,
    durationHours: parseNumber(formation.duree || formation.heures),
    price: parseNumber(formation.prix || formation.tarif),
    currency: formation.devise || 'EUR',
    metadata: formation,
  }
}

/**
 * Extrait les métadonnées du fichier XML
 */
function extractMetadata(data: any): EDOFParsedData['metadata'] {
  return {
    providerName: data.catalogue?.['@_organisme'] || data.organisme?.nom || data.providerName,
    siretNumber: data.catalogue?.['@_siret'] || data.organisme?.siret || data.siretNumber,
    exportDate: data.catalogue?.['@_dateExport'] || data.dateExport || data.exportDate,
    version: data.catalogue?.['@_version'] || data.version || '1.0',
  }
}

/**
 * Parse un nombre depuis une chaîne ou un nombre
 */
function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined
  }
  
  if (typeof value === 'number') {
    return value
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/,/g, '.').trim())
    return isNaN(parsed) ? undefined : parsed
  }
  
  return undefined
}

/**
 * Valide une formation parsée
 */
export function validateTraining(training: EDOFTraining): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!training.title || training.title.trim() === '') {
    errors.push('Le titre de la formation est requis')
  }

  if (training.price !== undefined && training.price < 0) {
    errors.push('Le prix ne peut pas être négatif')
  }

  if (training.durationHours !== undefined && training.durationHours < 0) {
    errors.push('La durée ne peut pas être négative')
  }

  if (training.cpfFundingRate !== undefined && (training.cpfFundingRate < 0 || training.cpfFundingRate > 100)) {
    errors.push('Le taux de financement CPF doit être entre 0 et 100')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

