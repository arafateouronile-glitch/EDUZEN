'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Eye, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export default function PortalDocumentsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Récupérer les documents de l'apprenant
  const { data: documents, isLoading } = useQuery({
    queryKey: ['learner-documents', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        logger.info('Portal Documents - No user ID')
        return []
      }

      logger.info('Portal Documents - Fetching documents', {
        userId: maskId(user.id),
        role: user.role,
      })

      let studentIds: string[] = []

      if (user?.role === 'parent') {
        // Récupérer les enfants
        const { data: guardians } = await supabase
          .from('guardians')
          .select('id')
          .eq('user_id', user.id)

        if (!guardians || guardians.length === 0) {
          logger.info('Portal Documents - No guardians found')
          return []
        }

        const { data: studentGuardians } = await supabase
          .from('student_guardians')
          .select('student_id')
          .in('guardian_id', guardians.map((g) => g.id))

        if (!studentGuardians || studentGuardians.length === 0) {
          logger.info('Portal Documents - No student guardians found')
          return []
        }
        studentIds = studentGuardians.map((sg) => sg.student_id).filter((id): id is string => id !== null)
        logger.info('Portal Documents - Parent student IDs count', {
          count: studentIds.length,
        })
      } else if (user?.role === 'student') {
        // Pour les étudiants, utiliser directement l'ID utilisateur
        // Les RLS policies filtreront automatiquement via learner_student_id()
        studentIds = [user.id]
        logger.info('Portal Documents - Student access')
      }

      if (studentIds.length === 0) {
        logger.info('Portal Documents - No student IDs')
        return []
      }

      // Récupérer les documents depuis learner_documents
      // Pour les étudiants, les RLS policies filtreront automatiquement
      // Pour les parents, on filtre explicitement par student_id
      let query = supabase
        .from('learner_documents')
        .select('*, students(first_name, last_name, student_number)')
        .order('sent_at', { ascending: false })

      // Pour les parents, filtrer explicitement par student_id
      if (user?.role === 'parent') {
        query = query.in('student_id', studentIds)
      }
      // Pour les étudiants, les RLS policies feront le filtrage automatiquement

      logger.info('Portal Documents - Querying learner_documents')
      const { data, error } = await query

      if (error) {
        logger.error('Portal Documents - Error fetching documents', error, {
          error: sanitizeError(error),
        })
        throw error
      }

      logger.info('Portal Documents - Documents found', {
        count: data?.length || 0,
      })
      return data || []
    },
    enabled: !!user?.id,
  })

  // Marquer un document comme vu
  const markAsViewed = async (documentId: string) => {
    const { error } = await supabase
      .from('learner_documents')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', documentId)

    if (error) {
      logger.error('Portal Documents - Error marking as viewed', error, {
        documentId: maskId(documentId),
        error: sanitizeError(error),
      })
    }
  }

  // Marquer un document comme téléchargé
  const markAsDownloaded = async (documentId: string) => {
    const { error } = await supabase
      .from('learner_documents')
      .update({ downloaded_at: new Date().toISOString() })
      .eq('id', documentId)

    if (error) {
      logger.error('Portal Documents - Error marking as downloaded', error, {
        documentId: maskId(documentId),
        error: sanitizeError(error),
      })
    }
  }

  // Télécharger un document
  const handleDownload = async (doc: any) => {
    try {
      // Télécharger le fichier
      const response = await fetch(doc.file_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.title || 'document.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Marquer comme téléchargé
      await markAsDownloaded(doc.id)
    } catch (error) {
      logger.error('Portal Documents - Error downloading document', error, {
        documentId: maskId(doc.id),
        error: sanitizeError(error),
      })
      alert('Erreur lors du téléchargement du document')
    }
  }

  // Ouvrir le document dans un nouvel onglet
  const handlePreview = async (document: any) => {
    setPreviewUrl(document.file_url)
    window.open(document.file_url, '_blank')
    
    // Marquer comme vu
    await markAsViewed(document.id)
  }

  const getTypeLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      convention: 'Convention de formation',
      facture: 'Facture',
      devis: 'Devis',
      attestation: 'Attestation',
      certificat: 'Certificat',
      releve_notes: 'Relevé de notes',
      autre: 'Autre',
    }
    return labels[type || 'autre'] || type || 'Document'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Documents</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Documents</h1>
      </div>

      {documents && documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc: any) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{doc.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {getTypeLabel(doc.type)}
                    </p>
                  </div>
                  <FileText className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {doc.students && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Apprenant</p>
                      <p className="font-medium">
                        {doc.students.first_name} {doc.students.last_name}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(doc.sent_at)}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(doc)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>

                  {doc.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {doc.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun document</h3>
            <p className="text-muted-foreground">
              Vous n'avez pas encore de documents disponibles.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

