'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Plus, Mail, Award } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { DocumentService } from '@/lib/services/document.service'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import type { DocumentWithRelations } from '@/lib/types/query-types'

interface StudentDocumentsSectionProps {
  studentId: string
  organizationId: string
}

export function StudentDocumentsSection({
  studentId,
  organizationId,
}: StudentDocumentsSectionProps) {
  const { addToast } = useToast()
  
  // Créer une instance du service avec le client côté client
  const documentService = useMemo(() => {
    const supabase = createClient()
    return new DocumentService(supabase)
  }, [])
  
  const { data: documents, isLoading } = useQuery<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>({
    queryKey: ['student-documents', studentId, organizationId],
    queryFn: async () => {
      if (!organizationId) return { data: [], total: 0, page: 1, limit: 50, totalPages: 0 }
      return documentService.getAll(organizationId, {
        studentId: studentId,
      })
    },
    enabled: !!studentId && !!organizationId,
  })

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'certificate':
        return <Award className="h-4 w-4" />
      case 'transcript':
        return <FileText className="h-4 w-4" />
      case 'attestation':
        return <FileText className="h-4 w-4" />
      case 'contract':
        return <FileText className="h-4 w-4" />
      case 'convocation':
        return <Mail className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'certificate':
        return 'Certificat'
      case 'transcript':
        return 'Relevé de notes'
      case 'attestation':
        return 'Attestation'
      case 'contract':
        return 'Contrat'
      case 'convocation':
        return 'Convocation'
      case 'invoice':
        return 'Facture'
      case 'receipt':
        return 'Reçu'
      default:
        return type
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Documents partagés
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              addToast({
                type: 'info',
                title: 'Fonctionnalité à venir',
                description: 'L\'upload de documents sera implémenté prochainement. Vous pourrez ajouter des supports de cours, exercices et autres documents.',
                duration: 7000,
              })
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un document
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des documents...</p>
        ) : documents && documents.data && documents.data.length > 0 ? (
          <div className="space-y-3">
            {documents.data.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    {getDocumentTypeIcon(doc.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {getDocumentTypeLabel(doc.type)}
                      {doc.created_at && ` • ${formatDate(doc.created_at)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {doc.file_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (doc.file_url) {
                          window.open(doc.file_url, '_blank')
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucun document partagé pour le moment</p>
            <p className="text-xs mt-1">Les supports de cours et exercices apparaîtront ici</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
























