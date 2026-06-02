import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function ensureSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: admin } = await supabase
    .from('platform_admins')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!admin) throw new Error('Accès réservé aux super admins')
  return createAdminClient()
}

export async function POST(req: NextRequest) {
  try {
    const admin = await ensureSuperAdmin()
    const { organizationId } = await req.json()

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId requis' }, { status: 400 })
    }

    // Fetch org info
    const { data: org } = await admin
      .from('organizations')
      .select('id, name, subscription_status, subscription_tier, settings, created_at')
      .eq('id', organizationId)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
    }

    // Fetch primary user (account owner)
    const { data: users } = await admin
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })
      .limit(1)

    const primaryUser = users?.[0]
    if (!primaryUser?.email) {
      return NextResponse.json({ error: 'Aucun utilisateur avec email trouvé pour cette organisation' }, { status: 404 })
    }

    // Fetch last events for context
    const { data: events } = await admin
      .from('customer_events')
      .select('event_type, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(10)

    const eventTypes = (events ?? []).map((e) => e.event_type)
    const daysSinceSignup = events?.length
      ? Math.floor((Date.now() - new Date(events[events.length - 1].created_at).getTime()) / 86_400_000)
      : null

    // Compute milestone label
    const milestone = computeMilestone(eventTypes)
    const firstName = primaryUser.first_name?.trim() || primaryUser.email.split('@')[0]
    const lastName = primaryUser.last_name?.trim() || ''

    const prompt = `Tu es responsable commercial chez EduZen, une plateforme SaaS française pour les organismes de formation (gestion administrative, qualité Qualiopi, émargements numériques, suivi apprenants).

Rédige un email de prise de contact chaleureux et professionnel en français pour ce prospect :

- Prénom : ${firstName}
- Nom : ${lastName}
- Organisation : ${org.name}
- Étape dans son parcours : ${milestone}
- Actions réalisées : ${eventTypes.slice(0, 5).join(', ') || 'Inscription récente'}
- Inscrit depuis : ${daysSinceSignup !== null ? `${daysSinceSignup} jour(s)` : 'récemment'}
- Plan actuel : ${org.subscription_tier || 'essai gratuit'}

Objectif : lui proposer une visio de démonstration de 15 minutes dans les prochains jours pour l'aider à tirer le meilleur d'EduZen et répondre à ses questions.

Contraintes :
- Ton humain, direct et bienveillant — pas commercial ni insistant
- Référence subtilement ce qu'il a déjà fait sur la plateforme (sans être intrusif)
- 3 paragraphes maximum
- Termine par : "Cordialement,\nL'équipe EduZen"
- NE PAS mettre de placeholders entre crochets
- Propose un lien fictif de réservation : https://cal.com/eduzen/demo-15min

Réponds UNIQUEMENT avec un JSON valide, sans markdown, avec exactement ces deux clés :
{"subject": "...", "body": "..."}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()

    let parsed: { subject: string; body: string }
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Try to extract JSON from markdown code block if present
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) {
        parsed = JSON.parse(match[1].trim())
      } else {
        throw new Error('Réponse IA invalide')
      }
    }

    return NextResponse.json({
      subject: parsed.subject,
      body: parsed.body,
      recipientEmail: primaryUser.email,
      recipientName: `${firstName} ${lastName}`.trim(),
      orgName: org.name,
    })
  } catch (err) {
    logger.error('[generate-prospect-email]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

function computeMilestone(eventTypes: string[]): string {
  const has = (t: string) => eventTypes.includes(t)
  if (has('billing_started')) return 'Abonnement payant actif'
  if (has('first_pdf_generated') || has('first_document_generated')) return 'Premier document généré'
  if (has('first_student_added')) return 'Premier apprenant ajouté'
  if (has('first_session_created')) return 'Première session créée'
  if (has('first_formation_created')) return 'Première formation créée'
  if (has('onboarding_started')) return 'Onboarding en cours'
  if (has('signup')) return 'Inscription récente'
  return 'Nouveau compte'
}
