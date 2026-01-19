'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { complianceService } from '@/lib/services/compliance.service.client'
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
  AlertCircle,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default function IncidentsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    category: 'unauthorized_access',
    severity: 'medium',
    detected_at: new Date().toISOString().split('T')[0],
  })

  // Récupérer les incidents
  const { data: incidents } = useQuery({
    queryKey: ['security-incidents', user?.organization_id, selectedStatus, selectedSeverity],
    queryFn: () =>
      complianceService.getIncidents(user?.organization_id || '', {
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        severity: selectedSeverity === 'all' ? undefined : selectedSeverity,
      }),
    enabled: !!user?.organization_id,
  })

  // Filtrer les incidents
  const filteredIncidents = incidents?.filter((incident: any) => {
    if (searchQuery && !incident.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !incident.incident_id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  // Créer un incident
  const createIncidentMutation = useMutation({
    mutationFn: () =>
      complianceService.createIncident({
        ...newIncident,
        organization_id: user?.organization_id || '',
        reported_by: user?.id || '',
        detected_at: new Date(newIncident.detected_at).toISOString(),
      } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-incidents'] })
      setIsCreateDialogOpen(false)
      setNewIncident({
        title: '',
        description: '',
        category: 'unauthorized_access',
        severity: 'medium',
        detected_at: new Date().toISOString().split('T')[0],
      })
    },
  })

  const severityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  }

  const statusColors: Record<string, string> = {
    open: 'bg-red-100 text-red-800',
    investigating: 'bg-yellow-100 text-yellow-800',
    contained: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  const categoryLabels: Record<string, string> = {
    data_breach: 'Violation de données',
    malware: 'Malware',
    unauthorized_access: 'Accès non autorisé',
    ddos: 'DDoS',
    phishing: 'Phishing',
    insider_threat: 'Menace interne',
    physical_security: 'Sécurité physique',
    other: 'Autre',
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <AlertCircle className="h-8 w-8" />
            Incidents de sécurité
          </h1>
          <p className="text-muted-foreground">
            Gestion des incidents et violations de sécurité
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel incident
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Signaler un incident de sécurité</DialogTitle>
              <DialogDescription>
                Enregistrez un nouvel incident de sécurité pour votre organisation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Catégorie</Label>
                  <Select
                    value={newIncident.category}
                    onValueChange={(value) => setNewIncident({ ...newIncident, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="data_breach">Violation de données</SelectItem>
                      <SelectItem value="malware">Malware</SelectItem>
                      <SelectItem value="unauthorized_access">Accès non autorisé</SelectItem>
                      <SelectItem value="ddos">DDoS</SelectItem>
                      <SelectItem value="phishing">Phishing</SelectItem>
                      <SelectItem value="insider_threat">Menace interne</SelectItem>
                      <SelectItem value="physical_security">Sécurité physique</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sévérité</Label>
                  <Select
                    value={newIncident.severity}
                    onValueChange={(value) => setNewIncident({ ...newIncident, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Faible</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="high">Élevée</SelectItem>
                      <SelectItem value="critical">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Titre</Label>
                <Input
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  placeholder="Titre de l'incident"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  placeholder="Description détaillée de l'incident"
                  rows={4}
                />
              </div>
              <div>
                <Label>Date de détection</Label>
                <Input
                  type="date"
                  value={newIncident.detected_at}
                  onChange={(e) => setNewIncident({ ...newIncident, detected_at: e.target.value })}
                />
              </div>
              <Button
                onClick={() => createIncidentMutation.mutate()}
                disabled={!newIncident.title}
                className="w-full"
              >
                Signaler l'incident
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
            placeholder="Rechercher un incident..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="open">Ouvert</SelectItem>
            <SelectItem value="investigating">En investigation</SelectItem>
            <SelectItem value="contained">Contenu</SelectItem>
            <SelectItem value="resolved">Résolu</SelectItem>
            <SelectItem value="closed">Fermé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sévérités</SelectItem>
            <SelectItem value="critical">Critique</SelectItem>
            <SelectItem value="high">Élevée</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="low">Faible</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des incidents */}
      {filteredIncidents && filteredIncidents.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredIncidents.map((incident: any) => (
            <Card key={incident.id} className={incident.severity === 'critical' ? 'border-red-200' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{incident.title}</CardTitle>
                      <Badge variant="outline">{incident.incident_id}</Badge>
                      <Badge className={severityColors[incident.severity] || 'bg-gray-100 text-gray-800'}>
                        <Shield className="h-3 w-3 mr-1" />
                        {incident.severity === 'critical'
                          ? 'Critique'
                          : incident.severity === 'high'
                          ? 'Élevée'
                          : incident.severity === 'medium'
                          ? 'Moyenne'
                          : 'Faible'}
                      </Badge>
                      <Badge className={statusColors[incident.status] || 'bg-gray-100 text-gray-800'}>
                        {incident.status === 'open' ? (
                          <Clock className="h-3 w-3 mr-1" />
                        ) : incident.status === 'resolved' ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {incident.status === 'open'
                          ? 'Ouvert'
                          : incident.status === 'investigating'
                          ? 'En investigation'
                          : incident.status === 'contained'
                          ? 'Contenu'
                          : incident.status === 'resolved'
                          ? 'Résolu'
                          : 'Fermé'}
                      </Badge>
                    </div>
                    {incident.description && (
                      <CardDescription className="mt-2">{incident.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="text-sm text-muted-foreground">Catégorie: </span>
                      <Badge variant="outline">
                        {categoryLabels[incident.category] || incident.category}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Détecté le: </span>
                      <span className="text-sm">{formatDate(incident.detected_at)}</span>
                    </div>
                    {incident.data_breach && (
                      <Badge className="bg-red-100 text-red-800">
                        Violation de données
                      </Badge>
                    )}
                    {incident.personal_data_affected && (
                      <Badge className="bg-orange-100 text-orange-800">
                        Données personnelles affectées
                      </Badge>
                    )}
                  </div>
                  {incident.assigned_to_user && (
                    <div>
                      <span className="text-sm text-muted-foreground">Assigné à: </span>
                      <span className="text-sm">
                        {incident.assigned_to_user.full_name || incident.assigned_to_user.email}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Link href={`/dashboard/compliance/incidents/${incident.id}`}>
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
            Aucun incident trouvé. {searchQuery && 'Essayez une autre recherche.'}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
