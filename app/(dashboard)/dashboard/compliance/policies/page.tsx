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
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  XCircle,
  Edit,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default function PoliciesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const [newPolicy, setNewPolicy] = useState({
    code: '',
    title: '',
    category: 'access_control',
    description: '',
    content: '',
    version: '1.0',
    iso27001_control: '',
    soc2_control: '',
  })

  // Récupérer les politiques
  const { data: policies } = useQuery({
    queryKey: ['security-policies', user?.organization_id, selectedStatus, selectedCategory],
    queryFn: () =>
      complianceService.getPolicies(user?.organization_id || '', {
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
      }),
    enabled: !!user?.organization_id,
  })

  // Filtrer les politiques
  const filteredPolicies = policies?.filter((policy: any) => {
    if (searchQuery && !policy.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !policy.code.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  // Créer une politique
  const createPolicyMutation = useMutation({
    mutationFn: () =>
      complianceService.createPolicy({
        ...newPolicy,
        organization_id: user?.organization_id || '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-policies'] })
      setIsCreateDialogOpen(false)
      setNewPolicy({
        code: '',
        title: '',
        category: 'access_control',
        description: '',
        content: '',
        version: '1.0',
        iso27001_control: '',
        soc2_control: '',
      })
    },
  })

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    archived: 'bg-red-100 text-red-800',
  }

  const approvalColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  const categoryLabels: Record<string, string> = {
    access_control: 'Contrôle d\'accès',
    data_protection: 'Protection des données',
    incident_response: 'Réponse aux incidents',
    business_continuity: 'Continuité d\'activité',
    encryption: 'Chiffrement',
    network_security: 'Sécurité réseau',
    physical_security: 'Sécurité physique',
    vendor_management: 'Gestion des fournisseurs',
    other: 'Autre',
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Politiques de sécurité
          </h1>
          <p className="text-muted-foreground">
            Documentation et gestion des politiques de sécurité
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle politique
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle politique</DialogTitle>
              <DialogDescription>
                Documentez une politique de sécurité pour votre organisation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Code</Label>
                  <Input
                    value={newPolicy.code}
                    onChange={(e) => setNewPolicy({ ...newPolicy, code: e.target.value })}
                    placeholder="Ex: POL-001"
                  />
                </div>
                <div>
                  <Label>Version</Label>
                  <Input
                    value={newPolicy.version}
                    onChange={(e) => setNewPolicy({ ...newPolicy, version: e.target.value })}
                    placeholder="1.0"
                  />
                </div>
              </div>
              <div>
                <Label>Titre</Label>
                <Input
                  value={newPolicy.title}
                  onChange={(e) => setNewPolicy({ ...newPolicy, title: e.target.value })}
                  placeholder="Titre de la politique"
                />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select
                  value={newPolicy.category}
                  onValueChange={(value) => setNewPolicy({ ...newPolicy, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="access_control">Contrôle d'accès</SelectItem>
                    <SelectItem value="data_protection">Protection des données</SelectItem>
                    <SelectItem value="incident_response">Réponse aux incidents</SelectItem>
                    <SelectItem value="business_continuity">Continuité d'activité</SelectItem>
                    <SelectItem value="encryption">Chiffrement</SelectItem>
                    <SelectItem value="network_security">Sécurité réseau</SelectItem>
                    <SelectItem value="physical_security">Sécurité physique</SelectItem>
                    <SelectItem value="vendor_management">Gestion des fournisseurs</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newPolicy.description}
                  onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                  placeholder="Description de la politique"
                  rows={2}
                />
              </div>
              <div>
                <Label>Contenu</Label>
                <Textarea
                  value={newPolicy.content}
                  onChange={(e) => setNewPolicy({ ...newPolicy, content: e.target.value })}
                  placeholder="Contenu complet de la politique"
                  rows={8}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contrôle ISO 27001 (optionnel)</Label>
                  <Input
                    value={newPolicy.iso27001_control}
                    onChange={(e) => setNewPolicy({ ...newPolicy, iso27001_control: e.target.value })}
                    placeholder="Ex: A.9.2.1"
                  />
                </div>
                <div>
                  <Label>Contrôle SOC 2 (optionnel)</Label>
                  <Input
                    value={newPolicy.soc2_control}
                    onChange={(e) => setNewPolicy({ ...newPolicy, soc2_control: e.target.value })}
                    placeholder="Ex: CC6.1"
                  />
                </div>
              </div>
              <Button
                onClick={() => createPolicyMutation.mutate()}
                disabled={!newPolicy.code || !newPolicy.title || !newPolicy.content}
                className="w-full"
              >
                Créer la politique
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
            placeholder="Rechercher une politique..."
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
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archivée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            <SelectItem value="access_control">Contrôle d'accès</SelectItem>
            <SelectItem value="data_protection">Protection des données</SelectItem>
            <SelectItem value="incident_response">Réponse aux incidents</SelectItem>
            <SelectItem value="business_continuity">Continuité d'activité</SelectItem>
            <SelectItem value="encryption">Chiffrement</SelectItem>
            <SelectItem value="network_security">Sécurité réseau</SelectItem>
            <SelectItem value="physical_security">Sécurité physique</SelectItem>
            <SelectItem value="vendor_management">Gestion des fournisseurs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des politiques */}
      {filteredPolicies && filteredPolicies.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredPolicies.map((policy: any) => (
            <Card key={policy.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{policy.title}</CardTitle>
                      <Badge variant="outline">{policy.code}</Badge>
                      <Badge>v{policy.version}</Badge>
                      <Badge className={statusColors[policy.status] || 'bg-gray-100 text-gray-800'}>
                        {policy.status === 'draft' ? (
                          <Edit className="h-3 w-3 mr-1" />
                        ) : policy.status === 'active' ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {policy.status === 'draft'
                          ? 'Brouillon'
                          : policy.status === 'active'
                          ? 'Active'
                          : 'Archivée'}
                      </Badge>
                      <Badge className={approvalColors[policy.approval_status] || 'bg-gray-100 text-gray-800'}>
                        {policy.approval_status === 'pending' ? (
                          <Clock className="h-3 w-3 mr-1" />
                        ) : policy.approval_status === 'approved' ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {policy.approval_status === 'pending'
                          ? 'En attente'
                          : policy.approval_status === 'approved'
                          ? 'Approuvée'
                          : 'Rejetée'}
                      </Badge>
                    </div>
                    {policy.description && (
                      <CardDescription className="mt-2">{policy.description}</CardDescription>
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
                        {categoryLabels[policy.category] || policy.category}
                      </Badge>
                    </div>
                    {policy.iso27001_control && (
                      <div>
                        <span className="text-sm text-muted-foreground">ISO 27001: </span>
                        <Badge variant="outline">{policy.iso27001_control}</Badge>
                      </div>
                    )}
                    {policy.soc2_control && (
                      <div>
                        <span className="text-sm text-muted-foreground">SOC 2: </span>
                        <Badge variant="outline">{policy.soc2_control}</Badge>
                      </div>
                    )}
                    {policy.effective_date && (
                      <div>
                        <span className="text-sm text-muted-foreground">En vigueur depuis: </span>
                        <span className="text-sm">{formatDate(policy.effective_date)}</span>
                      </div>
                    )}
                  </div>
                  {policy.approved_by_user && (
                    <div>
                      <span className="text-sm text-muted-foreground">Approuvée par: </span>
                      <span className="text-sm">
                        {policy.approved_by_user.full_name || policy.approved_by_user.email}
                      </span>
                      {policy.approved_at && (
                        <span className="text-sm text-muted-foreground ml-2">
                          le {formatDate(policy.approved_at)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Link href={`/dashboard/compliance/policies/${policy.id}`}>
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
            Aucune politique trouvée. {searchQuery && 'Essayez une autre recherche.'}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
