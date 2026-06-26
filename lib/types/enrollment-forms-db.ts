/**
 * Types additionnels pour les nouvelles tables enrollment_forms.
 * À intégrer dans database.types.ts après régénération via `supabase gen types`.
 */

export interface EnrollmentFormTemplateRow {
  id: string
  org_id: string
  name: string
  description: string | null
  fields: unknown
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EnrollmentFormLinkRow {
  id: string
  token: string
  org_id: string
  template_id: string
  session_id: string | null
  expires_at: string | null
  max_uses: number | null
  current_uses: number
  is_active: boolean
  label: string | null
  created_at: string
}

export interface EnrollmentSubmissionRow {
  id: string
  link_id: string
  org_id: string
  session_id: string | null
  student_id: string | null
  form_data: unknown
  documents: unknown
  status: string
  ip_address: string | null
  submitted_at: string
}
