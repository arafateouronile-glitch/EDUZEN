/**
 * POST /api/outils/[tool] — outils gratuits en libre-service (/outils).
 * Valide le formulaire, génère le document, l'envoie par email au visiteur
 * et enregistre le lead (séquence marketing via /api/cron/lead-nurture).
 * Public : limite par IP et champ piège contre les robots.
 */

import { NextResponse } from 'next/server'
import { withDistributedRateLimit } from '@/lib/utils/rate-limiter-distributed'
import { outilRequestSchema, parseLearners, MAX_EMARGEMENT_DAYS, MAX_EMARGEMENT_LEARNERS, type OutilRequest } from '@/lib/outils/schemas'
import { isOutilKey, OUTILS, type OutilKey } from '@/lib/outils/tools'
import { generateOutilPdf } from '@/lib/outils/generate'
import { recordLead, unsubscribeHeaders, unsubscribeUrl } from '@/lib/outils/leads'
import { buildLeadDeliveryEmail, LEAD_EMAIL_FROM, LEAD_EMAIL_REPLY_TO } from '@/lib/emails/lead-nurture-emails'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { APP_URLS } from '@/lib/config/app-config'
import { QUALIOPI_REFERENTIAL } from '@/lib/constants/qualiopi-referential'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

const DAY_MS = 24 * 60 * 60 * 1000

/** Contrôles qui dépassent le schéma : taille de la feuille d'émargement, réponses Qualiopi complètes */
export function extraValidation(tool: OutilKey, request: OutilRequest): string | null {
  const f = request.fields as Record<string, unknown>
  if (tool === 'emargement') {
    const learners = parseLearners(String(f.apprenants))
    if (learners.length === 0) return 'Ajoutez au moins un apprenant'
    if (learners.length > MAX_EMARGEMENT_LEARNERS) return `${MAX_EMARGEMENT_LEARNERS} apprenants maximum`
    const days = (new Date(String(f.session_fin)).getTime() - new Date(String(f.session_debut)).getTime()) / DAY_MS + 1
    if (days > MAX_EMARGEMENT_DAYS) return `${MAX_EMARGEMENT_DAYS} jours maximum`
  }
  if (tool === 'qualiopi') {
    const answers = f.answers as Record<string, string>
    const missing = QUALIOPI_REFERENTIAL.flatMap((c) => c.indicators).filter((i) => !answers[String(i.number)])
    if (missing.length > 0) return `Répondez aux ${missing.length} indicateur(s) restant(s)`
  }
  return null
}

/** Ce qu'on garde de la demande (sans le logo) pour les statistiques */
function payloadForStats(request: OutilRequest): Record<string, unknown> {
  const { logo: _logo, ...organisme } = request.organisme as Record<string, unknown>
  return { organisme, fields: request.fields }
}

export async function POST(request: Request, { params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params
  return withDistributedRateLimit(request, 'strict', async (req) => {
    if (!isOutilKey(tool)) return NextResponse.json({ error: 'Outil inconnu' }, { status: 404 })

    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }

    // Champ piège : un robot reçoit un faux succès, rien n'est généré ni enregistré
    if (typeof body.website === 'string' && body.website.trim()) {
      return NextResponse.json({ success: true })
    }

    const parsed = outilRequestSchema(tool).safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' }, { status: 400 })
    }
    const data = parsed.data
    const invalid = extraValidation(tool, data)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

    let generated
    try {
      generated = await generateOutilPdf(tool, data)
    } catch (error) {
      logger.error('[outils] génération impossible', error, { tool })
      return NextResponse.json({ error: 'La génération du document a échoué. Réessayez dans un instant.' }, { status: 500 })
    }
    const qualiopiScore = generated.qualiopi?.score ?? null

    let lead
    try {
      lead = await recordLead({
        email: data.lead.email,
        firstName: data.lead.first_name,
        lastName: data.lead.last_name,
        organizationName: data.organisme.nom,
        phone: (data.organisme as { telephone?: string }).telephone,
        tool,
        payload: payloadForStats(data),
        qualiopiScore,
      })
    } catch (error) {
      logger.error('[outils] enregistrement du lead impossible', error, { tool })
      return NextResponse.json({ error: 'Une erreur est survenue. Réessayez dans un instant.' }, { status: 500 })
    }

    const baseUrl = APP_URLS.getBaseUrl()
    const email = buildLeadDeliveryEmail({
      prenom: data.lead.first_name,
      tool,
      unsubscribeUrl: unsubscribeUrl(baseUrl, lead.unsubscribe_token),
      qualiopiScore,
    })
    const sent = await sendEmailViaResend({
      from: LEAD_EMAIL_FROM,
      replyTo: LEAD_EMAIL_REPLY_TO,
      to: lead.email,
      subject: email.subject,
      html: email.html,
      attachments: [{ filename: OUTILS[tool].fileName, content: generated.pdf }],
      headers: unsubscribeHeaders(baseUrl, lead.unsubscribe_token),
    })
    if (!sent.success) {
      logger.error('[outils] envoi du document impossible', undefined, { tool, error: sent.error })
      return NextResponse.json({ error: "L'email n'a pas pu être envoyé. Vérifiez votre adresse et réessayez." }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      ...(generated.qualiopi
        ? { score: generated.qualiopi.score, criteria: generated.qualiopi.criteria.map((c) => ({ number: c.number, name: c.name, score: c.score })) }
        : {}),
    })
  })
}
