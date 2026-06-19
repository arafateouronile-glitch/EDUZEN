import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { ProgramService } from '@/lib/services/program.service'
import { ProgramsClientPage } from './programs-client'

const PAGE_SIZE = 24

export default async function ProgramsPage() {
  const queryClient = new QueryClient()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const orgId = await getUserOrgId(supabase, user.id)

    if (orgId) {
      const programSvc = new ProgramService(supabase)

      await queryClient.prefetchQuery({
        queryKey: ['programs', orgId, '', true, 0],
        queryFn: () =>
          programSvc.getAllPrograms(orgId, { isActive: true, limit: PAGE_SIZE, offset: 0 }),
      })
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProgramsClientPage />
    </HydrationBoundary>
  )
}
