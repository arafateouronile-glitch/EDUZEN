import { Database } from '@/types/database.types'
import type { TableRow } from './supabase-helpers'

/**
 * Types pour les données retournées par les queries Supabase avec relations
 * Ces types permettent d'éviter les `as any` dans les composants
 */

// Types pour les sessions avec relations
export type SessionWithRelations = TableRow<'sessions'> & {
  formations?: TableRow<'formations'> & {
    programs?: TableRow<'programs'>
  }
}

// Types pour les formations avec relations
export type FormationWithRelations = TableRow<'formations'> & {
  programs?: TableRow<'programs'>
  sessions?: TableRow<'sessions'>[]
}

// Types pour les programmes avec relations
export type ProgramWithRelations = TableRow<'programs'> & {
  formations?: FormationWithRelations[]
}

// Types pour les étudiants avec relations
export type StudentWithRelations = TableRow<'students'> & {
  class_id?: string | null
}

// Types pour les inscriptions avec relations
export type EnrollmentWithRelations = TableRow<'enrollments'> & {
  students?: StudentWithRelations
  sessions?: SessionWithRelations
}

// Types pour les présences avec relations
export type AttendanceWithRelations = TableRow<'attendance'> & {
  students?: StudentWithRelations
  sessions?: SessionWithRelations
}

// Types pour les notes avec relations
export type GradeWithRelations = TableRow<'grades'> & {
  students?: StudentWithRelations
  sessions?: SessionWithRelations
}

// Types pour les paiements avec relations
export type PaymentWithRelations = TableRow<'payments'> & {
  invoices?: TableRow<'invoices'>
  students?: StudentWithRelations
}

// Types pour les factures avec relations
export type InvoiceWithRelations = TableRow<'invoices'> & {
  enrollments?: EnrollmentWithRelations[]
  students?: StudentWithRelations
}

// Types pour les documents avec relations
export type DocumentWithRelations = TableRow<'documents'> & {
  students?: StudentWithRelations
}

// Helper pour typer les arrays retournés par Supabase
export type QueryResult<T> = T | T[] | null | undefined

// Helper pour typer les données avec relations optionnelles
export type WithOptionalRelations<T, R extends Record<string, any>> = T & {
  [K in keyof R]?: R[K]
}

























