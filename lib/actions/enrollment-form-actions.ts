'use server'

import { createAdminClient as createClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'

export async function sendEnrollmentFormEmail(
  recipientEmail: string,
  linkId: string,
  customMessage?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient() as any

  const { data: link } = await supabase
    .from('enrollment_form_links')
    .select(`
      token, expires_at,
      organizations ( name, slug ),
      sessions ( name, start_date, end_date, location )
    `)
    .eq('id', linkId)
    .single()

  if (!link) return { success: false, error: 'Lien introuvable' }

  const org = link.organizations as { name: string; slug?: string | null } | null
  const session = link.sessions as {
    name: string
    start_date: string
    end_date: string
    location: string | null
  } | null

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.eduzen.io'
  const formUrl = org?.slug
    ? `${baseUrl}/s/${org.slug}/${link.token}`
    : `${baseUrl}/s/${link.token}`

  const expiryLine = link.expires_at
    ? `<p style="color:#666;font-size:13px;">Ce lien expire le ${new Date(link.expires_at).toLocaleDateString('fr-FR')}.</p>`
    : ''

  const sessionBlock = session
    ? `<div style="background:#f0f7ff;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 4px;font-weight:600;color:#274472;">${session.name}</p>
        ${session.start_date ? `<p style="margin:0;color:#666;font-size:13px;">Du ${new Date(session.start_date).toLocaleDateString('fr-FR')} au ${new Date(session.end_date).toLocaleDateString('fr-FR')}</p>` : ''}
        ${session.location ? `<p style="margin:4px 0 0;color:#666;font-size:13px;">📍 ${session.location}</p>` : ''}
      </div>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#15263f;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="padding:40px;text-align:center;">
          <div style="font-family:'Syne',Arial,sans-serif;font-size:24px;font-weight:700;color:#34B9EE;margin-bottom:24px;">${org?.name ?? 'Votre organisme de formation'}</div>
          <h1 style="color:#ffffff;font-size:20px;font-weight:600;margin:0 0 16px;">Formulaire d'inscription</h1>
          ${customMessage ? `<p style="color:rgba(255,255,255,0.8);font-size:15px;line-height:1.6;margin:0 0 24px;">${customMessage}</p>` : ''}
          <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 24px;">
            Cliquez sur le bouton ci-dessous pour accéder à votre formulaire d'inscription :
          </p>
          ${sessionBlock}
          <a href="${formUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#335ACF,#34B9EE);color:white;text-decoration:none;padding:16px 32px;border-radius:10px;font-size:16px;font-weight:700;margin:16px 0;box-shadow:0 8px 24px rgba(52,185,238,0.25);">
            Accéder au formulaire →
          </a>
          ${expiryLine}
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
          <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;">${org?.name ?? ''} — Propulsé par EduZen</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return sendEmailViaResend({
    to: recipientEmail,
    subject: `${org?.name ?? 'Organisme de formation'} — Formulaire d'inscription à votre formation`,
    html,
  })
}
