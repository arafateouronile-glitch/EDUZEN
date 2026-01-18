/**
 * API CRON pour l'envoi des documents planifiés
 * À exécuter toutes les 5-15 minutes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withCronSecurity } from '@/lib/utils/cron-security'

const CRON_SECRET = process.env.CRON_SECRET
const ALLOWED_IPS = process.env.CRON_ALLOWED_IPS?.split(',').map(ip => ip.trim()) || []

export async function GET(request: NextRequest) {
  return withCronSecurity(
    request,
    async (req) => {
      try {
    const supabaseAdmin = createAdminClient()
    
    // Récupérer les envois planifiés en attente
    const { data: pending, error: fetchError } = await supabaseAdmin
      .from('scheduled_document_sends')
      .select(`
        *,
        documents(id, name, file_url, type),
        organizations(settings)
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(20)

    if (fetchError) {
      throw fetchError
    }

    if (!pending?.length) {
      return NextResponse.json({
        success: true,
        message: 'No pending document sends',
        sent: 0,
        failed: 0,
      })
    }

    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const scheduledSend of pending) {
      try {
        const document = scheduledSend.documents as any
        const recipients = await getRecipients(
          supabaseAdmin,
          scheduledSend.organization_id,
          scheduledSend.recipient_type,
          scheduledSend.recipient_ids || [],
          scheduledSend.session_id
        )

        if (!recipients.length) {
          await supabaseAdmin
            .from('scheduled_document_sends')
            .update({
              status: 'failed',
              error_message: 'Aucun destinataire trouvé',
            })
            .eq('id', scheduledSend.id)
          failed++
          continue
        }

        // Envoyer à chaque destinataire
        let sendSuccess = true
        const sendErrors: string[] = []

        for (const recipient of recipients) {
          if (scheduledSend.send_via && scheduledSend.send_via.includes('email') && recipient.email) {
            const result = await sendDocumentByEmail(
              recipient.email,
              recipient.name,
              scheduledSend.subject,
              scheduledSend.message,
              document
            )
            if (!result.success) {
              sendErrors.push(`${recipient.email}: ${result.error}`)
              sendSuccess = false
            }
          }
        }

        // Mettre à jour le statut
        await supabaseAdmin
          .from('scheduled_document_sends')
          .update({
            status: sendSuccess ? 'sent' : 'failed',
            sent_at: sendSuccess ? new Date().toISOString() : null,
            error_message: sendErrors.length ? sendErrors.join('; ') : null,
          })
          .eq('id', scheduledSend.id)

        if (sendSuccess) {
          sent++
        } else {
          failed++
          errors.push(...sendErrors.slice(0, 3))
        }
      } catch (sendError) {
        failed++
        const errMsg = sendError instanceof Error ? sendError.message : 'Unknown error'
        errors.push(`${scheduledSend.id}: ${errMsg}`)
        
        await supabaseAdmin
          .from('scheduled_document_sends')
          .update({
            status: 'failed',
            error_message: errMsg,
          })
          .eq('id', scheduledSend.id)
      }
    }

        return NextResponse.json({
          success: true,
          message: 'Scheduled document sends processed',
          sent,
          failed,
          errors: errors.slice(0, 10),
        })
      } catch (error) {
        console.error('CRON send-scheduled-documents error:', error)
        return NextResponse.json(
          { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          },
          { status: 500 }
        )
      }
    },
    {
      secret: CRON_SECRET,
      allowedIPs: ALLOWED_IPS,
      requireSecret: !!CRON_SECRET,
      logExecution: true,
    }
  )
}

/**
 * Récupère les destinataires en fonction du type et des IDs
 */
async function getRecipients(
  supabase: any,
  organizationId: string,
  recipientType: string,
  recipientIds: string[],
  sessionId?: string
): Promise<{ email: string; name: string; phone?: string }[]> {
  const recipients: { email: string; name: string; phone?: string }[] = []

  // Si des IDs spécifiques sont fournis
  if (recipientIds && recipientIds.length > 0) {
    if (recipientType === 'teacher') {
      const { data: teachers } = await supabase
        .from('users')
        .select('email, full_name, phone')
        .in('id', recipientIds)
        .eq('organization_id', organizationId)
      
      teachers?.forEach((t: any) => {
        if (t.email) {
          recipients.push({ email: t.email, name: t.full_name, phone: t.phone })
        }
      })
    } else if (recipientType === 'student') {
      const { data: students } = await supabase
        .from('students')
        .select('email, first_name, last_name, phone, parent_phone')
        .in('id', recipientIds)
        .eq('organization_id', organizationId)
      
      students?.forEach((s: any) => {
        if (s.email) {
          recipients.push({ 
            email: s.email, 
            name: `${s.first_name} ${s.last_name}`,
            phone: s.phone || s.parent_phone 
          })
        }
      })
    }
  }
  // Si une session est spécifiée, envoyer à tous les participants
  else if (sessionId) {
    if (recipientType === 'teacher' || recipientType === 'all') {
      const { data: sessionTeachers } = await supabase
        .from('session_teachers')
        .select(`
          teacher_id,
          users:teacher_id(email, full_name, phone)
        `)
        .eq('session_id', sessionId)
      
      sessionTeachers?.forEach((st: any) => {
        const t = st.users
        if (t?.email) {
          recipients.push({ email: t.email, name: t.full_name, phone: t.phone })
        }
      })
    }
    
    if (recipientType === 'student' || recipientType === 'all') {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          students:student_id(email, first_name, last_name, phone, parent_phone)
        `)
        .eq('session_id', sessionId)
      
      enrollments?.forEach((e: any) => {
        const s = e.students
        if (s?.email) {
          recipients.push({ 
            email: s.email, 
            name: `${s.first_name} ${s.last_name}`,
            phone: s.phone || s.parent_phone 
          })
        }
      })
    }
  }

  return recipients
}

/**
 * Envoie un document par email
 */
async function sendDocumentByEmail(
  to: string,
  recipientName: string,
  subject: string,
  message: string,
  document: { name: string; file_url?: string; type?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0066FF, #4F46E5); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .document-info { background: white; padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid #e5e7eb; }
          .btn { display: inline-block; padding: 12px 24px; background: #0066FF; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">EduZen - Document</h2>
          </div>
          <div class="content">
            <p>Bonjour ${recipientName},</p>
            ${message ? `<p>${message}</p>` : '<p>Vous trouverez ci-joint un document important.</p>'}
            
            <div class="document-info">
              <strong>📄 Document :</strong> ${document.name}
              ${document.file_url ? `
                <br><br>
                <a href="${document.file_url}" class="btn">Télécharger le document</a>
              ` : ''}
            </div>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par EduZen.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const emailApiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const response = await fetch(`${emailApiUrl}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject: subject || `Document : ${document.name}`,
        html,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { 
        success: false, 
        error: errorData.error || `HTTP ${response.status}` 
      }
    }

    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

