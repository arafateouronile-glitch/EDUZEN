'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'

export function useOrganization() {
  const { user } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data } = await supabase
        .from('organizations')
        .select('id, name, currency, country, language, settings')
        .eq('id', user.organization_id)
        .single()
      return data
    },
    enabled: !!user?.organization_id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useOrganizationCurrency(): string {
  const { data: org } = useOrganization()
  return org?.currency || 'EUR'
}
