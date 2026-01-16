'use client'

import { useQuery } from '@tanstack/react-query'
import { accessibilityService } from '@/lib/services/accessibility.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  FileText,
  Link as LinkIcon,
  Package,
  TrendingUp,
} from 'lucide-react'

interface ComplianceDashboardProps {
  organizationId: string
}

export function ComplianceDashboard({ organizationId }: ComplianceDashboardProps) {
  // Charger la configuration
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['accessibility-config', organizationId],
    queryFn: async () => {
      return await accessibilityService.getConfiguration(organizationId)
    },
    enabled: !!organizationId,
  })

  // Charger les statistiques
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['accessibility-stats', organizationId],
    queryFn: async () => {
      return await accessibilityService.getStats(organizationId)
    },
    enabled: !!organizationId,
  })

  // Calculer le taux de conformité global
  const { data: complianceRate, isLoading: rateLoading } = useQuery({
    queryKey: ['accessibility-compliance-rate', organizationId],
    queryFn: async () => {
      return await accessibilityService.calculateComplianceRate(organizationId)
    },
    enabled: !!organizationId,
  })

  const isLoading = configLoading || statsLoading || rateLoading

  // Critères de conformité Qualiopi
  const criteria = [
    {
      id: 'referent',
      title: 'Référent handicap désigné',
      description: 'Un référent handicap doit être désigné et formé',
      icon: User,
      status: config?.referent_user_id ? 'success' : 'error',
      details: config?.referent_user_id
        ? config?.referent_training_date
          ? `Formé le ${new Date(config.referent_training_date).toLocaleDateString('fr-FR')}`
          : 'Formation non renseignée'
        : 'Aucun référent désigné',
    },
    {
      id: 'policy',
      title: 'Politique d\'accessibilité',
      description: 'Une politique d\'accessibilité doit être définie',
      icon: FileText,
      status: config?.accessibility_policy ? 'success' : 'warning',
      details: config?.accessibility_policy
        ? `${config.accessibility_policy.length} caractères`
        : 'Non définie',
    },
    {
      id: 'physical',
      title: 'Registre accessibilité physique',
      description: 'Documentation de l\'accessibilité des locaux',
      icon: FileText,
      status: config?.physical_accessibility_statement ? 'success' : 'warning',
      details: config?.physical_accessibility_statement
        ? `${config.physical_accessibility_statement.length} caractères`
        : 'Non défini',
    },
    {
      id: 'digital',
      title: 'Registre accessibilité numérique',
      description: 'Documentation de l\'accessibilité numérique',
      icon: FileText,
      status: config?.digital_accessibility_statement ? 'success' : 'warning',
      details: config?.digital_accessibility_statement
        ? `${config.digital_accessibility_statement.length} caractères`
        : 'Non défini',
    },
    {
      id: 'partners',
      title: 'Partenariats réseaux spécialisés',
      description: 'Collaborations avec Agefiph, Cap emploi, etc.',
      icon: LinkIcon,
      status:
        (config?.partner_agefiph || config?.partner_cap_emploi || config?.partner_fiphfp)
          ? 'success'
          : 'warning',
      details: [
        config?.partner_agefiph && 'Agefiph',
        config?.partner_cap_emploi && 'Cap emploi',
        config?.partner_fiphfp && 'FIPHFP',
        ...(config?.partner_other || []).map((p: any) => p.name),
      ]
        .filter(Boolean)
        .join(', ') || 'Aucun partenariat',
    },
    {
      id: 'accommodations',
      title: 'Aménagements mis en place',
      description: 'Adaptations pédagogiques et techniques actives',
      icon: TrendingUp,
      status: (stats?.active_accommodations || 0) > 0 ? 'success' : 'warning',
      details: `${stats?.active_accommodations || 0} aménagements actifs`,
    },
    {
      id: 'equipment',
      title: 'Équipements adaptés',
      description: 'Matériel et aides techniques disponibles',
      icon: Package,
      status: (stats?.available_equipment || 0) > 0 ? 'success' : 'warning',
      details: `${stats?.available_equipment || 0} équipements disponibles`,
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-100 text-green-800">
            Conforme
          </Badge>
        )
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800">
            Non conforme
          </Badge>
        )
      case 'warning':
        return (
          <Badge className="bg-amber-100 text-amber-800">
            À améliorer
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            Non évalué
          </Badge>
        )
    }
  }

  const successCount = criteria.filter((c) => c.status === 'success').length
  const totalCount = criteria.length
  const globalCompliance = Math.round((successCount / totalCount) * 100)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Chargement de la conformité...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Score global */}
      <Card>
        <CardHeader>
          <CardTitle>Conformité Qualiopi - Critère 8 (Accessibilité)</CardTitle>
          <CardDescription>
            Indicateur 8.1 : Accessibilité physique | Indicateur 8.2 : Accessibilité numérique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-primary">{globalCompliance}%</p>
                <p className="text-sm text-muted-foreground">Taux de conformité global</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold">
                  {successCount} / {totalCount}
                </p>
                <p className="text-sm text-muted-foreground">Critères conformes</p>
              </div>
            </div>
            <Progress value={globalCompliance} className="h-3" />
            <div className="flex items-center gap-2 text-sm">
              {globalCompliance >= 80 ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">Excellent niveau de conformité</span>
                </>
              ) : globalCompliance >= 60 ? (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-600 font-medium">Conformité satisfaisante, améliorations possibles</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-600 font-medium">Niveau de conformité insuffisant</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Détail des critères */}
      <Card>
        <CardHeader>
          <CardTitle>Détail des critères</CardTitle>
          <CardDescription>Exigences Qualiopi pour l'accessibilité</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {criteria.map((criterion) => {
              const Icon = criterion.icon
              return (
                <div
                  key={criterion.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">{getStatusIcon(criterion.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium">{criterion.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{criterion.description}</p>
                      <p className="text-xs text-gray-600 mt-2">{criterion.details}</p>
                    </div>
                  </div>
                  <div>{getStatusBadge(criterion.status)}</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Statistiques supplémentaires */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Statistiques d'accompagnement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats.total_students_with_needs || 0}</p>
                <p className="text-sm text-muted-foreground">Stagiaires avec besoins</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.active_accommodations || 0}</p>
                <p className="text-sm text-muted-foreground">Aménagements actifs</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{stats.available_equipment || 0}</p>
                <p className="text-sm text-muted-foreground">Équipements disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
