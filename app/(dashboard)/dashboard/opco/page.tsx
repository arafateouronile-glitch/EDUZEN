'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { opcoService, type OPCODeclaration, type OPCOConvention, type OPCOFundingRequest } from '@/lib/services/opco.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Euro,
  RefreshCw,
  Plus,
  FileText,
  TrendingUp,
  Send
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  validated: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-orange-100 text-orange-800',
  terminated: 'bg-red-100 text-red-800',
  approved: 'bg-green-100 text-green-800',
  under_review: 'bg-yellow-100 text-yellow-800',
}

export default function OPCOPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  // Récupérer les conventions
  const { data: conventions = [], isLoading: isLoadingConventions } = useQuery({
    queryKey: ['opco-conventions', user?.organization_id],
    queryFn: async () => {
      try {
        return await opcoService.getConventions(user!.organization_id!)
      } catch (error: any) {
        // La gestion d'erreur est déjà faite dans le service, mais on double la vérification ici
        if (
          error?.code === 'PGRST116' ||
          error?.code === '42P01' ||
          error?.code === 'PGRST301' ||
          error?.status === 404 ||
          error?.code === '404' ||
          error?.message?.includes('relation') ||
          error?.message?.includes('relationship') ||
          error?.message?.includes('does not exist') ||
          error?.message?.includes('schema cache')
        ) {
          return []
        }
        throw error
      }
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Récupérer les déclarations
  const { data: declarations = [], isLoading: isLoadingDeclarations } = useQuery({
    queryKey: ['opco-declarations', user?.organization_id],
    queryFn: async () => {
      try {
        return await opcoService.getDeclarations(user!.organization_id!)
      } catch (error: any) {
        // La gestion d'erreur est déjà faite dans le service, mais on double la vérification ici
        if (
          error?.code === 'PGRST116' ||
          error?.code === '42P01' ||
          error?.code === 'PGRST301' ||
          error?.status === 404 ||
          error?.code === '404' ||
          error?.message?.includes('relation') ||
          error?.message?.includes('relationship') ||
          error?.message?.includes('does not exist') ||
          error?.message?.includes('schema cache')
        ) {
          return []
        }
        throw error
      }
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Récupérer les demandes de financement
  const { data: fundingRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['opco-funding-requests', user?.organization_id],
    queryFn: async () => {
      try {
        return await opcoService.getFundingRequests(user!.organization_id!)
      } catch (error: any) {
        // La gestion d'erreur est déjà faite dans le service, mais on double la vérification ici
        if (
          error?.code === 'PGRST116' ||
          error?.code === '42P01' ||
          error?.code === 'PGRST301' ||
          error?.status === 404 ||
          error?.code === '404' ||
          error?.message?.includes('relation') ||
          error?.message?.includes('relationship') ||
          error?.message?.includes('does not exist') ||
          error?.message?.includes('schema cache')
        ) {
          return []
        }
        throw error
      }
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Statistiques
  const stats = {
    totalConventions: conventions.length,
    activeConventions: conventions.filter((c) => c.status === 'active').length,
    totalDeclarations: declarations.length,
    pendingDeclarations: declarations.filter((d) => d.status === 'draft' || d.status === 'submitted').length,
    totalFundingRequests: fundingRequests.length,
    pendingRequests: fundingRequests.filter((r) => r.status === 'draft' || r.status === 'submitted').length,
    totalRequestedFunding: declarations.reduce((sum, d) => sum + d.requested_funding, 0) +
      fundingRequests.reduce((sum, r) => sum + r.requested_amount, 0),
    totalPaidFunding: declarations.reduce((sum, d) => sum + d.paid_funding, 0) +
      fundingRequests.reduce((sum, r) => sum + r.paid_amount, 0),
  }

  // Soumettre une déclaration
  const submitDeclaration = useMutation({
    mutationFn: (declarationId: string) => opcoService.submitDeclaration(declarationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opco-declarations'] })
      addToast({
        title: 'Déclaration soumise',
        description: 'La déclaration a été soumise à l\'OPCO avec succès.',
        type: 'success',
      })
    },
  })

  if (isLoadingConventions || isLoadingDeclarations || isLoadingRequests) {
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
          <Building2 className="h-8 w-8 text-brand-blue" />
          OPCO (Opérateurs de Compétences)
        </h1>
        <p className="text-muted-foreground">
          Gérez vos conventions, déclarations et demandes de financement OPCO
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conventions actives</p>
                <p className="text-2xl font-bold">{stats.activeConventions}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Déclarations en attente</p>
                <p className="text-2xl font-bold">{stats.pendingDeclarations}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Financement demandé</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRequestedFunding)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Financement reçu</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalPaidFunding)}</p>
              </div>
              <Euro className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="declarations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="declarations">Déclarations</TabsTrigger>
          <TabsTrigger value="conventions">Conventions</TabsTrigger>
          <TabsTrigger value="funding">Demandes de financement</TabsTrigger>
        </TabsList>

        {/* Déclarations */}
        <TabsContent value="declarations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Déclarations OPCO</CardTitle>
                  <CardDescription>
                    Déclarations d'activité et demandes de financement
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href="/dashboard/opco/declarations/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle déclaration
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {declarations.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucune déclaration OPCO enregistrée
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/opco/declarations/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Créer une déclaration
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {declarations.map((declaration) => (
                    <Card key={declaration.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">
                                Déclaration {declaration.declaration_type.replace(/_/g, ' ')}
                              </h3>
                              <Badge className={STATUS_COLORS[declaration.status]}>
                                {declaration.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                              <div>
                                <p className="text-muted-foreground">Période</p>
                                <p className="font-medium">
                                  {formatDate(declaration.declaration_period_start)} - {formatDate(declaration.declaration_period_end)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Stagiaires</p>
                                <p className="font-medium">{declaration.total_trainees}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Heures</p>
                                <p className="font-medium">{declaration.total_hours}h</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Financement demandé</p>
                                <p className="font-medium">{formatCurrency(declaration.requested_funding)}</p>
                              </div>
                            </div>
                            {declaration.opco_reference && (
                              <p className="text-sm text-muted-foreground">
                                Référence OPCO: {declaration.opco_reference}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {declaration.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => submitDeclaration.mutate(declaration.id)}
                                disabled={submitDeclaration.isPending}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Soumettre
                              </Button>
                            )}
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/dashboard/opco/declarations/${declaration.id}`}>
                                Voir les détails
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

        {/* Conventions */}
        <TabsContent value="conventions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Conventions OPCO</CardTitle>
                  <CardDescription>
                    Conventions signées avec les opérateurs de compétences
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href="/dashboard/opco/conventions/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle convention
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {conventions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucune convention OPCO enregistrée
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/opco/conventions/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Créer une convention
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {conventions.map((convention) => (
                    <Card key={convention.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">{convention.convention_number}</h3>
                              <Badge className={STATUS_COLORS[convention.status]}>
                                {convention.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              Type: {convention.convention_type.replace(/_/g, ' ')} | 
                              Période: {formatDate(convention.start_date)} - {convention.end_date ? formatDate(convention.end_date) : 'En cours'}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Taux de financement</p>
                                <p className="font-medium">{convention.funding_rate}%</p>
                              </div>
                              {convention.max_funding_amount && (
                                <>
                                  <div>
                                    <p className="text-muted-foreground">Montant max</p>
                                    <p className="font-medium">{formatCurrency(convention.max_funding_amount)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Restant</p>
                                    <p className="font-medium">{formatCurrency(convention.remaining_funding_amount || 0)}</p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" asChild>
                            <Link href={`/dashboard/opco/conventions/${convention.id}`}>
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

        {/* Demandes de financement */}
        <TabsContent value="funding">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Demandes de financement</CardTitle>
                  <CardDescription>
                    Demandes de financement auprès des OPCO
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href="/dashboard/opco/funding/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle demande
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {fundingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucune demande de financement enregistrée
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/opco/funding/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Créer une demande
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {fundingRequests.map((request) => (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">{request.title}</h3>
                              <Badge className={STATUS_COLORS[request.status]}>
                                {request.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {request.description}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Montant demandé</p>
                                <p className="font-medium">{formatCurrency(request.requested_amount)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Montant approuvé</p>
                                <p className="font-medium">{formatCurrency(request.approved_amount)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Montant payé</p>
                                <p className="font-medium">{formatCurrency(request.paid_amount)}</p>
                              </div>
                            </div>
                            {request.request_number && (
                              <p className="text-sm text-muted-foreground mt-2">
                                N° demande: {request.request_number}
                              </p>
                            )}
                          </div>
                          <Button variant="outline" asChild>
                            <Link href={`/dashboard/opco/funding/${request.id}`}>
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
      </Tabs>

      {/* Actions rapides */}
      <div className="mt-8 flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard/opco/configuration">
            <Building2 className="h-4 w-4 mr-2" />
            Configuration OPCO
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/opco/reports">
            <FileText className="h-4 w-4 mr-2" />
            Rapports
          </Link>
        </Button>
      </div>
    </div>
  )
}
