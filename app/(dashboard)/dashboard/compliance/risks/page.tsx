'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { complianceService } from '@/lib/services/compliance.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  Plus,
  Search,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react'
import Link from 'next/link'

export default function RisksPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const [newRisk, setNewRisk] = useState({
    risk_id: '',
    title: '',
    description: '',
    category: 'security',
    likelihood: 'possible',
    impact: 'moderate',
    treatment_status: 'open',
    treatment_plan: '',
  })

  // Récupérer les risques
  const { data: risks } = useQuery({
    queryKey: ['risk-assessments', user?.organization_id, selectedLevel, selectedStatus],
    queryFn: () =>
      complianceService.getRisks(user?.organization_id || '', {
        riskLevel: selectedLevel === 'all' ? undefined : selectedLevel,
        treatmentStatus: selectedStatus === 'all' ? undefined : selectedStatus,
      }),
    enabled: !!user?.organization_id,
  })

  // Filtrer les risques
  const filteredRisks = risks?.filter((risk: any) => {
    if (searchQuery && !risk.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !risk.risk_id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  // Créer un risque
  const createRiskMutation = useMutation({
    mutationFn: () =>
      complianceService.createRisk({
        ...newRisk,
        organization_id: user?.organization_id || '',
      } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-assessments'] })
      setIsCreateDialogOpen(false)
      setNewRisk({
        risk_id: '',
        title: '',
        description: '',
        category: 'security',
        likelihood: 'possible',
        impact: 'moderate',
        treatment_status: 'open',
        treatment_plan: '',
      })
    },
  })

  const riskLevelColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  }

  const treatmentStatusColors: Record<string, string> = {
    open: 'bg-red-100 text-red-800',
    mitigated: 'bg-green-100 text-green-800',
    accepted: 'bg-blue-100 text-blue-800',
    transferred: 'bg-purple-100 text-purple-800',
    avoided: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-8 w-8" />
            Évaluations de risques
          </h1>
          <p className="text-muted-foreground">
            Identification, évaluation et traitement des risques de sécurité
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau risque
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle évaluation de risque</DialogTitle>
              <DialogDescription>
                Identifiez et évaluez un nouveau risque pour votre organisation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID du risque</Label>
                  <Input
                    value={newRisk.risk_id}
                    onChange={(e) => setNewRisk({ ...newRisk, risk_id: e.target.value })}
                    placeholder="Ex: RISK-001"
                  />
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Select
                    value={newRisk.category}
                    onValueChange={(value) => setNewRisk({ ...newRisk, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="security">Sécurité</SelectItem>
                      <SelectItem value="operational">Opérationnel</SelectItem>
                      <SelectItem value="financial">Financier</SelectItem>
                      <SelectItem value="compliance">Conformité</SelectItem>
                      <SelectItem value="reputation">Réputation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Titre</Label>
                <Input
                  value={newRisk.title}
                  onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                  placeholder="Titre du risque"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newRisk.description}
                  onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
                  placeholder="Description du risque"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Probabilité</Label>
                  <Select
                    value={newRisk.likelihood}
                    onValueChange={(value) => setNewRisk({ ...newRisk, likelihood: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rare">Rare</SelectItem>
                      <SelectItem value="unlikely">Peu probable</SelectItem>
                      <SelectItem value="possible">Possible</SelectItem>
                      <SelectItem value="likely">Probable</SelectItem>
                      <SelectItem value="almost_certain">Presque certain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Impact</Label>
                  <Select
                    value={newRisk.impact}
                    onValueChange={(value) => setNewRisk({ ...newRisk, impact: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="negligible">Négligeable</SelectItem>
                      <SelectItem value="minor">Mineur</SelectItem>
                      <SelectItem value="moderate">Modéré</SelectItem>
                      <SelectItem value="major">Majeur</SelectItem>
                      <SelectItem value="catastrophic">Catastrophique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Plan de traitement</Label>
                <Textarea
                  value={newRisk.treatment_plan}
                  onChange={(e) => setNewRisk({ ...newRisk, treatment_plan: e.target.value })}
                  placeholder="Plan de traitement du risque"
                  rows={3}
                />
              </div>
              <Button
                onClick={() => createRiskMutation.mutate()}
                disabled={!newRisk.risk_id || !newRisk.title}
                className="w-full"
              >
                Créer le risque
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher un risque..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedLevel} onValueChange={setSelectedLevel}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les niveaux</SelectItem>
            <SelectItem value="critical">Critique</SelectItem>
            <SelectItem value="high">Élevé</SelectItem>
            <SelectItem value="medium">Moyen</SelectItem>
            <SelectItem value="low">Faible</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="open">Ouvert</SelectItem>
            <SelectItem value="mitigated">Atténué</SelectItem>
            <SelectItem value="accepted">Accepté</SelectItem>
            <SelectItem value="transferred">Transféré</SelectItem>
            <SelectItem value="avoided">Évité</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des risques */}
      {filteredRisks && filteredRisks.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredRisks.map((risk: any) => (
            <Card key={risk.id} className={risk.risk_level === 'critical' ? 'border-red-200' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{risk.title}</CardTitle>
                      <Badge variant="outline">{risk.risk_id}</Badge>
                      <Badge className={riskLevelColors[risk.risk_level] || 'bg-gray-100 text-gray-800'}>
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {risk.risk_level === 'critical'
                          ? 'Critique'
                          : risk.risk_level === 'high'
                          ? 'Élevé'
                          : risk.risk_level === 'medium'
                          ? 'Moyen'
                          : 'Faible'}
                      </Badge>
                    </div>
                    {risk.description && (
                      <CardDescription className="mt-2">{risk.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="text-sm text-muted-foreground">Probabilité: </span>
                      <Badge variant="outline">{risk.likelihood}</Badge>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Impact: </span>
                      <Badge variant="outline">{risk.impact}</Badge>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Statut: </span>
                      <Badge className={treatmentStatusColors[risk.treatment_status] || 'bg-gray-100 text-gray-800'}>
                        {risk.treatment_status === 'open' ? (
                          <XCircle className="h-3 w-3 mr-1" />
                        ) : risk.treatment_status === 'mitigated' ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {risk.treatment_status === 'open'
                          ? 'Ouvert'
                          : risk.treatment_status === 'mitigated'
                          ? 'Atténué'
                          : risk.treatment_status === 'accepted'
                          ? 'Accepté'
                          : risk.treatment_status === 'transferred'
                          ? 'Transféré'
                          : 'Évité'}
                      </Badge>
                    </div>
                    {risk.category && (
                      <div>
                        <span className="text-sm text-muted-foreground">Catégorie: </span>
                        <Badge variant="outline">{risk.category}</Badge>
                      </div>
                    )}
                  </div>
                  {risk.treatment_plan && (
                    <div>
                      <span className="text-sm font-medium">Plan de traitement: </span>
                      <p className="text-sm text-muted-foreground mt-1">{risk.treatment_plan}</p>
                    </div>
                  )}
                  {risk.owner && (
                    <div>
                      <span className="text-sm text-muted-foreground">Propriétaire: </span>
                      <span className="text-sm">{risk.owner.full_name || risk.owner.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Link href={`/dashboard/compliance/risks/${risk.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Voir les détails
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Aucun risque trouvé. {searchQuery && 'Essayez une autre recherche.'}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
