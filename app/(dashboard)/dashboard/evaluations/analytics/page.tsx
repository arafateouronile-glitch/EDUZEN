'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, Calendar, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { ASSESSMENT_TYPE_LABELS } from '@/lib/services/evaluation-analytics'
import { EvaluationAnalyticsView } from '@/components/evaluations/analytics/evaluation-analytics-view'

function EvaluationBatchAnalytics() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const subject = searchParams.get('subject')
  const assessmentType = searchParams.get('assessment_type')
  const gradedAt = searchParams.get('graded_at')

  const { data: session } = useQuery({
    queryKey: ['session-name', sessionId],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('sessions').select('id, name').eq('id', sessionId as string).maybeSingle()
      return data
    },
    enabled: !!sessionId,
  })

  if (!sessionId) {
    return <p className="text-sm text-gray-500">Lot d&apos;évaluations introuvable.</p>
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/dashboard/evaluations"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux évaluations
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{subject || 'Analyse des évaluations'}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
            {assessmentType && <span>{ASSESSMENT_TYPE_LABELS[assessmentType] ?? assessmentType}</span>}
            {session?.name && (
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> {session.name}
              </span>
            )}
            {gradedAt && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {formatDate(gradedAt)}
              </span>
            )}
            <Link
              href={`/dashboard/sessions/${sessionId}?step=gestion&gestionTab=qualite`}
              className="inline-flex items-center gap-1.5 text-brand-blue hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Suivi qualité de toute la session
            </Link>
          </div>
        </div>
      </div>

      <EvaluationAnalyticsView
        sessionId={sessionId}
        batch={{ subject, assessment_type: assessmentType, graded_at: gradedAt }}
      />
    </div>
  )
}

export default function EvaluationAnalyticsPage() {
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <Suspense fallback={null}>
        <EvaluationBatchAnalytics />
      </Suspense>
    </div>
  )
}
