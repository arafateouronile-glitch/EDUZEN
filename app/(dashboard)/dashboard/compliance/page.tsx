'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { complianceService } from '@/lib/services/compliance.service.client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  AlertTriangle,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Download,
  Bell,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'

export default function CompliancePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedFramework, setSelectedFramework] = useState<string>('all')

  // Récupérer le rapport de conformité
  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['compliance-report', user?.organization_id, selectedFramework],
    queryFn: () =>
      complianceService.generateComplianceReport(
        user?.organization_id || '',
        selectedFramework === 'all' ? undefined : selectedFramework
      ),
    enabled: !!user?.organization_id,
  })

  // Récupérer les risques critiques
  const { data: criticalRisks } = useQuery({
    queryKey: ['critical-risks', user?.organization_id],
    queryFn: () => complianceService.getCriticalRisks(user?.organization_id || ''),
    enabled: !!user?.organization_id,
  })

  // Récupérer les incidents ouverts
  const { data: openIncidents } = useQuery({
    queryKey: ['open-incidents', user?.organization_id],
    queryFn: () => complianceService.getIncidents(user?.organization_id || '', { status: 'open' }),
    enabled: !!user?.organization_id,
  })

  // Générer le rapport
  const generateReportMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/compliance/reports/generate?framework=${selectedFramework}`)
        .then((res) => res.json()),
    onSuccess: () => {
      // Le rapport sera automatiquement mis à jour via React Query
    },
  })

  // Synchroniser les contrôles
  const syncControlsMutation = useMutation({
    mutationFn: () =>
      fetch('/api/compliance/sync-controls', { method: 'POST' })
        .then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-controls'] })
      queryClient.invalidateQueries({ queryKey: ['compliance-report'] })
    },
  })

  if (reportLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Conformité & Sécurité
        </h1>
        <p className="text-muted-foreground">
          Gestion de la conformité ISO 27001, SOC 2 et sécurité
        </p>
      </div>

      {/* Alertes critiques */}
      {(criticalRisks && criticalRisks.length > 0) || (openIncidents && openIncidents.length > 0) ? (
        <div className="mb-6 space-y-2">
          {criticalRisks && criticalRisks.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-900">
                      {criticalRisks.length} risque(s) critique(s) nécessitent une attention immédiate
                    </span>
                  </div>
                  <Link href="/dashboard/compliance/risks?level=critical">
                    <Button variant="outline" size="sm">
                      Voir les risques
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
          {openIncidents && openIncidents.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-600" />
                    <span className="font-semibold text-orange-900">
                      {openIncidents.length} incident(s) de sécurité ouvert(s)
                    </span>
                  </div>
                  <Link href="/dashboard/compliance/incidents?status=open">
                    <Button variant="outline" size="sm">
                      Voir les incidents
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Filtres */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={selectedFramework === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedFramework('all')}
            size="sm"
          >
            Tous
          </Button>
          <Button
            variant={selectedFramework === 'iso27001' ? 'default' : 'outline'}
            onClick={() => setSelectedFramework('iso27001')}
            size="sm"
          >
            ISO 27001
          </Button>
          <Button
            variant={selectedFramework === 'soc2' ? 'default' : 'outline'}
            onClick={() => setSelectedFramework('soc2')}
            size="sm"
          >
            SOC 2
          </Button>
          <Button
            variant={selectedFramework === 'gdpr' ? 'default' : 'outline'}
            onClick={() => setSelectedFramework('gdpr')}
            size="sm"
          >
            GDPR
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => syncControlsMutation.mutate()}
            variant="outline"
            disabled={syncControlsMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncControlsMutation.isPending ? 'animate-spin' : ''}`} />
            Synchroniser
          </Button>
          <Button onClick={() => generateReportMutation.mutate()} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Générer le rapport
          </Button>
        </div>
      </div>

      {/* Statistiques principales */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conformité</p>
                  <p className="text-2xl font-bold">{report.controls.compliance_percentage.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Contrôles implémentés</p>
                  <p className="text-2xl font-bold">
                    {report.controls.implemented} / {report.controls.total}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Risques critiques</p>
                  <p className="text-2xl font-bold">{report.risks.critical}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Score d'audit moyen</p>
                  <p className="text-2xl font-bold">{report.audits.average_score.toFixed(1)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs pour les différentes sections */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="controls">Contrôles</TabsTrigger>
          <TabsTrigger value="risks">Risques</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="audits">Audits</TabsTrigger>
          <TabsTrigger value="policies">Politiques</TabsTrigger>
          <TabsTrigger value="teacher-documents">Documents formateurs</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview">
          {report && (
            <div className="space-y-6">
              {/* Recommandations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommandations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {report.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Détails des contrôles */}
              <Card>
                <CardHeader>
                  <CardTitle>État des contrôles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Implémentés</p>
                      <p className="text-2xl font-bold text-green-600">{report.controls.implemented}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Partiels</p>
                      <p className="text-2xl font-bold text-yellow-600">{report.controls.partial}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Non implémentés</p>
                      <p className="text-2xl font-bold text-red-600">{report.controls.not_implemented}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Conformes</p>
                      <p className="text-2xl font-bold text-blue-600">{report.controls.compliant}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Détails des risques */}
              <Card>
                <CardHeader>
                  <CardTitle>Risques</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{report.risks.total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Critiques</p>
                      <p className="text-2xl font-bold text-red-600">{report.risks.critical}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Élevés</p>
                      <p className="text-2xl font-bold text-orange-600">{report.risks.high}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Moyens</p>
                      <p className="text-2xl font-bold text-yellow-600">{report.risks.medium}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Atténués</p>
                      <p className="text-2xl font-bold text-green-600">{report.risks.mitigated}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Contrôles */}
        <TabsContent value="controls">
          <Card>
            <CardHeader>
              <CardTitle>Contrôles de sécurité</CardTitle>
              <CardDescription>
                Gestion des contrôles ISO 27001, SOC 2 et autres frameworks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/compliance/controls">
                <Button>Gérer les contrôles</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risques */}
        <TabsContent value="risks">
          <Card>
            <CardHeader>
              <CardTitle>Évaluations de risques</CardTitle>
              <CardDescription>
                Identification, évaluation et traitement des risques
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/compliance/risks">
                <Button>Gérer les risques</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidents */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle>Incidents de sécurité</CardTitle>
              <CardDescription>
                Gestion des incidents et violations de sécurité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/compliance/incidents">
                <Button>Gérer les incidents</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audits */}
        <TabsContent value="audits">
          <Card>
            <CardHeader>
              <CardTitle>Audits de sécurité</CardTitle>
              <CardDescription>
                Audits internes et externes de conformité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/compliance/audits">
                <Button>Gérer les audits</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Politiques */}
        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle>Politiques de sécurité</CardTitle>
              <CardDescription>
                Documentation et gestion des politiques de sécurité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/compliance/policies">
                <Button>Gérer les politiques</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents des formateurs */}
        <TabsContent value="teacher-documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents des formateurs</CardTitle>
              <CardDescription>
                Consultez les documents administratifs et diplômes de tous les formateurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/compliance/teacher-documents">
                <Button>Voir les documents</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
