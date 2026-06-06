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
      const { data } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('organization_id', user.organization_id)
        .maybeSingle()
      return !data || data.status === 'trialing'
    },
    enabled: !!user?.organization_id,
    staleTime: 5 * 60_000,
  })

  return { isTrial }
}
