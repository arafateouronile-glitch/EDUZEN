/**
 * Edge Function : Relance automatique signature / émargement
 *
 * Si au bout d'1h le stagiaire n'a pas cliqué sur le lien reçu par mail,
 * envoie un rappel via Resend.
 *
 * Déclenchée par cron (ex. toutes les 15 min) ou manuellement.
 * Secrets : RESEND_API_KEY, EDUZEN_APP_URL (optionnel, défaut https://eduzen.app)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ONE_HOUR_MS = 60 * 60 * 1000
const APP_URL = Deno.env.get('EDUZEN_APP_URL') ?? 'https://eduzen.app'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

async function sendResendEmail(
  to: string,
  subject: string,
  html: string,
  from: string = 'EDUZEN <onboarding@resend.dev>'
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY missing' }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: (data as any).message ?? res.statusText }
  }
  return { ok: true, id: (data as any).id }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const since = new Date(Date.now() - ONE_HOUR_MS).toISOString()

    // 1. Émargements en attente créés il y a > 1h, sans rappel ou dernier rappel > 1h
    const { data: attRequests } = await supabase
      .from('electronic_attendance_requests')
      .select(`
        id, student_email, student_name, signature_token, access_token,
        reminder_count, last_reminder_sent_at,
        attendance_session:electronic_attendance_sessions(title, date)
      `)
      .eq('status', 'pending')
      .lt('created_at', since)

    const toRemindAtt = (attRequests ?? []).filter((r: any) => {
      if ((r.reminder_count ?? 0) >= 3) return false
      const last = r.last_reminder_sent_at ? new Date(r.last_reminder_sent_at).getTime() : 0
      return last < Date.now() - ONE_HOUR_MS
    })

    let attSent = 0
    for (const r of toRemindAtt) {
      const token = r.access_token ?? r.signature_token
      const url = `${APP_URL}/sign/${token}`
      const session = r.attendance_session as any
      const title = session?.title ?? 'Formation'
      const date = session?.date
        ? new Date(session.date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : ''

      const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0;">🔔 Rappel d'émargement</h1>
  </div>
  <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Bonjour <strong>${r.student_name}</strong>,</p>
    <p>Ceci est un rappel : vous n'avez pas encore validé votre présence pour la session suivante.</p>
    <p><strong>📚 ${title}</strong><br><strong>📅 ${date}</strong></p>
    <p><a href="${url}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Émarger maintenant</a></p>
    <p style="font-size: 14px; color: #6b7280;">Lien : <a href="${url}" style="color: #f59e0b;">${url}</a></p>
  </div>
  <p style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 14px;">EDUZEN – Plateforme de gestion de formation</p>
</body></html>`

      const { ok } = await sendResendEmail(
        r.student_email,
        `Rappel : Émargement en attente – ${title}`,
        html
      )
      if (ok) {
        await supabase
          .from('electronic_attendance_requests')
          .update({
            reminder_count: (r.reminder_count ?? 0) + 1,
            last_reminder_sent_at: new Date().toISOString(),
          })
          .eq('id', r.id)
        attSent++
      }
    }

    // 2. Demandes de signature (conventions) en attente, même logique
    const { data: sigRequests } = await supabase
      .from('signature_requests')
      .select(`
        id, recipient_email, recipient_name, signature_token, access_token,
        reminder_count, last_reminder_sent_at,
        document:documents(title)
      `)
      .eq('status', 'pending')
      .lt('created_at', since)

    const toRemindSig = (sigRequests ?? []).filter((r: any) => {
      if ((r.reminder_count ?? 0) >= 3) return false
      const last = r.last_reminder_sent_at ? new Date(r.last_reminder_sent_at).getTime() : 0
      return last < Date.now() - ONE_HOUR_MS
    })

    let sigSent = 0
    for (const r of toRemindSig) {
      const token = r.access_token ?? r.signature_token
      const url = `${APP_URL}/sign/${token}`
      const title = (r.document as any)?.title ?? 'Document'

      const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0;">🔔 Rappel de signature</h1>
  </div>
  <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Bonjour <strong>${r.recipient_name}</strong>,</p>
    <p>Ceci est un rappel : le document <strong>${title}</strong> est en attente de votre signature.</p>
    <p><a href="${url}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Signer maintenant</a></p>
    <p style="font-size: 14px; color: #6b7280;">Lien : <a href="${url}" style="color: #f59e0b;">${url}</a></p>
  </div>
  <p style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 14px;">EDUZEN – Plateforme de gestion de formation</p>
</body></html>`

      const { ok } = await sendResendEmail(
        r.recipient_email,
        `Rappel : Signature en attente – ${title}`,
        html
      )
      if (ok) {
        await supabase
          .from('signature_requests')
          .update({
            reminder_count: (r.reminder_count ?? 0) + 1,
            last_reminder_sent_at: new Date().toISOString(),
          })
          .eq('id', r.id)
        sigSent++
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        reminders: { attendance: attSent, signature: sigSent },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('sign-reminder error:', e)
    return new Response(
      JSON.stringify({ error: 'Internal error', details: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
