'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Prévisualisation d'un portfolio : redirection vers la page d'édition du portfolio.
 * Évite le 404 sur les liens "preview" de la liste des portfolios.
 */
export default function PortfolioPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  useEffect(() => {
    if (id) {
      router.replace(`/dashboard/evaluations/portfolios/${id}`)
    }
  }, [id, router])

  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
    </div>
  )
}
