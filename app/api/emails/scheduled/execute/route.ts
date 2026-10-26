/**
 * API Route pour exécuter les emails planifiés
 * Cette route doit être appelée par un cron job ou un scheduler externe
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { EmailScheduleService } from '@/lib/services/email-schedule.service'
import {
  alreadyRanToday,
  EMAIL_AUTOMATION_ENROLLMENT_STATUSES,
  isTriggerDay,
  resolveScheduleScope,
  runStatus,
  studentsWithPendingHotEvaluation,
} from '@/lib/services/email-schedule-run'
import { AUTOMATION_EMAIL_DEFAULTS, AUTOMATION_EMAIL_FALLBACK_TYPE } from '@/lib/constants/automation-email-defaults'
import { sendEmailViaResend, verifiedSenderAddress } from '@/lib/utils/send-email-resend'
import { DocumentTemplateService } from '@/lib/services/document-template.service'
import type { DocumentTemplate } from '@/lib/types/document-templates'
import { extractDocumentVariables } from '@/lib/utils/document-generation/variable-extractor'
import { renderTemplatePdf } from '@/lib/utils/document-generation/render-template-pdf.server'
import { fetchStudentCompany } from '@/lib/utils/document-generation/student-company'
import {
  isSchedulableDocumentType,
  scheduledDocumentFilename,
} from '@/lib/utils/document-generation/schedulable-document-types'
import { EmailTemplateService } from '@/lib/services/email-template.service'
import { type EmailType } from '@/lib/services/email-template.service.client'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { APP_URLS } from '@/lib/config/app-config'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type EmailSchedule = Database['public']['Tables']['email_schedules']['Row']
type Recipient = { email: string; name?: string; type: string; context?: Record<string, unknown> }

// Génération de documents joints : plusieurs PDF par exécution
export const maxDuration = 300

/** Documents générés en parallèle (Gotenberg) */
const DOCUMENT_CONCURRENCY = 3

// Clé secrète pour sécuriser l'endpoint (obligatoire en production)
const CRON_SECRET = process.env.CRON_SECRET || process.env.EMAIL_SCHEDULE_SECRET

/**
 * Détermine si une règle doit être exécutée maintenant
 */
function shouldExecuteSchedule(schedule: EmailSchedule, now: Date = new Date()): boolean {
  const { trigger_type, trigger_datetime } = schedule

  if (trigger_type === 'fixed_date') {
    if (!trigger_datetime) return false
    const triggerDate = new Date(trigger_datetime)
    // Exécuter si la date/heure est passée ou dans les 5 prochaines minutes
    return triggerDate <= new Date(now.getTime() + 5 * 60 * 1000)
  }

  // Pour les autres types de déclencheurs, on doit vérifier les sessions/évaluations
  // Cette logique sera gérée dans la boucle principale
  return true
}

type SessionRule = { session_id: string | null; email_type: string }

/**
 * Sessions de l'organisme dont c'est aujourd'hui (heure de Paris) le jour
 * d'envoi pour cette règle, en tenant compte des règles propres à une session.
 * Une erreur de requête est remontée (la règle est journalisée en échec).
 */
async function getMatchingSessions(
  schedule: EmailSchedule,
  supabase: any,
  now: Date,
  sessionRules: SessionRule[]
): Promise<any[]> {
  // Pas de colonne is_active ni de lien programs sur sessions : le programme
  // passe par la formation.
  let query: any = supabase
    .from('sessions')
    .select('*, formations(*, programs(*))')
    // Client service role : sans ce filtre, une règle viserait les sessions
    // de tous les organismes
    .eq('organization_id', schedule.organization_id)

  if (schedule.session_id) query = query.eq('id', schedule.session_id)
  if (schedule.formation_id) query = query.eq('formation_id', schedule.formation_id)
  if (schedule.session_status && schedule.session_status.length > 0) {
    query = query.in('status', schedule.session_status)
  } else {
    query = query.neq('status', 'cancelled')
  }

  const { data: sessions, error } = await query
  if (error) throw new Error(`Lecture des sessions impossible : ${error.message}`)

  const candidates = ((sessions ?? []) as any[])
    .map((session) => {
      const formation = Array.isArray(session.formations) ? session.formations[0] : session.formations
      const program = Array.isArray(formation?.programs) ? formation.programs[0] : formation?.programs
      // Formes attendues par buildStudentDocument / extractDocumentVariables
      return { ...session, formations: formation ?? null, programs: program ?? null }
    })
    .filter((session) => !schedule.program_id || session.formations?.program_id === schedule.program_id)
    .filter((session) => isTriggerDay(schedule.trigger_type, session, schedule.trigger_days, now))

  return resolveScheduleScope(schedule, candidates, sessionRules)
}

/**
 * Récupère les évaluations qui correspondent aux critères de la règle
 */
async function getMatchingEvaluations(
  schedule: EmailSchedule,
  supabase: any,
  now: Date
): Promise<any[]> {
  const { data: evaluations, error } = await supabase
    .from('evaluations')
    .select('*, sessions(*), formations(*)')
    .eq('is_active', true)

  if (error) {
    logger.error('Error fetching evaluations:', error)
    return []
  }

  return ((evaluations ?? []) as any[]).filter((evaluation: any) => {
    // Client service role : uniquement les évaluations de l'organisme de la règle
    const evaluationOrgId = evaluation.organization_id ?? evaluation.sessions?.organization_id
    if (evaluationOrgId !== schedule.organization_id) return false
    return isTriggerDay(schedule.trigger_type, evaluation, schedule.trigger_days, now)
  })
}

/** Factures impayées de la session (relance paiement) */
async function getUnpaidInvoices(supabase: any, sessionId: string): Promise<{ count: number; amount: number; currency: string }> {
  const { data: enrollments } = await supabase.from('enrollments').select('id').eq('session_id', sessionId)
  const enrollmentIds = ((enrollments ?? []) as Array<{ id: string }>).map((e) => e.id)
  if (enrollmentIds.length === 0) return { count: 0, amount: 0, currency: 'EUR' }

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('total_amount, currency, document_type, status')
    .in('enrollment_id', enrollmentIds)
    .in('status', ['sent', 'overdue', 'partial'])
  if (error) throw new Error(`Lecture des factures impossible : ${error.message}`)

  const unpaid = ((invoices ?? []) as Array<{ total_amount: number; currency?: string; document_type?: string | null }>).filter(
    (i) => (i.document_type ?? 'invoice') === 'invoice'
  )
  return {
    count: unpaid.length,
    amount: unpaid.reduce((sum, i) => sum + Number(i.total_amount ?? 0), 0),
    currency: unpaid[0]?.currency || 'EUR',
  }
}

/** Apprenants de la session dont l'évaluation à chaud n'est pas complétée */
async function getStudentsToRemind(supabase: any, sessionId: string): Promise<Set<string>> {
  const { data: grades } = await supabase
    .from('grades')
    .select('id, student_id')
    .eq('session_id', sessionId)
    .eq('assessment_type', 'hot')
  const gradeRows = (grades ?? []) as Array<{ id: string; student_id: string | null }>
  if (gradeRows.length === 0) return new Set()

  const { data: instances } = await supabase
    .from('evaluation_template_instances')
    .select('grade_id, completed_at')
    .in('grade_id', gradeRows.map((g) => g.id))
  return studentsWithPendingHotEvaluation(gradeRows, (instances ?? []) as Array<{ grade_id: string; completed_at: string | null }>)
}

/**
 * Récupère les destinataires pour une règle donnée
 */
async function getRecipientsForSchedule(
  schedule: EmailSchedule,
  supabase: any,
  now: Date,
  sessionRules: SessionRule[]
): Promise<Recipient[]> {
  const recipients: Recipient[] = []

  const loadStudents = async (sessionId: string) => {
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('*, students(*)')
      .eq('session_id', sessionId)
      .in('status', EMAIL_AUTOMATION_ENROLLMENT_STATUSES)
    if (error) throw new Error(`Lecture des inscriptions impossible : ${error.message}`)
    return (enrollments ?? []) as any[]
  }

  const loadCoordinators = async () => {
    const { data: coordinators } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('organization_id', schedule.organization_id)
      // Rôles de gestion (le rôle « coordinator » n'existe pas)
      .in('role', ['admin', 'super_admin', 'secretary'])
    return (coordinators ?? []) as any[]
  }

  if (schedule.target_type === 'session') {
    const matchingSessions = await getMatchingSessions(schedule, supabase, now, sessionRules)

    for (const session of matchingSessions) {
      if (schedule.send_to_students) {
        // Relance d'évaluation : uniquement ceux qui n'ont pas répondu
        const toRemind = schedule.email_type === 'relance_evaluation' ? await getStudentsToRemind(supabase, session.id) : null
        for (const enrollment of await loadStudents(session.id)) {
          const student = enrollment.students
          if (!student?.email) continue
          if (toRemind && !toRemind.has(student.id)) continue
          recipients.push({
            email: student.email,
            name: `${student.first_name} ${student.last_name}`,
            type: 'student',
            context: { session, enrollment, student },
          })
        }
      }

      if (schedule.send_to_teachers && session.teacher_id) {
        const { data: teacher } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .eq('id', session.teacher_id)
          .maybeSingle()
        if (teacher?.email) {
          recipients.push({
            email: teacher.email,
            name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim(),
            type: 'teacher',
            context: { session, teacher },
          })
        }
      }

      if (schedule.send_to_coordinators) {
        // Relance paiement : uniquement s'il reste des factures impayées
        let unpaid: { count: number; amount: number; currency: string } | null = null
        if (schedule.email_type === 'relance_paiement') {
          unpaid = await getUnpaidInvoices(supabase, session.id)
          if (unpaid.count === 0) continue
        }
        for (const coordinator of await loadCoordinators()) {
          if (!coordinator.email) continue
          recipients.push({
            email: coordinator.email,
            name: `${coordinator.first_name || ''} ${coordinator.last_name || ''}`.trim(),
            type: 'coordinator',
            context: { session, coordinator, ...(unpaid ? { unpaid } : {}) },
          })
        }
      }
    }
  }

  if (schedule.target_type === 'evaluation') {
    for (const evaluation of await getMatchingEvaluations(schedule, supabase, now)) {
      if (schedule.send_to_students && evaluation.session_id) {
        for (const enrollment of await loadStudents(evaluation.session_id)) {
          const student = enrollment.students
          if (!student?.email) continue
          recipients.push({
            email: student.email,
            name: `${student.first_name} ${student.last_name}`,
            type: 'student',
            context: { evaluation, enrollment, student },
          })
        }
      }
    }
  }

  // Dédupliquer par destinataire et par session (un apprenant de deux sessions
  // le même jour reçoit les deux emails, chacun avec ses informations)
  const seen = new Set<string>()
  return recipients.filter((r) => {
    const sessionKey = (r.context?.session as { id?: string } | undefined)?.id ?? (r.context?.evaluation as { id?: string } | undefined)?.id ?? ''
    const key = `${r.email.toLowerCase()}|${sessionKey}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function formatTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : ''
}

/**
 * Remplace les variables dans le template avec les données du contexte
 */
function replaceTemplateVariables(
  template: { subject?: string | null; body_html?: string | null; body_text?: string | null },
  recipient: Recipient,
  organization: any
): { subject: string; bodyHtml: string; bodyText: string } {
  let subject = template.subject || ''
  let bodyHtml = template.body_html || ''
  let bodyText = template.body_text || ''

  const variables: Record<string, string> = {
    organization_name: organization?.name || '',
    organization_email: organization?.email || '',
    organization_phone: organization?.phone || '',
    recipient_name: recipient.name || '',
    recipient_email: recipient.email || '',
  }

  const context = (recipient.context ?? {}) as Record<string, any>
  if (context.session) {
    const session = context.session
    variables.session_name = session.formations?.name || session.name || ''
    variables.session_start_date = session.start_date ? new Date(session.start_date).toLocaleDateString('fr-FR') : ''
    variables.session_end_date = session.end_date ? new Date(session.end_date).toLocaleDateString('fr-FR') : ''
    variables.session_start_time = formatTime(session.start_time)
    variables.session_location = session.location || ''
  }

  if (context.student) {
    const student = context.student
    variables.student_name = `${student.first_name} ${student.last_name}`
    variables.student_first_name = student.first_name || ''
    variables.student_last_name = student.last_name || ''
    variables.student_email = student.email || ''
    variables.espace_apprenant = student.id ? `${APP_URLS.getBaseUrl()}/learner/access/${student.id}` : ''
  }

  if (context.evaluation) {
    const evaluation = context.evaluation
    variables.evaluation_name = evaluation.name || ''
    variables.evaluation_start_date = evaluation.start_date ? new Date(evaluation.start_date).toLocaleDateString('fr-FR') : ''
    variables.evaluation_end_date = evaluation.end_date ? new Date(evaluation.end_date).toLocaleDateString('fr-FR') : ''
  }

  if (context.unpaid) {
    variables.factures_impayees = String(context.unpaid.count)
    variables.montant_impaye = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: context.unpaid.currency || 'EUR' }).format(context.unpaid.amount)
  }

  // Remplacer les variables {variable_name}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g')
    subject = subject.replace(regex, value)
    bodyHtml = bodyHtml.replace(regex, value)
    bodyText = bodyText.replace(regex, value)
  })

  return { subject, bodyHtml, bodyText }
}

/**
 * Modèle d'email : celui de la règle, sinon le modèle par défaut de
 * l'organisme pour ce type, puis pour un type proche, sinon l'email intégré
 * de l'automatisation — une automatisation activée envoie toujours un email.
 */
async function resolveEmailTemplate(
  service: EmailTemplateService,
  schedule: EmailSchedule
): Promise<{ subject?: string | null; body_html?: string | null; body_text?: string | null } | null> {
  if (schedule.template_id) {
    const chosen = await service.getById(schedule.template_id).catch(() => null)
    if (chosen) return chosen
  }
  const own = await service.getDefault(schedule.organization_id, schedule.email_type as EmailType).catch(() => null)
  if (own) return own
  const fallbackType = AUTOMATION_EMAIL_FALLBACK_TYPE[schedule.email_type]
  if (fallbackType) {
    const related = await service.getDefault(schedule.organization_id, fallbackType as EmailType).catch(() => null)
    if (related) return related
  }
  return AUTOMATION_EMAIL_DEFAULTS[schedule.email_type] ?? null
}

/**
 * Modèle de document à joindre : celui choisi dans la règle, ou à défaut le
 * modèle par défaut du type (anciennes règles). Erreur explicite sinon — la
 * règle est alors journalisée en échec, sans envoyer d'email sans le document.
 */
async function resolveDocumentTemplate(
  service: DocumentTemplateService,
  schedule: EmailSchedule
): Promise<DocumentTemplate> {
  let template: DocumentTemplate | null = null
  if (schedule.document_template_id) {
    template = (await service.getTemplateById(schedule.document_template_id).catch(() => null)) as DocumentTemplate | null
    if (template && template.organization_id && template.organization_id !== schedule.organization_id) {
      template = null
    }
  } else if (schedule.document_type && isSchedulableDocumentType(schedule.document_type)) {
    template = (await service.getDefaultTemplate(schedule.organization_id, schedule.document_type)) as DocumentTemplate | null
  }

  if (!template) {
    throw new Error('Modèle de document à joindre introuvable : choisissez un modèle dans la règle d\'envoi')
  }
  if (!isSchedulableDocumentType(template.type)) {
    throw new Error(`Le modèle « ${template.name} » ne peut pas être généré pour un apprenant`)
  }
  return template
}

/**
 * Génère le document nominatif d'un apprenant (données de l'apprenant, de sa
 * session, de la formation, du programme et de son entreprise).
 */
async function buildStudentDocument(
  supabase: any,
  template: DocumentTemplate,
  recipient: Recipient,
  organization: any,
  sessionCache: Map<string, Promise<any>>,
  now: Date
): Promise<{ filename: string; content: Buffer }> {
  const context = (recipient.context ?? {}) as { session?: any; evaluation?: any; student?: any }
  const student = context.student
  if (!student) throw new Error('Apprenant introuvable pour le document')

  // Session avec formation et programme (évaluations : session rechargée)
  let session = context.session
  const sessionId = session?.id ?? context.evaluation?.session_id
  if (!session?.formations && sessionId) {
    if (!sessionCache.has(sessionId)) {
      sessionCache.set(
        sessionId,
        supabase
          .from('sessions')
          .select('*, formations(*), programs(*)')
          .eq('id', sessionId)
          .eq('organization_id', organization?.id)
          .maybeSingle()
          .then((r: { data: unknown }) => r.data)
      )
    }
    session = (await sessionCache.get(sessionId)) ?? session
  }

  const formation = Array.isArray(session?.formations) ? session.formations[0] : session?.formations
  const program = Array.isArray(session?.programs) ? session.programs[0] : session?.programs

  const variables = extractDocumentVariables({
    student,
    session: session ? { ...session, formations: formation } : undefined,
    organization,
    program: program
      ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: formation.duration_hours }] : undefined }
      : undefined,
    company: await fetchStudentCompany(supabase, student.id),
    language: 'fr',
    issueDate: now.toISOString(),
  } as Parameters<typeof extractDocumentVariables>[0])

  const content = await renderTemplatePdf(template, variables)
  return { filename: scheduledDocumentFilename(template.type, student), content }
}

export async function POST(request: NextRequest) {
  try {
    // Exiger CRON_SECRET pour éviter l'exécution non autorisée (audit P0 2026-02-28)
    if (!CRON_SECRET || CRON_SECRET.length === 0) {
      logger.error('[emails/scheduled/execute] CRON_SECRET non configuré')
      return NextResponse.json(
        { error: 'Endpoint désactivé : CRON_SECRET manquant' },
        { status: 503 }
      )
    }
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cron : pas de cookies → client service role partout (le client à
    // cookies ne lisait rien sous RLS). Chaque requête filtre l'organisation.
    const adminSupabase = createAdminClient()
    const emailScheduleService = new EmailScheduleService(adminSupabase)
    const emailTemplateService = new EmailTemplateService(adminSupabase)
    const documentTemplateService = new DocumentTemplateService(adminSupabase)

    // Récupérer toutes les règles actives
    const schedules = await emailScheduleService.getActiveSchedulesToExecute()
    const now = new Date()

    // Règles propres à une session (actives ou non) : elles priment sur la
    // règle de l'organisme du même type pour leur session
    const { data: sessionRulesData } = await adminSupabase
      .from('email_schedules')
      .select('session_id, email_type')
      .not('session_id', 'is', null)
    const sessionRules = (sessionRulesData ?? []) as SessionRule[]

    const results = []

    for (const schedule of schedules) {
      try {
        // Vérifier si la règle doit être exécutée
        if (!shouldExecuteSchedule(schedule, now)) {
          continue
        }

        // Émargement automatique : géré par /api/cron/auto-launch-attendance
        if (schedule.trigger_type === 'after_seance_start') {
          continue
        }

        // Pas de double envoi si le cron est rappelé le même jour
        if (alreadyRanToday(schedule.last_run_at, schedule.last_run_status, now)) {
          logger.info(`Schedule ${schedule.id} already executed today — skipped`)
          continue
        }

        // Pour les déclencheurs basés sur sessions/évaluations, vérifier les matches
        if (
          schedule.trigger_type !== 'fixed_date' &&
          (schedule.target_type === 'session' || schedule.target_type === 'evaluation')
        ) {
          // On va récupérer les destinataires qui incluent aussi le filtrage temporel
          const recipients = await getRecipientsForSchedule(schedule, adminSupabase, now, sessionRules)

          if (recipients.length === 0) {
            logger.info(`No recipients for schedule ${schedule.id} at this time`)
            continue
          }

          const template = await resolveEmailTemplate(emailTemplateService, schedule)
          if (!template) {
            throw new Error(`Aucun modèle d'email pour le type « ${schedule.email_type} »`)
          }

          // Organisation complète : nécessaire aux variables {ecole_*} des documents
          const { data: organization } = await adminSupabase
            .from('organizations')
            .select('*')
            .eq('id', schedule.organization_id)
            .single()

          // Document à joindre (généré pour chaque apprenant)
          const documentTemplate = schedule.send_document
            ? await resolveDocumentTemplate(documentTemplateService, schedule)
            : null
          const sessionCache = new Map<string, Promise<any>>()

          // Expéditeur : domaine vérifié dans Resend, au nom de l'organisme ;
          // les réponses vont à l'organisme
          const from = `${(organization?.name || 'EDUZEN').replace(/[<>"]/g, '')} <${verifiedSenderAddress()}>`
          const replyTo = organization?.email || undefined

          // Envoyer les emails
          let successfulSends = 0
          let failedSends = 0
          const errors: Array<{ email: string; error: string }> = []

          const sendToRecipient = async (recipient: Recipient) => {
            try {
              // Remplacer les variables du template
              const { subject, bodyHtml, bodyText } = replaceTemplateVariables(
                template,
                recipient,
                organization
              )

              // Document nominatif : uniquement pour les apprenants. En cas
              // d'échec de génération, l'email n'est pas envoyé sans le document.
              const attachments: Array<{ filename: string; content: Buffer }> = []
              if (documentTemplate && recipient.type === 'student') {
                attachments.push(
                  await buildStudentDocument(adminSupabase, documentTemplate, recipient, organization, sessionCache, now)
                )
              }

              const sent = await sendEmailViaResend({
                from,
                replyTo,
                to: recipient.email,
                subject,
                html: bodyHtml || bodyText,
                text: bodyText || undefined,
                attachments,
              })
              if (!sent.success) {
                throw new Error(`Email send failed: ${sent.error ?? 'erreur inconnue'}`)
              }

              successfulSends++
            } catch (error) {
              failedSends++
              errors.push({
                email: recipient.email,
                error: error instanceof Error ? error.message : 'Unknown error',
              })
              logger.error(`Error sending email to ${recipient.email}:`, error)
            }
          }

          // Par lots quand des PDF sont générés (Gotenberg), sinon séquentiel comme avant
          const batchSize = documentTemplate ? DOCUMENT_CONCURRENCY : 1
          for (let i = 0; i < recipients.length; i += batchSize) {
            await Promise.all(recipients.slice(i, i + batchSize).map(sendToRecipient))
          }

          // Enregistrer le log d'exécution
          await emailScheduleService.logExecution(
            schedule.id,
            schedule.organization_id,
            {
              scheduleId: schedule.id,
              status: runStatus(successfulSends, failedSends),
              totalRecipients: recipients.length,
              successfulSends,
              failedSends,
              errorMessage: errors.length > 0 ? `${errors.length} erreurs` : undefined,
              errorDetails: errors.length > 0 ? { errors } : undefined,
            },
            {
              executed_at: now.toISOString(),
              schedule_name: schedule.name,
              trigger_type: schedule.trigger_type,
            }
          )

          results.push({
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            status: 'success',
            recipientsCount: recipients.length,
            successfulSends,
            failedSends,
          })
        } else if (schedule.trigger_type === 'fixed_date') {
          // Pour les dates fixes, on peut envoyer à tous les utilisateurs de l'organisation
          // Cette logique est simplifiée et peut être étendue
          logger.info(`Fixed date schedule ${schedule.id} - implementation simplified`)
        }
      } catch (error) {
        logger.error(`Error executing schedule ${schedule.id}:`, error)

        await emailScheduleService.logExecution(
          schedule.id,
          schedule.organization_id,
          {
            scheduleId: schedule.id,
            status: 'failed',
            totalRecipients: 0,
            successfulSends: 0,
            failedSends: 0,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
          {
            executed_at: now.toISOString(),
            schedule_name: schedule.name,
          }
        )

        results.push({
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      executedAt: now.toISOString(),
      schedulesProcessed: results.length,
      results,
    })
  } catch (error) {
    logger.error('Error in scheduled email execution:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Permettre également GET pour tester facilement
export async function GET(request: NextRequest) {
  return POST(request)
}