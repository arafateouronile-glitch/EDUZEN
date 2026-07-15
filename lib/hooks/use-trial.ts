'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'

export function useTrial() {
  const { user } = useAuth()
  const supabase = createClient()

  const { data: isTrial = false } = useQuery({
    queryKey: ['is-trial', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return false
      const [{ data: subscription }, { data: org }] = await Promise.all([
        supabase.from('subscriptions').select('status').eq('organization_id', user.organization_id).maybeSingle(),
        supabase.from('organizations').select('settings').eq('id', user.organization_id).single(),
      ])
      // payment_method_added est la source de vérité (cf app/(dashboard)/layout.tsx) :
      // subscriptions.status peut rester bloqué sur 'trialing' si le webhook Stripe
      // n'a pas encore synchronisé, alors que le paiement a bien été effectué.
      const paymentMethodAdded = (org?.settings as Record<string, unknown> | null)?.payment_method_added === true
      if (paymentMethodAdded) return false
      return !subscription || subscription.status === 'trialing'
    },
    enabled: !!user?.organization_id,
    staleTime: 5 * 60_000,
  })

  return { isTrial }
}
