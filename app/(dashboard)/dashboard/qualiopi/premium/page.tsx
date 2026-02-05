'use client'

/**
 * Redirection : /dashboard/qualiopi/premium → /dashboard/qualiopi
 * Le dashboard premium est désormais la page principale Qualiopi.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function QualiopiPremiumRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/qualiopi')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#34B9EE]/5 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-600 font-medium">Redirection...</p>
      </div>
    </div>
  )
}
