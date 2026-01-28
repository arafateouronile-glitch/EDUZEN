'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { enterprisePortalService } from '@/lib/services/enterprise-portal.service'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import {
  FileText,
  Download,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  FileCheck,
  User,
  ChevronDown,
  Package,
} from 'lucide-react'

type DocumentType = 'all' | 'certificate' | 'attestation' | 'convention'

export default function EnterpriseDocumentsPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const initialType = (searchParams.get('type') as DocumentType) || 'all'

  const [selectedType, setSelectedType] = useState<DocumentType>(initialType)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>()
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

  // Get employees for filter
  const { data: employeesData } = useQuery({
    queryKey: ['enterprise-employees', company?.id],
    queryFn: async () => {
      if (!company?.id) return { employees: [], total: 0 }
      return enterprisePortalService.getEmployees(company.id, { limit: 100 })
    },
    enabled: !!company?.id,
  })

  // Get documents
  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['enterprise-documents', company?.id, selectedType, selectedEmployeeId, page],
    queryFn: async () => {
      if (!company?.id) return { documents: [], total: 0 }
      return enterprisePortalService.getCompanyDocuments(company.id, {
        type: selectedType === 'all' ? 'all' : selectedType,
        employeeId: selectedEmployeeId,
        page,
        limit: 20,
      })
    },
    enabled: !!company?.id,
  })

  const documentTypes: { value: DocumentType; label: string; icon: typeof FileText }[] = [
    { value: 'all', label: 'Tous les documents', icon: FileText },
    { value: 'certificate', label: 'Certificats de réalisation', icon: FileCheck },
    { value: 'attestation', label: 'Attestations d\'assiduité', icon: CheckCircle },
    { value: 'convention', label: 'Conventions de formation', icon: FileText },
  ]

  // Filter documents by search query
  const filteredDocuments = (documentsData?.documents || []).filter((doc: any) => {
    if (!searchQuery) return true
    const studentName = `${doc.student?.first_name || ''} ${doc.student?.last_name || ''}`.toLowerCase()
    return (
      studentName.includes(searchQuery.toLowerCase()) ||
      doc.document_type?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const handleDownload = (url: string, filename: string) => {
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleBulkDownload = async () => {
    // In a real implementation, this would call an API to generate a ZIP
    // For now, we'll just show an alert
    alert('Fonctionnalité de téléchargement groupé bientôt disponible')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Documents
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Téléchargez vos certificats et attestations pour vos remboursements OPCO
          </p>
        </div>
        <Button onClick={handleBulkDownload} className="bg-[#274472] hover:bg-[#1e3a5f]">
          <Package className="w-4 h-4 mr-2" />
          Télécharger tous les documents
        </Button>
      </div>

      {/* Filters */}
      <GlassCard variant="default" className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Document Type Filter */}
          <div className="flex flex-wrap gap-2">
            {documentTypes.map((type) => (
              <Button
                key={type.value}
                variant={selectedType === type.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedType(type.value)
                  setPage(1)
                }}
                className={selectedType === type.value ? 'bg-[#274472]' : ''}
              >
                <type.icon className="w-4 h-4 mr-2" />
                {type.label}
              </Button>
            ))}
          </div>

          {/* Search and Employee Filter */}
          <div className="flex flex-1 gap-4 lg:justify-end">
            <div className="relative flex-1 lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={selectedEmployeeId || ''}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value || undefined)
                setPage(1)
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#274472]"
            >
              <option value="">Tous les collaborateurs</option>
              {employeesData?.employees?.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.student?.first_name} {emp.student?.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Documents List */}
      <GlassCard variant="premium" className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun document trouvé
            </h3>
            <p className="text-gray-500">
              Les documents seront disponibles une fois les formations terminées.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredDocuments.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#274472]/10 flex items-center justify-center">
                    <DocumentTypeIcon type={doc.document_type} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {getDocumentTypeName(doc.document_type)}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="w-3 h-3" />
                      <span>
                        {doc.student?.first_name} {doc.student?.last_name}
                      </span>
                      <span>•</span>
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DocumentStatusBadge status={doc.status} />
                  {doc.file_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc.file_url, `${doc.document_type}_${doc.student?.last_name}.pdf`)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {documentsData && documentsData.total > 20 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} sur {Math.ceil(documentsData.total / 20)}
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
                disabled={page >= Math.ceil(documentsData.total / 20)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Info Card */}
      <GlassCard variant="subtle" className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">
              Besoin d'aide pour vos remboursements OPCO ?
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Vous pouvez générer un lien de partage temporaire pour permettre à votre conseiller OPCO
              d'accéder directement aux documents nécessaires pour vos remboursements.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="/enterprise/opco-share">
                Partager avec mon OPCO
              </a>
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

// Helper Components
function DocumentTypeIcon({ type }: { type: string }) {
  if (type?.includes('certificat') || type?.includes('certificate')) {
    return <FileCheck className="w-6 h-6 text-[#274472]" />
  }
  if (type?.includes('attestation')) {
    return <CheckCircle className="w-6 h-6 text-[#274472]" />
  }
  return <FileText className="w-6 h-6 text-[#274472]" />
}

function getDocumentTypeName(type: string): string {
  const names: Record<string, string> = {
    certificat_realisation: 'Certificat de réalisation',
    certificate: 'Certificat de réalisation',
    attestation_assiduite: 'Attestation d\'assiduité',
    attestation: 'Attestation d\'assiduité',
    attestation_formation: 'Attestation de formation',
    convention: 'Convention de formation',
    convention_formation: 'Convention de formation',
  }
  return names[type] || type
}

function DocumentStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    sent: { label: 'Envoyé', className: 'bg-green-100 text-green-700' },
    pending: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
    generated: { label: 'Généré', className: 'bg-blue-100 text-blue-700' },
  }

  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
