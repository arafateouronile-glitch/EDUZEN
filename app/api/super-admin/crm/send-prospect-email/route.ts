import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { logger } from '@/lib/utils/logger'
import { filterXSS } from 'xss'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: admin } = await supabase
      .from('platform_admins')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { recipientEmail, subject, body } = await req.json()

    if (!recipientEmail || !subject || !body) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    // Convert plain text body to simple HTML
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.7;color:#333;max-width:600px;margin:0 auto;padding:32px 20px;">
  ${filterXSS(String(body))
    .split('\n')
    .map((line) => (line.trim() === '' ? '<br>' : `<p style="margin:0 0 12px">${line}</p>`))
    .join('\n')}
</body>
</html>`

    const result = await sendEmailViaResend({
      to: recipientEmail,
      subject: filterXSS(String(subject).slice(0, 200)),
      html,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Erreur envoi email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('[send-prospect-email]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
