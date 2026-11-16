/**
 * Envoi d'un email au nom d'un organisme, côté serveur : expéditeur au nom de
 * l'organisme (domaine vérifié Resend), réponses vers l'email de l'organisme,
 * et trace dans email_logs (suivi, checklist Qualiopi, timeline CRM).
 *
 * À utiliser dans les routes serveur à la place d'emailService.sendEmail, qui
 * rappelle /api/email/send sans la session de l'utilisateur (401, email non envoyé).
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaResend, verifiedSenderAddress } from '@/lib/utils/send-email-resend'
import { logger } from '@/lib/utils/logger'

export interface OrganizationEmailInput {
  organizationId: string
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{ filename: string; content: Buffer }>
  /** Type d'email enregistré dans email_logs (ex. type du modèle de document) */
  templateType?: string | null
  metadata?: Record<string, unknown>
}

export async function sendOrganizationEmail(
  input: OrganizationEmailInput
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { data: organization } = await createAdminClient()
    .from('organizations')
    .select('name, email')
    .eq('id', input.organizationId)
    .maybeSingle()
  const sender = organization as { name?: string | null; email?: string | null } | null
  const from = `${(sender?.name || 'EDUZEN').replace(/[<>"]/g, '')} <${verifiedSenderAddress()}>`

  const result = await sendEmailViaResend({
    from,
    replyTo: sender?.email || undefined,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.attachments,
  })

  if (result.success) {
    const { error } = await createAdminClient().from('email_logs').insert({
      organization_id: input.organizationId,
      recipient: input.to,
      subject: input.subject,
      template_type: input.templateType ?? null,
      resend_id: result.id ?? null,
      status: 'sent',
      metadata: input.metadata ?? {},
    } as never)
    if (error) logger.warn('email_logs insert failed', { error: error.message })
  }

  return result
}
