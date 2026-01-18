/**
 * Types pour le système de modèles de documents avec header/footer
 */

export type DocumentType =
  | 'convention'
  | 'facture'
  | 'devis'
  | 'convocation'
  | 'contrat'
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
  
  created_at: string
  updated_at: string
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
    headerStyle?: Record<string, any>
    cellStyle?: Record<string, any>
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
  metadata?: Record<string, any>
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
  
  // Élève
  eleve_nom?: string
  eleve_prenom?: string
  eleve_numero?: string
  eleve_date_naissance?: string
  eleve_classe?: string
  eleve_photo?: string
  
  // Tuteur
  tuteur_nom?: string
  tuteur_telephone?: string
  tuteur_email?: string
  tuteur_adresse?: string
  
  // Programme
  programme_nom?: string
  programme_code?: string
  programme_description?: string
  programme_objectifs?: string
  programme_duree_totale?: string
  programme_nombre_formations?: string
  programme_nombre_sessions?: string
  programme_public_concerne?: string
  programme_modalites?: string
  programme_certification?: string
  
  // Formation
  formation_nom?: string
  formation_code?: string
  formation_duree?: string
  formation_prix?: string
  formation_dates?: string
  formation_description?: string
  formation_certification?: string
  formation_public_concerne?: string
  formation_equipe_pedagogique?: string
  
  // Session
  session_nom?: string
  session_debut?: string
  session_fin?: string
  session_lieu?: string
  session_horaires?: string
  session_effectif?: string
  session_modalite?: string
  
  // Finances
  montant?: string
  montant_lettres?: string
  montant_ttc?: string
  montant_ht?: string
  tva?: string
  date_paiement?: string
  mode_paiement?: string
  numero_facture?: string
  
  // Dates
  date_jour?: string
  date_emission?: string
  annee_scolaire?: string
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
  ecole_code_postal?: string
  ecole_region?: string
  ecole_numero_declaration?: string
  ecole_representant?: string
  eleve_adresse?: string
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






