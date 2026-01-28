'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { accessibilityService } from '@/lib/services/accessibility.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Accessibility,
  Users,
  CheckCircle2,
  Package,
  TrendingUp,
  Settings,
  FileText,
  AlertCircle,
  RefreshCw,
  Plus,
} from 'lucide-react'
import Link from 'next/link'

export default function AccessibilityPage() {
  const { user } = useAuth()
  const [selectedTab, setSelectedTab] = useState('overview')

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['accessibility-stats', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      return await accessibilityService.getStats(user.organization_id)
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['accessibility-config', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      return await accessibilityService.getConfiguration(user.organization_id)
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  const { data: studentNeeds = [], isLoading: needsLoading } = useQuery({
    queryKey: ['accessibility-needs', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return await accessibilityService.getStudentNeeds(user.organization_id)
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  const { data: accommodations = [], isLoading: accommodationsLoading } = useQuery({
    queryKey: ['accessibility-accommodations', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return await accessibilityService.getAccommodations(user.organization_id)
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  const { data: equipment = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ['accessibility-equipment', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return await accessibilityService.getEquipment(user.organization_id)
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  const isLoading = statsLoading || configLoading || needsLoading || accommodationsLoading || equipmentLoading

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full p-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      </div>
    )
  }

  // Empty state - Configuration initiale
  if (!config) {
    return (
      <div className="w-full p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Accessibility className="h-6 w-6 text-brand-blue" />
              Module Accessibilité Handicap
            </CardTitle>
            <CardDescription>
              Gestion de l'accessibilité et des aménagements pour les stagiaires en situation de handicap
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Accessibility className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Configuration initiale requise</h3>
              <p className="text-muted-foreground mb-6">
                Pour commencer, configurez votre politique d'accessibilité et désignez un référent handicap.
              </p>
              <Button asChild>
                <Link href="/dashboard/accessibility/config">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurer le module
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const complianceRate = stats?.compliance_rate || 0
  const totalNeeds = stats?.total_students_with_needs || 0
  const activeAccommodations = stats?.active_accommodations || 0
  const availableEquipment = stats?.available_equipment || 0
  const pendingReviews = stats?.pending_reviews || 0

  return (
    <div className="w-full p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Accessibility className="h-8 w-8 text-brand-blue" />
          Accessibilité Handicap
        </h1>
        <p className="text-muted-foreground">
          Gestion complète de l'accessibilité conforme aux exigences Qualiopi (critère 8)
        </p>
      </div>

      {/* Alertes */}
      {!config.referent_user_id && (
        <Card className="mb-4 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Référent handicap non désigné</h3>
                <p className="text-sm text-yellow-800 mt-1">
                  La désignation d'un référent handicap est obligatoire pour la conformité Qualiopi.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/dashboard/accessibility/config">Désigner un référent</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {pendingReviews > 0 && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">
                  {pendingReviews} déclaration{pendingReviews > 1 ? 's' : ''} en attente de revue
                </h3>
                <p className="text-sm text-blue-800 mt-1">
                  Des stagiaires ont déclaré des besoins spécifiques qui nécessitent votre attention.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiques - 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stagiaires concernés</p>
                <p className="text-2xl font-bold">{totalNeeds}</p>
                <p className="text-xs text-muted-foreground mt-1">Avec besoins déclarés</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aménagements actifs</p>
                <p className="text-2xl font-bold">{activeAccommodations}</p>
                <p className="text-xs text-muted-foreground mt-1">En cours</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux de conformité</p>
                <p className="text-2xl font-bold">{complianceRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Critère Qualiopi 8</p>
              </div>
              <TrendingUp className={`h-8 w-8 ${complianceRate >= 80 ? 'text-green-500' : 'text-orange-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Équipements disponibles</p>
                <p className="text-2xl font-bold">{availableEquipment}</p>
                <p className="text-xs text-muted-foreground mt-1">Unités</p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="students">
            Stagiaires
            {pendingReviews > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingReviews}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accommodations">Aménagements</TabsTrigger>
          <TabsTrigger value="equipment">Équipements</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Référent handicap</span>
                  {config.referent_user_id ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Politique d'accessibilité</span>
                  {config.accessibility_policy ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Registre accessibilité physique</span>
                  {config.physical_accessibility_statement ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Registre accessibilité numérique</span>
                  {config.digital_accessibility_statement ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link href="/dashboard/accessibility/config">
                    <Settings className="h-4 w-4 mr-2" />
                    Modifier la configuration
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Partenariats */}
            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-lg">Partenariats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 pb-4">
                <div className="flex items-center gap-3">
                  {config.partner_agefiph ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                  <span className="text-sm">Agefiph</span>
                </div>
                <div className="flex items-center gap-3">
                  {config.partner_cap_emploi ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                  <span className="text-sm">Cap emploi</span>
                </div>
                <div className="flex items-center gap-3">
                  {config.partner_fiphfp ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                  <span className="text-sm">FIPHFP</span>
                </div>
                {config.partner_other && config.partner_other.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-2">Autres partenaires</p>
                    {config.partner_other.map((partner: any, idx: number) => (
                      <p key={idx} className="text-sm text-muted-foreground">
                        • {partner.name}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <Button asChild variant="outline" className="h-auto py-4">
              <Link href="/dashboard/accessibility/config">
                <Settings className="h-5 w-5 mr-2" />
                Configuration
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4">
              <Link href="/dashboard/accessibility/equipment">
                <Package className="h-5 w-5 mr-2" />
                Gérer les équipements
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4">
              <div>
                <FileText className="h-5 w-5 mr-2" />
                Générer un rapport
              </div>
            </Button>
          </div>
        </TabsContent>

        {/* Stagiaires */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Stagiaires avec besoins déclarés</CardTitle>
              <CardDescription>
                {totalNeeds} stagiaire{totalNeeds > 1 ? 's' : ''} {totalNeeds > 1 ? 'ont' : 'a'} déclaré des besoins
                spécifiques
              </CardDescription>
            </CardHeader>
            <CardContent>
              {studentNeeds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun besoin spécifique déclaré pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentNeeds.map((need) => (
                    <div key={need.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">Stagiaire #{need.student_id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {need.has_disability ? 'Handicap déclaré' : 'Besoins spécifiques'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            need.status === 'implemented'
                              ? 'default'
                              : need.status === 'reviewed'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {need.status === 'implemented'
                            ? 'Mis en œuvre'
                            : need.status === 'reviewed'
                              ? 'Revue'
                              : 'En attente'}
                        </Badge>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/accessibility/students/${need.student_id}`}>Voir détails</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aménagements */}
        <TabsContent value="accommodations">
          <Card>
            <CardHeader className="pb-3 pt-4">
              <CardTitle>Aménagements en place</CardTitle>
              <CardDescription>
                {activeAccommodations} aménagement{activeAccommodations > 1 ? 's' : ''} actif
                {activeAccommodations > 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              {accommodations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun aménagement configuré</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accommodations.slice(0, 5).map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{acc.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Type : {acc.accommodation_type} • Progression : {acc.completion_rate}%
                        </p>
                      </div>
                      <Badge variant={acc.status === 'active' ? 'default' : 'secondary'}>{acc.status}</Badge>
                    </div>
                  ))}
                  {accommodations.length > 5 && (
                    <p className="text-sm text-center text-muted-foreground pt-2">
                      Et {accommodations.length - 5} autre{accommodations.length - 5 > 1 ? 's' : ''}...
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Équipements */}
        <TabsContent value="equipment">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Équipements adaptés</h2>
                <p className="text-sm text-muted-foreground">
                  {equipment.length} équipement{equipment.length > 1 ? 's' : ''} inventorié
                  {equipment.length > 1 ? 's' : ''}
                </p>
              </div>
              <Button asChild>
                <Link href="/dashboard/accessibility/equipment">
                  <Package className="h-4 w-4 mr-2" />
                  Gérer les équipements
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {equipment.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucun équipement inventorié</p>
                    <Button asChild variant="outline" className="mt-4">
                      <Link href="/dashboard/accessibility/equipment">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un équipement
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                equipment.slice(0, 6).map((eq) => (
                  <Card key={eq.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{eq.name}</CardTitle>
                      <Badge
                        variant={eq.status === 'available' ? 'default' : eq.status === 'in_use' ? 'secondary' : 'outline'}
                        className="w-fit"
                      >
                        {eq.status === 'available'
                          ? 'Disponible'
                          : eq.status === 'in_use'
                            ? 'En utilisation'
                            : eq.status === 'maintenance'
                              ? 'Maintenance'
                              : 'Retiré'}
                      </Badge>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4">
                      <p className="text-sm text-muted-foreground">
                        {eq.quantity_available} / {eq.quantity_total} disponible{eq.quantity_available > 1 ? 's' : ''}
                      </p>
                      {eq.location && <p className="text-xs text-muted-foreground mt-1">📍 {eq.location}</p>}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            {equipment.length > 6 && (
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/accessibility/equipment">Voir tous les équipements</Link>
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
