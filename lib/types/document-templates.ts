/**
 * Types pour le système de modèles de documents avec header/footer
 */

export type DocumentType =
  | 'convention'
  | 'facture'
  | 'devis'
  | 'convocation'
  | 'contrat'
  | 'attestation' // Attestation générique
  | 'attestation_reussite'
  | 'certificat_realisation' // OF - Certificat de réalisation
  | 'certificat_scolarite'
  | 'releve_notes'
  | 'attestation_entree'
  | 'reglement_interieur'
  | 'cgv'
  | 'programme'
  | 'attestation_assiduite'
  | 'livret_accueil' // OF - Livret d'accueil
  | 'emargement' // OF - Feuille d'émargement
  | 'convention_formateur' // Convention de prestation avec formateur indépendant
  | 'ordre_de_mission' // Ordre de mission pour déplacement d'un formateur
  | 'attestation_defraiement' // Attestation de défraiement pour membres de jury

export interface DocumentTemplate {
  id: string
  organization_id: string
  type: DocumentType
  name: string
  
  // Header configuration
  header: HeaderConfig | null
  header_enabled: boolean
  header_height: number
  
  // Body configuration
  content: DocumentContent
  
  // Footer configuration
  footer: FooterConfig | null
  footer_enabled: boolean
  footer_height: number
  
  // Document settings
  is_default: boolean
  is_active: boolean
  page_size: 'A4' | 'Letter' | 'Legal'
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  font_size?: number // Taille de police par défaut en points (pt)
  
  // Template DOCX natif pour Word (docxtemplater)
  // Si défini, utilisé pour la génération Word au lieu de la conversion HTML
  docx_template_url?: string | null
  
  /** Zones de signature (Template Picker) : [{ id, page, x, y, w, h }, ...] en % (0–1) */
  sign_zones?: SignZoneTemplate[]
  
  created_at: string
  updated_at: string
}

export interface SignZoneTemplate {
  id: string
  page: number
  x: number
  y: number
  w: number
  h: number
  label?: string
}

export interface HeaderConfig {
  enabled: boolean
  height: number
  layout?: 'logo_left_info_right' | 'logo_centered' | 'banner_gradient' | 'minimal' | 'professional' | 'custom'
  backgroundColor?: {
    type: 'solid' | 'gradient'
    color?: string // For solid
    from?: string // For gradient
    to?: string // For gradient
    direction?: 'horizontal' | 'vertical' | number // angle in degrees
  }
  backgroundImage?: {
    url: string
    opacity: number
  }
  border?: {
    bottom?: {
      enabled: boolean
      color: string
      width: number
      style?: 'solid' | 'dashed' | 'dotted'
    }
  }
  elements: TemplateElement[]
  repeatOnAllPages: boolean
  content?: string
}

export interface FooterConfig {
  enabled: boolean
  height: number
  layout?: 'simple' | 'complete' | 'minimal' | 'professional' | 'modern' | 'custom'
  backgroundColor?: string
  border?: {
    top?: {
      enabled: boolean
      color: string
      width: number
      style?: 'solid' | 'dashed' | 'dotted' | 'double'
    }
  }
  pagination?: {
    enabled: boolean
    format: 'Page X' | 'X / Y' | 'Page X / Y' | 'Page X sur Y' | string // custom format
    position: 'left' | 'center' | 'right'
    style?: {
      fontSize?: number
      color?: string
      fontWeight?: 'normal' | 'bold'
    }
  }
  elements: TemplateElement[]
  repeatOnAllPages: boolean
  differentFirstPage?: boolean // Different footer on first page
  content?: string
}

export interface DocumentContent {
  pageSize: 'A4' | 'Letter' | 'Legal'
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  elements: TemplateElement[]
  html?: string // Contenu HTML du document (utilisé pour la génération)
}

export type ElementType =
  | 'text'
  | 'image'
  | 'line'
  | 'spacer'
  | 'table'
  | 'signature'
  | 'qrcode'
  | 'barcode'
  | 'variable'
  | 'html'

export interface TemplateElement {
  id: string
  type: ElementType
  
  // Position and size
  position: {
    x: number
    y: number
  }
  size?: {
    width: number
    height: number
  }
  
  // Content (for text, variables)
  content?: string
  /** Contenu HTML brut (pour type 'html') */
  html?: string
  
  // Source (for images, QR codes)
  source?: string
  
  // Styles
  style?: {
    fontSize?: number
    fontWeight?: 'normal' | 'bold' | 'light' | 'medium' | 'semibold'
    fontStyle?: 'normal' | 'italic'
    color?: string
    backgroundColor?: string
    textAlign?: 'left' | 'center' | 'right' | 'justify'
    lineHeight?: number
    textDecoration?: 'none' | 'underline' | 'line-through'
    opacity?: number
    border?: {
      enabled: boolean
      color: string
      width: number
      style?: 'solid' | 'dashed' | 'dotted'
      radius?: number
    }
    padding?: {
      top?: number
      right?: number
      bottom?: number
      left?: number
    }
    margin?: {
      top?: number
      right?: number
      bottom?: number
      left?: number
    }
  }
  
  // Alignment (for images, etc.)
  alignment?: 'left' | 'center' | 'right'
  
  // Table specific
  tableData?: {
    headers: string[]
    rows: string[][]
    headerStyle?: Record<string, unknown>
    cellStyle?: Record<string, unknown>
    borders?: boolean
    alternateRows?: boolean
  }
  
  // QR Code specific
  qrData?: string // Data to encode
  
  // Barcode specific
  barcodeData?: string
  barcodeType?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC'
  
  // Visibility and order
  visible?: boolean
  zIndex?: number
  locked?: boolean // Prevent editing
  
  // Metadata
  label?: string // For signature zones, etc.
  showLabel?: boolean
}

export interface GeneratedDocument {
  id: string
  organization_id: string
  template_id: string | null
  type: DocumentType
  file_name: string
  file_url: string
  format: 'PDF' | 'DOCX' | 'ODT' | 'HTML'
  page_count: number
  related_entity_type?: string | null // 'student', 'session', 'enrollment', 'invoice', etc.
  related_entity_id?: string | null
  metadata?: Record<string, unknown>
  generated_by?: string | null
  created_at: string
}

// Types pour les layouts prédéfinis
export type HeaderLayout = 'logo_left_info_right' | 'logo_centered' | 'banner_gradient' | 'minimal' | 'professional' | 'custom'
export type FooterLayout = 'simple' | 'complete' | 'minimal' | 'professional' | 'modern' | 'custom'

// Types pour les variables disponibles
export interface DocumentVariables {
  // Établissement
  ecole_nom?: string
  ecole_logo?: string
  ecole_adresse?: string
  ecole_ville?: string
  ecole_telephone?: string
  ecole_email?: string
  ecole_site_web?: string
  ecole_slogan?: string
  organisation_nom?: string
  organisation_adresse?: string
  organisation_telephone?: string
  organisation_email?: string
  organisation_logo?: string
  organisation_site_web?: string
  
  // Élève
  eleve_nom?: string
  eleve_prenom?: string
  eleve_numero?: string
  eleve_date_naissance?: string
  eleve_classe?: string
  eleve_photo?: string
  classe_nom?: string
  etudiant_nom?: string
  etudiant_prenom?: string
  etudiant_nom_complet?: string
  etudiant_numero?: string
  etudiant_date_naissance?: string
  etudiant_adresse?: string
  etudiant_code_postal?: string
  etudiant_ville?: string
  etudiant_telephone?: string
  etudiant_email?: string
  etudiant_photo?: string
  
  // Tuteur
  tuteur_nom?: string
  tuteur_telephone?: string
  tuteur_email?: string
  tuteur_adresse?: string
  
  // Programme
  programme_nom?: string
  programme_code?: string
  programme_description?: string
  programme_sous_titre?: string
  programme_categorie?: string
  programme_version?: string
  programme_date_version?: string
  programme_duree_heures?: string
  programme_duree_jours?: string
  programme_duree_totale?: string
  programme_objectifs?: string
  programme_profil_apprenants?: string
  programme_public_concerne?: string
  programme_contenu?: string
  programme_suivi_execution?: string
  programme_modalites?: string
  programme_modalites_certification?: string
  programme_certification?: string
  programme_type_action?: string
  programme_qualite?: string
  programme_eligible_cpf?: string
  programme_code_cpf?: string
  programme_prix_entreprise?: string
  programme_prix_particulier?: string
  programme_prix_independant?: string
  programme_domaines_competences?: string
  programme_prerequis?: string
  programme_methodes_pedagogiques?: string
  programme_delai_acces?: string
  programme_accessibilite?: string
  programme_nombre_formations?: string
  programme_nombre_sessions?: string
  
  // Formation
  formation_nom?: string
  formation_code?: string
  formation_duree?: string
  formation_prix?: string
  formation_prerequis?: string
  formation_dates?: string
  formation_description?: string
  formation_contenu?: string
  formation_certification?: string
  diplome_ou_certification?: string
  formation_public_concerne?: string
  formation_equipe_pedagogique?: string
  formation_ressources?: string
  formation_supports?: string
  formation_qualite_et_resultats?: string
  
  // Session
  session_nom?: string
  session_debut?: string
  session_date_debut?: string
  session_fin?: string
  session_date_fin?: string
  session_lieu?: string
  session_horaires?: string
  session_effectif?: string
  session_modalite?: string
  
  // Finances
  modules_lignes?: unknown
  modules?: unknown
  modules_lignes_facture?: unknown
  montant?: string
  montant_lettres?: string
  montant_ttc?: string
  montant_ht?: string
  tva?: string
  date_paiement?: string
  mode_paiement?: string
  numero_facture?: string
  facture_numero?: string
  reference_devis?: string
  facture_date_emission?: string
  facture_date_echeance?: string
  facture_montant?: string
  facture_tva?: string
  facture_total?: string
  facture_devise?: string
  facture_items?: string
  iban?: string
  bic?: string
  langue?: string
  
  // Dates
  date_jour?: string
  date_aujourd_hui?: string
  date_emission?: string
  annee_scolaire?: string
  annee_courante?: string
  annee_academique?: string
  trimestre?: string
  semestre?: string
  
  // Notes
  moyenne?: string
  moyenne_classe?: string
  classement?: string
  appreciations?: string
  mention?: string
  
  // Divers
  numero_document?: string
  validite_document?: string
  code_verification?: string
  
  // Pagination (spécifique au footer)
  numero_page?: number
  total_pages?: number
  
  // Génération
  date_generation?: string
  heure?: string
  annee_actuelle?: string
  copyright?: string
  
  // Variables supplémentaires pour documents spécifiques
  ecole_siret?: string
  ecole_rcs?: string
  ecole_code_postal?: string

  // Entreprise / Client
  entreprise_nom?: string
  entreprise_adresse?: string
  entreprise_code_postal?: string
  entreprise_ville?: string
  entreprise_telephone?: string
  entreprise_email?: string
  entreprise_siret?: string
  entreprise_tva?: string
  entreprise_contact?: string
  entreprise_representant?: string
  destinataire_du_devis?: string
  adresse_destinataire?: string
  code_postal_destinataire?: string
  ville_destinataire?: string
  ecole_region?: string
  ecole_numero_declaration?: string
  ecole_representant?: string
  eleve_adresse?: string
  eleve_code_postal?: string
  eleve_ville?: string
  eleve_telephone?: string
  eleve_email?: string
  taux_tva?: string
  date_echeance?: string
  numero_devis?: string
  validite_devis?: string
  convocation_objet?: string
  convocation_date?: string
  convocation_heure?: string
  convocation_lieu?: string
  convocation_adresse?: string
  convocation_duree?: string
  convocation_contenu?: string
  date_confirmation?: string
  matiere_1?: string
  matiere_2?: string
  matiere_3?: string
  coef_1?: string
  coef_2?: string
  coef_3?: string
  note_1?: string
  note_2?: string
  note_3?: string
  appreciation_1?: string
  appreciation_2?: string
  appreciation_3?: string
  effectif_classe?: string
  formation_objectifs?: string
  prerequis_1?: string
  prerequis_2?: string
  prerequis_3?: string
  module_1_titre?: string
  module_1_duree?: string
  module_1_contenu_1?: string
  module_1_contenu_2?: string
  module_1_contenu_3?: string
  module_2_titre?: string
  module_2_duree?: string
  module_2_contenu_1?: string
  module_2_contenu_2?: string
  module_2_contenu_3?: string
  module_3_titre?: string
  module_3_duree?: string
  module_3_contenu_1?: string
  module_3_contenu_2?: string
  module_3_contenu_3?: string
  horaires_ouverture?: string
  horaires_cours?: string
  heures_suivies?: string
  heures_totales?: string
  taux_assiduite?: string

  // Formateur indépendant (convention_formateur)
  formateur_nom?: string
  formateur_prenom?: string
  formateur_email?: string
  formateur_adresse?: string
  formateur_code_postal?: string
  formateur_ville?: string
  formateur_telephone?: string
  formateur_siret?: string
  formateur_specialite?: string
  formateur_statut?: string // Ex: Micro-entrepreneur, SASU, Profession libérale...
  convention_date_debut?: string
  convention_date_fin?: string
  convention_tarif_horaire?: string
  convention_heures_total?: string
  convention_montant_total?: string
  convention_modalites_paiement?: string
  convention_lieu_formation?: string
  convention_notes?: string

  // Jury / Attestation de défraiement
  jury_nom?: string
  jury_prenom?: string
  jury_qualite?: string
  jury_email?: string
  jury_adresse?: string
  jury_code_postal?: string
  jury_ville?: string
  jury_iban?: string
  jury_bic?: string
  examen_nom?: string
  examen_date?: string
  examen_lieu?: string
  examen_reference?: string
  examen_type?: string
  defraiement_reference?: string
  defraiement_nb_heures?: string
  defraiement_taux_vacation?: string
  defraiement_vacations?: string
  defraiement_transport?: string
  defraiement_distance_km?: string
  defraiement_taux_km?: string
  defraiement_repas?: string
  defraiement_hebergement?: string
  defraiement_total?: string
  defraiement_notes?: string

  // Ordre de mission
  mission_reference?: string
  mission_objet?: string
  mission_formation?: string
  mission_session_ref?: string
  mission_lieu?: string
  mission_lieu_adresse?: string
  mission_date_debut?: string
  mission_date_fin?: string
  mission_horaires?: string
  mission_duree_jours?: string
  mission_duree_heures?: string
  mission_transport_autorise?: string
  mission_distance_aller?: string
  mission_indemnite_km?: string
  mission_frais_repas_midi?: string
  mission_frais_repas_soir?: string
  mission_frais_hebergement?: string
  mission_avance?: string
  mission_autorisant_nom?: string
  mission_autorisant_qualite?: string
  mission_notes?: string
}

// Type pour les données d'édition
export interface TemplateEditData {
  template: DocumentTemplate
  activeTab: 'header' | 'body' | 'footer'
  selectedElementId: string | null
  zoomLevel: number
  showGrid: boolean
  showRulers: boolean
}

// Types pour les API
export interface CreateTemplateInput {
  organization_id: string
  type: DocumentType
  name: string
  header?: Partial<HeaderConfig> | any
  content: DocumentContent | any
  footer?: Partial<FooterConfig> | any
  header_enabled?: boolean
  header_height?: number
  footer_enabled?: boolean
  footer_height?: number
  page_size?: 'A4' | 'Letter' | 'Legal'
  margins?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  font_size?: number
  is_default?: boolean
  is_active?: boolean
  sign_zones?: SignZoneTemplate[]
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string
}

export interface CopyHeaderFooterInput {
  sourceTemplateId: string
  copyHeader: boolean
  copyFooter: boolean
}

// Types pour la génération de documents
export interface GenerateDocumentInput {
  template_id: string
  related_entity_type?: string
  related_entity_id?: string
  format: 'PDF' | 'DOCX' | 'ODT' | 'HTML' | 'ODT' | 'HTML'
  variables: DocumentVariables
  options?: {
    sendEmail?: boolean
    emailTo?: string
    download?: boolean
    print?: boolean
  }
}






