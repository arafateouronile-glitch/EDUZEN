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

/** Structure possible du JSON parsé depuis le XML EDOF */
type XmlParsed = {
  catalogue?: Record<string, unknown>
  actions?: { action?: unknown }
  action?: unknown
  formations?: { formation?: unknown }
  organisme?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Extrait les formations depuis l'objet JSON parsé
 * Gère plusieurs formats XML possibles
 */
function extractTrainings(data: Record<string, unknown>): EDOFTraining[] {
  const d = data as XmlParsed
  const trainings: EDOFTraining[] = []

  const rawActions = d.catalogue && typeof d.catalogue === 'object' && 'actions' in d.catalogue
    ? (d.catalogue as Record<string, unknown>).actions as { action?: unknown } | undefined
    : d.actions
  const rawAction = rawActions?.action

  // Format 1 & 2: catalogue.actions.action ou actions.action
  if (rawAction) {
    const actions = Array.isArray(rawAction) ? rawAction : [rawAction]
    for (const action of actions) {
      trainings.push(parseAction((action ?? {}) as Record<string, unknown>))
    }
    return trainings
  }

  // Format 3 & 4: data.action (array ou single)
  if (d.action) {
    const actions = Array.isArray(d.action) ? d.action : [d.action]
    for (const action of actions) {
      trainings.push(parseAction((action ?? {}) as Record<string, unknown>))
    }
    return trainings
  }

  // Format 5: data.formations.formation
  const rawFormations = d.formations && typeof d.formations === 'object' && 'formation' in d.formations
    ? (d.formations as Record<string, unknown>).formation
    : undefined
  if (rawFormations) {
    const formations = Array.isArray(rawFormations) ? rawFormations : [rawFormations]
    for (const formation of formations) {
      trainings.push(parseFormation((formation ?? {}) as Record<string, unknown>))
    }
  }

  return trainings
}

/**
 * Parse une action de formation au format EDOF standard
 */
function parseAction(action: Record<string, unknown>): EDOFTraining {
  const duree = action.duree as Record<string, unknown> | undefined
  const tarif = action.tarif as Record<string, unknown> | undefined
  const modalites = action.modalites as Record<string, unknown> | undefined
  const rncp = action.rncp as Record<string, unknown> | undefined
  return {
    actionCode: (action['@_code'] ?? action.code ?? action.numeroAction) as string | undefined,
    rncpCode: (rncp?.code ?? action.codeRNCP ?? action.rncpCode) as string | undefined,
    title: (action.intitule ?? action.titre ?? action.libelle ?? action.title ?? '') as string,
    description: (action.description ?? action.descriptif ?? action.presentation) as string | undefined,
    objectives: (action.objectifs ?? action.objectifsPedagogiques) as string | undefined,
    prerequisites: (action.prerequis ?? action.preRequis) as string | undefined,
    durationHours: parseNumber(duree?.heures ?? action.dureeHeures ?? action.durationHours),
    durationDays: parseNumber(duree?.jours ?? action.dureeJours ?? action.durationDays),
    modality: (action.modalite ?? modalites?.enseignement ?? action.modality) as string | undefined,
    location: (action.lieu ?? action.lieuFormation ?? action.location) as string | undefined,
    price: parseNumber(tarif?.ttc ?? action.prix ?? action.price ?? action.montant),
    currency: (tarif?.devise ?? action.currency ?? 'EUR') as string,
    cpfFundingRate: parseNumber(action.tauxFinancementCPF ?? action.fundingRate ?? 100),
    certificationLevel: (action.niveau ?? action.niveauCertification ?? action.certificationLevel) as string | undefined,
    certificationType: (action.typeCertification ?? action.certificationType) as string | undefined,
    targetAudience: (action.publicVise ?? action.public ?? action.targetAudience) as string | undefined,
    maxLearners: parseNumber(action.effectifMax ?? action.maxLearners ?? action.nbStagiairesMax),
    eligibilityStartDate: (action.dateDebutEligibilite ?? action.eligibilityStartDate) as string | undefined,
    eligibilityEndDate: (action.dateFinEligibilite ?? action.eligibilityEndDate) as string | undefined,
    metadata: action,
  }
}

/**
 * Parse une formation au format alternatif
 */
function parseFormation(formation: Record<string, unknown>): EDOFTraining {
  const duree = formation.duree as Record<string, unknown> | undefined
  const heures = duree && typeof duree === 'object' && 'heures' in duree ? (duree as Record<string, unknown>).heures : formation.heures
  return {
    actionCode: (formation.code ?? formation.id) as string | undefined,
    title: (formation.titre ?? formation.nom ?? formation.title ?? '') as string,
    description: (formation.description ?? formation.descriptif) as string | undefined,
    durationHours: parseNumber(heures ?? formation.duree),
    price: parseNumber(formation.prix ?? formation.tarif),
    currency: (formation.devise ?? 'EUR') as string,
    metadata: formation,
  }
}

/**
 * Extrait les métadonnées du fichier XML
 */
function extractMetadata(data: Record<string, unknown>): EDOFParsedData['metadata'] {
  const cat = data.catalogue as Record<string, unknown> | undefined
  const org = data.organisme as Record<string, unknown> | undefined
  return {
    providerName: (cat?.['@_organisme'] ?? org?.nom ?? data.providerName) as string | undefined,
    siretNumber: (cat?.['@_siret'] ?? org?.siret ?? data.siretNumber) as string | undefined,
    exportDate: (cat?.['@_dateExport'] ?? data.dateExport ?? data.exportDate) as string | undefined,
    version: (cat?.['@_version'] ?? data.version ?? '1.0') as string,
  }
}

/**
 * Parse un nombre depuis une chaîne ou un nombre
 */
function parseNumber(value: unknown): number | undefined {
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

