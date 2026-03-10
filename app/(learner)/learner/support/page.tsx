'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Les apprenants n'ont pas accès au support (tickets).
 * Redirection vers la messagerie pour contacter formateurs, admin ou secrétariat.
 */
export default function LearnerSupportRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/learner/messages')
  }, [router])

  return (
    <div className="p-6 flex items-center justify-center min-h-[40vh]">
      <p className="text-muted-foreground">Redirection…</p>
    </div>
  )
}
