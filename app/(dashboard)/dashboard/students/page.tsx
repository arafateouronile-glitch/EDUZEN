import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { StudentService } from '@/lib/services/student.service'
import { StudentsClientPage } from './students-client'

export default async function StudentsPage() {
  const queryClient = new QueryClient()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const orgId = await getUserOrgId(supabase, user.id)

    if (orgId) {
      const studentSvc = new StudentService(supabase)

      await queryClient.prefetchQuery({
        queryKey: ['students', orgId, '', 'all', 'all', 1],
        queryFn: () => studentSvc.getAll(orgId, { search: '', page: 1, limit: 12 }),
      })
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StudentsClientPage />
    </HydrationBoundary>
  )
}
