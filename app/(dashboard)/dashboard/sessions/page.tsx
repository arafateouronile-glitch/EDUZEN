import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { SessionService } from '@/lib/services/session.service'
import { FormationService } from '@/lib/services/formation.service'
import { SessionsClientPage } from './sessions-client'

const PAGE_SIZE = 24

export default async function SessionsPage() {
  const queryClient = new QueryClient()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const orgId = await getUserOrgId(supabase, user.id)

    if (orgId) {
      const sessionSvc = new SessionService(supabase)
      const formationSvc = new FormationService(supabase)

      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['sessions', orgId, '', '', '', 0],
          queryFn: () =>
            sessionSvc.getAllSessions(orgId, { limit: PAGE_SIZE, offset: 0 }),
        }),
        queryClient.prefetchQuery({
          queryKey: ['formations-filter', orgId],
          queryFn: async () => {
            const result = await formationSvc.getAllFormations(orgId, { isActive: true })
            return Array.isArray(result) ? result : result.data
          },
          staleTime: 1000 * 60 * 10,
        }),
      ])
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SessionsClientPage />
    </HydrationBoundary>
  )
}
