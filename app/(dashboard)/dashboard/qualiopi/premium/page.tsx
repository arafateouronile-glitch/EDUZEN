'use client'

/**
 * Page Dashboard Qualiopi Premium
 * Interface ultra-premium inspirée de Linear et Apple
 * URL: /dashboard/qualiopi/premium
 */

import { Suspense } from 'react'
import { QualiopiDashboardPremium } from '@/components/qualiopi/premium'
import { RefreshCw } from 'lucide-react'

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#34B9EE]/5 flex items-center justify-center">
      <div className="text-center">
        <RefreshCw className="h-12 w-12 animate-spin text-[#34B9EE] mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Chargement du dashboard...</p>
      </div>
    </div>
  )
}

export default function QualiopiPremiumPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <QualiopiDashboardPremium />
    </Suspense>
  )
}
