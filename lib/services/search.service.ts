/**
 * Service de recherche globale
 * Recherche dans étudiants, sessions, documents, messages
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { logger } from '@/lib/utils/logger'

type Student = TableRow<'students'>
type Session = TableRow<'sessions'>
type Document = TableRow<'documents'>
type Conversation = TableRow<'conversations'>

export interface SearchResult {
  type: 'student' | 'session' | 'document' | 'message'
  id: string
  title: string
  description?: string
  url: string
  metadata?: Record<string, unknown>
}

export class SearchService {
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient: SupabaseClient<Database>) {

    this.supabase = supabaseClient!

  }

  /**
   * Recherche par filtre rapide (mapping)
   */
  async searchByFilter(
    filterId: string,
    organizationId: string,
    textQuery?: string
  ): Promise<SearchResult[]> {
    try {
      const now = new Date().toISOString()
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      switch (filterId) {
        case 'enrolled_students': {
          const { data, error } = await this.supabase
            .from('enrollments')
            .select('student_id, students!inner(id, first_name, last_name, email, student_number)')
            .eq('status', 'confirmed')
            .limit(20)

          if (error || !data) return []

          type EnrollRow = { student_id: string | null; students: { id: string; first_name: string | null; last_name: string | null; email: string | null; student_number: string | null } }
          const seen = new Set<string>()
          return (data as unknown as EnrollRow[])
            .filter((row) => {
              if (!row.student_id || seen.has(row.student_id)) return false
              seen.add(row.student_id)
              const s = row.students
              if (textQuery) {
                const q = textQuery.toLowerCase()
                const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase()
                if (!name.includes(q) && !(s.email || '').toLowerCase().includes(q)) return false
              }
              return true
            })
            .map((row) => {
              const s = row.students
              return {
                type: 'student' as const,
                id: s.id,
                title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.student_number || 'Étudiant',
                description: s.email || s.student_number || undefined,
                url: `/dashboard/students/${s.id}`,
              }
            })
        }

        case 'active_sessions': {
          let query = this.supabase
            .from('sessions')
            .select('id, name, start_date, end_date')
            .eq('organization_id', organizationId)
            .lte('start_date', now)
            .gte('end_date', now)
            .limit(20)

          if (textQuery) query = query.ilike('name', `%${textQuery}%`)

          const { data, error } = await query
          if (error || !data) return []

          return (data as Pick<Session, 'id' | 'name' | 'start_date' | 'end_date'>[]).map((s) => ({
            type: 'session' as const,
            id: s.id,
            title: s.name || 'Session',
            description: s.end_date
              ? `Jusqu'au ${new Date(s.end_date).toLocaleDateString('fr-FR')}`
              : undefined,
            url: `/dashboard/sessions/${s.id}`,
          }))
        }

        case 'upcoming_sessions': {
          let query = this.supabase
            .from('sessions')
            .select('id, name, start_date, end_date')
            .eq('organization_id', organizationId)
            .gt('start_date', now)
            .order('start_date', { ascending: true })
            .limit(20)

          if (textQuery) query = query.ilike('name', `%${textQuery}%`)

          const { data, error } = await query
          if (error || !data) return []

          return (data as Pick<Session, 'id' | 'name' | 'start_date' | 'end_date'>[]).map((s) => ({
            type: 'session' as const,
            id: s.id,
            title: s.name || 'Session',
            description: s.start_date
              ? `Débute le ${new Date(s.start_date).toLocaleDateString('fr-FR')}`
              : undefined,
            url: `/dashboard/sessions/${s.id}`,
          }))
        }

        case 'overdue_payments': {
          const { data, error } = await this.supabase
            .from('enrollments')
            .select('id, student_id, total_amount, paid_amount, session_id, students!inner(id, first_name, last_name, email)')
            .eq('payment_status', 'overdue')
            .limit(20)

          if (error || !data) return []

          type OverdueRow = { id: string; student_id: string | null; total_amount: number; paid_amount: number | null; session_id: string | null; students: { id: string; first_name: string | null; last_name: string | null; email: string | null } }
          return (data as unknown as OverdueRow[])
            .filter((row) => {
              if (!textQuery) return true
              const q = textQuery.toLowerCase()
              const s = row.students
              return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q) ||
                (s.email || '').toLowerCase().includes(q)
            })
            .map((row) => {
              const s = row.students
              const remaining = row.total_amount - (row.paid_amount || 0)
              return {
                type: 'student' as const,
                id: s.id,
                title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Apprenant',
                description: `${remaining.toLocaleString('fr-FR')} € restants`,
                url: `/dashboard/students/${s.id}`,
              }
            })
        }

        case 'pending_enrollments': {
          const { data, error } = await this.supabase
            .from('enrollments')
            .select('id, student_id, session_id, students!inner(id, first_name, last_name, email), sessions(name)')
            .eq('status', 'pending')
            .limit(20)

          if (error || !data) return []

          type PendingRow = { id: string; student_id: string | null; session_id: string | null; students: { id: string; first_name: string | null; last_name: string | null; email: string | null }; sessions: { name: string | null } | null }
          return (data as unknown as PendingRow[])
            .filter((row) => {
              if (!textQuery) return true
              const q = textQuery.toLowerCase()
              const s = row.students
              return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q) ||
                (s.email || '').toLowerCase().includes(q)
            })
            .map((row) => {
              const s = row.students
              return {
                type: 'student' as const,
                id: s.id,
                title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Apprenant',
                description: row.sessions?.name ? `Session : ${row.sessions.name}` : 'En attente de confirmation',
                url: `/dashboard/students/${s.id}`,
              }
            })
        }

        case 'new_students': {
          let query = this.supabase
            .from('students')
            .select('id, first_name, last_name, email, student_number, created_at')
            .eq('organization_id', organizationId)
            .gte('created_at', thirtyDaysAgo)
            .order('created_at', { ascending: false })
            .limit(20)

          if (textQuery) {
            query = query.or(
              `first_name.ilike.%${textQuery}%,last_name.ilike.%${textQuery}%,email.ilike.%${textQuery}%`
            )
          }

          const { data, error } = await query
          if (error || !data) return []

          type NewStudent = { id: string; first_name: string | null; last_name: string | null; email: string | null; student_number: string | null; created_at: string | null }
          return (data as NewStudent[]).map((s) => ({
            type: 'student' as const,
            id: s.id,
            title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.student_number || 'Apprenant',
            description: s.created_at
              ? `Inscrit le ${new Date(s.created_at).toLocaleDateString('fr-FR')}`
              : undefined,
            url: `/dashboard/students/${s.id}`,
          }))
        }

        case 'completed_sessions': {
          let query = this.supabase
            .from('sessions')
            .select('id, name, start_date, end_date')
            .eq('organization_id', organizationId)
            .lt('end_date', now)
            .order('end_date', { ascending: false })
            .limit(20)

          if (textQuery) query = query.ilike('name', `%${textQuery}%`)

          const { data, error } = await query
          if (error || !data) return []

          return (data as Pick<Session, 'id' | 'name' | 'start_date' | 'end_date'>[]).map((s) => ({
            type: 'session' as const,
            id: s.id,
            title: s.name || 'Session',
            description: s.end_date
              ? `Terminée le ${new Date(s.end_date).toLocaleDateString('fr-FR')}`
              : undefined,
            url: `/dashboard/sessions/${s.id}`,
          }))
        }

        case 'partial_payments': {
          const { data, error } = await this.supabase
            .from('enrollments')
            .select('id, student_id, total_amount, paid_amount, students!inner(id, first_name, last_name, email)')
            .eq('payment_status', 'partial')
            .limit(20)

          if (error || !data) return []

          type PartialRow = { id: string; student_id: string | null; total_amount: number; paid_amount: number | null; students: { id: string; first_name: string | null; last_name: string | null; email: string | null } }
          return (data as unknown as PartialRow[])
            .filter((row) => {
              if (!textQuery) return true
              const q = textQuery.toLowerCase()
              const s = row.students
              return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q) ||
                (s.email || '').toLowerCase().includes(q)
            })
            .map((row) => {
              const s = row.students
              const remaining = row.total_amount - (row.paid_amount || 0)
              return {
                type: 'student' as const,
                id: s.id,
                title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Apprenant',
                description: `${(row.paid_amount || 0).toLocaleString('fr-FR')} € / ${row.total_amount.toLocaleString('fr-FR')} € — reste ${remaining.toLocaleString('fr-FR')} €`,
                url: `/dashboard/students/${s.id}`,
              }
            })
        }

        case 'cpf_enrollments': {
          const { data, error } = await this.supabase
            .from('cpf_enrollments')
            .select('id, learner_id, cpf_funding_amount, status, start_date, students!inner(id, first_name, last_name, email)')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(20)

          if (error || !data) return []

          type CpfRow = { id: string; learner_id: string; cpf_funding_amount: number; status: string | null; start_date: string | null; students: { id: string; first_name: string | null; last_name: string | null; email: string | null } }
          return (data as unknown as CpfRow[])
            .filter((row) => {
              if (!textQuery) return true
              const q = textQuery.toLowerCase()
              const s = row.students
              return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q) ||
                (s.email || '').toLowerCase().includes(q)
            })
            .map((row) => {
              const s = row.students
              return {
                type: 'student' as const,
                id: s.id,
                title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Apprenant',
                description: `CPF — ${row.cpf_funding_amount.toLocaleString('fr-FR')} €${row.start_date ? ` · ${new Date(row.start_date).toLocaleDateString('fr-FR')}` : ''}`,
                url: `/dashboard/students/${s.id}`,
              }
            })
        }

        case 'recent_absences': {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          const { data, error } = await this.supabase
            .from('attendance')
            .select('id, student_id, date, session_id, students!inner(id, first_name, last_name, email), sessions(name)')
            .eq('organization_id', organizationId)
            .eq('status', 'absent')
            .gte('date', sevenDaysAgo)
            .order('date', { ascending: false })
            .limit(20)

          if (error || !data) return []

          type AbsenceRow = { id: string; student_id: string | null; date: string; session_id: string | null; students: { id: string; first_name: string | null; last_name: string | null; email: string | null }; sessions: { name: string | null } | null }
          const seen = new Set<string>()
          return (data as unknown as AbsenceRow[])
            .filter((row) => {
              if (!row.student_id) return false
              if (seen.has(row.student_id)) return false
              seen.add(row.student_id)
              if (!textQuery) return true
              const q = textQuery.toLowerCase()
              const s = row.students
              return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q)
            })
            .map((row) => {
              const s = row.students
              return {
                type: 'student' as const,
                id: s.id,
                title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Apprenant',
                description: `Absent le ${new Date(row.date).toLocaleDateString('fr-FR')}${row.sessions?.name ? ` · ${row.sessions.name}` : ''}`,
                url: `/dashboard/students/${s.id}`,
              }
            })
        }

        case 'unpaid_invoices': {
          let query = this.supabase
            .from('invoices')
            .select('id, student_id, invoice_number, total_amount, due_date, students!inner(id, first_name, last_name, email)')
            .eq('organization_id', organizationId)
            .in('status', ['pending', 'overdue'])
            .lt('due_date', now)
            .order('due_date', { ascending: true })
            .limit(20)

          const { data, error } = await query
          if (error || !data) return []

          type InvoiceRow = { id: string; student_id: string | null; invoice_number: string; total_amount: number; due_date: string; students: { id: string; first_name: string | null; last_name: string | null; email: string | null } }
          return (data as unknown as InvoiceRow[])
            .filter((row) => {
              if (!textQuery) return true
              const q = textQuery.toLowerCase()
              const s = row.students
              return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q) ||
                row.invoice_number.toLowerCase().includes(q)
            })
            .map((row) => {
              const s = row.students
              return {
                type: 'student' as const,
                id: s.id,
                title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Apprenant',
                description: `Facture ${row.invoice_number} — ${row.total_amount.toLocaleString('fr-FR')} € · Échue le ${new Date(row.due_date).toLocaleDateString('fr-FR')}`,
                url: `/dashboard/students/${s.id}`,
              }
            })
        }

        case 'delivered_certificates': {
          const { data, error } = await this.supabase
            .from('certification_certificates')
            .select('id, delivered_to, issue_date, certificate_number, organization_id, students!inner(id, first_name, last_name, email)')
            .eq('organization_id', organizationId)
            .not('delivered_at', 'is', null)
            .order('delivered_at', { ascending: false })
            .limit(20)

          if (error || !data) return []

          type CertRow = { id: string; delivered_to: string | null; issue_date: string; certificate_number: string | null; students: { id: string; first_name: string | null; last_name: string | null; email: string | null } }
          return (data as unknown as CertRow[])
            .filter((row) => {
              if (!textQuery) return true
              const q = textQuery.toLowerCase()
              const s = row.students
              return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q) ||
                (row.certificate_number || '').toLowerCase().includes(q)
            })
            .map((row) => {
              const s = row.students
              return {
                type: 'student' as const,
                id: s.id,
                title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Apprenant',
                description: `Certificat${row.certificate_number ? ` ${row.certificate_number}` : ''} · Délivré le ${new Date(row.issue_date).toLocaleDateString('fr-FR')}`,
                url: `/dashboard/students/${s.id}`,
              }
            })
        }

        case 'unenrolled_students': {
          // Apprenants sans aucune inscription active
          const { data: enrolled } = await this.supabase
            .from('enrollments')
            .select('student_id')
            .eq('status', 'confirmed')
          const enrolledIds = (enrolled || []).map((e: { student_id: string | null }) => e.student_id).filter(Boolean) as string[]

          let query = this.supabase
            .from('students')
            .select('id, first_name, last_name, email, student_number, created_at')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(20)

          if (enrolledIds.length > 0) query = query.not('id', 'in', `(${enrolledIds.join(',')})`)
          if (textQuery) query = query.or(`first_name.ilike.%${textQuery}%,last_name.ilike.%${textQuery}%,email.ilike.%${textQuery}%`)

          const { data, error } = await query
          if (error || !data) return []

          type UnenrolledRow = { id: string; first_name: string | null; last_name: string | null; email: string | null; student_number: string | null; created_at: string | null }
          return (data as UnenrolledRow[]).map((s) => ({
            type: 'student' as const,
            id: s.id,
            title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.student_number || 'Apprenant',
            description: s.email || 'Aucune session active',
            url: `/dashboard/students/${s.id}`,
          }))
        }

        case 'payment_reminders': {
          const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
          const { data, error } = await this.supabase
            .from('payment_reminders')
            .select('id, invoice_id, recipient_email, sent_at, reminder_type, invoices!inner(student_id, invoice_number, total_amount, students!inner(id, first_name, last_name, email))')
            .eq('organization_id', organizationId)
            .gte('sent_at', fourteenDaysAgo)
            .not('sent_at', 'is', null)
            .order('sent_at', { ascending: false })
            .limit(20)

          if (error || !data) return []

          type ReminderRow = { id: string; recipient_email: string | null; sent_at: string | null; reminder_type: string; invoices: { invoice_number: string; total_amount: number; students: { id: string; first_name: string | null; last_name: string | null; email: string | null } } }
          const seen = new Set<string>()
          return (data as unknown as ReminderRow[])
            .filter((row) => {
              const sid = row.invoices?.students?.id
              if (!sid || seen.has(sid)) return false
              seen.add(sid)
              if (!textQuery) return true
              const q = textQuery.toLowerCase()
              const s = row.invoices.students
              return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q)
            })
            .map((row) => {
              const s = row.invoices.students
              return {
                type: 'student' as const,
                id: s.id,
                title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Apprenant',
                description: row.sent_at
                  ? `Relance envoyée le ${new Date(row.sent_at).toLocaleDateString('fr-FR')} · Facture ${row.invoices.invoice_number}`
                  : undefined,
                url: `/dashboard/students/${s.id}`,
              }
            })
        }

        case 'accessibility_needs': {
          let query = this.supabase
            .from('accessibility_student_needs')
            .select('id, student_id, disability_type_ids, needs_exam_accommodations, students!inner(id, first_name, last_name, email)')
            .eq('has_disability', true)
            .limit(20)

          const { data, error } = await query
          if (error || !data) return []

          type AccessRow = { id: string; student_id: string; needs_exam_accommodations: boolean | null; students: { id: string; first_name: string | null; last_name: string | null; email: string | null } }
          return (data as unknown as AccessRow[])
            .filter((row) => {
              if (!textQuery) return true
              const q = textQuery.toLowerCase()
              const s = row.students
              return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q) ||
                (s.email || '').toLowerCase().includes(q)
            })
            .map((row) => {
              const s = row.students
              return {
                type: 'student' as const,
                id: s.id,
                title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Apprenant',
                description: row.needs_exam_accommodations
                  ? 'Aménagements d\'examen requis'
                  : 'Besoins d\'accessibilité déclarés',
                url: `/dashboard/students/${s.id}`,
              }
            })
        }

        case 'empty_sessions': {
          // Sessions sans aucune inscription confirmée
          const { data: filledSessions } = await this.supabase
            .from('enrollments')
            .select('session_id')
            .eq('status', 'confirmed')
          const filledIds = [...new Set((filledSessions || []).map((e: { session_id: string | null }) => e.session_id).filter(Boolean) as string[])]

          let query = this.supabase
            .from('sessions')
            .select('id, name, start_date, end_date')
            .eq('organization_id', organizationId)
            .gte('end_date', now)
            .order('start_date', { ascending: true })
            .limit(20)

          if (filledIds.length > 0) query = query.not('id', 'in', `(${filledIds.join(',')})`)
          if (textQuery) query = query.ilike('name', `%${textQuery}%`)

          const { data, error } = await query
          if (error || !data) return []

          return (data as Pick<Session, 'id' | 'name' | 'start_date' | 'end_date'>[]).map((s) => ({
            type: 'session' as const,
            id: s.id,
            title: s.name || 'Session',
            description: s.start_date
              ? `Débute le ${new Date(s.start_date).toLocaleDateString('fr-FR')} · 0 apprenant`
              : '0 apprenant',
            url: `/dashboard/sessions/${s.id}`,
          }))
        }

        case 'pending_signatures': {
          const { data, error } = await this.supabase
            .from('of_generated_documents')
            .select('id, student_id, title, created_at, students!inner(id, first_name, last_name, email)')
            .eq('organization_id', organizationId)
            .eq('signature_status', 'pending')
            .order('created_at', { ascending: false })
            .limit(20)

          if (error || !data) return []

          type SigRow = { id: string; student_id: string | null; title: string | null; created_at: string | null; students: { id: string; first_name: string | null; last_name: string | null; email: string | null } }
          return (data as unknown as SigRow[])
            .filter((row) => {
              if (!textQuery) return true
              const q = textQuery.toLowerCase()
              const s = row.students
              return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q) ||
                (row.title || '').toLowerCase().includes(q)
            })
            .map((row) => {
              const s = row.students
              return {
                type: 'student' as const,
                id: s.id,
                title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Apprenant',
                description: row.title || 'Document en attente de signature',
                url: `/dashboard/students/${s.id}`,
              }
            })
        }

        case 'qualiopi_audits': {
          let query = this.supabase
            .from('qualiopi_audits')
            .select('id, audit_type, audit_date, status, auditor_name, overall_score')
            .eq('organization_id', organizationId)
            .order('audit_date', { ascending: false })
            .limit(20)

          const { data, error } = await query
          if (error || !data) return []

          type AuditRow = { id: string; audit_type: string; audit_date: string; status: string | null; auditor_name: string | null; overall_score: number | null }
          return (data as AuditRow[])
            .filter((row) => {
              if (!textQuery) return true
              const q = textQuery.toLowerCase()
              return row.audit_type.toLowerCase().includes(q) || (row.auditor_name || '').toLowerCase().includes(q)
            })
            .map((row) => ({
              type: 'document' as const,
              id: row.id,
              title: `Audit ${row.audit_type}`,
              description: [
                new Date(row.audit_date).toLocaleDateString('fr-FR'),
                row.auditor_name,
                row.overall_score != null ? `Score : ${row.overall_score}%` : null,
              ].filter(Boolean).join(' · '),
              url: `/dashboard/settings/qualiopi`,
            }))
        }

        case 'active_formations': {
          let query = this.supabase
            .from('formations')
            .select('id, name, subtitle, category, duration_hours')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('name', { ascending: true })
            .limit(20)

          if (textQuery) query = query.ilike('name', `%${textQuery}%`)

          const { data, error } = await query
          if (error || !data) return []

          type FormationRow = { id: string; name: string; subtitle: string | null; category: string | null; duration_hours: number | null }
          return (data as FormationRow[]).map((f) => ({
            type: 'document' as const,
            id: f.id,
            title: f.name,
            description: [f.category, f.duration_hours ? `${f.duration_hours}h` : null].filter(Boolean).join(' · ') || f.subtitle || undefined,
            url: `/dashboard/formations/${f.id}`,
          }))
        }

        case 'upcoming_events': {
          let query = this.supabase
            .from('calendar_events')
            .select('id, title, start_time, end_time, event_type, location')
            .eq('organization_id', organizationId)
            .gt('start_time', now)
            .order('start_time', { ascending: true })
            .limit(20)

          if (textQuery) query = query.ilike('title', `%${textQuery}%`)

          const { data, error } = await query
          if (error || !data) return []

          type EventRow = { id: string; title: string | null; start_time: string; end_time: string; event_type: string | null; location: string | null }
          return (data as EventRow[]).map((e) => ({
            type: 'session' as const,
            id: e.id,
            title: e.title || 'Événement',
            description: [
              new Date(e.start_time).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
              e.location,
            ].filter(Boolean).join(' · '),
            url: `/dashboard/calendar`,
          }))
        }

        case 'student_companies': {
          const { data, error } = await this.supabase
            .from('student_entities')
            .select('id, student_id, position, is_current, students!inner(id, first_name, last_name, email), entities!inner(name)')
            .eq('is_current', true)
            .limit(20)

          if (error || !data) return []

          type StudentEntityRow = { id: string; student_id: string; position: string | null; students: { id: string; first_name: string | null; last_name: string | null; email: string | null }; entities: { name: string } }
          return (data as unknown as StudentEntityRow[])
            .filter((row) => {
              if (!textQuery) return true
              const q = textQuery.toLowerCase()
              const s = row.students
              return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q) ||
                row.entities.name.toLowerCase().includes(q)
            })
            .map((row) => {
              const s = row.students
              return {
                type: 'student' as const,
                id: s.id,
                title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Apprenant',
                description: [row.entities.name, row.position].filter(Boolean).join(' · '),
                url: `/dashboard/students/${s.id}`,
              }
            })
        }

        case 'anomaly_alerts': {
          const { data, error } = await this.supabase
            .from('anomaly_alerts')
            .select('id, alert_type, created_at, is_sent, anomalies!inner(id, anomaly_type_id, organization_id, anomaly_types(name))')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(20)

          if (error || !data) return []

          type AlertRow = { id: string; alert_type: string | null; created_at: string; is_sent: boolean | null; anomalies: { id: string; anomaly_types: { name: string } | null } }
          return (data as unknown as AlertRow[])
            .filter((row) => {
              if (!textQuery) return true
              const q = textQuery.toLowerCase()
              return (row.alert_type || '').toLowerCase().includes(q) ||
                (row.anomalies?.anomaly_types?.name || '').toLowerCase().includes(q)
            })
            .map((row) => ({
              type: 'document' as const,
              id: row.id,
              title: row.anomalies?.anomaly_types?.name || row.alert_type || 'Alerte',
              description: new Date(row.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
              url: `/dashboard/anomalies`,
            }))
        }

        case 'sent_documents': {
          let query = this.supabase
            .from('learner_documents')
            .select('id, student_id, title, type, sent_at, students!inner(id, first_name, last_name, email)')
            .eq('organization_id', organizationId)
            .order('sent_at', { ascending: false })
            .limit(20)

          if (textQuery) query = query.or(`title.ilike.%${textQuery}%`)

          const { data, error } = await query
          if (error || !data) return []

          type LearnerDocRow = { id: string; student_id: string; title: string; type: string | null; sent_at: string; students: { id: string; first_name: string | null; last_name: string | null; email: string | null } }
          return (data as unknown as LearnerDocRow[]).map((row) => {
            const s = row.students
            return {
              type: 'student' as const,
              id: s.id,
              title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Apprenant',
              description: `${row.title}${row.type ? ` · ${row.type}` : ''} · ${new Date(row.sent_at).toLocaleDateString('fr-FR')}`,
              url: `/dashboard/students/${s.id}`,
            }
          })
        }

        case 'graded_submissions': {
          const { data, error } = await this.supabase
            .from('assignment_submissions')
            .select('id, student_id, submitted_at, score, status, assignments!inner(id, title, course_id), students!inner(id, first_name, last_name, email)')
            .is('graded_at', null)
            .eq('status', 'submitted')
            .order('submitted_at', { ascending: true })
            .limit(20)

          if (error || !data) return []

          type SubmissionRow = { id: string; student_id: string; submitted_at: string; score: number | null; assignments: { id: string; title: string }; students: { id: string; first_name: string | null; last_name: string | null; email: string | null } }
          return (data as unknown as SubmissionRow[])
            .filter((row) => {
              if (!textQuery) return true
              const q = textQuery.toLowerCase()
              const s = row.students
              return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q) ||
                row.assignments.title.toLowerCase().includes(q)
            })
            .map((row) => {
              const s = row.students
              return {
                type: 'student' as const,
                id: s.id,
                title: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Apprenant',
                description: `${row.assignments.title} · Rendu le ${new Date(row.submitted_at).toLocaleDateString('fr-FR')}`,
                url: `/dashboard/students/${s.id}`,
              }
            })
        }

        default:
          return []
      }
    } catch (error) {
      logger.error('SearchService.searchByFilter', error, { organizationId, filterId })
      return []
    }
  }

  /**
   * Recherche globale dans tous les types de contenu
   */
  async searchGlobal(
    query: string,
    organizationId: string,
    userId?: string
  ): Promise<SearchResult[]> {
    try {
      if (!query || query.trim().length < 2) {
        return []
      }

      const searchTerm = query.trim().toLowerCase()
      const results: SearchResult[] = []

      const [students, sessions, documents, conversations] = await Promise.all([
        this.searchStudents(searchTerm, organizationId),
        this.searchSessions(searchTerm, organizationId),
        this.searchDocuments(searchTerm, organizationId),
        userId ? this.searchConversations(searchTerm, organizationId, userId) : Promise.resolve([]),
      ])

      results.push(...students, ...sessions, ...documents, ...conversations)

      return results.sort((a, b) => {
        const aStarts = a.title.toLowerCase().startsWith(searchTerm) ? 1 : 0
        const bStarts = b.title.toLowerCase().startsWith(searchTerm) ? 1 : 0
        return bStarts - aStarts
      })
    } catch (error) {
      logger.error('SearchService.searchGlobal', error, { organizationId, query: query?.slice(0, 50) })
      throw error
    }
  }

  /**
   * Recherche dans les étudiants
   */
  private async searchStudents(
    searchTerm: string,
    organizationId: string
  ): Promise<SearchResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('students')
        .select('id, first_name, last_name, student_number, email')
        .eq('organization_id', organizationId)
        .or(
          `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,student_number.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        )
        .limit(10)

      if (error || !data) return []

      return (data as Pick<Student, 'id' | 'first_name' | 'last_name' | 'student_number' | 'email'>[]).map((student) => ({
      type: 'student' as const,
      id: student.id,
      title: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.student_number || 'Étudiant',
      description: student.student_number || student.email || undefined,
      url: `/dashboard/students/${student.id}`,
      metadata: {
        student_number: student.student_number,
        email: student.email,
      },
    }))
    } catch (error) {
      logger.error('SearchService.searchStudents', error, { organizationId, searchTerm: searchTerm.slice(0, 50) })
      return []
    }
  }

  /**
   * Recherche dans les sessions
   */
  private async searchSessions(
    searchTerm: string,
    organizationId: string
  ): Promise<SearchResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('sessions')
        .select('id, name, start_date, end_date')
        .eq('organization_id', organizationId)
        .ilike('name', `%${searchTerm}%`)
        .limit(10)

      if (error || !data) return []

      return (data as Pick<Session, 'id' | 'name' | 'start_date' | 'end_date'>[]).map((session) => ({
        type: 'session' as const,
        id: session.id,
        title: session.name || 'Session',
        description: session.start_date
          ? `Du ${new Date(session.start_date).toLocaleDateString('fr-FR')}`
          : undefined,
        url: `/dashboard/sessions/${session.id}`,
        metadata: {
          start_date: session.start_date,
          end_date: session.end_date,
        },
      }))
    } catch (error) {
      logger.error('SearchService.searchSessions', error, { organizationId, searchTerm: searchTerm.slice(0, 50) })
      return []
    }
  }

  /**
   * Recherche dans les documents
   */
  private async searchDocuments(
    searchTerm: string,
    organizationId: string
  ): Promise<SearchResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select('id, title, type, created_at')
        .eq('organization_id', organizationId)
        .ilike('title', `%${searchTerm}%`)
        .limit(10)

      if (error || !data) return []

      type DocSearchRow = { id: string; title?: string; type?: string; created_at?: string }
      return (data as DocSearchRow[]).map((doc) => ({
        type: 'document' as const,
        id: doc.id,
        title: doc.title || 'Document',
        description: doc.type || undefined,
        url: `/dashboard/documents`,
        metadata: {
          type: doc.type,
          created_at: doc.created_at,
        },
      }))
    } catch (error) {
      logger.error('SearchService.searchDocuments', error, { organizationId, searchTerm: searchTerm.slice(0, 50) })
      return []
    }
  }

  /**
   * Recherche dans les conversations/messages
   */
  private async searchConversations(
    searchTerm: string,
    organizationId: string,
    userId: string
  ): Promise<SearchResult[]> {
    try {
      const { data: conversations, error } = await this.supabase
        .from('conversations')
        .select('id, name, conversation_type')
        .eq('organization_id', organizationId)
        .ilike('name', `%${searchTerm}%`)
        .limit(5)

      if (error || !conversations) return []

      const conversationIds = conversations.map((c) => c.id)
      const { data: participants } = await this.supabase
        .from('conversation_participants')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .eq('user_id', userId)

      const userConversationIds = new Set(participants?.map((p) => p.conversation_id) || [])

      return conversations
        .filter((conv) => userConversationIds.has(conv.id))
        .map((conv: { id: string; name: string | null; conversation_type: string | null }) => ({
          type: 'message' as const,
          id: conv.id,
          title: conv.name ?? 'Conversation',
          description: conv.conversation_type === 'group' ? 'Groupe' : 'Direct',
          url: `/dashboard/messages/${conv.id}`,
          metadata: {
            conversation_type: conv.conversation_type,
          },
        }))
    } catch (error) {
      logger.error('SearchService.searchConversations', error, { organizationId, userId, searchTerm: searchTerm.slice(0, 50) })
      return []
    }
  }
}




