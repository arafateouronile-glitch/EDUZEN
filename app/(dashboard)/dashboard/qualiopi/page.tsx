'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { qualiopiService, type QualiopiIndicator } from '@/lib/services/qualiopi.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  TrendingUp,
  Plus,
  RefreshCw,
  Accessibility
} from 'lucide-react'
import Link from 'next/link'

const STATUS_COLORS = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  compliant: 'bg-green-100 text-green-800',
  non_compliant: 'bg-red-100 text-red-800',
  needs_improvement: 'bg-yellow-100 text-yellow-800',
}

const STATUS_ICONS = {
  not_started: Clock,
  in_progress: RefreshCw,
  compliant: CheckCircle2,
  non_compliant: XCircle,
  needs_improvement: AlertCircle,
}

export default function QualiopiPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Récupérer les indicateurs
  const { data: indicators = [], isLoading } = useQuery({
    queryKey: ['qualiopi-indicators', user?.organization_id],
    queryFn: async () => {
      try {
        return await qualiopiService.getIndicators(user!.organization_id!)
      } catch (error: any) {
        // Si la table n'existe pas encore ou erreur 404, retourner un tableau vide
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
          console.warn('Error fetching qualiopi indicators:', error?.message)
          return []
        }
        throw error
      }
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Calculer le taux de conformité
  const { data: complianceRate = 0 } = useQuery({
    queryKey: ['qualiopi-compliance-rate', user?.organization_id],
    queryFn: async () => {
      try {
        return await qualiopiService.calculateComplianceRate(user!.organization_id!)
      } catch (error: any) {
        // Si la fonction RPC n'existe pas encore ou erreur 404, retourner 0
        // La gestion d'erreur est déjà faite dans le service, mais on double la vérification ici
        const is404Error = 
          error?.code === 'PGRST116' ||
          error?.code === '42883' ||
          error?.code === 'PGRST301' ||
          error?.status === 404 ||
          error?.code === '404' ||
          String(error?.status) === '404' ||
          error?.message?.toLowerCase().includes('function') ||
          error?.message?.toLowerCase().includes('does not exist') ||
          error?.message?.toLowerCase().includes('schema cache') ||
          error?.message?.toLowerCase().includes('not found') ||
          error?.message?.toLowerCase().includes('404')

        if (is404Error) {
          // L'erreur est déjà gérée dans le service, on retourne simplement 0
          return 0
        }
        throw error
      }
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Initialiser les indicateurs si nécessaire
  const initializeIndicators = useMutation({
    mutationFn: () => qualiopiService.initializeIndicators(user!.organization_id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualiopi-indicators'] })
      addToast({
        title: 'Indicateurs initialisés',
        description: 'Les indicateurs Qualiopi ont été initialisés avec succès.',
        type: 'success',
      })
    },
    onError: (error: any) => {
      console.error('Error initializing indicators:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Une erreur est survenue lors de l\'initialisation des indicateurs.',
      })
    },
  })

  // Filtrer par catégorie
  const categories = Array.from(new Set(indicators.map((i) => i.category)))
  const filteredIndicators = selectedCategory === 'all'
    ? indicators
    : indicators.filter((i) => i.category === selectedCategory)

  // Statistiques
  const stats = {
    total: indicators.length,
    compliant: indicators.filter((i) => i.status === 'compliant').length,
    inProgress: indicators.filter((i) => i.status === 'in_progress').length,
    nonCompliant: indicators.filter((i) => i.status === 'non_compliant').length,
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      </div>
    )
  }

  // Si aucun indicateur, proposer l'initialisation
  if (indicators.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Module Qualiopi
            </CardTitle>
            <CardDescription>
              Initialisez les indicateurs Qualiopi pour commencer la gestion de votre certification qualité
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-6">
                Aucun indicateur Qualiopi n'a été configuré pour votre organisation.
              </p>
              <Button onClick={() => initializeIndicators.mutate()} disabled={initializeIndicators.isPending}>
                {initializeIndicators.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Initialisation...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Initialiser les indicateurs Qualiopi
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="h-8 w-8 text-brand-blue" />
          Certification Qualiopi
        </h1>
        <p className="text-muted-foreground">
          Gérez votre certification qualité et vos indicateurs de conformité
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux de conformité</p>
                <p className="text-2xl font-bold">{complianceRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conformes</p>
                <p className="text-2xl font-bold">{stats.compliant}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Non conformes</p>
                <p className="text-2xl font-bold">{stats.nonCompliant}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Accessibilité (Critère 8) */}
      <Card className="mb-8 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5 text-blue-600" />
            Critère 8 - Accessibilité Handicap
          </CardTitle>
          <CardDescription>
            Gestion de l'accessibilité conforme aux exigences Qualiopi (indicateurs 8.1 et 8.2)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                Assurez-vous de désigner un référent handicap, définir une politique d'accessibilité,
                et mettre en place des aménagements pour les stagiaires en situation de handicap.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-white">
                  Indicateur 8.1 : Accessibilité physique
                </Badge>
                <Badge variant="outline" className="bg-white">
                  Indicateur 8.2 : Accessibilité numérique
                </Badge>
              </div>
            </div>
            <Link href="/dashboard/accessibility">
              <Button className="ml-4">
                Gérer l'accessibilité
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Navigation par catégories */}
      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all" onClick={() => setSelectedCategory('all')}>
            Tous ({indicators.length})
          </TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              onClick={() => setSelectedCategory(category)}
            >
              {category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Liste des indicateurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIndicators.map((indicator) => {
          const StatusIcon = STATUS_ICONS[indicator.status]
          return (
            <Card key={indicator.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{indicator.indicator_code}</CardTitle>
                    <CardDescription className="mt-1">{indicator.indicator_name}</CardDescription>
                  </div>
                  <StatusIcon className={`h-5 w-5 ${STATUS_COLORS[indicator.status].split(' ')[1]}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Statut</span>
                    <Badge className={STATUS_COLORS[indicator.status]}>
                      {indicator.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Conformité</span>
                    <span className="font-semibold">{indicator.compliance_rate}%</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    asChild
                  >
                    <Link href={`/dashboard/qualiopi/indicators/${indicator.id}`}>
                      <FileText className="h-4 w-4 mr-2" />
                      Voir les détails
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Actions rapides */}
      <div className="mt-8 flex gap-4">
        <Button asChild>
          <Link href="/dashboard/qualiopi/audits">
            <FileText className="h-4 w-4 mr-2" />
            Audits
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/qualiopi/actions">
            <AlertCircle className="h-4 w-4 mr-2" />
            Actions correctives
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/qualiopi/reports">
            <FileText className="h-4 w-4 mr-2" />
            Rapports
          </Link>
        </Button>
      </div>
    </div>
  )
}
