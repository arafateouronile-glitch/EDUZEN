'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { gdprService, type GDPRDataSubjectRequest, type GDPRDataBreach, type GDPRProcessingRegistry } from '@/lib/services/gdpr.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { 
  Shield, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText,
  RefreshCw,
  Plus,
  Download,
  Trash2,
  Eye,
  Database,
  Lock
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/utils'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  open: 'bg-red-100 text-red-800',
  investigating: 'bg-yellow-100 text-yellow-800',
  remediated: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
}

const SEVERITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

export default function GDPRPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  // Récupérer les demandes de droits
  const { data: dataRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['gdpr-data-requests', user?.organization_id],
    queryFn: () => gdprService.getDataSubjectRequests(user!.organization_id!),
    enabled: !!user?.organization_id,
  })

  // Récupérer les violations
  const { data: dataBreaches = [], isLoading: isLoadingBreaches } = useQuery({
    queryKey: ['gdpr-data-breaches', user?.organization_id],
    queryFn: () => gdprService.getDataBreaches(user!.organization_id!),
    enabled: !!user?.organization_id,
  })

  // Récupérer le registre des traitements
  const { data: processingRegistry = [], isLoading: isLoadingRegistry } = useQuery({
    queryKey: ['gdpr-processing-registry', user?.organization_id],
    queryFn: () => gdprService.getProcessingRegistry(user!.organization_id!),
    enabled: !!user?.organization_id,
  })

  // Statistiques
  const stats = {
    totalRequests: dataRequests.length,
    pendingRequests: dataRequests.filter((r) => r.request_status === 'pending' || r.request_status === 'in_progress').length,
    totalBreaches: dataBreaches.length,
    openBreaches: dataBreaches.filter((b) => b.status === 'open' || b.status === 'investigating').length,
    totalProcessings: processingRegistry.length,
  }

  if (isLoadingRequests || isLoadingBreaches || isLoadingRegistry) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="h-8 w-8 text-brand-blue" />
          Conformité RGPD
        </h1>
        <p className="text-muted-foreground">
          Gérez la conformité RGPD : consentements, registre des traitements, demandes des personnes concernées
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Demandes en attente</p>
                <p className="text-2xl font-bold">{stats.pendingRequests}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Violations ouvertes</p>
                <p className="text-2xl font-bold">{stats.openBreaches}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Traitements actifs</p>
                <p className="text-2xl font-bold">{stats.totalProcessings}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total demandes</p>
                <p className="text-2xl font-bold">{stats.totalRequests}</p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="requests">Demandes de droits</TabsTrigger>
          <TabsTrigger value="breaches">Violations de données</TabsTrigger>
          <TabsTrigger value="registry">Registre des traitements</TabsTrigger>
          <TabsTrigger value="consents">Consentements</TabsTrigger>
        </TabsList>

        {/* Demandes de droits */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Demandes des personnes concernées</CardTitle>
                  <CardDescription>
                    Gestion des demandes d'accès, rectification, effacement et portabilité
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href="/dashboard/gdpr/requests/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle demande
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dataRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucune demande de droits RGPD enregistrée
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dataRequests.map((request) => (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">
                                {request.request_type.replace(/_/g, ' ').toUpperCase()}
                              </h3>
                              <Badge className={STATUS_COLORS[request.request_status]}>
                                {request.request_status.replace(/_/g, ' ')}
                              </Badge>
                              {!request.identity_verified && (
                                <Badge variant="outline" className="bg-yellow-50">
                                  Vérification requise
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                              <div>
                                <p className="text-muted-foreground">Demandeur</p>
                                <p className="font-medium">{request.requested_by_name}</p>
                                <p className="text-muted-foreground">{request.requested_by_email}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Date de demande</p>
                                <p className="font-medium">{formatDateTime(request.request_date)}</p>
                              </div>
                              {request.completed_at && (
                                <div>
                                  <p className="text-muted-foreground">Date de traitement</p>
                                  <p className="font-medium">{formatDateTime(request.completed_at)}</p>
                                </div>
                              )}
                            </div>
                            {request.description && (
                              <p className="text-sm text-muted-foreground mb-2">{request.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/dashboard/gdpr/requests/${request.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Violations de données */}
        <TabsContent value="breaches">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Violations de données</CardTitle>
                  <CardDescription>
                    Gestion des violations de données personnelles (Article 33-34 RGPD)
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href="/dashboard/gdpr/breaches/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Déclarer une violation
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dataBreaches.length === 0 ? (
                <div className="text-center py-12">
                  <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucune violation de données déclarée
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dataBreaches.map((breach) => (
                    <Card key={breach.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">
                                Violation {breach.breach_type}
                              </h3>
                              <Badge className={SEVERITY_COLORS[breach.severity]}>
                                {breach.severity}
                              </Badge>
                              <Badge className={STATUS_COLORS[breach.status]}>
                                {breach.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{breach.description}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Date de violation</p>
                                <p className="font-medium">{formatDate(breach.breach_date)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Découverte</p>
                                <p className="font-medium">{formatDate(breach.discovery_date)}</p>
                              </div>
                              {breach.affected_data_subjects_count && (
                                <div>
                                  <p className="text-muted-foreground">Personnes concernées</p>
                                  <p className="font-medium">{breach.affected_data_subjects_count}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-muted-foreground">CNIL notifiée</p>
                                <p className="font-medium">
                                  {breach.cnil_notified ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-red-500 inline" />
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/gdpr/breaches/${breach.id}`}>
                              Voir les détails
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Registre des traitements */}
        <TabsContent value="registry">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registre des traitements</CardTitle>
                  <CardDescription>
                    Article 30 RGPD - Registre des activités de traitement
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href="/dashboard/gdpr/registry/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un traitement
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {processingRegistry.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucun traitement enregistré
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/gdpr/registry/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Créer le premier traitement
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {processingRegistry.map((processing) => (
                    <Card key={processing.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">{processing.processing_name}</h3>
                            <p className="text-sm text-muted-foreground mb-3">{processing.processing_purpose}</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Base légale</p>
                                <p className="font-medium">{processing.legal_basis.replace(/_/g, ' ')}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Catégories de données</p>
                                <p className="font-medium">{processing.data_categories.length}</p>
                              </div>
                              {processing.retention_period && (
                                <div>
                                  <p className="text-muted-foreground">Conservation</p>
                                  <p className="font-medium">{processing.retention_period}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/gdpr/registry/${processing.id}`}>
                              Voir les détails
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consentements */}
        <TabsContent value="consents">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des consentements</CardTitle>
              <CardDescription>
                Consultez et gérez les consentements RGPD des utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Fonctionnalité en cours de développement
                </p>
                <p className="text-sm text-muted-foreground">
                  La gestion détaillée des consentements sera disponible prochainement
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions rapides */}
      <div className="mt-8 flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard/gdpr/reports">
            <FileText className="h-4 w-4 mr-2" />
            Rapports de conformité
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/gdpr/settings">
            <Shield className="h-4 w-4 mr-2" />
            Paramètres RGPD
          </Link>
        </Button>
      </div>
    </div>
  )
}

