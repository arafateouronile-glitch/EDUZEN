'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { enterprisePortalService, type TrainingRequest } from '@/lib/services/enterprise-portal.service'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import {
  Plus,
  GraduationCap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Users,
  Calendar,
  FileText,
} from 'lucide-react'
import Link from 'next/link'

type StatusFilter = TrainingRequest['status'] | 'all'

export default function EnterpriseTrainingsPage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)

  // Get company
  const { data: company } = useQuery({
    queryKey: ['enterprise-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      return enterprisePortalService.getCompanyForManager(user.id)
    },
    enabled: !!user?.id,
  })

  // Get training requests
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['enterprise-training-requests', company?.id, statusFilter, page],
    queryFn: async () => {
      if (!company?.id) return { requests: [], total: 0 }
      return enterprisePortalService.getTrainingRequests(company.id, {
        status: statusFilter,
        page,
        limit: 10,
      })
    },
    enabled: !!company?.id,
  })

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'pending', label: 'En attente' },
    { value: 'reviewing', label: 'En cours d\'étude' },
    { value: 'approved', label: 'Approuvées' },
    { value: 'scheduled', label: 'Planifiées' },
    { value: 'completed', label: 'Terminées' },
    { value: 'rejected', label: 'Refusées' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Demandes de formation
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez vos demandes de formation et suivez leur avancement
          </p>
        </div>
        <Link href="/enterprise/trainings/request">
          <Button className="bg-[#274472] hover:bg-[#1e3a5f]">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle demande
          </Button>
        </Link>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <Button
            key={option.value}
            variant={statusFilter === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter(option.value)
              setPage(1)
            }}
            className={statusFilter === option.value ? 'bg-[#274472]' : ''}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Requests List */}
      <GlassCard variant="premium" className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : !requestsData?.requests || requestsData.requests.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune demande de formation
            </h3>
            <p className="text-gray-500 mb-6">
              Commencez par créer une nouvelle demande de formation
            </p>
            <Link href="/enterprise/trainings/request">
              <Button className="bg-[#274472] hover:bg-[#1e3a5f]">
                <Plus className="w-4 h-4 mr-2" />
                Créer une demande
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requestsData.requests.map((request) => (
              <TrainingRequestCard key={request.id} request={request} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {requestsData && requestsData.total > 10 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} sur {Math.ceil(requestsData.total / 10)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(requestsData.total / 10)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

// Training Request Card Component
function TrainingRequestCard({ request }: { request: TrainingRequest }) {
  const statusConfig: Record<string, { icon: typeof Clock; className: string; label: string }> = {
    draft: { icon: FileText, className: 'bg-gray-100 text-gray-700', label: 'Brouillon' },
    pending: { icon: Clock, className: 'bg-amber-100 text-amber-700', label: 'En attente' },
    reviewing: { icon: AlertCircle, className: 'bg-blue-100 text-blue-700', label: 'En cours d\'étude' },
    approved: { icon: CheckCircle, className: 'bg-green-100 text-green-700', label: 'Approuvée' },
    rejected: { icon: XCircle, className: 'bg-red-100 text-red-700', label: 'Refusée' },
    scheduled: { icon: Calendar, className: 'bg-violet-100 text-violet-700', label: 'Planifiée' },
    completed: { icon: CheckCircle, className: 'bg-emerald-100 text-emerald-700', label: 'Terminée' },
    cancelled: { icon: XCircle, className: 'bg-gray-100 text-gray-700', label: 'Annulée' },
  }

  const config = statusConfig[request.status] || statusConfig.pending
  const StatusIcon = config.icon

  const requestTypeLabels: Record<string, string> = {
    new_enrollment: 'Inscription',
    custom_training: 'Formation sur mesure',
    group_training: 'Formation de groupe',
    certification: 'Certification',
    other: 'Autre',
  }

  return (
    <div className="p-4 sm:p-6 hover:bg-gray-50/50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {requestTypeLabels[request.request_type]}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 truncate">
            {request.title}
          </h3>
          {request.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">
              {request.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
            {request.number_of_participants > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {request.number_of_participants} participant{request.number_of_participants > 1 ? 's' : ''}
              </span>
            )}
            {request.preferred_start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(request.preferred_start_date)}
              </span>
            )}
            <span>
              Créée le {formatDate(request.created_at)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/enterprise/trainings/${request.id}`}>
            <Button variant="outline" size="sm">
              Voir détails
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
