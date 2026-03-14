'use client'

import { useQuery } from '@tanstack/react-query'
import { LearnerPipeline } from '@/components/dashboard/crm/learner-pipeline'
import { getLearnerPipeline } from '@/lib/actions/learner-crm-actions'
import { Activity, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function CrmPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['learner-pipeline'],
    queryFn:  () => getLearnerPipeline(),
    staleTime: 2 * 60 * 1000, // 2 min
  })

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2">
            <Activity className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">CRM Apprenants</h1>
            <p className="text-sm text-muted-foreground">
              Pipeline de formation — suivi du parcours de chaque apprenant
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Pipeline */}
      {isLoading ? (
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-1 space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              {[...Array(3)].map((_, j) => (
                <Skeleton key={j} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : data ? (
        <LearnerPipeline initialData={data} />
      ) : null}
    </div>
  )
}
