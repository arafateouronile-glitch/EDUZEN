/**
 * CRON : Envoi automatique des évaluations à froid à J+90
 *
 * Pour chaque session terminée il y a 87-93 jours :
 * - Trouve les apprenants sans grade assessment_type = 'cold'
 * - Crée un grade cold + une instance du template cold de l'organisation
 * - Envoie un email de relance à l'apprenant
 *
 * Déclenché quotidiennement (ex: 09:00). Couverture Qualiopi indicateur 14.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { withCronSecurity } from '@/lib/utils/cron-security'
import { logger } from '@/lib/utils/logger'
import { APP_URLS } from '@/lib/config/app-config'

const CRON_SECRET = process.env.CRON_SECRET
const ALLOWED_IPS = process.env.CRON_ALLOWED_IPS?.split(',').map((ip) => ip.trim()) ?? []

const COLD_EVAL_WINDOW_MIN_DAYS = 87
const COLD_EVAL_WINDOW_MAX_DAYS = 93

export async function GET(request: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 })
  }

  return withCronSecurity(
    request,
    async () => {
      try {
        const supabase = createAdminClient()
        const now = new Date()

        const minEnd = new Date(now)
        minEnd.setDate(minEnd.getDate() - COLD_EVAL_WINDOW_MAX_DAYS)
        const maxEnd = new Date(now)
        maxEnd.setDate(maxEnd.getDate() - COLD_EVAL_WINDOW_MIN_DAYS)

        // Sessions dont la fin tombe dans la fenêtre J+87..J+93
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, name, organization_id, end_date, formations(name)')
          .gte('end_date', minEnd.toISOString().split('T')[0])
          .lte('end_date', maxEnd.toISOString().split('T')[0])

        if (sessionsError) {
          logger.error('send-cold-evaluations: sessions query', sessionsError)
          return NextResponse.json({ error: sessionsError.message }, { status: 500 })
        }

        if (!sessions?.length) {
          return NextResponse.json({ success: true, processed: 0, message: 'Aucune session dans la fenêtre J+90.' })
        }

        let totalCreated = 0
        let totalEmailed = 0

        for (const session of sessions) {
          const orgId = session.organization_id as string
          const sessionId = session.id as string

          // Trouver le template cold de l'organisation
          const { data: coldTemplate } = await supabase
            .from('evaluation_templates')
            .select('id, name')
            .eq('organization_id', orgId)
            .eq('assessment_type', 'cold')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          // Récupérer les apprenants inscrits
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('student_id, students(id, first_name, last_name, email)')
            .eq('session_id', sessionId)
            .in('status', ['confirmed', 'active', 'completed'])

          if (!enrollments?.length) continue

          // Récupérer les grades cold déjà existants pour cette session
          const { data: existingColdGrades } = await supabase
            .from('grades')
            .select('student_id')
            .eq('session_id', sessionId)
            .eq('organization_id', orgId)
            .eq('assessment_type', 'cold')

          const alreadyDone = new Set((existingColdGrades ?? []).map((g: any) => g.student_id))

          for (const enrollment of enrollments) {
            const student = (enrollment as any).students
            if (!student?.email) continue
            if (alreadyDone.has(enrollment.student_id)) continue

            const studentName = [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Apprenant'
            const formationName =
              Array.isArray(session.formations)
                ? session.formations[0]?.name
                : (session.formations as any)?.name ?? session.name

            try {
              // Créer le grade cold
              const { data: grade, error: gradeError } = await supabase
                .from('grades')
                .insert({
                  organization_id: orgId,
                  student_id: enrollment.student_id,
                  session_id: sessionId,
                  assessment_type: 'cold',
                  subject: `Évaluation à froid — ${formationName}`,
                  graded_at: now.toISOString(),
                  rating: null,
                  score: null,
                  max_score: null,
                  coefficient: 1.0,
                  is_makeup: false,
                })
                .select('id')
                .single()

              if (gradeError || !grade?.id) {
                logger.warn('send-cold-evaluations: grade insert error', { gradeError, studentId: enrollment.student_id })
                continue
              }

              totalCreated++

              // Lier le template cold si disponible
              if (coldTemplate?.id) {
                await supabase
                  .from('evaluation_template_instances')
                  .insert({ grade_id: grade.id, template_id: coldTemplate.id })
                  .select('id')
                  .maybeSingle()
              }

              // Envoyer l'email à l'apprenant — passe par /learner/access/[id] pour
              // établir la session apprenant (cookie + secureSessionStorage) avant
              // de renvoyer sur /learner/evaluations. Un lien direct vers
              // /learner/evaluations sans session laisse l'apprenant bloqué sur un
              // spinner indéfini (aucune redirection réelle n'est déclenchée).
              const evalLink = `${APP_URLS.getBaseUrl()}/learner/access/${enrollment.student_id}?redirect=/learner/evaluations`

              await sendEmailViaResend({
                to: student.email,
                subject: `Comment avez-vous mis en pratique votre formation "${formationName}" ?`,
                html: `
                  <p>Bonjour ${studentName},</p>
                  <p>Il y a environ 3 mois, vous avez suivi la formation <strong>${formationName}</strong>.</p>
                  <p>Nous aimerions connaître l'impact concret de cette formation sur votre activité professionnelle.</p>
                  <p>Cela ne prend que quelques minutes et vos retours nous aident à améliorer continuellement nos formations.</p>
                  <p style="margin: 24px 0;">
                    <a href="${evalLink}"
                       style="display: inline-block; padding: 12px 28px; background-color: #274472; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
                      Répondre au questionnaire à froid
                    </a>
                  </p>
                  <p style="color: #666; font-size: 13px;">
                    Ou copiez ce lien dans votre navigateur : <a href="${evalLink}" style="color: #274472;">${evalLink}</a>
                  </p>
                  <p>Merci pour votre retour,<br>L'équipe de formation</p>
                `,
              })

              totalEmailed++
            } catch (err) {
              logger.error('send-cold-evaluations: student loop error', err, {
                studentId: enrollment.student_id,
                sessionId,
              })
            }
          }
        }

        logger.info('send-cold-evaluations: done', { sessions: sessions.length, totalCreated, totalEmailed })

        return NextResponse.json({
          success: true,
          sessions: sessions.length,
          gradesCreated: totalCreated,
          emailsSent: totalEmailed,
          message: `${totalCreated} évaluation(s) à froid créée(s), ${totalEmailed} email(s) envoyé(s).`,
        })
      } catch (e) {
        logger.error('send-cold-evaluations: unhandled error', e)
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
      }
    },
    {
      secret: CRON_SECRET,
      allowedIPs: ALLOWED_IPS,
      requireSecret: true,
      logExecution: true,
    }
  )
}
