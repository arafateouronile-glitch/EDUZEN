'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  Loader2,
  ArrowLeft,
  Mail,
  Download,
  CheckCircle2,
  XCircle,
  ClipboardList,
} from 'lucide-react'
import { motion } from '@/components/ui/motion'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type SessionComplianceStudent = {
  student_id: string
  student_name: string
  student_email: string | null
  hasSignedContract: boolean
  attendanceSignedSlots: number
  attendanceTotalSlots: number
  /** Positionnement pré-formation — indicateur 2 Qualiopi */
  hasPreFormationEval: boolean
  /** Évaluation à chaud — indicateur 7 Qualiopi */
  hasEvaluation: boolean
  /** Évaluation à froid — indicateur 14 Qualiopi */
  hasColdEvaluation: boolean
  missingAttendanceDates?: string[]
}

type ComplianceAlert = {
  type: 'contract' | 'attendance' | 'evaluation' | 'cold_evaluation' | 'certificate'
  priority: string
  message: string
  count?: number
  details?: string
}

type SessionComplianceResult = {
  sessionId: string
  sessionName: string
  formationName?: string
  startDate: string
  endDate: string
  score: number
  totalStudents: number
  students: SessionComplianceStudent[]
  alerts: ComplianceAlert[]
}

export default function QualiopiCheckSessionPage() {
  const params = useParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const sessionId = params?.sessionId as string

  const { data: compliance, isLoading } = useQuery<SessionComplianceResult>({
    queryKey: ['qualiopi-check-session', sessionId, user?.organization_id],
    queryFn: async () => {
      const res = await fetch(`/api/qualiopi-check/sessions/${sessionId}`)
      if (!res.ok) throw new Error('Session introuvable')
      return res.json()
    },
    enabled: !!sessionId && !!user?.organization_id,
  })

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/qualiopi-check/sessions/${sessionId}/resend`, {
        method: 'POST',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? 'Erreur lors de la relance')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['qualiopi-check-session', sessionId] })
      toast.success(data?.message ?? 'Relance envoyée.')
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    },
  })

  const auditZipMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/qualiopi-check/sessions/${sessionId}/audit-zip`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? 'Erreur lors de la préparation de l\'archive')
      }
      return res.json()
    },
    onSuccess: (data) => {
      if (data?.files?.length) {
        data.files.forEach((f: { name: string; url: string }) => {
          window.open(f.url, '_blank')
        })
        toast.success(`${data.files.length} fichier(s) à télécharger.`)
      } else {
        toast.info(data?.message ?? 'Aucun fichier signé disponible.')
      }
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    },
  })

  if (!sessionId) return null
  if (isLoading || !compliance) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-10 w-10 animate-spin text-[#34B9EE] mb-4" />
        <p className="text-gray-600">Chargement de la conformité…</p>
      </div>
    )
  }

  const score = compliance.score
  const scoreColor =
    score === 100 ? 'text-green-600' : score >= 70 ? 'text-amber-600' : 'text-red-600'
  const progressColor =
    score === 100 ? 'bg-green-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/qualiopi/check">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{compliance.sessionName}</h1>
          {compliance.formationName && (
            <p className="text-gray-500">{compliance.formationName}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(compliance.startDate)} – {formatDate(compliance.endDate)} · {compliance.totalStudents} apprenant(s)
          </p>
        </div>
      </div>

      {/* Score de santé */}
      <GlassCard variant="premium" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl',
                score === 100 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
              )}
            >
              {score === 100 ? (
                <ShieldCheck className="h-8 w-8" />
              ) : (
                <AlertTriangle className="h-8 w-8" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Score de santé</h2>
              <p className="text-sm text-gray-500">
                {score === 100
                  ? 'Tout est conforme. Prêt pour l\'audit.'
                  : 'Des éléments manquent. Consultez les alertes ci-dessous.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <span className={cn('text-4xl font-bold', scoreColor)}>{score}%</span>
            </div>
            <div className="w-48 h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', progressColor)}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Alertes */}
      {compliance.alerts.length > 0 && (
        <GlassCard variant="premium" className="p-6 border-amber-200 dark:border-amber-800">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Alertes à traiter
          </h2>
          <ul className="space-y-3">
            {compliance.alerts.map((a, i) => (
              <li key={i} className={`text-sm rounded-lg px-4 py-3 flex items-start gap-3 ${
                a.priority === 'high'
                  ? 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
                  : a.priority === 'medium'
                  ? 'bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300'
                  : 'bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
              }`}>
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{a.message}</p>
                  {a.details && <p className="text-xs mt-1 opacity-80">{a.details}</p>}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending || !compliance.students.some((s) => !s.hasSignedContract)}
              className="bg-[#34B9EE] hover:bg-[#2aa8dd] text-white"
            >
              {resendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Relancer les retardataires
            </Button>
            <Button
              variant="outline"
              onClick={() => auditZipMutation.mutate()}
              disabled={auditZipMutation.isPending}
            >
              {auditZipMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Prêt pour Audit (ZIP)
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Tableau des apprenants */}
      <GlassCard variant="premium" className="p-6 overflow-x-auto">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-[#34B9EE]" />
          Dossiers stagiaires
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Apprenant</th>
              <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Convention</th>
              <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Assiduité</th>
              <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300" title="Positionnement pré-formation — indicateur 2 Qualiopi">Pré-formation</th>
              <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300" title="Évaluation à chaud — indicateur 7 Qualiopi">Éval. à chaud</th>
              <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300" title="Évaluation à froid — indicateur 14 Qualiopi (exigible à J+90)">Éval. à froid</th>
            </tr>
          </thead>
          <tbody>
            {compliance.students.map((s) => (
              <tr key={s.student_id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 px-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{s.student_name}</p>
                    {s.student_email && (
                      <p className="text-xs text-gray-500">{s.student_email}</p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  {s.hasSignedContract ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 inline" />
                  ) : (
                    <XCircle className="h-5 w-5 text-amber-500 inline" />
                  )}
                </td>
                <td className="py-3 px-2 text-center">
                  <span className={s.attendanceSignedSlots === s.attendanceTotalSlots ? 'text-green-600' : 'text-amber-600'}>
                    {s.attendanceSignedSlots}/{s.attendanceTotalSlots}
                  </span>
                </td>
                <td className="py-3 px-2 text-center">
                  {s.hasPreFormationEval ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 inline" />
                  ) : (
                    <XCircle className="h-5 w-5 text-amber-500 inline" />
                  )}
                </td>
                <td className="py-3 px-2 text-center">
                  {s.hasEvaluation ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 inline" />
                  ) : (
                    <XCircle className="h-5 w-5 text-amber-500 inline" />
                  )}
                </td>
                <td className="py-3 px-2 text-center">
                  {s.hasColdEvaluation ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 inline" />
                  ) : (
                    <span className="text-gray-300 text-xs" title="En attente (exigible à J+90 après la fin de session)">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>

      {compliance.alerts.length === 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => auditZipMutation.mutate()}
            disabled={auditZipMutation.isPending}
          >
            {auditZipMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Télécharger les preuves (Prêt pour Audit)
          </Button>
        </div>
      )}
    </div>
  )
}
