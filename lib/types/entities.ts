/**
 * Types TypeScript stricts pour les entités métier
 * Ces types sont utilisés dans toute l'application pour garantir la sécurité de type
 */

import type { TableRow } from './supabase-helpers'

// ========== UTILISATEURS ==========

export type UserRole = 'admin' | 'teacher' | 'secretary' | 'staff'

export interface User extends TableRow<'users'> {
  id: string
  organization_id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  avatar_url?: string | null
  created_at: string
  updated_at?: string | null
}

export interface CreateUserInput {
  email: string
  full_name: string
  role: UserRole
  organization_id: string
  is_active?: boolean
  avatar_url?: string
}

export interface UpdateUserInput {
  full_name?: string
  role?: UserRole
  is_active?: boolean
  avatar_url?: string
}

// ========== ÉTUDIANTS ==========

export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'dropped'

export interface Student extends TableRow<'students'> {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  student_number: string
  status: StudentStatus
  date_of_birth?: string | null
  address?: string | null
  created_at: string
  updated_at?: string | null
}

export interface CreateStudentInput {
  organization_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  student_number: string
  status?: StudentStatus
  date_of_birth?: string
  address?: string
}

export interface UpdateStudentInput {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  status?: StudentStatus
  date_of_birth?: string
  address?: string
}

// ========== PAIEMENTS ==========

export type PaymentMethod = 'card' | 'cash' | 'bank_transfer' | 'sepa' | 'mobile_money'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'
export type PaymentProvider = 'stripe' | 'paypal' | 'mobile_money_provider'

export interface Payment extends TableRow<'payments'> {
  id: string
  organization_id: string
  invoice_id: string
  student_id: string
  amount: number
  currency: string
  payment_method: PaymentMethod
  payment_provider?: PaymentProvider | null
  transaction_id?: string | null
  status: PaymentStatus
  paid_at?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at?: string | null
}

export interface CreatePaymentInput {
  organization_id: string
  invoice_id: string
  student_id: string
  amount: number
  currency: string
  payment_method: PaymentMethod
  payment_provider?: PaymentProvider
  transaction_id?: string
  status?: PaymentStatus
  paid_at?: string
  metadata?: Record<string, unknown>
}

export interface UpdatePaymentInput {
  status?: PaymentStatus
  paid_at?: string
  transaction_id?: string
  metadata?: Record<string, unknown>
}

// ========== FACTURES ==========

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type InvoiceType = 'invoice' | 'quote' | 'receipt'

export interface Invoice extends TableRow<'invoices'> {
  id: string
  organization_id: string
  student_id: string
  invoice_number: string
  type: InvoiceType
  status: InvoiceStatus
  total_amount: number
  paid_amount: number
  remaining_amount: number
  currency: string
  due_date?: string | null
  issued_at?: string | null
  paid_at?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at?: string | null
}

export interface CreateInvoiceInput {
  organization_id: string
  student_id: string
  invoice_number: string
  type: InvoiceType
  total_amount: number
  currency: string
  due_date?: string
  issued_at?: string
  metadata?: Record<string, unknown>
}

// ========== MESSAGERIE ==========

export type ConversationType = 'direct' | 'group'

export interface Conversation extends TableRow<'conversations'> {
  id: string
  organization_id: string
  conversation_type: ConversationType
  name?: string | null
  created_by: string
  is_archived: boolean
  last_message_at?: string | null
  created_at: string
  updated_at?: string | null
}

export interface Message extends TableRow<'messages'> {
  id: string
  conversation_id: string
  sender_id?: string | null
  student_sender_id?: string | null
  content: string
  attachments?: Array<{
    path: string
    filename: string
    type: string
    size: number
  }> | null
  reply_to_id?: string | null
  is_deleted: boolean
  deleted_at?: string | null
  created_at: string
  updated_at?: string | null
}

export interface CreateMessageInput {
  conversation_id: string
  content: string
  attachments?: Array<{
    path: string
    filename: string
    type: string
    size: number
  }>
  reply_to_id?: string
}

// ========== SESSIONS ==========

export type SessionStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled'

export interface Session extends TableRow<'sessions'> {
  id: string
  organization_id: string
  formation_id: string
  name: string
  description?: string | null
  start_date: string
  end_date: string
  status: SessionStatus
  max_students?: number | null
  created_at: string
  updated_at?: string | null
}

export interface CreateSessionInput {
  organization_id: string
  formation_id: string
  name: string
  description?: string
  start_date: string
  end_date: string
  status?: SessionStatus
  max_students?: number
}

// ========== PRÉSENCES ==========

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface Attendance extends TableRow<'attendance'> {
  id: string
  organization_id: string
  session_id: string
  student_id: string
  date: string
  status: AttendanceStatus
  slot_id?: string | null
  notes?: string | null
  created_at: string
  updated_at?: string | null
}

export interface CreateAttendanceInput {
  organization_id: string
  session_id: string
  student_id: string
  date: string
  status: AttendanceStatus
  slot_id?: string
  notes?: string
}

// ========== ÉVALUATIONS ==========

export interface EvaluationTemplate extends TableRow<'evaluation_templates'> {
  id: string
  organization_id?: string | null
  name: string
  description?: string | null
  is_system: boolean
  created_at: string
  updated_at?: string | null
}

export interface EvaluationTemplateQuestion extends TableRow<'evaluation_template_questions'> {
  id: string
  template_id: string
  question_text: string
  question_type: string
  order: number
  required: boolean
  options?: Record<string, unknown> | null
  created_at: string
}

// ========== DOCUMENTS ==========

export type DocumentType = 
  | 'report_card' 
  | 'certificate' 
  | 'attendance_certificate' 
  | 'invoice' 
  | 'quote' 
  | 'receipt'
  | 'learning_portfolio'

export interface Document extends TableRow<'documents'> {
  id: string
  organization_id: string
  student_id?: string | null
  session_id?: string | null
  type: DocumentType
  title: string
  content?: string | null
  file_url?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at?: string | null
}

// ========== ORGANISATIONS ==========

export interface Organization extends TableRow<'organizations'> {
  id: string
  name: string
  code: string
  type: string
  country?: string | null
  currency?: string | null
  language?: string | null
  timezone?: string | null
  subscription_tier: string
  created_at: string
  updated_at?: string | null
}

// ========== HELPERS ==========

/**
 * Type guard pour vérifier si un objet est un User
 */
export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    'full_name' in obj &&
    'role' in obj &&
    'organization_id' in obj
  )
}

/**
 * Type guard pour vérifier si un objet est un Student
 */
export function isStudent(obj: unknown): obj is Student {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'first_name' in obj &&
    'last_name' in obj &&
    'student_number' in obj &&
    'organization_id' in obj
  )
}

/**
 * Type guard pour vérifier si un objet est un Payment
 */
export function isPayment(obj: unknown): obj is Payment {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'amount' in obj &&
    'currency' in obj &&
    'payment_method' in obj &&
    'status' in obj &&
    'organization_id' in obj
  )
}



