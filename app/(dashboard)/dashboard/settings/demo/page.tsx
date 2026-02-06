'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirection : ancienne page "Données démo" supprimée → retour aux paramètres.
 * Le fichier existe pour éviter l'erreur Tailwind (ENOENT) sur le chemin supprimé.
 */
export default function DemoSettingsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/settings')
  }, [router])
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
    </div>
  )
}
