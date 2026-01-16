/**
 * API CRON pour les rappels de notifications
 * À exécuter quotidiennement (ex: tous les jours à 18h pour rappeler la veille)
 * 
 * Configurer via Vercel Cron ou service externe
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Sécuriser l'endpoint avec un secret
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Vérifier le secret CRON
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseAdmin = createAdminClient()
    const results: { organizationId: string; scheduled: number; errors: string[] }[] = []

    // Récupérer toutes les organisations avec des abonnements actifs
    const { data: organizations } = await supabaseAdmin
      .from('organizations')
      .select('id, name, settings, subscription_tier')
      .eq('subscription_status', 'active')

    if (!organizations?.length) {
      return NextResponse.json({
        success: true,
        message: 'No active organizations found',
        results: [],
      })
    }

    for (const org of organizations) {
      const orgResult = {
        organizationId: org.id,
        scheduled: 0,
        errors: [] as string[],
      }

      try {
        const settings = (org.settings as any) || {}
        const isPremium = ['premium', 'enterprise'].includes(org.subscription_tier || '')
        
        // Vérifier si les rappels sont activés
        if (settings.notifications?.reminder_enabled === false) {
          continue
        }

        const whatsappEnabled = isPremium && settings.notifications?.whatsapp_enabled
        const emailEnabled = settings.notifications?.email_enabled !== false
        const reminderHours = settings.notifications?.reminder_hours_before || 24

        // Calculer la date de demain
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        
        const dayAfter = new Date(tomorrow)
        dayAfter.setDate(dayAfter.getDate() + 1)

        // Récupérer les sessions de demain
        const { data: upcomingSessions, error: sessionsError } = await supabaseAdmin
          .from('sessions')
          .select(`
            id,
            name,
            start_date,
            start_time,
            end_time,
            location,
            room,
            organization_id,
            formations(id, name),
            session_teachers(
              teacher_id
            ),
            enrollments(
              student_id
            )
          `)
          .eq('organization_id', org.id)
          .gte('start_date', tomorrow.toISOString().split('T')[0])
          .lt('start_date', dayAfter.toISOString().split('T')[0])
          .in('status', ['active', 'scheduled', 'in_progress'])

        if (sessionsError) {
          orgResult.errors.push(`Sessions fetch error: ${sessionsError.message}`)
          continue
        }

        if (!upcomingSessions?.length) {
          continue
        }

        for (const session of upcomingSessions) {
          const formation = (session.formations as any)
          const formattedDate = tomorrow.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })

          const locationInfo = [session.location, session.room].filter(Boolean).join(' - ')
          const timeInfo = session.start_time 
            ? `${session.start_time}${session.end_time ? ` - ${session.end_time}` : ''}`
            : ''

          // Rappels pour les enseignants
          for (const teacherAssignment of (session.session_teachers || [])) {
            const teacherId = (teacherAssignment as any).teacher_id
            if (!teacherId) continue

            // Récupérer les infos de l'enseignant
            const { data: teacher } = await supabaseAdmin
              .from('users')
              .select('id, email, full_name, phone')
              .eq('id', teacherId)
              .single()

            if (!teacher) continue

            const teacherMessage = 
              `📚 Rappel : Vous avez une session de formation demain\n\n` +
              `📖 Formation : ${formation?.name || session.name}\n` +
              `📅 Date : ${formattedDate}\n` +
              `${timeInfo ? `⏰ Horaire : ${timeInfo}\n` : ''}` +
              `${locationInfo ? `📍 Lieu : ${locationInfo}\n` : ''}`

            // WhatsApp pour enseignants (premium)
            if (whatsappEnabled && teacher.phone) {
              await supabaseAdmin
                .from('scheduled_notifications')
                .upsert({
                  organization_id: org.id,
                  type: 'whatsapp',
                  recipient_type: 'teacher',
                  recipient_id: teacher.id,
                  session_id: session.id,
                  message: teacherMessage,
                  scheduled_at: new Date().toISOString(),
                  status: 'pending',
                  metadata: {
                    phone: teacher.phone,
                    recipient_name: teacher.full_name,
                  },
                }, {
                  onConflict: 'organization_id,session_id,recipient_id,type',
                  ignoreDuplicates: true,
                })
              orgResult.scheduled++
            }

            // Email pour enseignants
            if (emailEnabled && teacher.email) {
              await supabaseAdmin
                .from('scheduled_notifications')
                .upsert({
                  organization_id: org.id,
                  type: 'email',
                  recipient_type: 'teacher',
                  recipient_id: teacher.id,
                  session_id: session.id,
                  subject: `Rappel : Formation "${formation?.name || session.name}" - ${formattedDate}`,
                  message: teacherMessage.replace(/\n/g, '<br>'),
                  scheduled_at: new Date().toISOString(),
                  status: 'pending',
                  metadata: {
                    email: teacher.email,
                    recipient_name: teacher.full_name,
                  },
                }, {
                  onConflict: 'organization_id,session_id,recipient_id,type',
                  ignoreDuplicates: true,
                })
              orgResult.scheduled++
            }
          }

          // Rappels pour les apprenants
          for (const enrollment of (session.enrollments || [])) {
            const studentId = (enrollment as any).student_id
            if (!studentId) continue

            // Récupérer les infos de l'apprenant
            const { data: student } = await supabaseAdmin
              .from('students')
              .select('id, first_name, last_name, email, phone, parent_phone')
              .eq('id', studentId)
              .single()

            if (!student) continue

            const studentMessage = 
              `📚 Rappel : Vous avez une formation demain\n\n` +
              `📖 Formation : ${formation?.name || session.name}\n` +
              `📅 Date : ${formattedDate}\n` +
              `${timeInfo ? `⏰ Horaire : ${timeInfo}\n` : ''}` +
              `${locationInfo ? `📍 Lieu : ${locationInfo}\n` : ''}`

            const studentPhone = student.phone || student.parent_phone

            // WhatsApp pour apprenants (premium)
            if (whatsappEnabled && studentPhone) {
              await supabaseAdmin
                .from('scheduled_notifications')
                .upsert({
                  organization_id: org.id,
                  type: 'whatsapp',
                  recipient_type: 'student',
                  recipient_id: student.id,
                  session_id: session.id,
                  message: studentMessage,
                  scheduled_at: new Date().toISOString(),
                  status: 'pending',
                  metadata: {
                    phone: studentPhone,
                    recipient_name: `${student.first_name} ${student.last_name}`,
                  },
                }, {
                  onConflict: 'organization_id,session_id,recipient_id,type',
                  ignoreDuplicates: true,
                })
              orgResult.scheduled++
            }

            // Email pour apprenants
            if (emailEnabled && student.email) {
              await supabaseAdmin
                .from('scheduled_notifications')
                .upsert({
                  organization_id: org.id,
                  type: 'email',
                  recipient_type: 'student',
                  recipient_id: student.id,
                  session_id: session.id,
                  subject: `Rappel : Formation "${formation?.name || session.name}" - ${formattedDate}`,
                  message: studentMessage.replace(/\n/g, '<br>'),
                  scheduled_at: new Date().toISOString(),
                  status: 'pending',
                  metadata: {
                    email: student.email,
                    recipient_name: `${student.first_name} ${student.last_name}`,
                  },
                }, {
                  onConflict: 'organization_id,session_id,recipient_id,type',
                  ignoreDuplicates: true,
                })
              orgResult.scheduled++
            }
          }
        }
      } catch (orgError) {
        orgResult.errors.push(
          orgError instanceof Error ? orgError.message : 'Unknown error'
        )
      }

      results.push(orgResult)
    }

    return NextResponse.json({
      success: true,
      message: 'Notification reminders scheduled',
      results,
      totalScheduled: results.reduce((sum, r) => sum + r.scheduled, 0),
    })
  } catch (error) {
    console.error('CRON notification-reminders error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Configuration pour Vercel Cron (si utilisé)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

