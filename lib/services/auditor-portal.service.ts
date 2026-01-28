/**
 * Service Portail Auditeur EDUZEN
 * Gère les liens temporaires sécurisés et l'accès aux données Qualiopi pour les auditeurs externes
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

// Crypto utilities for generating secure tokens
function generateToken(): string {
  const array = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    // Fallback for Node.js environment
    const nodeCrypto = require('crypto')
    const randomBytes = nodeCrypto.randomBytes(32)
    array.set(randomBytes)
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function hashToken(token: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Web Crypto API (browser and modern Node.js)
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } else {
    // Fallback for older Node.js
    const nodeCrypto = require('crypto')
    return nodeCrypto.createHash('sha256').update(token).digest('hex')
  }
}

// ============================================================================
// Types
// ============================================================================

export interface AuditorAccessLink {
  id: string
  organization_id: string
  token_hash: string
  audit_id?: string
  auditor_name: string
  auditor_email?: string
  auditor_organization?: string
  expires_at: string
  is_active: boolean
  created_by: string
  created_at: string
  last_accessed_at?: string
  access_count: number
  permissions: AuditorPermissions
  notes?: string
}

export interface AuditorPermissions {
  view_indicators: boolean
  view_evidence: boolean
  view_corrective_actions: boolean
  export_pdf: boolean
  sampling_mode: boolean
}

export interface ComplianceEvidenceAutomated {
  id: string
  organization_id: string
  indicator_number: number
  indicator_id?: string
  evidence_type: 'document' | 'event' | 'data_point' | 'signature' | 'attendance' | 'evaluation' | 'feedback' | 'contract' | 'certificate' | 'system_generated'
  source: 'system' | 'manual_upload' | 'integration' | 'automated_detection'
  entity_type?: 'session' | 'student' | 'program' | 'teacher' | 'document' | 'evaluation' | 'contract'
  entity_id?: string
  entity_name?: string
  title: string
  description?: string
  file_url?: string
  file_type?: string
  metadata: Record<string, unknown>
  status: 'valid' | 'pending' | 'expired' | 'invalid'
  confidence_score: number
  action_hash?: string
  event_date: string
  created_at: string
  updated_at: string
}

export interface QualiopiCriterion {
  number: number
  name: string
  description: string
  indicators: QualiopiIndicatorDefinition[]
}

export interface QualiopiIndicatorDefinition {
  number: number
  name: string
  description: string
  methodology?: string
}

export interface EvidenceCountByIndicator {
  indicator_number: number
  evidence_count: number
  auto_count: number
  manual_count: number
}

export interface AuditorPortalData {
  organization: {
    id: string
    name: string
    logo_url?: string
  }
  criteria: QualiopiCriterion[]
  indicators: {
    id: string
    indicator_code: string
    indicator_name: string
    category: string
    status: string
    compliance_rate: number
    evidence_count: number
    auto_evidence_count: number
    manual_evidence_count: number
  }[]
  evidence: ComplianceEvidenceAutomated[]
  stats: {
    total_indicators: number
    compliant_indicators: number
    compliance_rate: number
    total_evidence: number
    auto_evidence_percentage: number
  }
  link: {
    auditor_name: string
    auditor_organization?: string
    expires_at: string
    permissions: AuditorPermissions
  }
}

// ============================================================================
// Référentiel Qualiopi - Les 7 critères et 32 indicateurs
// ============================================================================

export const QUALIOPI_REFERENTIAL: QualiopiCriterion[] = [
  {
    number: 1,
    name: 'Conditions d\'information du public',
    description: 'Les conditions d\'information du public sur les prestations proposées, les délais pour y accéder et les résultats obtenus.',
    indicators: [
      { number: 1, name: 'Information sur les prestations', description: 'Diffusion d\'une information accessible sur les prestations, résultats obtenus et tarifs.', methodology: 'Assurez-vous que vos tarifs et prérequis sont publiés sur votre site web et accessibles à tous. EDUZEN génère automatiquement cette preuve lors de la publication d\'un programme.' },
      { number: 2, name: 'Indicateurs de résultats', description: 'Diffusion d\'indicateurs de résultats adaptés à la nature des prestations.', methodology: 'Publiez vos taux de réussite, satisfaction et insertion. EDUZEN calcule automatiquement ces indicateurs à partir des questionnaires et certifications.' },
      { number: 3, name: 'Délais d\'accès', description: 'Information sur les délais d\'accès aux prestations.', methodology: 'Indiquez clairement les délais d\'inscription sur vos supports. Le délai moyen est automatiquement calculé par EDUZEN.' },
    ]
  },
  {
    number: 2,
    name: 'Identification précise des objectifs',
    description: 'L\'identification précise des objectifs des prestations proposées et l\'adaptation de ces prestations aux publics bénéficiaires.',
    indicators: [
      { number: 4, name: 'Analyse du besoin', description: 'Analyse du besoin du bénéficiaire en lien avec l\'entreprise et/ou le financeur.', methodology: 'Utilisez le formulaire d\'inscription EDUZEN qui inclut automatiquement l\'analyse des besoins et les attentes du stagiaire.' },
      { number: 5, name: 'Objectifs opérationnels', description: 'Définition des objectifs opérationnels et évaluables.', methodology: 'Vos programmes EDUZEN doivent contenir des objectifs SMART. Vérifiez que chaque module a des objectifs mesurables.' },
      { number: 6, name: 'Contenu et modalités', description: 'Établissement du contenu et des modalités de mise en œuvre.', methodology: 'Le programme de formation doit détailler le contenu, la durée et les modalités. EDUZEN génère automatiquement ces documents.' },
      { number: 7, name: 'Adéquation contenus/objectifs', description: 'Adéquation des contenus aux objectifs définis.', methodology: 'Assurez-vous que chaque séquence pédagogique correspond à un objectif. Utilisez la matrice de correspondance EDUZEN.' },
      { number: 8, name: 'Procédures de positionnement', description: 'Procédures de positionnement et d\'évaluation des acquis à l\'entrée.', methodology: 'Intégrez un test de positionnement initial. EDUZEN permet de créer des quiz d\'évaluation des prérequis.' },
    ]
  },
  {
    number: 3,
    name: 'Adaptation aux publics bénéficiaires',
    description: 'L\'adaptation aux publics bénéficiaires des prestations et des modalités d\'accueil, d\'accompagnement, de suivi et d\'évaluation.',
    indicators: [
      { number: 9, name: 'Conditions de déroulement', description: 'Information sur les conditions de déroulement.', methodology: 'La convocation et le règlement intérieur doivent être envoyés avant le début. EDUZEN automatise cet envoi.' },
      { number: 10, name: 'Adaptation de la prestation', description: 'Adaptation de la prestation, de l\'accompagnement et du suivi.', methodology: 'Documentez les adaptations individuelles. Utilisez les notes de suivi EDUZEN pour chaque stagiaire.' },
      { number: 11, name: 'Évaluation de l\'atteinte', description: 'Évaluation de l\'atteinte des objectifs par les bénéficiaires.', methodology: 'Les quiz et évaluations de fin de formation prouvent l\'atteinte des objectifs. EDUZEN trace automatiquement ces résultats.' },
      { number: 12, name: 'Engagement des bénéficiaires', description: 'Mesures favorisant l\'engagement des bénéficiaires.', methodology: 'Suivez l\'assiduité via les émargements QR Code EDUZEN. Un taux de présence élevé prouve l\'engagement.' },
      { number: 13, name: 'Coordination des intervenants', description: 'Coordination des intervenants internes et/ou externes.', methodology: 'Planifiez les interventions dans le calendrier EDUZEN. Les réunions de coordination doivent être tracées.' },
      { number: 14, name: 'Exercice de la citoyenneté', description: 'Exercice de la citoyenneté des bénéficiaires (CFA).', methodology: 'Indicateur spécifique CFA : documentez les actions citoyennes et le conseil de perfectionnement.' },
      { number: 15, name: 'Accompagnement socio-professionnel', description: 'Accompagnement socio-professionnel, éducatif et relatif à l\'exercice de la citoyenneté (CFA).', methodology: 'Indicateur spécifique CFA : tracez les entretiens individuels et l\'accompagnement vers l\'emploi.' },
      { number: 16, name: 'Accessibilité handicap', description: 'Conformité du règlement intérieur et conditions d\'accessibilité aux PSH.', methodology: 'Désignez un référent handicap et documentez les aménagements. Utilisez le module Accessibilité EDUZEN.' },
    ]
  },
  {
    number: 4,
    name: 'Adéquation des moyens pédagogiques',
    description: 'L\'adéquation des moyens pédagogiques, techniques et d\'encadrement aux prestations mises en œuvre.',
    indicators: [
      { number: 17, name: 'Moyens humains et techniques', description: 'Adéquation des moyens humains et techniques aux prestations.', methodology: 'Conservez les CV et diplômes des formateurs dans EDUZEN. Listez les équipements techniques utilisés.' },
      { number: 18, name: 'Coordination des apprentis', description: 'Coordination des acteurs de l\'alternance (CFA).', methodology: 'Indicateur spécifique CFA : documentez les échanges avec les maîtres d\'apprentissage et tuteurs.' },
      { number: 19, name: 'Ressources pédagogiques', description: 'Mise à disposition des ressources pédagogiques et accès aux ressources.', methodology: 'Les supports de cours doivent être accessibles aux stagiaires. Utilisez la médiathèque EDUZEN.' },
      { number: 20, name: 'Personnels dédiés handicap', description: 'Personnel dédié à l\'accompagnement des PSH.', methodology: 'Nommez un référent handicap formé. Documentez ses actions dans le module Accessibilité.' },
    ]
  },
  {
    number: 5,
    name: 'Qualification et développement des compétences',
    description: 'La qualification et le développement des connaissances et compétences des personnels.',
    indicators: [
      { number: 21, name: 'Compétences des intervenants', description: 'Détermination des compétences des intervenants internes et/ou externes.', methodology: 'Créez une fiche formateur avec CV, diplômes et expériences. EDUZEN stocke ces documents de manière sécurisée.' },
      { number: 22, name: 'Développement des compétences', description: 'Entretien et développement des compétences des salariés.', methodology: 'Établissez un plan de formation pour votre équipe. Tracez les formations suivies par vos formateurs.' },
    ]
  },
  {
    number: 6,
    name: 'Inscription dans l\'environnement professionnel',
    description: 'L\'inscription et l\'investissement du prestataire dans son environnement professionnel.',
    indicators: [
      { number: 23, name: 'Veille légale et réglementaire', description: 'Réalisation d\'une veille légale et réglementaire sur la formation professionnelle.', methodology: 'Abonnez-vous aux newsletters officielles (DGEFP, France Compétences). Documentez votre veille dans EDUZEN.' },
      { number: 24, name: 'Veille sur les évolutions', description: 'Veille sur les évolutions des compétences, métiers et emplois.', methodology: 'Participez aux salons professionnels et mettez à jour vos programmes en conséquence.' },
      { number: 25, name: 'Veille technologique', description: 'Veille sur les innovations pédagogiques et technologiques.', methodology: 'Testez de nouveaux outils pédagogiques. EDUZEN intègre les dernières innovations e-learning.' },
      { number: 26, name: 'Mobilisation des acteurs', description: 'Mobilisation des expertises et ressources pour accompagner les bénéficiaires handicapés.', methodology: 'Construisez un réseau de partenaires (Cap Emploi, AGEFIPH). Documentez ces partenariats.' },
      { number: 27, name: 'Réseau CFA', description: 'Conformité aux conditions de sous-traitance (CFA).', methodology: 'Indicateur spécifique CFA : formalisez les conventions avec vos partenaires et sous-traitants.' },
      { number: 28, name: 'Ingénierie de formation', description: 'Ingénierie de formation selon besoins de recrutement des entreprises (CFA).', methodology: 'Indicateur spécifique CFA : travaillez avec les entreprises pour adapter vos formations à leurs besoins.' },
    ]
  },
  {
    number: 7,
    name: 'Recueil et prise en compte des appréciations',
    description: 'Le recueil et la prise en compte des appréciations et des réclamations des parties prenantes.',
    indicators: [
      { number: 29, name: 'Modalités de recueil', description: 'Recueil des appréciations des parties prenantes.', methodology: 'Envoyez systématiquement les questionnaires de satisfaction. EDUZEN les envoie automatiquement en fin de formation.' },
      { number: 30, name: 'Traitement des réclamations', description: 'Traitement des difficultés rencontrées par les parties prenantes.', methodology: 'Mettez en place une procédure de réclamation. Tracez chaque réclamation et sa résolution dans EDUZEN.' },
      { number: 31, name: 'Mesures d\'amélioration', description: 'Mesures d\'amélioration à partir de l\'analyse des appréciations.', methodology: 'Analysez les retours et mettez en œuvre des actions correctives. Documentez l\'amélioration continue.' },
      { number: 32, name: 'Amélioration continue', description: 'Amélioration continue par l\'analyse des appréciations et réclamations.', methodology: 'Tenez un registre des améliorations réalisées suite aux retours. EDUZEN génère des rapports d\'analyse automatiques.' },
    ]
  },
]

// ============================================================================
// Service
// ============================================================================

export class AuditorPortalService {
  private supabase: SupabaseClient<any>

  constructor(supabaseClient: SupabaseClient<any>) {
    if (!supabaseClient) {
      throw new Error('SupabaseClient is required for AuditorPortalService')
    }
    this.supabase = supabaseClient
  }

  // --------------------------------------------------------------------------
  // Génération et gestion des liens temporaires
  // --------------------------------------------------------------------------

  /**
   * Génère un lien d'accès temporaire pour un auditeur
   * @returns Le token clair (à envoyer à l'auditeur) - le hash est stocké en DB
   */
  async generateAccessLink(
    organizationId: string,
    createdBy: string,
    options: {
      auditorName: string
      auditorEmail?: string
      auditorOrganization?: string
      auditId?: string
      validityHours?: number
      permissions?: Partial<AuditorPermissions>
      notes?: string
    }
  ): Promise<{ token: string; link: AuditorAccessLink; url: string }> {
    // Générer un token cryptographiquement sécurisé
    const token = generateToken()
    const tokenHash = await hashToken(token)

    // Calculer la date d'expiration (défaut: 48h)
    const validityHours = options.validityHours || 48
    const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000)

    // Permissions par défaut
    const permissions: AuditorPermissions = {
      view_indicators: true,
      view_evidence: true,
      view_corrective_actions: true,
      export_pdf: true,
      sampling_mode: options.permissions?.sampling_mode ?? false,
      ...options.permissions,
    }

    const { data, error } = await this.supabase
      .from('auditor_access_links')
      .insert({
        organization_id: organizationId,
        token_hash: tokenHash,
        auditor_name: options.auditorName,
        auditor_email: options.auditorEmail,
        auditor_organization: options.auditorOrganization,
        audit_id: options.auditId,
        expires_at: expiresAt.toISOString(),
        created_by: createdBy,
        permissions,
        notes: options.notes,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating auditor access link:', error)
      throw error
    }

    // Construire l'URL publique
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const url = `${baseUrl}/audit/${token}`

    return { token, link: data, url }
  }

  /**
   * Valide un token et récupère le lien associé
   */
  async validateToken(token: string): Promise<AuditorAccessLink | null> {
    const tokenHash = await hashToken(token)

    const { data, error } = await this.supabase
      .from('auditor_access_links')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      return null
    }

    // Mettre à jour les statistiques d'accès
    await this.supabase
      .from('auditor_access_links')
      .update({
        last_accessed_at: new Date().toISOString(),
        access_count: (data.access_count || 0) + 1,
      })
      .eq('id', data.id)

    return data
  }

  /**
   * Désactive un lien d'accès
   */
  async revokeLink(linkId: string): Promise<void> {
    const { error } = await this.supabase
      .from('auditor_access_links')
      .update({ is_active: false })
      .eq('id', linkId)

    if (error) throw error
  }

  /**
   * Récupère tous les liens d'accès d'une organisation
   */
  async getAccessLinks(organizationId: string): Promise<AuditorAccessLink[]> {
    const { data, error } = await this.supabase
      .from('auditor_access_links')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // --------------------------------------------------------------------------
  // Données pour le portail auditeur
  // --------------------------------------------------------------------------

  /**
   * Récupère toutes les données nécessaires pour le portail auditeur
   */
  async getAuditorPortalData(token: string): Promise<AuditorPortalData | null> {
    const link = await this.validateToken(token)
    if (!link) return null

    const organizationId = link.organization_id

    // Récupérer l'organisation
    const { data: org } = await this.supabase
      .from('organizations')
      .select('id, name, logo_url')
      .eq('id', organizationId)
      .single()

    // Récupérer les indicateurs Qualiopi
    const { data: indicators } = await this.supabase
      .from('qualiopi_indicators')
      .select('*')
      .eq('organization_id', organizationId)
      .order('indicator_code', { ascending: true })

    // Récupérer le comptage des preuves par indicateur
    const { data: evidenceCounts } = await this.supabase
      .rpc('get_evidence_count_by_indicator', { org_id: organizationId })

    // Récupérer les preuves automatisées
    const { data: evidence } = await this.supabase
      .from('compliance_evidence_automated')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'valid')
      .order('event_date', { ascending: false })
      .limit(500)

    // Construire les données enrichies des indicateurs
    const enrichedIndicators = (indicators || []).map((ind: any) => {
      const counts = (evidenceCounts || []).find(
        (ec: EvidenceCountByIndicator) => ec.indicator_number === parseInt(ind.indicator_code, 10)
      )
      return {
        id: ind.id,
        indicator_code: ind.indicator_code,
        indicator_name: ind.indicator_name,
        category: ind.category,
        status: ind.status,
        compliance_rate: ind.compliance_rate,
        evidence_count: counts?.evidence_count || 0,
        auto_evidence_count: counts?.auto_count || 0,
        manual_evidence_count: counts?.manual_count || 0,
      }
    })

    // Calculer les statistiques globales
    const totalEvidence = (evidence || []).length
    const autoEvidence = (evidence || []).filter(
      (e: ComplianceEvidenceAutomated) => e.source === 'system' || e.source === 'automated_detection'
    ).length
    const compliantIndicators = (indicators || []).filter((i: any) => i.status === 'compliant').length

    return {
      organization: org || { id: organizationId, name: 'Organisation' },
      criteria: QUALIOPI_REFERENTIAL,
      indicators: enrichedIndicators,
      evidence: evidence || [],
      stats: {
        total_indicators: (indicators || []).length,
        compliant_indicators: compliantIndicators,
        compliance_rate: (indicators || []).length > 0
          ? Math.round((compliantIndicators / (indicators || []).length) * 100)
          : 0,
        total_evidence: totalEvidence,
        auto_evidence_percentage: totalEvidence > 0
          ? Math.round((autoEvidence / totalEvidence) * 100)
          : 0,
      },
      link: {
        auditor_name: link.auditor_name,
        auditor_organization: link.auditor_organization,
        expires_at: link.expires_at,
        permissions: link.permissions as AuditorPermissions,
      },
    }
  }

  /**
   * Récupère les preuves pour un indicateur spécifique
   */
  async getEvidenceForIndicator(
    organizationId: string,
    indicatorNumber: number
  ): Promise<ComplianceEvidenceAutomated[]> {
    const { data, error } = await this.supabase
      .from('compliance_evidence_automated')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('indicator_number', indicatorNumber)
      .eq('status', 'valid')
      .order('event_date', { ascending: false })

    if (error) {
      logger.error('Error fetching evidence for indicator:', error)
      return []
    }

    return data || []
  }

  // --------------------------------------------------------------------------
  // Mode Échantillonnage (Killer Feature)
  // --------------------------------------------------------------------------

  /**
   * Recherche des preuves par échantillon (stagiaire, session, etc.)
   */
  async searchBySample(
    organizationId: string,
    searchTerm: string
  ): Promise<ComplianceEvidenceAutomated[]> {
    const { data, error } = await this.supabase
      .rpc('search_evidence_by_sample', {
        org_id: organizationId,
        search_term: searchTerm,
      })

    if (error) {
      logger.error('Error searching evidence by sample:', error)
      // Fallback à une recherche simple
      const { data: fallbackData } = await this.supabase
        .from('compliance_evidence_automated')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'valid')
        .or(`entity_name.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`)
        .order('event_date', { ascending: false })
        .limit(100)

      return fallbackData || []
    }

    return data || []
  }

  // --------------------------------------------------------------------------
  // Compliance Engine - Enregistrement automatique des preuves
  // --------------------------------------------------------------------------

  /**
   * Enregistre une preuve automatiquement détectée
   */
  async trackEvidence(
    organizationId: string,
    indicatorNumber: number,
    data: {
      title: string
      description?: string
      evidenceType: ComplianceEvidenceAutomated['evidence_type']
      entityType?: ComplianceEvidenceAutomated['entity_type']
      entityId?: string
      entityName?: string
      fileUrl?: string
      fileType?: string
      metadata?: Record<string, unknown>
    }
  ): Promise<ComplianceEvidenceAutomated> {
    // Générer un hash pour l'immuabilité
    const actionHash = await hashToken(JSON.stringify({
      organizationId,
      indicatorNumber,
      title: data.title,
      timestamp: new Date().toISOString(),
    }))

    const { data: evidence, error } = await this.supabase
      .from('compliance_evidence_automated')
      .insert({
        organization_id: organizationId,
        indicator_number: indicatorNumber,
        evidence_type: data.evidenceType,
        source: 'system',
        entity_type: data.entityType,
        entity_id: data.entityId,
        entity_name: data.entityName,
        title: data.title,
        description: data.description,
        file_url: data.fileUrl,
        file_type: data.fileType,
        metadata: data.metadata || {},
        status: 'valid',
        confidence_score: 100, // Score max car généré par le système
        action_hash: actionHash,
        event_date: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      logger.error('Error tracking compliance evidence:', error)
      throw error
    }

    return evidence
  }

  // --------------------------------------------------------------------------
  // Journalisation des accès auditeur
  // --------------------------------------------------------------------------

  /**
   * Enregistre une action de l'auditeur
   */
  async logAuditorAction(
    linkId: string,
    action: 'page_view' | 'indicator_view' | 'evidence_view' | 'document_download' | 'pdf_export' | 'sampling_search' | 'session_start' | 'session_end',
    details?: {
      indicatorNumber?: number
      entityType?: string
      entityId?: string
      searchQuery?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    await this.supabase
      .from('auditor_access_logs')
      .insert({
        link_id: linkId,
        action,
        indicator_number: details?.indicatorNumber,
        entity_type: details?.entityType,
        entity_id: details?.entityId,
        search_query: details?.searchQuery,
        ip_address: details?.ipAddress,
        user_agent: details?.userAgent,
      })
  }
}

// Note: Ne pas créer d'instance singleton car le service nécessite un client Supabase
// Utiliser `new AuditorPortalService(supabaseClient)` dans les routes API ou composants serveur
