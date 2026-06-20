import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { getLearnerPipeline } from '@/lib/actions/learner-crm-actions'
import { CrmClientPage } from './crm-client'

export default async function CrmPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['learner-pipeline'],
    queryFn: () => getLearnerPipeline(),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CrmClientPage />
    </HydrationBoundary>
  )
}
