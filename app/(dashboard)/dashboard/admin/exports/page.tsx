'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { exportHistoryService, type ExportType, type EntityType, type ExportHistoryWithUser } from '@/lib/services/export-history.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SkeletonList } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { 
  FileSpreadsheet, 
  FileText, 
  FileDown, 
  Trash2, 
  Download, 
  Filter,
  Calendar,
  User,
  BarChart3,
  TrendingUp
} from 'lucide-react'
import { formatDate, formatRelativeTime, formatFileSize } from '@/lib/utils'
import { motion } from '@/components/ui/motion'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { RoleGuard, ADMIN_ROLES } from '@/components/auth/role-guard'

function ExportsHistoryPageContent() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [exportTypeFilter, setExportTypeFilter] = useState<ExportType | 'all'>('all')
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | 'all'>('all')
  const pageSize = 20

  // Récupérer l'historique des exports
  const { data: exportsData, isLoading } = useQuery({
    queryKey: ['export-history', user?.organization_id, page, exportTypeFilter, entityTypeFilter],
    queryFn: async () => {
      if (!user?.organization_id) return { data: [], total: 0, page: 1, limit: pageSize, totalPages: 0 }
      
      return exportHistoryService.getByOrganization(user.organization_id, {
        page,
        limit: pageSize,
        exportType: exportTypeFilter !== 'all' ? exportTypeFilter : undefined,
        entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
      })
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les statistiques
  const { data: stats } = useQuery({
    queryKey: ['export-stats', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      return exportHistoryService.getStats(user.organization_id)
    },
    enabled: !!user?.organization_id,
  })

  // Mutation pour supprimer un export
  const deleteMutation = useMutation({
    mutationFn: async (exportId: string) => {
      if (!user?.id) throw new Error('Utilisateur non authentifié')
      await exportHistoryService.delete(exportId, user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-history'] })
      queryClient.invalidateQueries({ queryKey: ['export-stats'] })
      addToast({
        type: 'success',
        title: 'Export supprimé',
        description: 'L\'export a été supprimé de l\'historique avec succès.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la suppression.',
      })
    },
  })

  const exports: ExportHistoryWithUser[] = exportsData?.data || []
  const totalPages = exportsData?.totalPages || 0

  const getExportTypeIcon = (type: ExportType) => {
    switch (type) {
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4" />
      case 'csv':
        return <FileText className="h-4 w-4" />
      case 'pdf':
        return <FileDown className="h-4 w-4" />
    }
  }

  const getExportTypeLabel = (type: ExportType) => {
    switch (type) {
      case 'excel':
        return 'Excel'
      case 'csv':
        return 'CSV'
      case 'pdf':
        return 'PDF'
    }
  }

  const getEntityTypeLabel = (type: EntityType) => {
    const labels: Record<EntityType, string> = {
      students: 'Étudiants',
      documents: 'Documents',
      payments: 'Paiements',
      dashboard_report: 'Rapport Dashboard',
      attendance_report: 'Rapport Présence',
      other: 'Autre',
    }
    return labels[type] || type
  }

  const getExportTypeColor = (type: ExportType) => {
    switch (type) {
      case 'excel':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'csv':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'pdf':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Historique des Exports
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Consultez tous les exports effectués dans votre organisation
          </p>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Exports</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Tous les exports</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Excel</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byType.excel || 0}</div>
              <p className="text-xs text-muted-foreground">Fichiers Excel</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CSV</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byType.csv || 0}</div>
              <p className="text-xs text-muted-foreground">Fichiers CSV</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PDF</CardTitle>
              <FileDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byType.pdf || 0}</div>
              <p className="text-xs text-muted-foreground">Rapports PDF</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Type: {exportTypeFilter === 'all' ? 'Tous' : getExportTypeLabel(exportTypeFilter)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setExportTypeFilter('all')}>
              Tous
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExportTypeFilter('excel')}>
              Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExportTypeFilter('csv')}>
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExportTypeFilter('pdf')}>
              PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Entité: {entityTypeFilter === 'all' ? 'Toutes' : getEntityTypeLabel(entityTypeFilter)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setEntityTypeFilter('all')}>
              Toutes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEntityTypeFilter('students')}>
              Étudiants
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEntityTypeFilter('documents')}>
              Documents
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEntityTypeFilter('payments')}>
              Paiements
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEntityTypeFilter('dashboard_report')}>
              Rapport Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEntityTypeFilter('attendance_report')}>
              Rapport Présence
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Liste des exports */}
      {isLoading ? (
        <SkeletonList count={pageSize} />
      ) : exports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileDown className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
              Aucun export trouvé
            </p>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Les exports que vous effectuez apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {exports.map((export_) => (
            <motion.div
              key={export_.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${getExportTypeColor(export_.export_type)}`}>
                        {getExportTypeIcon(export_.export_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {export_.filename}
                          </h3>
                          <Badge variant="outline" className={getExportTypeColor(export_.export_type)}>
                            {getExportTypeLabel(export_.export_type)}
                          </Badge>
                          <Badge variant="outline">
                            {getEntityTypeLabel(export_.entity_type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>
                              {(export_ as any).users?.full_name || 
                               (export_ as any).users?.email || 
                               'Utilisateur inconnu'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatRelativeTime(export_.created_at)}</span>
                          </div>
                          {export_.record_count > 0 && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" />
                              <span>{export_.record_count} enregistrement(s)</span>
                            </div>
                          )}
                          {export_.file_size_bytes && (
                            <span>{formatFileSize(export_.file_size_bytes)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(export_.id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Précédent
          </Button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} sur {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  )
}

export default function ExportsHistoryPage() {
  return (
    <RoleGuard allowedRoles={ADMIN_ROLES}>
      <ExportsHistoryPageContent />
    </RoleGuard>
  )
}

