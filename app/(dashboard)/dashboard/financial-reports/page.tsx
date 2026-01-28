'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileText, DollarSign, TrendingUp, Calendar, Download, RefreshCw } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function FinancialReportsPage() {
  const supabase = createClient()
  const { user } = useAuth()

  // Récupérer les rapports financiers
  const { data: reports, isLoading } = useQuery({
    queryKey: ['financial-reports', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []

      // Pour l'instant, retourner un tableau vide
      // NOTE: Fonctionnalité prévue - Récupération depuis la table financial_reports
      // Créer la table financial_reports avec les colonnes nécessaires (period, revenue, expenses, etc.)
      return []
    },
    enabled: !!user?.organization_id,
  })

  if (isLoading) {
    return (
      <div className="w-full p-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <FileText className="h-8 w-8 text-brand-blue" />
          Rapports financiers
        </h1>
        <p className="text-muted-foreground">
          Consultez et téléchargez vos rapports financiers
        </p>
      </div>

      {/* Contenu principal */}
      <div className="space-y-4">
        {reports && reports.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Aucun rapport financier disponible
                </p>
                <p className="text-sm text-muted-foreground">
                  Les rapports financiers seront disponibles prochainement
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {reports?.map((report: any) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{report.name}</CardTitle>
                      <CardDescription>
                        {report.description || 'Rapport financier'}
                      </CardDescription>
                    </div>
                    <Download className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Période</p>
                      <p className="font-medium">
                        {report.period || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date de génération</p>
                      <p className="font-medium">
                        {report.created_at ? formatDate(report.created_at) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Format</p>
                      <p className="font-medium">{report.format || 'PDF'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Taille</p>
                      <p className="font-medium">{report.size || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
