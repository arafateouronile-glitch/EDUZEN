'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirection : Sites et Antennes a été déplacé dans Paramètres.
 */
export default function SitesRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/settings/sites')
  }, [router])
  return null
}
