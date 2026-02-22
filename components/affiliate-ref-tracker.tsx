'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Appeler quand l'utilisateur atterrit avec ?ref=AFFILIATE_ID.
 * Déclenche le tracking (clic + cookie 60j) pour attribution à la conversion.
 */
export function AffiliateRefTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('ref')?.trim()
    if (!ref) return

    fetch(`/api/affiliate/track?ref=${encodeURIComponent(ref)}`, {
      method: 'GET',
      credentials: 'same-origin',
    }).catch(() => {})
  }, [searchParams])

  return null
}
