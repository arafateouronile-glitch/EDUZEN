'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { ShieldCheck, AlertTriangle, FileText, Loader2, ChevronRight } from 'lucide-react'
import { motion } from '@/components/ui/motion'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

type SessionSummary = {
  sessionId: string
  sessionName: string
  formationName?: string
  startDate: string
  endDate: string
  score: number
  totalStudents: number
  alertCount: number
}

export default function QualiopiCheckPage() {
  const { user } = useAuth()

  const { data: sessions = [], isLoading } = useQuery<SessionSummary[]>({
    queryKey: ['qualiopi-check-sessions', user?.organization_id],
    queryFn: async () => {
      const res = await fetch('/api/qualiopi-check/sessions?limit=30')
      if (!res.ok) throw new Error('Erreur chargement sessions')
      return res.json()
    },
    enabled: !!user?.organization_id,
  })

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Qualiopi Check</h1>
        <p className="text-gray-600 mt-1">
          Tableau de bord de conformité des dossiers stagiaires par session. Vérifiez en un coup d&apos;œil que tout est prêt pour l&apos;audit.
        </p>
      </div>

      {isLoading ? (
        <GlassCard variant="premium" className="p-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#34B9EE]" />
          <p className="text-gray-600">Chargement des sessions…</p>
        </GlassCard>
      ) : sessions.length === 0 ? (
        <GlassCard variant="premium" className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Aucune session à afficher.</p>
          <p className="text-sm text-gray-500 mt-2">Les sessions avec inscriptions apparaîtront ici.</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {sessions.map((s) => (
            <Link key={s.sessionId} href={`/dashboard/qualiopi/check/${s.sessionId}`}>
              <GlassCard
                variant="premium"
                hoverable
                className={cn(
                  'p-6 transition-all',
                  s.score < 100 && 'border-amber-200 dark:border-amber-800'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                        s.score === 100
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                      )}
                    >
                      {s.score === 100 ? (
                        <ShieldCheck className="h-6 w-6" />
                      ) : (
                        <AlertTriangle className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-white">{s.sessionName}</h2>
                      {s.formationName && (
                        <p className="text-sm text-gray-500">{s.formationName}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(s.startDate)} – {formatDate(s.endDate)} · {s.totalStudents} apprenant(s)
                      </p>
                      {s.alertCount > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          {s.alertCount} alerte(s) à traiter
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span
                        className={cn(
                          'text-2xl font-bold',
                          s.score === 100
                            ? 'text-green-600 dark:text-green-400'
                            : s.score >= 70
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {s.score}%
                      </span>
                      <span className="text-xs text-gray-500">Score de santé</span>
                    </div>
                    <div className="w-24 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <motion.div
                        className={cn(
                          'h-full rounded-full',
                          s.score === 100
                            ? 'bg-green-500'
                            : s.score >= 70
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${s.score}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
