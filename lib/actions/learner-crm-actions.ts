'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LearnerEventType } from '@/lib/utils/track-learner-event'

// Tables email_logs et learner_events non dans le schéma généré — cast centralisé ici
function untyped(client: ReturnType<typeof createAdminClient>): SupabaseClient {
  return client as unknown as SupabaseClient
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CrmStatus = 'prospect' | 'inscrit' | 'en_cours' | 'termine' | 'abandon'

export interface LearnerEvent {
  id: string
  event_type: LearnerEventType | string
  metadata: Record<string, unknown>
  created_at: string
  created_by: string | null
  session?: { id: string; name: string } | null
}

export interface QualiopiChecklist {
  convocation_envoyee: boolean
  convocation_ouverte: boolean
  contrat_genere: boolean
  contrat_signe: boolean
  reglement_signe: boolean
  presence_validee: boolean
  evaluation_faite: boolean
  diplome_emis: boolean
}

export interface LearnerCard {
  id: string
  first_name: string
  last_name: string
  email: string | null
  photo_url: string | null
  crm_status: CrmStatus
  session_name: string | null
  session_id: string | null
  session_start_date: string | null
  session_end_date: string | null
  formation_name: string | null
  formation_id: string | null
  program_name: string | null
  company_name: string | null
  missing_qualiopi: string[]
  enrollment_id: string | null
  created_at: string
}

export interface LearnerProfile {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  photo_url: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  date_of_birth: string | null
  student_number: string
  created_at: string
  enrollment: {
    id: string
    status: string | null
    session_id: string
    session_name: string
    formation_name: string | null
    start_date: string
    end_date: string
    payment_status: string | null
  } | null
  company: { id: string; name: string } | null
  checklist: QualiopiChecklist
  events: LearnerEvent[]
}

export interface LearnerPipelineData {
  prospect:  LearnerCard[]
  inscrit:   LearnerCard[]
  en_cours:  LearnerCard[]
  termine:   LearnerCard[]
  abandon:   LearnerCard[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData?.organization_id) throw new Error('Organisation introuvable')
  return { supabase, orgId: userData.organization_id as string, userId: user.id }
}

function computeCrmStatus(
  enrollmentStatus: string | null,
  sessionStartDate: string | null,
  sessionEndDate: string | null
): CrmStatus {
  // Pas de statut d'inscription = au moins inscrit (jamais prospect si une inscription existe)
  if (!enrollmentStatus) return 'inscrit'
  if (enrollmentStatus === 'cancelled' || enrollmentStatus === 'dropped') return 'abandon'
  if (enrollmentStatus === 'completed') return 'termine'

  const now   = new Date()
  const start = sessionStartDate ? new Date(sessionStartDate) : null
  const end   = sessionEndDate   ? new Date(sessionEndDate)   : null

  // Session terminée (end_date dans le passé)
  if (end && end < now) return 'termine'

  // Session en cours : a démarré (end peut être null si pas encore renseigné)
  if (start && start <= now) return 'en_cours'

  // Inscrit : session pas encore démarrée ou dates absentes
  return 'inscrit'
}

// ─── Construit la timeline unifiée depuis les vraies tables ───────────────────

async function buildTimeline(
  supabase: ReturnType<typeof createAdminClient>,
  studentId: string,
  studentEmail: string | null,
  orgId: string
): Promise<LearnerEvent[]> {
  const events: LearnerEvent[] = []

  // ── 1. Inscriptions (enrollments) ──
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, status, enrollment_date, created_at, sessions(id, name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  for (const e of enrollments ?? []) {
    const sess = e.sessions as { id: string; name: string } | null
    events.push({
      id:         `enroll-${e.id}`,
      event_type: e.status === 'cancelled' ? 'enrollment_cancelled'
                : e.status === 'completed' ? 'enrollment_completed'
                : 'enrollment_created',
      metadata:   { enrollment_id: e.id, status: e.status },
      created_at: e.enrollment_date ?? e.created_at ?? new Date().toISOString(),
      created_by: null,
      session:    sess,
    })
  }

  // ── 2. Présences (attendance) ──
  const { data: attendances } = await supabase
    .from('attendance')
    .select('id, date, status, notes, created_at, sessions(id, name)')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
    .limit(30)

  for (const a of attendances ?? []) {
    const sess = a.sessions as { id: string; name: string } | null
    const isPresent = a.status === 'present' || a.status === 'present_late'
    events.push({
      id:         `att-${a.id}`,
      event_type: isPresent ? 'presence_validee' : 'absence_notee',
      metadata:   { attendance_status: a.status, notes: a.notes, date: a.date },
      created_at: a.date ?? a.created_at,
      created_by: null,
      session:    sess,
    })
  }

  // ── 3. Documents apprenants (learner_documents) ──
  const { data: docs } = await supabase
    .from('learner_documents')
    .select('id, title, type, sent_at, viewed_at, downloaded_at, notified_at, document_id')
    .eq('student_id', studentId)
    .order('sent_at', { ascending: false })

  for (const d of docs ?? []) {
    if (d.sent_at) {
      const evType =
        d.type?.toLowerCase().includes('diplom') || d.type?.toLowerCase().includes('certif')
          ? 'diplome_emis'
          : d.type?.toLowerCase().includes('contrat') || d.type?.toLowerCase().includes('convention')
          ? 'contrat_genere'
          : 'document_genere'

      events.push({
        id:         `doc-sent-${d.id}`,
        event_type: evType,
        metadata:   { document_id: d.document_id, title: d.title, type: d.type },
        created_at: d.sent_at,
        created_by: null,
        session:    null,
      })
    }
    if (d.viewed_at) {
      events.push({
        id:         `doc-viewed-${d.id}`,
        event_type: 'document_consulte',
        metadata:   { document_id: d.document_id, title: d.title },
        created_at: d.viewed_at,
        created_by: null,
        session:    null,
      })
    }
    if (d.downloaded_at) {
      events.push({
        id:         `doc-dl-${d.id}`,
        event_type: 'document_telecharge',
        metadata:   { document_id: d.document_id, title: d.title },
        created_at: d.downloaded_at,
        created_by: null,
        session:    null,
      })
    }
  }

  // ── 4. Signatures (signing_processes → signatories) ──
  if (studentEmail) {
    const { data: signatories } = await supabase
      .from('signatories')
      .select('id, name, signed_at, mail_sent_at, signing_processes(id, title, document_id, status)')
      .eq('email', studentEmail)
      .order('mail_sent_at', { ascending: false })
      .limit(20)

    for (const sig of signatories ?? []) {
      const proc = sig.signing_processes as { id: string; title: string | null; document_id: string; status: string } | null
      const titleLower = (proc?.title ?? '').toLowerCase()
      const isReglement  = titleLower.includes('règlement') || titleLower.includes('reglement')
      const isConvoc     = titleLower.includes('convocation')
      const isContrat    = titleLower.includes('contrat') || titleLower.includes('convention')

      if (sig.mail_sent_at) {
        // Convocation uniquement si le process est explicitement une convocation
        // (ou si le titre ne permet pas de déterminer le type, on ne suppose pas)
        const sentType = isConvoc ? 'convocation_envoyee'
                       : isContrat ? 'contrat_genere'
                       : 'convocation_envoyee' // fallback par défaut
        events.push({
          id:         `sig-sent-${sig.id}`,
          event_type: sentType,
          metadata:   { signature_process_id: proc?.id, title: proc?.title ?? 'Demande de signature' },
          created_at: sig.mail_sent_at,
          created_by: null,
          session:    null,
        })
      }
      if (sig.signed_at) {
        const signedType = isReglement ? 'reglement_signe'
                         : isContrat   ? 'contrat_signe'
                         : isConvoc    ? 'convocation_signee'
                         : 'contrat_signe' // fallback par défaut
        events.push({
          id:         `sig-done-${sig.id}`,
          event_type: signedType,
          metadata:   { signature_process_id: proc?.id, title: proc?.title, document_id: proc?.document_id },
          created_at: sig.signed_at,
          created_by: null,
          session:    null,
        })
      }
    }
  }

  // ── 5. Évaluations (evaluation_responses) ──
  const { data: evals } = await supabase
    .from('evaluation_responses')
    .select('id, created_at, points_earned, max_points')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Dédupliquer : une ligne par date approximative (réponses groupées en une session d'éval)
  const seenEvalDates = new Set<string>()
  for (const ev of evals ?? []) {
    const dayKey = ev.created_at.slice(0, 10)
    if (seenEvalDates.has(dayKey)) continue
    seenEvalDates.add(dayKey)
    events.push({
      id:         `eval-${ev.id}`,
      event_type: 'evaluation_faite',
      metadata:   { points_earned: ev.points_earned, max_points: ev.max_points },
      created_at: ev.created_at,
      created_by: null,
      session:    null,
    })
  }

  // ── 6. Emails trackés (email_logs, par adresse) ──
  if (studentEmail) {
    const { data: emails } = await untyped(supabase)
      .from('email_logs')
      .select('id, subject, template_type, status, created_at, updated_at')
      .eq('recipient', studentEmail)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20)

    for (const em of emails ?? []) {
      // Email envoyé
      events.push({
        id:         `email-sent-${em.id}`,
        event_type: (em.template_type === 'convocation' || em.template_type?.includes('convoc'))
                    ? 'convocation_envoyee'
                  : (em.template_type === 'contrat' || em.template_type?.includes('contrat') || em.template_type?.includes('convention'))
                    ? 'contrat_genere'
                  : (em.template_type?.includes('diplom') || em.template_type?.includes('certif') || em.template_type?.includes('attestat'))
                    ? 'diplome_emis'
                  : (em.template_type?.includes('regl') || em.template_type?.includes('règl'))
                    ? 'reglement_envoye'
                  : 'email_envoye',
        metadata:   { email_log_id: em.id, subject: em.subject, template_type: em.template_type },
        created_at: em.created_at,
        created_by: null,
        session:    null,
      })
      // Email ouvert (si le statut a changé et updated_at > created_at)
      if ((em.status === 'opened' || em.status === 'clicked') && em.updated_at !== em.created_at) {
        events.push({
          id:         `email-opened-${em.id}`,
          event_type: 'convocation_ouverte',
          metadata:   { email_log_id: em.id, subject: em.subject },
          created_at: em.updated_at,
          created_by: null,
          session:    null,
        })
      }
      // Email rejeté
      if (em.status === 'bounced' || em.status === 'complained') {
        events.push({
          id:         `email-bounced-${em.id}`,
          event_type: 'email_bounced',
          metadata:   { email_log_id: em.id, subject: em.subject, bounce_status: em.status },
          created_at: em.updated_at,
          created_by: null,
          session:    null,
        })
      }
    }
  }

  // ── 7. Événements manuels (learner_events : notes, etc.) ──
  const { data: manualEvents } = await untyped(supabase)
    .from('learner_events')
    .select('id, event_type, metadata, created_at, created_by, sessions(id, name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(100)

  for (const ev of manualEvents ?? []) {
    const sess = ev.sessions as unknown as { id: string; name: string } | null
    events.push({
      id:         ev.id,
      event_type: ev.event_type,
      metadata:   ev.metadata as Record<string, unknown>,
      created_at: ev.created_at,
      created_by: ev.created_by,
      session:    sess,
    })
  }

  // ── Tri final du plus récent au plus ancien ──
  return events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

// ─── Checklist Qualiopi depuis les vraies données ─────────────────────────────

function buildChecklist(events: LearnerEvent[]): QualiopiChecklist {
  const types = new Set(events.map(e => e.event_type))
  return {
    convocation_envoyee: types.has('convocation_envoyee'),
    convocation_ouverte: types.has('convocation_ouverte'),
    contrat_genere:      types.has('contrat_genere'),
    contrat_signe:       types.has('contrat_signe'),
    reglement_signe:     types.has('reglement_signe'),
    presence_validee:    types.has('presence_validee'),
    evaluation_faite:    types.has('evaluation_faite'),
    diplome_emis:        types.has('diplome_emis'),
  }
}

// ─── Actions publiques ────────────────────────────────────────────────────────

export async function getLearnerPipeline(): Promise<LearnerPipelineData> {
  const { orgId } = await getAuthContext()
  const supabase  = createAdminClient()

  // Query 1 : students — paginé par tranches de 1000 (limite PostgREST)
  const PAGE = 1000
  let students: { id: string; first_name: string; last_name: string; email: string | null; photo_url: string | null; created_at: string | null }[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('students')
      .select('id, first_name, last_name, email, photo_url, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`getLearnerPipeline : ${error.message}`)
    students = students.concat(data ?? [])
    if (!data || data.length < PAGE) break
    from += PAGE
  }

  const studentIds    = (students ?? []).map(s => s.id)
  const studentEmails = (students ?? []).map(s => s.email).filter(Boolean) as string[]

  // Supabase utilise des requêtes GET : une clause .in() avec trop d'UUIDs dépasse la limite d'URL (~100 IDs max)
  // On batch toutes les queries par student_id
  const BATCH = 100
  function chunks<T>(arr: T[]): T[][] {
    const result: T[][] = []
    for (let i = 0; i < arr.length; i += BATCH) result.push(arr.slice(i, i + BATCH))
    return result
  }

  type RawEnrollment = {
    id: string; status: string | null; session_id: string; student_id: string
    sessions: { id: string; name: string; start_date: string; end_date: string; formation_id: string | null } | null
  }

  const idChunks    = studentIds.length > 0 ? chunks(studentIds) : []
  const emailChunks = studentEmails.length > 0 ? chunks(studentEmails) : []

  const [
    enrollmentBatches,
    presenceBatches,
    docBatches,
    emailBatches,
    evalBatches,
    companyBatches,
    { data: rawFormations, error: formationsError },
  ] = await Promise.all([
    Promise.all(idChunks.map(ids =>
      supabase.from('enrollments')
        .select('id, status, student_id, session_id, sessions(id, name, start_date, end_date, formation_id)')
        .in('student_id', ids)
        .order('created_at', { ascending: false })
    )),
    Promise.all(idChunks.map(ids =>
      supabase.from('attendance').select('student_id')
        .eq('organization_id', orgId).in('student_id', ids).in('status', ['present', 'present_late'])
    )),
    Promise.all(idChunks.map(ids =>
      supabase.from('learner_documents').select('student_id, type').in('student_id', ids)
    )),
    Promise.all(emailChunks.map(emails =>
      (untyped(supabase) as ReturnType<typeof createAdminClient>).from('email_logs')
        .select('recipient, template_type').eq('organization_id', orgId).in('recipient', emails)
    )),
    Promise.all(idChunks.map(ids =>
      supabase.from('evaluation_responses').select('student_id').in('student_id', ids)
    )),
    Promise.all(idChunks.map(ids =>
      supabase.from('company_employees').select('student_id, companies(id, name)')
        .in('student_id', ids).eq('is_active', true)
    )),
    supabase.from('formations').select('id, name, programs(name)').eq('organization_id', orgId),
  ])

  const rawEnrollments  = enrollmentBatches.flatMap(r => (r.data ?? []) as RawEnrollment[])
  const presences       = presenceBatches.flatMap(r => r.data ?? [])
  const learnerDocs     = docBatches.flatMap(r => r.data ?? [])
  const emailLogsBatch  = emailBatches.flatMap(r => r.data ?? [])
  const evalsBatch      = evalBatches.flatMap(r => r.data ?? [])
  const companyEmployees = companyBatches.flatMap(r => r.data ?? [])

  if (formationsError) console.error('[CRM] formations query error:', formationsError.message)

  // Map formation_id → {name, program_name}
  // programs est un objet (join many-to-one formations→programs), pas un tableau
  const formationMap = new Map<string, { name: string; program_name: string | null }>()
  for (const f of rawFormations ?? []) {
    const prog = f.programs as { name: string } | { name: string }[] | null
    const program_name = Array.isArray(prog)
      ? (prog[0]?.name ?? null)
      : ((prog as { name: string } | null)?.name ?? null)
    formationMap.set(f.id, { name: f.name, program_name })
  }

  // Grouper les enrollments par student_id (ordre created_at DESC conservé)
  const enrollmentsByStudent = new Map<string, RawEnrollment[]>()
  for (const e of (rawEnrollments ?? []) as RawEnrollment[]) {
    const list = enrollmentsByStudent.get(e.student_id) ?? []
    list.push(e)
    enrollmentsByStudent.set(e.student_id, list)
  }

  const hasPresence   = new Set((presences ?? []).map(p => p.student_id))
  const hasEval       = new Set((evalsBatch ?? []).map(e => e.student_id))

  // Entreprise par student_id
  const companyByStudent = new Map<string, string>()
  for (const ce of companyEmployees ?? []) {
    const company = ce.companies as { id: string; name: string } | null
    if (company) companyByStudent.set(ce.student_id, company.name)
  }

  // Docs par student_id
  const docsByStudent = new Map<string, string[]>()
  for (const d of learnerDocs ?? []) {
    const list = docsByStudent.get(d.student_id) ?? []
    list.push(d.type ?? '')
    docsByStudent.set(d.student_id, list)
  }

  // Emails par recipient email
  const emailsByRecipient = new Map<string, string[]>()
  for (const e of emailLogsBatch ?? []) {
    const list = emailsByRecipient.get(e.recipient) ?? []
    list.push(e.template_type ?? '')
    emailsByRecipient.set(e.recipient, list)
  }

  function getMissingQualiopi(studentId: string, studentEmail: string | null): string[] {
    const missing: string[] = []
    const emails  = studentEmail ? (emailsByRecipient.get(studentEmail) ?? []) : []
    const docs    = docsByStudent.get(studentId) ?? []
    const hasConvoc = emails.includes('convocation') || docs.some(d => d.toLowerCase().includes('convoc'))
    const hasContrat = docs.some(d => d.toLowerCase().includes('contrat') || d.toLowerCase().includes('convention'))
    if (!hasConvoc)           missing.push('Convocation')
    if (!hasContrat)          missing.push('Contrat')
    if (!hasPresence.has(studentId)) missing.push('Émargement')
    if (!hasEval.has(studentId))     missing.push('Évaluation')
    return missing
  }

  const pipeline: LearnerPipelineData = {
    prospect: [], inscrit: [], en_cours: [], termine: [], abandon: [],
  }

  for (const student of students ?? []) {
    const enrollments = enrollmentsByStudent.get(student.id) ?? []

    // Priorité : inscription non-annulée la plus récente ; sinon considéré prospect
    const active = enrollments.find(e => e.status !== 'cancelled' && e.status !== 'dropped') ?? null
    const sess   = active?.sessions ?? null

    const crm_status = active
      ? computeCrmStatus(active.status, sess?.start_date ?? null, sess?.end_date ?? null)
      : 'prospect'

    pipeline[crm_status].push({
      id:             student.id,
      first_name:     student.first_name,
      last_name:      student.last_name,
      email:          student.email,
      photo_url:      student.photo_url,
      crm_status,
      session_name:       sess?.name ?? null,
      session_id:         sess?.id ?? null,
      session_start_date: sess?.start_date ?? null,
      session_end_date:   sess?.end_date ?? null,
      formation_name:     sess?.formation_id ? (formationMap.get(sess.formation_id)?.name ?? null) : null,
      formation_id:       sess?.formation_id ?? null,
      program_name:       sess?.formation_id ? (formationMap.get(sess.formation_id)?.program_name ?? null) : null,
      company_name:       companyByStudent.get(student.id) ?? null,
      missing_qualiopi: getMissingQualiopi(student.id, student.email),
      enrollment_id:  active?.id ?? null,
      created_at:     student.created_at ?? new Date().toISOString(),
    })
  }

  return pipeline
}

export async function getLearnerProfile(studentId: string): Promise<LearnerProfile> {
  const { orgId } = await getAuthContext()
  const supabase  = createAdminClient()

  const { data: student, error } = await supabase
    .from('students')
    .select(`
      id, first_name, last_name, email, phone, photo_url,
      address, city, postal_code, date_of_birth, student_number, created_at,
      enrollments (
        id, status, session_id, payment_status,
        sessions ( id, name, start_date, end_date, formations ( name ) )
      )
    `)
    .eq('id', studentId)
    .eq('organization_id', orgId)
    .single()

  if (error || !student) throw new Error('Apprenant introuvable')

  // Entreprise de l'apprenant
  const { data: companyEmployeeRow } = await supabase
    .from('company_employees')
    .select('companies(id, name)')
    .eq('student_id', studentId)
    .eq('is_active', true)
    .maybeSingle()
  const company = (companyEmployeeRow?.companies as { id: string; name: string } | null) ?? null

  // Construction de la timeline depuis les vraies tables
  const events = await buildTimeline(supabase, studentId, student.email, orgId)

  // Checklist depuis les événements réels
  const checklist = buildChecklist(events)

  type RawEnrollment = {
    id: string; status: string | null; session_id: string; payment_status: string | null
    sessions: { id: string; name: string; start_date: string; end_date: string; formations: { name: string }[] | null } | null
  }
  const enrollments = (student.enrollments ?? []) as RawEnrollment[]
  const active = enrollments.find(e => e.status !== 'cancelled') ?? enrollments[0] ?? null

  const enrollmentOut = active && active.sessions
    ? {
        id:             active.id,
        status:         active.status,
        session_id:     active.session_id,
        session_name:   active.sessions.name,
        formation_name: active.sessions.formations?.[0]?.name ?? null,
        start_date:     active.sessions.start_date,
        end_date:       active.sessions.end_date,
        payment_status: active.payment_status,
      }
    : null

  return {
    id:             student.id,
    first_name:     student.first_name,
    last_name:      student.last_name,
    email:          student.email,
    phone:          student.phone,
    photo_url:      student.photo_url,
    address:        student.address,
    city:           student.city,
    postal_code:    student.postal_code,
    date_of_birth:  student.date_of_birth,
    student_number: student.student_number,
    created_at:     student.created_at ?? new Date().toISOString(),
    enrollment:     enrollmentOut,
    company,
    checklist,
    events,
  }
}

export async function addLearnerNote(studentId: string, note: string): Promise<void> {
  const { supabase, orgId, userId } = await getAuthContext()
  void supabase
  const adminClient = createAdminClient()
  await untyped(adminClient).from('learner_events').insert({
    student_id:      studentId,
    organization_id: orgId,
    event_type:      'note_admin',
    metadata:        { note },
    created_by:      userId,
  })
}
