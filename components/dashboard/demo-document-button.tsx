'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Loader2, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DemoDocumentButton() {
  const { user } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: documentsCount } = useQuery({
    queryKey: ['documents-count-demo', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      const { count } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', user.organization_id)
      return count ?? 0
    },
    enabled: !!user?.organization_id,
  })

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/documents/generate-demo')
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Erreur lors de la génération')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  // Ne pas afficher si documents déjà générés ou si fermé
  if (dismissed || (documentsCount !== undefined && documentsCount > 0)) return null
  if (user?.role === 'teacher') return null

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-brand-blue via-brand-blue/90 to-brand-cyan p-px mb-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#0a1628] to-[#0d2a4a] px-6 py-5 flex items-center gap-4">
        {/* Icône */}
        <div className="shrink-0 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
          <FileText className="w-6 h-6 text-white" />
        </div>

        {/* Texte */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base leading-snug">
            Voir ce qu'EduZen génère pour vous
          </p>
          <p className="text-white/60 text-sm mt-0.5">
            Convention d'exemple avec les infos de {user?.organization_id ? 'votre organisme' : 'votre organisme'} — générée en quelques secondes
          </p>
          {error && (
            <p className="text-red-300 text-xs mt-1">{error}</p>
          )}
        </div>

        {/* Bouton */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={cn(
            'shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all',
            'bg-white text-brand-blue hover:bg-white/90 active:scale-95',
            loading && 'opacity-70 cursor-not-allowed'
          )}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Génération…</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Générer</>
          )}
        </button>

        {/* Fermer */}
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
