/**
 * API CRON pour l'envoi effectif des notifications planifiées
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
        
        // Récupérer les notifications en attente
        const { data: pending, error: fetchError } = await supabaseAdmin
          .from('scheduled_notifications')
          .select(`
            *,
            organizations(settings)
          `)
          .eq('status', 'pending')
          .lte('scheduled_at', new Date().toISOString())
          .limit(50)

        if (fetchError) {
          throw fetchError
        }

        if (!pending?.length) {
          return NextResponse.json({
            success: true,
            message: 'No pending notifications',
            sent: 0,
            failed: 0,
          })
        }

        let sent = 0
        let failed = 0
        const errors: string[] = []

        for (const notification of pending) {
          const metadata = (notification.metadata as any) || {}
          let success = false
          let errorMessage: string | null = null

          try {
            if (notification.type === 'whatsapp') {
              // Envoyer via WhatsApp
              success = await sendWhatsAppMessage(
                metadata.phone,
                notification.message,
                notification.organization_id,
                (notification.organizations as any)?.settings
              )
              if (!success) {
                errorMessage = 'WhatsApp send failed'
              }
            } else if (notification.type === 'email') {
              // Envoyer via Email (utilise l'API email interne)
              const emailResult = await sendEmailNotification(
                metadata.email,
                notification.subject || 'Notification',
                notification.message,
                metadata.recipient_name
              )
              success = emailResult.success
              if (!success) {
                errorMessage = emailResult.error || 'Email send failed'
              }
            } else if (notification.type === 'sms') {
              // SMS - à implémenter selon le provider
              errorMessage = 'SMS not yet implemented'
            }

            // Mettre à jour le statut
            await supabaseAdmin
              .from('scheduled_notifications')
              .update({
                status: success ? 'sent' : 'failed',
                sent_at: success ? new Date().toISOString() : null,
                error_message: errorMessage,
              })
              .eq('id', notification.id)

            if (success) {
              sent++
            } else {
              failed++
              if (errorMessage) {
                errors.push(`${notification.id}: ${errorMessage}`)
              }
            }
          } catch (notifError) {
            failed++
            const errMsg = notifError instanceof Error ? notifError.message : 'Unknown error'
            errors.push(`${notification.id}: ${errMsg}`)
            
            await supabaseAdmin
              .from('scheduled_notifications')
              .update({
                status: 'failed',
                error_message: errMsg,
              })
              .eq('id', notification.id)
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Notifications processed',
          sent,
          failed,
          errors: errors.slice(0, 10), // Limiter les erreurs retournées
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json(
          { 
            success: false, 
            error: errorMessage
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
 * Envoie un message WhatsApp via Twilio
 */
async function sendWhatsAppMessage(
  phone: string,
  message: string,
  organizationId: string,
  orgSettings: any
): Promise<boolean> {
  const whatsappConfig = orgSettings?.whatsapp || {}

  if (!whatsappConfig.account_sid || !whatsappConfig.auth_token || !whatsappConfig.from_number) {
    return false
  }

  try {
    // Nettoyer le numéro de téléphone
    let cleanPhone = phone.replace(/\s+/g, '').replace(/[^+\d]/g, '')
    if (!cleanPhone.startsWith('+')) {
      // Ajouter le préfixe par défaut (Sénégal)
      cleanPhone = `+221${cleanPhone}`
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${whatsappConfig.account_sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${whatsappConfig.account_sid}:${whatsappConfig.auth_token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:${whatsappConfig.from_number}`,
          To: `whatsapp:${cleanPhone}`,
          Body: message,
        }),
      }
    )

    return response.ok
  } catch (error) {
    return false
  }
}

/**
 * Envoie un email via l'API interne
 */
async function sendEmailNotification(
  to: string,
  subject: string,
  htmlContent: string,
  recipientName?: string
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
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">EduZen</h2>
          </div>
          <div class="content">
            ${recipientName ? `<p>Bonjour ${recipientName},</p>` : ''}
            ${htmlContent}
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
        subject,
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
