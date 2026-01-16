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
  Shield,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Eye,
} from 'lucide-react'
import Link from 'next/link'

export default function ControlsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFramework, setSelectedFramework] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const [newControl, setNewControl] = useState({
    control_id: '',
    framework: 'iso27001',
    title: '',
    description: '',
    category: '',
    implementation_status: 'not_implemented',
    compliance_status: 'non_compliant',
    risk_level: 'medium',
  })

  // Récupérer les contrôles
  const { data: controls } = useQuery({
    queryKey: ['security-controls', user?.organization_id, selectedFramework, selectedStatus],
    queryFn: () =>
      complianceService.getControls(user?.organization_id || '', {
        framework: selectedFramework === 'all' ? undefined : selectedFramework,
      }),
    enabled: !!user?.organization_id,
  })

  // Filtrer les contrôles
  const filteredControls = controls?.filter((control: any) => {
    if (selectedStatus !== 'all' && control.implementation_status !== selectedStatus) {
      return false
    }
    if (searchQuery && !control.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !control.control_id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  // Créer un contrôle
  const createControlMutation = useMutation({
    mutationFn: () =>
      complianceService.createControl({
        ...newControl,
        organization_id: user?.organization_id || '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-controls'] })
      setIsCreateDialogOpen(false)
      setNewControl({
        control_id: '',
        framework: 'iso27001',
        title: '',
        description: '',
        category: '',
        implementation_status: 'not_implemented',
        compliance_status: 'non_compliant',
        risk_level: 'medium',
      })
    },
  })

  const statusColors: Record<string, string> = {
    implemented: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    not_implemented: 'bg-red-100 text-red-800',
  }

  const complianceColors: Record<string, string> = {
    compliant: 'bg-blue-100 text-blue-800',
    partially_compliant: 'bg-yellow-100 text-yellow-800',
    non_compliant: 'bg-red-100 text-red-800',
  }

  const riskColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Contrôles de sécurité
          </h1>
          <p className="text-muted-foreground">
            Gestion des contrôles ISO 27001, SOC 2, GDPR et autres frameworks
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau contrôle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un nouveau contrôle</DialogTitle>
              <DialogDescription>
                Ajoutez un contrôle de sécurité pour votre organisation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID du contrôle</Label>
                  <Input
                    value={newControl.control_id}
                    onChange={(e) => setNewControl({ ...newControl, control_id: e.target.value })}
                    placeholder="Ex: A.9.2.1"
                  />
                </div>
                <div>
                  <Label>Framework</Label>
                  <Select
                    value={newControl.framework}
                    onValueChange={(value) => setNewControl({ ...newControl, framework: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iso27001">ISO 27001</SelectItem>
                      <SelectItem value="soc2">SOC 2</SelectItem>
                      <SelectItem value="gdpr">GDPR</SelectItem>
                      <SelectItem value="nist">NIST</SelectItem>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Titre</Label>
                <Input
                  value={newControl.title}
                  onChange={(e) => setNewControl({ ...newControl, title: e.target.value })}
                  placeholder="Titre du contrôle"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newControl.description}
                  onChange={(e) => setNewControl({ ...newControl, description: e.target.value })}
                  placeholder="Description du contrôle"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Statut d'implémentation</Label>
                  <Select
                    value={newControl.implementation_status}
                    onValueChange={(value) => setNewControl({ ...newControl, implementation_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_implemented">Non implémenté</SelectItem>
                      <SelectItem value="partial">Partiel</SelectItem>
                      <SelectItem value="implemented">Implémenté</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Statut de conformité</Label>
                  <Select
                    value={newControl.compliance_status}
                    onValueChange={(value) => setNewControl({ ...newControl, compliance_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non_compliant">Non conforme</SelectItem>
                      <SelectItem value="partially_compliant">Partiellement conforme</SelectItem>
                      <SelectItem value="compliant">Conforme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Niveau de risque</Label>
                  <Select
                    value={newControl.risk_level}
                    onValueChange={(value) => setNewControl({ ...newControl, risk_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Faible</SelectItem>
                      <SelectItem value="medium">Moyen</SelectItem>
                      <SelectItem value="high">Élevé</SelectItem>
                      <SelectItem value="critical">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => createControlMutation.mutate()}
                disabled={!newControl.control_id || !newControl.title}
                className="w-full"
              >
                Créer le contrôle
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
            placeholder="Rechercher un contrôle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedFramework} onValueChange={setSelectedFramework}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les frameworks</SelectItem>
            <SelectItem value="iso27001">ISO 27001</SelectItem>
            <SelectItem value="soc2">SOC 2</SelectItem>
            <SelectItem value="gdpr">GDPR</SelectItem>
            <SelectItem value="nist">NIST</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="implemented">Implémenté</SelectItem>
            <SelectItem value="partial">Partiel</SelectItem>
            <SelectItem value="not_implemented">Non implémenté</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des contrôles */}
      {filteredControls && filteredControls.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredControls.map((control: any) => (
            <Card key={control.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{control.title}</CardTitle>
                      <Badge variant="outline">{control.control_id}</Badge>
                      <Badge>{control.framework.toUpperCase()}</Badge>
                    </div>
                    {control.description && (
                      <CardDescription className="mt-2">{control.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge className={statusColors[control.implementation_status] || 'bg-gray-100 text-gray-800'}>
                    {control.implementation_status === 'implemented' ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : control.implementation_status === 'partial' ? (
                      <Clock className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {control.implementation_status === 'implemented'
                      ? 'Implémenté'
                      : control.implementation_status === 'partial'
                      ? 'Partiel'
                      : 'Non implémenté'}
                  </Badge>
                  <Badge className={complianceColors[control.compliance_status] || 'bg-gray-100 text-gray-800'}>
                    {control.compliance_status === 'compliant'
                      ? 'Conforme'
                      : control.compliance_status === 'partially_compliant'
                      ? 'Partiellement conforme'
                      : 'Non conforme'}
                  </Badge>
                  {control.risk_level && (
                    <Badge className={riskColors[control.risk_level] || 'bg-gray-100 text-gray-800'}>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Risque {control.risk_level}
                    </Badge>
                  )}
                  {control.category && (
                    <Badge variant="outline">{control.category}</Badge>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Link href={`/dashboard/compliance/controls/${control.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Voir les détails
                    </Button>
                  </Link>
                  {control.evidence_required && (
                    <Link href={`/dashboard/compliance/controls/${control.id}/evidence`}>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Preuves
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Aucun contrôle trouvé. {searchQuery && 'Essayez une autre recherche.'}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
