/**
 * POST /api/jury/send-convocation
 * Envoie (ou renvoie) la convocation d'un membre du jury pour une session.
 * Requiert une session authentifiée admin.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.eduzen.io'

export async function POST(request: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionJuryId } = body as { sessionJuryId?: string }
    if (!sessionJuryId) {
      return NextResponse.json({ error: 'sessionJuryId requis' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // ── Récupérer l'entrée session_jury avec toutes les relations ────────────
    const { data: sj, error: sjError } = await supabase
      .from('session_jury')
      .select(`
        *,
        jury_members(*),
        sessions(
          id,
          name,
          start_date,
          end_date,
          exam_date,
          location,
          organization_id,
          organizations(id, name, email)
        )
      `)
      .eq('id', sessionJuryId)
      .single()

    if (sjError || !sj) {
      return NextResponse.json({ error: 'Entrée session_jury introuvable' }, { status: 404 })
    }

    const session      = sj.sessions
    const juryMember   = sj.jury_members
    const organization = session?.organizations

    if (!session || !juryMember?.email) {
      return NextResponse.json({ error: 'Données incomplètes' }, { status: 422 })
    }

    // Sécurité multi-tenant : vérifier que la session appartient à l'org de l'utilisateur
    const { data: userRow } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userRow?.organization_id && session.organization_id !== userRow.organization_id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // ── Construire les liens de confirmation ────────────────────────────────
    const confirmUrl = `${APP_URL}/api/jury/confirm?token=${sj.token}&action=confirm`
    const declineUrl = `${APP_URL}/api/jury/confirm?token=${sj.token}&action=decline`

    const formatDt = (dt: string | null) =>
      dt ? format(new Date(dt), 'd MMMM yyyy', { locale: fr }) : 'Non définie'

    const examDateStr = session.exam_date
      ? format(new Date(session.exam_date), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })
      : 'Date à confirmer'

    const orgName = organization?.name || 'L\'organisme de formation'
    const subject = `[CONVOCATION] Jury d'examen — ${session.name}`

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour ${juryMember.first_name} ${juryMember.last_name},</p>

            <p style="margin:0 0 20px;">Vous êtes convoqué(e) en tant que membre du jury pour l'examen de la session suivante, organisée par ${orgName} :</p>

            <p style="margin:0 0 8px;"><strong>Formation :</strong> ${session.name}</p>
            <p style="margin:0 0 8px;"><strong>Date d'examen :</strong> ${examDateStr}</p>
            <p style="margin:0 0 8px;"><strong>Période :</strong> ${formatDt(session.start_date)} — ${formatDt(session.end_date)}</p>
            ${session.location ? `<p style="margin:0 0 20px;"><strong>Lieu :</strong> ${session.location}</p>` : '<p style="margin:0 0 20px;"></p>'}

            <p style="margin:0 0 20px;">Merci de confirmer votre présence. Un seul clic suffit, aucun compte n'est nécessaire.</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
              <tr>
                <td style="padding-right:8px;">
                  <a href="${confirmUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:4px;">Je confirme ma présence</a>
                </td>
                <td style="padding-left:8px;">
                  <a href="${declineUrl}" style="display:inline-block;background:#ffffff;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:4px;border:1px solid #1a1a1a;">Je ne serai pas disponible</a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 40px;font-size:14px;color:#555;">Ce lien est personnel et à usage unique. En cas de problème, contactez directement ${orgName}.</p>

            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
              ${orgName}
            </p>

          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

    // ── Envoyer via Resend ──────────────────────────────────────────────────
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const FROM_EMAIL     = process.env.EMAIL_FROM || 'noreply@eduzen.io'

    if (RESEND_API_KEY) {
      const { Resend } = await import('resend')
      const resend = new Resend(RESEND_API_KEY)
      const { error: resendError } = await resend.emails.send({
        from:    FROM_EMAIL,
        to:      juryMember.email,
        subject,
        html,
        replyTo: organization?.email || undefined,
      })
      if (resendError) {
        return NextResponse.json({ error: resendError.message }, { status: 502 })
      }
    } else {
      // Mode développement — simuler l'envoi
      logger.debug('[send-convocation] DEV — email simulé', { to: juryMember.email, subject })
    }

    // ── Mettre à jour email_sent_at ──────────────────────────────────────────
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    await supabase
      .from('session_jury')
      .update({
        email_sent_at: new Date().toISOString(),
        token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', sessionJuryId)

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('[send-convocation] error', err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
