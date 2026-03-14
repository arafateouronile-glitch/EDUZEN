export type CustomerEventType =
  | 'signup'
  | 'login'
  | 'onboarding_started'
  | 'onboarding_step_1_completed'
  | 'onboarding_step_2_completed'
  | 'onboarding_step_3_completed'
  | 'onboarding_completed'
  | 'first_formation_created'
  | 'first_session_created'
  | 'first_student_added'
  | 'first_document_generated'
  | 'first_pdf_generated'
  | 'billing_started'
  | 'subscription_upgraded'
  | 'subscription_canceled'
  | 'payment_failed'
  | 'payment_succeeded'
  | 'integration_connected'
  | 'integration_disconnected'
  | 'support_ticket_created'
  | 'feature_used'
  | 'error'

export interface CustomerEvent {
  id: string
  organization_id: string
  user_id: string | null
  event_type: string
  metadata: Record<string, unknown>
  created_at: string
  user_name?: string | null
}

export type HealthStatus = 'active' | 'at_risk' | 'inactive' | 'new'

export interface OrganizationCrmSummary {
  organization_id: string
  organization_name: string
  subscription_status: string | null
  subscription_tier: string | null
  last_activity_at: string | null
  health_status: HealthStatus
  current_milestone: string
  event_count: number
  days_since_activity: number | null
}
