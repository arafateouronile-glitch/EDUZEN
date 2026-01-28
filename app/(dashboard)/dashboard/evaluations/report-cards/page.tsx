'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { logger, sanitizeError } from '@/lib/utils/logger'

export default function ReportCardsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  const handleCreateReportCard = () => {
    // Rediriger vers la page de génération de documents avec le type report_card
    router.push('/dashboard/documents/generate?type=report_card')
  }

  // Récupérer les bulletins de notes
  const { data: reportCards, isLoading } = useQuery({
    queryKey: ['report-cards', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []

      // Récupérer les bulletins depuis la table documents
      const { data, error } = await supabase
        .from('documents')
        .select('*, students(*)')
        .eq('organization_id', user.organization_id)
        .eq('type', 'report_card')
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Erreur lors de la récupération des bulletins:', error)
        return []
      }

      return data || []
    },
    enabled: !!user?.organization_id,
  })

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Bulletins de notes</h1>
          <p className="text-text-tertiary mt-1">
            Gérez et consultez les bulletins de notes des élèves
          </p>
        </div>
        <Button onClick={handleCreateReportCard}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau bulletin
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-text-tertiary">Chargement...</p>
        </div>
      ) : !reportCards || reportCards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Aucun bulletin de notes
            </h3>
            <p className="text-text-tertiary text-center mb-4">
              Commencez par créer un nouveau bulletin de notes pour un élève.
            </p>
            <Button onClick={handleCreateReportCard}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un bulletin
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reportCards.map((reportCard: any) => (
            <Card key={reportCard.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {reportCard.students?.first_name} {reportCard.students?.last_name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-text-tertiary">
                  <p>
                    <span className="font-medium">Élève:</span>{' '}
                    {reportCard.students?.first_name} {reportCard.students?.last_name}
                  </p>
                  {reportCard.students?.student_number && (
                    <p>
                      <span className="font-medium">Numéro d'élève:</span>{' '}
                      {reportCard.students.student_number}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Date de création:</span>{' '}
                    {new Date(reportCard.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  {reportCard.title && (
                    <p>
                      <span className="font-medium">Titre:</span> {reportCard.title}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
