'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useEnterpriseCompany } from '@/lib/contexts/enterprise-company-context'
import { enterprisePortalService, type CompanySession } from '@/lib/services/enterprise-portal.service.client'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import {
  CalendarDays,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  CalendarClock,
  GraduationCap,
  Hourglass,
} from 'lucide-react'

type StatusFilter = 'all' | 'planned' | 'ongoing' | 'completed' | 'cancelled'

const statusConfig: Record<string, { icon: typeof Clock; className: string; label: string }> = {
  planned: { icon: CalendarClock, className: 'bg-violet-100 text-violet-700', label: 'Planifiée' },
  ongoing: { icon: Clock, className: 'bg-blue-100 text-blue-700', label: 'En cours' },
  completed: { icon: CheckCircle, className: 'bg-emerald-100 text-emerald-700', label: 'Terminée' },
  cancelled: { icon: XCircle, className: 'bg-gray-100 text-gray-700', label: 'Annulée' },
}

export default function EnterpriseSessionsPage() {
  const { company, isLoading: isLoadingCompany } = useEnterpriseCompany()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['enterprise-sessions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [] as CompanySession[]
      return enterprisePortalService.getCompanySessions(company.id)
    },
    enabled: !!company?.id,
  })

  const filtered = useMemo(() => {
    const list = sessions || []
    if (statusFilter === 'all') return list
    return list.filter((s) => s.status === statusFilter)
  }, [sessions, statusFilter])

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'planned', label: 'Planifiées' },
    { value: 'ongoing', label: 'En cours' },
    { value: 'completed', label: 'Terminées' },
    { value: 'cancelled', label: 'Annulées' },
  ]

  const reservationOnlyCount = (sessions || []).filter((s) => s.reservationOnly).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sessions de formation</h1>
        <p className="mt-1 text-sm text-gray-600">
          Toutes les sessions auxquelles votre entreprise est inscrite, y compris celles sans liste
          nominative d&apos;apprenants.
        </p>
      </div>

      {reservationOnlyCount > 0 && (
        <GlassCard variant="subtle" className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Hourglass className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-sm text-gray-600">
              {reservationOnlyCount} session{reservationOnlyCount > 1 ? 's sont inscrites' : ' est inscrite'}{' '}
              avec un effectif prévisionnel. Les apprenants concernés apparaîtront ici dès que leurs noms
              auront été communiqués à l&apos;organisme de formation.
            </p>
          </div>
        </GlassCard>
      )}

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <Button
            key={option.value}
            variant={statusFilter === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(option.value)}
            className={statusFilter === option.value ? 'bg-[#274472]' : ''}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Sessions List */}
      <GlassCard variant="premium" className="p-0 overflow-hidden">
        {isLoadingCompany || isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune session</h3>
            <p className="text-gray-500">
              {statusFilter === 'all'
                ? "Votre entreprise n'est inscrite à aucune session pour le moment."
                : 'Aucune session ne correspond à ce filtre.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}

function SessionCard({ session }: { session: CompanySession }) {
  const config = statusConfig[session.status ?? 'planned'] || statusConfig.planned
  const StatusIcon = config.icon

  return (
    <div className="p-4 sm:p-6 hover:bg-gray-50/50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}
            >
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </span>
            {session.reservationOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                <Hourglass className="w-3 h-3" />
                Effectif prévisionnel
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 truncate">{session.name}</h3>

          {session.formation?.name && (
            <p className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <GraduationCap className="w-4 h-4" />
              {session.formation.name}
              {session.formation.duration_hours ? ` · ${session.formation.duration_hours}h` : ''}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
            {(session.start_date || session.end_date) && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                {formatDate(session.start_date)}
                {session.end_date ? ` – ${formatDate(session.end_date)}` : ''}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {session.enrolledCount > 0 && (
                <>
                  {session.enrolledCount} apprenant{session.enrolledCount > 1 ? 's' : ''} inscrit
                  {session.enrolledCount > 1 ? 's' : ''}
                </>
              )}
              {session.enrolledCount > 0 && session.expectedCount > 0 && ' · '}
              {session.expectedCount > 0 && (
                <>
                  {session.expectedCount} prévu{session.expectedCount > 1 ? 's' : ''}
                </>
              )}
              {session.enrolledCount === 0 && session.expectedCount === 0 && 'Effectif non communiqué'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
