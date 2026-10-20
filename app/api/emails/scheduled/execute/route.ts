/**
 * API Route pour exécuter les emails planifiés
 * Cette route doit être appelée par un cron job ou un scheduler externe
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { EmailScheduleService } from '@/lib/services/email-schedule.service'
import { alreadyRanToday, runStatus } from '@/lib/services/email-schedule-run'
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
import { Resend } from 'resend'
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
  const { trigger_type, trigger_datetime, trigger_days, trigger_time } = schedule

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

/**
 * Récupère les sessions qui correspondent aux critères de la règle
 */
async function getMatchingSessions(
  schedule: EmailSchedule,

  supabase: any,
  now: Date

): Promise<any[]> {

  let query: any = supabase
    .from('sessions')
    .select('*, formations(*), programs(*)')
    .eq('is_active', true)
    // Client service role : sans ce filtre, une règle viserait les sessions
    // de tous les organismes
    .eq('organization_id', schedule.organization_id)

  // Filtrer par formation ou programme si spécifié
  if (schedule.formation_id) {
    query = query.eq('formation_id', schedule.formation_id)
  }
  if (schedule.program_id) {
    query = query.eq('program_id', schedule.program_id)
  }

  // Filtrer par statut si spécifié
  if (schedule.session_status && schedule.session_status.length > 0) {
    query = query.in('status', schedule.session_status)
  }

  const { data: sessions, error } = await query

  if (error) {
    logger.error('Error fetching sessions:', error)
    return []
  }

  if (!sessions) return []

  // Filtrer selon le type de déclencheur

  const matchingSessions = (sessions as any[]).filter((session: any) => {
    if (!session.start_date || !session.end_date) return false

    const startDate = new Date(session.start_date)
    const endDate = new Date(session.end_date)

    if (schedule.trigger_type === 'before_session_start') {
      const daysBefore = schedule.trigger_days || 0
      const targetDate = new Date(startDate)
      targetDate.setDate(targetDate.getDate() - daysBefore)

      // Vérifier si on est dans la fenêtre d'exécution (jour même, à l'heure spécifiée)
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      const targetDay = new Date(targetDate)
      targetDay.setHours(0, 0, 0, 0)

      if (targetDay.getTime() === today.getTime()) {
        // Vérifier l'heure si spécifiée
        if (schedule.trigger_time) {
          const [hours, minutes] = schedule.trigger_time.split(':').map(Number)
          const triggerTime = new Date(now)
          triggerTime.setHours(hours, minutes || 0, 0, 0)
          return now >= triggerTime && now < new Date(triggerTime.getTime() + 60 * 60 * 1000) // Fenêtre d'1h
        }
        return true
      }
      return false
    }

    if (schedule.trigger_type === 'after_session_end') {
      const daysAfter = schedule.trigger_days || 0
      const targetDate = new Date(endDate)
      targetDate.setDate(targetDate.getDate() + daysAfter)

      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      const targetDay = new Date(targetDate)
      targetDay.setHours(0, 0, 0, 0)

      if (targetDay.getTime() === today.getTime()) {
        if (schedule.trigger_time) {
          const [hours, minutes] = schedule.trigger_time.split(':').map(Number)
          const triggerTime = new Date(now)
          triggerTime.setHours(hours, minutes || 0, 0, 0)
          return now >= triggerTime && now < new Date(triggerTime.getTime() + 60 * 60 * 1000)
        }
        return true
      }
      return false
    }

    return false
  })

  return matchingSessions
}

/**
 * Récupère les évaluations qui correspondent aux critères de la règle
 */
async function getMatchingEvaluations(
  schedule: EmailSchedule,

  supabase: any,
  now: Date

): Promise<any[]> {

  let query: any = supabase
    .from('evaluations')
    .select('*, sessions(*), formations(*)')
    .eq('is_active', true)

  const { data: evaluations, error } = await query

  if (error) {
    logger.error('Error fetching evaluations:', error)
    return []
  }

  if (!evaluations) return []

  // Filtrer selon le type de déclencheur

  const matchingEvaluations = (evaluations as any[]).filter((evaluation: any) => {
    // Client service role : uniquement les évaluations de l'organisme de la règle
    const evaluationOrgId = evaluation.organization_id ?? evaluation.sessions?.organization_id
    if (evaluationOrgId !== schedule.organization_id) return false
    if (!evaluation.start_date || !evaluation.end_date) return false

    const startDate = new Date(evaluation.start_date)
    const endDate = new Date(evaluation.end_date)

    if (schedule.trigger_type === 'before_evaluation_start') {
      const daysBefore = schedule.trigger_days || 0
      const targetDate = new Date(startDate)
      targetDate.setDate(targetDate.getDate() - daysBefore)

      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      const targetDay = new Date(targetDate)
      targetDay.setHours(0, 0, 0, 0)

      if (targetDay.getTime() === today.getTime()) {
        if (schedule.trigger_time) {
          const [hours, minutes] = schedule.trigger_time.split(':').map(Number)
          const triggerTime = new Date(now)
          triggerTime.setHours(hours, minutes || 0, 0, 0)
          return now >= triggerTime && now < new Date(triggerTime.getTime() + 60 * 60 * 1000)
        }
        return true
      }
      return false
    }

    if (schedule.trigger_type === 'after_evaluation_end') {
      const daysAfter = schedule.trigger_days || 0
      const targetDate = new Date(endDate)
      targetDate.setDate(targetDate.getDate() + daysAfter)

      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      const targetDay = new Date(targetDate)
      targetDay.setHours(0, 0, 0, 0)

      if (targetDay.getTime() === today.getTime()) {
        if (schedule.trigger_time) {
          const [hours, minutes] = schedule.trigger_time.split(':').map(Number)
          const triggerTime = new Date(now)
          triggerTime.setHours(hours, minutes || 0, 0, 0)
          return now >= triggerTime && now < new Date(triggerTime.getTime() + 60 * 60 * 1000)
        }
        return true
      }
      return false
    }

    return false
  })

  return matchingEvaluations
}

/**
 * Récupère les destinataires pour une règle donnée
 */
async function getRecipientsForSchedule(
  schedule: EmailSchedule,

  supabase: any,
  now: Date
): Promise<Recipient[]> {
  const recipients: Recipient[] = []

  try {
    // Récupérer l'organisation pour les emails
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name, email, phone')
      .eq('id', schedule.organization_id)
      .single()

    if (schedule.target_type === 'session') {
      const matchingSessions = await getMatchingSessions(schedule, supabase, now)

      for (const session of matchingSessions) {
        // Récupérer les étudiants inscrits à cette session
        if (schedule.send_to_students) {
          // eslint-disable-next-line
          const qEnr: any = supabase
            .from('enrollments')
            .select('*, students(*)')
            .eq('session_id', session.id)
            .eq('status', 'active')
          const { data: enrollments } = await qEnr

          if (enrollments) {
            for (const enrollment of enrollments) {
              const student = enrollment.students
              if (student?.email) {
                recipients.push({
                  email: student.email,
                  name: `${student.first_name} ${student.last_name}`,
                  type: 'student',
                  context: { session, enrollment, student },
                })
              }
            }
          }
        }

        // Récupérer les enseignants de la session
        if (schedule.send_to_teachers && session.teacher_id) {
          const { data: teacher } = await supabase
            .from('users')
            .select('id, email, first_name, last_name')
            .eq('id', session.teacher_id)
            .single()

          if (teacher?.email) {
            recipients.push({
              email: teacher.email,
              name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim(),
              type: 'teacher',
              context: { session, teacher },
            })
          }
        }

        // Récupérer les coordinateurs
        if (schedule.send_to_coordinators) {
          const { data: coordinators } = await supabase
            .from('users')
            .select('id, email, first_name, last_name')
            .eq('organization_id', schedule.organization_id)
            .in('role', ['admin', 'super_admin', 'coordinator'])

          if (coordinators) {
            for (const coordinator of coordinators) {
              if (coordinator.email) {
                recipients.push({
                  email: coordinator.email,
                  name: `${coordinator.first_name || ''} ${coordinator.last_name || ''}`.trim(),
                  type: 'coordinator',
                  context: { session, coordinator },
                })
              }
            }
          }
        }
      }
    }

    if (schedule.target_type === 'evaluation') {
      const matchingEvaluations = await getMatchingEvaluations(schedule, supabase, now)

      for (const evaluation of matchingEvaluations) {
        // Récupérer les étudiants concernés par cette évaluation
        if (schedule.send_to_students && evaluation.session_id) {
          // eslint-disable-next-line
          const qEnr2: any = supabase
            .from('enrollments')
            .select('*, students(*)')
            .eq('session_id', evaluation.session_id)
            .eq('status', 'active')
          const { data: enrollments } = await qEnr2

          if (enrollments) {
            for (const enrollment of enrollments) {
              const student = enrollment.students
              if (student?.email) {
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

        // Récupérer les enseignants
        if (schedule.send_to_teachers) {
          // eslint-disable-next-line
          const qSess: any = supabase
            .from('sessions')
            .select('*, users(*)')
            .eq('id', evaluation.session_id)
            .single()
          const { data: session } = await qSess

          if (session?.users?.email) {
            recipients.push({
              email: session.users.email,
              name: `${session.users.first_name || ''} ${session.users.last_name || ''}`.trim(),
              type: 'teacher',
              context: { evaluation, teacher: session.users },
            })
          }
        }
      }
    }

    // Dédupliquer les emails
    const uniqueRecipients = recipients.reduce((acc, recipient) => {
      if (!acc.find((r) => r.email === recipient.email)) {
        acc.push(recipient)
      }
      return acc
    }, [] as typeof recipients)

    return uniqueRecipients
  } catch (error) {
    logger.error('Error getting recipients:', error)
    return recipients
  }
}

/**
 * Remplace les variables dans le template avec les données du contexte
 */
function replaceTemplateVariables(
  template: any,
  recipient: any,
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

  // Ajouter les variables du contexte (session, student, etc.)
  if (recipient.context) {
    if (recipient.context.session) {
      const session = recipient.context.session
      variables.session_name = session.name || ''
      variables.session_start_date = session.start_date
        ? new Date(session.start_date).toLocaleDateString('fr-FR')
        : ''
      variables.session_end_date = session.end_date
        ? new Date(session.end_date).toLocaleDateString('fr-FR')
        : ''
      variables.session_start_time = session.start_time || ''
      variables.session_location = session.location || ''
    }

    if (recipient.context.student) {
      const student = recipient.context.student
      variables.student_name = `${student.first_name} ${student.last_name}`
      variables.student_first_name = student.first_name || ''
      variables.student_last_name = student.last_name || ''
      variables.student_email = student.email || ''
      variables.espace_apprenant = student.id ? `${APP_URLS.getBaseUrl()}/learner/access/${student.id}` : ''
    }

    if (recipient.context.evaluation) {
      const evaluation = recipient.context.evaluation
      variables.evaluation_name = evaluation.name || ''
      variables.evaluation_start_date = evaluation.start_date
        ? new Date(evaluation.start_date).toLocaleDateString('fr-FR')
        : ''
      variables.evaluation_end_date = evaluation.end_date
        ? new Date(evaluation.end_date).toLocaleDateString('fr-FR')
        : ''
    }
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

    const results = []

    for (const schedule of schedules) {
      try {
        // Vérifier si la règle doit être exécutée
        if (!shouldExecuteSchedule(schedule, now)) {
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
          const recipients = await getRecipientsForSchedule(schedule, adminSupabase, now)

          if (recipients.length === 0) {
            logger.info(`No recipients for schedule ${schedule.id} at this time`)
            continue
          }

          // Récupérer le template d'email
          let template = null
          if (schedule.template_id) {
            template = await emailTemplateService.getById(schedule.template_id)
          } else {
            template = await emailTemplateService.getDefault(
              schedule.organization_id,
              schedule.email_type as EmailType
            )
          }

          if (!template) {
            logger.warn(`No template found for schedule ${schedule.id}`)
            continue
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

          if (!process.env.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY not configured')
          }
          const resend = new Resend(process.env.RESEND_API_KEY)
          const fromEmail = organization?.email || process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@eduzen.fr'

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

              // Envoyer l'email directement via Resend (pour le cron job, pas d'authentification requise)
              const { error: emailError } = await resend.emails.send({
                from: `${organization?.name || 'EDUZEN'} <${fromEmail}>`,
                to: recipient.email,
                subject,
                html: bodyHtml || bodyText,
                text: bodyText,
                ...(attachments.length > 0 ? { attachments } : {}),
              })

              if (emailError) {
                throw new Error(`Email send failed: ${emailError.message}`)
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