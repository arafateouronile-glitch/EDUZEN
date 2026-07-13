import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DashboardClientLayout from './dashboard-client-layout'

// Cached 60s per userId — invalidated by revalidateTag('layout-data-<userId>')
// Uses admin client so the function is pure (no dependency on request cookies)
const getLayoutData = (userId: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient()

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', userId)
        .single()

      if (!userData?.organization_id) return null

      const orgId = userData.organization_id
      const [orgResult, subscriptionResult] = await Promise.all([
        supabase
          .from('organizations')
          .select('settings, subscription_status')
          .eq('id', orgId)
          .single(),
        supabase
          .from('subscriptions')
          .select('trial_end_at, status')
          .eq('organization_id', orgId)
          .maybeSingle(),
      ])

      return {
        userData,
        org: orgResult.data,
        subscription: subscriptionResult.data,
      }
    },
    [`layout-data-${userId}`],
    { revalidate: 60, tags: [`layout-data-${userId}`] }
  )()

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { headers } = await import('next/headers')
  const h = await headers()
  const pathname = h.get('x-pathname') ?? '/dashboard'

  const supabase = await createClient()
  // getUser() validates the JWT with Supabase Auth server — required here because
  // authUser.id is used to query org data and make routing decisions
  const { data: { user: authUser } } = await supabase.auth.getUser().catch(async (e: unknown) => {
    const err = e as { code?: string }
    if (err?.code === 'refresh_token_not_found') await supabase.auth.signOut()
    return { data: { user: null } }
  })

  if (!authUser) {
    // Clear any stale session cookie so the middleware fast-path no longer
    // sees an auth cookie on the next request (prevents the redirect loop).
    await supabase.auth.signOut().catch(() => {})
    redirect('/auth/login?redirect=' + encodeURIComponent(pathname))
  }

  const isOnboardingRoute = pathname.startsWith('/dashboard/onboarding')
  const isSubscribeRoute = pathname.startsWith('/dashboard/subscribe')

  if (!isOnboardingRoute && !isSubscribeRoute) {
    try {
      const cached = await getLayoutData(authUser.id)

      // Pas de profil en base → onboarding non fait, rediriger
      if (!cached?.userData?.organization_id) {
        redirect('/dashboard/onboarding')
      }

      const { org, subscription } = cached
      const settings = (org?.settings || {}) as Record<string, unknown>
      const paymentMethodAdded = settings.payment_method_added === true
      const onboardingCompleted = settings.onboarding_completed === true

      const trialEndAt = subscription?.trial_end_at
        ? new Date(subscription.trial_end_at)
        : null
      const now = new Date()
      // Un trial actif (prolongé manuellement ou non) donne toujours accès au
      // dashboard, même si le wizard d'onboarding n'a jamais été terminé —
      // sinon une prolongation en base reste sans effet pour le client.
      const hasActiveTrial = !!trialEndAt && trialEndAt > now

      if (!onboardingCompleted && !hasActiveTrial) {
        redirect('/dashboard/onboarding')
      }

      if (!paymentMethodAdded && onboardingCompleted) {
        if (subscription) {
          if (trialEndAt && trialEndAt < now) {
            redirect('/dashboard/onboarding?reason=trial_expired&step=4')
          }
        } else {
          redirect('/dashboard/onboarding?reason=payment_required&step=4')
        }
      }
    } catch {
      // En cas d'erreur DB, rediriger vers l'onboarding par sécurité
      redirect('/dashboard/onboarding')
    }
  }

  return <DashboardClientLayout>{children}</DashboardClientLayout>
}
