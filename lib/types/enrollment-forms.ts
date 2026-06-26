export type FormFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'file'
  | 'separator'

export type MapsTo =
  | 'student.first_name'
  | 'student.last_name'
  | 'student.email'
  | 'student.phone'
  | 'student.birth_date'
  | 'student.address'
  | 'student.company'
  | 'student.job_title'
  | 'student.accessibility_needs'
  | 'student.notes'
  | `student.custom_field_${number}`
  | 'document.cv'
  | 'document.id_card'
  | 'document.medical_certificate'
  | 'document.other'
  | 'enrollment.program_id'
  | 'enrollment.session_id'
  | 'enrollment.funding_type_id'

export type DynamicSource = 'programs' | 'sessions' | 'funding_types'

export interface FormField {
  id: string
  type: FormFieldType
  label: string
  placeholder?: string
  description?: string
  required: boolean
  order: number
  options?: string[]
  accept?: string
  max_size_mb?: number
  maps_to?: MapsTo
  dynamic_source?: DynamicSource
}

export interface EnrollmentFormTemplate {
  id: string
  org_id: string
  name: string
  description?: string | null
  fields: FormField[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EnrollmentFormLink {
  id: string
  token: string
  org_id: string
  template_id: string
  session_id?: string | null
  expires_at?: string | null
  max_uses?: number | null
  current_uses: number
  is_active: boolean
  label?: string | null
  created_at: string
}

export interface EnrollmentSubmission {
  id: string
  link_id: string
  org_id: string
  session_id?: string | null
  student_id?: string | null
  form_data: Record<string, unknown>
  documents: Array<{ field_id: string; storage_path: string; filename: string }>
  status: 'pending' | 'student_created' | 'error'
  ip_address?: string | null
  submitted_at: string
}

// Préréglages de champs standards
export const PRESET_FIELDS: Array<{
  id: string
  label: string
  type: FormFieldType
  maps_to: MapsTo
  required?: boolean
  accept?: string
  max_size_mb?: number
  dynamic_source?: DynamicSource
}> = [
  { id: 'preset_first_name', label: 'Prénom', type: 'text', maps_to: 'student.first_name', required: true },
  { id: 'preset_last_name', label: 'Nom', type: 'text', maps_to: 'student.last_name', required: true },
  { id: 'preset_email', label: 'Email', type: 'email', maps_to: 'student.email', required: true },
  { id: 'preset_phone', label: 'Téléphone', type: 'tel', maps_to: 'student.phone' },
  { id: 'preset_birth_date', label: 'Date de naissance', type: 'date', maps_to: 'student.birth_date' },
  { id: 'preset_company', label: 'Entreprise', type: 'text', maps_to: 'student.company' },
  { id: 'preset_job_title', label: 'Poste', type: 'text', maps_to: 'student.job_title' },
  { id: 'preset_address', label: 'Adresse', type: 'textarea', maps_to: 'student.address' },
  { id: 'preset_accessibility', label: 'Besoins d\'accessibilité', type: 'textarea', maps_to: 'student.accessibility_needs' },
  { id: 'preset_notes', label: 'Notes / informations complémentaires', type: 'textarea', maps_to: 'student.notes' },
  { id: 'preset_cv', label: 'CV', type: 'file', maps_to: 'document.cv', accept: '.pdf,.doc,.docx', max_size_mb: 10 },
  { id: 'preset_id_card', label: 'Pièce d\'identité', type: 'file', maps_to: 'document.id_card', accept: '.pdf,image/*', max_size_mb: 5 },
  { id: 'preset_medical', label: 'Certificat médical', type: 'file', maps_to: 'document.medical_certificate', accept: '.pdf,image/*', max_size_mb: 5 },
  { id: 'preset_other_doc', label: 'Autre document', type: 'file', maps_to: 'document.other', accept: '.pdf,.doc,.docx,image/*', max_size_mb: 10 },
  { id: 'preset_program', label: 'Formation souhaitée', type: 'select', maps_to: 'enrollment.program_id', dynamic_source: 'programs' },
  { id: 'preset_session', label: 'Session souhaitée', type: 'select', maps_to: 'enrollment.session_id', dynamic_source: 'sessions' },
  { id: 'preset_funding', label: 'Mode de financement', type: 'select', maps_to: 'enrollment.funding_type_id', dynamic_source: 'funding_types' },
]

export const CUSTOM_FIELD_TYPES: Array<{
  id: string
  label: string
  type: FormFieldType
  icon: string
}> = [
  { id: 'custom_text', label: 'Texte court', type: 'text', icon: 'Type' },
  { id: 'custom_textarea', label: 'Texte long', type: 'textarea', icon: 'AlignLeft' },
  { id: 'custom_select', label: 'Liste déroulante', type: 'select', icon: 'ChevronDown' },
  { id: 'custom_checkbox', label: 'Cases à cocher', type: 'checkbox', icon: 'CheckSquare' },
  { id: 'custom_radio', label: 'Choix unique', type: 'radio', icon: 'Circle' },
  { id: 'custom_date', label: 'Date', type: 'date', icon: 'Calendar' },
  { id: 'custom_file', label: 'Upload fichier', type: 'file', icon: 'Upload' },
  { id: 'custom_separator', label: 'Séparateur de section', type: 'separator', icon: 'Minus' },
]
