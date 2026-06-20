import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { FormationService } from '@/lib/services/formation.service'
import { ProgramService } from '@/lib/services/program.service'
import { FormationsClientPage } from './formations-client'

const PAGE_SIZE = 24

export default async function FormationsPage() {
  const queryClient = new QueryClient()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const orgId = await getUserOrgId(supabase, user.id)

    if (orgId) {
      const formationSvc = new FormationService(supabase)
      const programSvc = new ProgramService(supabase)

      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['formations', orgId, '', true, '', 0],
          queryFn: async () => {
            const result = await formationSvc.getAllFormations(orgId, {
              isActive: true,
              limit: PAGE_SIZE,
              offset: 0,
            })
            return result as { data: any[]; count: number; hasMore: boolean }
          },
        }),
        queryClient.prefetchQuery({
          queryKey: ['programs-filter', orgId],
          queryFn: async () => {
            const result = await programSvc.getAllPrograms(orgId, { isActive: true })
            return Array.isArray(result) ? result : result.data
          },
          staleTime: 1000 * 60 * 5,
        }),
      ])
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FormationsClientPage />
    </HydrationBoundary>
  )
}
