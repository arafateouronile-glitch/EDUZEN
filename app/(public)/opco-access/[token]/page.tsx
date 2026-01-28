'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  Building2,
  FileText,
  Download,
  Clock,
  AlertCircle,
  CheckCircle,
  Shield,
  User,
  Package,
} from 'lucide-react'

interface ShareLinkData {
  shareLink: {
    title: string
    description?: string
    company: {
      id: string
      name: string
      siren?: string
      opco_name?: string
    }
    expires_at: string
  }
  documents: Array<{
    id: string
    document_type: string
    file_url: string
    file_name?: string
    status: string
    created_at: string
    student: {
      first_name: string
      last_name: string
    }
  }>
  invoices: Array<{
    id: string
    invoice_number: string
    total_amount: number
    currency: string
    status: string
    issue_date: string
    pdf_url?: string
    student: {
      first_name: string
      last_name: string
    }
  }>
  employees: Array<{
    id: string
    employee_number?: string
    department?: string
    job_title?: string
    name: string
  }>
}

export default function OpcoAccessPage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<ShareLinkData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/opco-access/${token}`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch data')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [token])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <GlassCard variant="default" className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Lien non valide
          </h1>
          <p className="text-gray-600">
            {error === 'Share link not found or expired' && 'Ce lien de partage n\'existe pas ou a été désactivé.'}
            {error === 'This share link has expired' && 'Ce lien de partage a expiré.'}
            {error === 'Maximum access count reached' && 'Le nombre maximum d\'accès a été atteint.'}
            {!['Share link not found or expired', 'This share link has expired', 'Maximum access count reached'].includes(error) && error}
          </p>
        </GlassCard>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { shareLink, documents, invoices, employees } = data

  const handleDownload = (url: string, filename?: string) => {
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'document.pdf'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadAll = () => {
    // In a real implementation, this would call an API to generate a ZIP
    documents.forEach((doc, index) => {
      setTimeout(() => {
        handleDownload(doc.file_url, doc.file_name)
      }, index * 500)
    })
  }

  const getDocumentTypeName = (type: string): string => {
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <GlassCard variant="premium" className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-[#274472] flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-600">Accès sécurisé OPCO</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {shareLink.title}
              </h1>
              <p className="text-lg text-[#274472] font-medium mt-1">
                {shareLink.company.name}
              </p>
              {shareLink.company.siren && (
                <p className="text-sm text-gray-500">
                  SIREN: {shareLink.company.siren}
                </p>
              )}
              {shareLink.description && (
                <p className="text-gray-600 mt-2">{shareLink.description}</p>
              )}
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Lien valide jusqu'au {formatDate(shareLink.expires_at)}</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Employees Summary */}
        {employees.length > 0 && (
          <GlassCard variant="default" className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-[#274472]" />
              Collaborateurs concernés ({employees.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-[#274472] text-white flex items-center justify-center font-medium">
                    {emp.name.split(' ').map((n) => n.charAt(0)).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{emp.name}</p>
                    {(emp.department || emp.job_title) && (
                      <p className="text-sm text-gray-500">
                        {emp.department || emp.job_title}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Documents Section */}
        <GlassCard variant="premium" className="p-0 overflow-hidden">
          <div className="p-6 border-b border-gray-200/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Documents disponibles ({documents.length})
              </h2>
              <p className="text-sm text-gray-500">
                Certificats de réalisation, attestations d'assiduité et conventions
              </p>
            </div>
            {documents.length > 0 && (
              <Button onClick={handleDownloadAll} className="bg-[#274472] hover:bg-[#1e3a5f]">
                <Package className="w-4 h-4 mr-2" />
                Tout télécharger
              </Button>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun document disponible</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#274472]/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#274472]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {getDocumentTypeName(doc.document_type)}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{doc.student.first_name} {doc.student.last_name}</span>
                        <span>•</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3" />
                      Disponible
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc.file_url, doc.file_name)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Invoices Section */}
        {invoices.length > 0 && (
          <GlassCard variant="default" className="p-0 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Factures acquittées ({invoices.length})
              </h2>
              <p className="text-sm text-gray-500">
                Justificatifs de paiement pour le remboursement
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Facture {invoice.invoice_number}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{invoice.student.first_name} {invoice.student.last_name}</span>
                        <span>•</span>
                        <span>{formatDate(invoice.issue_date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(invoice.total_amount, invoice.currency)}
                    </span>
                    {invoice.pdf_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(invoice.pdf_url!, `facture_${invoice.invoice_number}.pdf`)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>
            Documents partagés via <span className="font-medium text-[#274472]">EDUZEN</span>
          </p>
          <p className="mt-1">
            Plateforme de gestion des organismes de formation
          </p>
        </div>
      </div>
    </div>
  )
}
