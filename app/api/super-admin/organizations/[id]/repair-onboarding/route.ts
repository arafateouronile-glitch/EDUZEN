import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { ensureOnboardingComplete } from '@/lib/utils/billing/ensure-onboarding-complete'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/super-admin/organizations/[id]/repair-onboarding
 *
 * Force la complétion d'onboarding d'une organisation : écrit
 * onboarding_completed + payment_method_added et invalide le cache du layout
 * pour tous ses utilisateurs. Débloque un client facturé resté coincé sur
 * l'onboarding, sans intervention SQL.
 *
 * Body optionnel : { markPaymentAdded?: boolean } (défaut true).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: admin } = await supabase
      .from('platform_admins')
      .select('permissions')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!admin || !(admin.permissions as { manage_subscriptions?: boolean })?.manage_subscriptions) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const markPaymentAdded = body?.markPaymentAdded !== false

    const service = createServiceRoleClient()

    const { data: org } = await service
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .maybeSingle()

    if (!org) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
    }

    const ok = await ensureOnboardingComplete(service, organizationId, {
      markPaymentAdded,
      context: { source: 'super-admin-repair', adminUserId: user.id },
    })

    if (!ok) {
      return NextResponse.json(
        { error: 'La réparation a échoué (voir logs [billing][CRITICAL])' },
        { status: 500 }
      )
    }

    // Invalider le cache du layout pour chaque utilisateur de l'org
    const { data: orgUsers } = await service
      .from('users')
      .select('id')
      .eq('organization_id', organizationId)

    for (const u of orgUsers ?? []) {
      revalidateTag(`layout-data-${u.id}`, { expire: 0 })
    }

    logger.info('[super-admin] Onboarding réparé', {
      organizationId,
      orgName: org.name,
      adminUserId: user.id,
      usersRefreshed: orgUsers?.length ?? 0,
      markPaymentAdded,
    })

    return NextResponse.json({
      success: true,
      organizationId,
      usersRefreshed: orgUsers?.length ?? 0,
    })
  } catch (error) {
    logger.error('[super-admin] repair-onboarding erreur:', (error as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
