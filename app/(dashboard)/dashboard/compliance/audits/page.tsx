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
  FileCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Download,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default function AuditsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFramework, setSelectedFramework] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const [newAudit, setNewAudit] = useState({
    title: '',
    audit_type: 'internal',
    framework: 'iso27001',
    auditor_name: '',
    auditor_organization: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  })

  // Récupérer les audits
  const { data: audits } = useQuery({
    queryKey: ['security-audits', user?.organization_id, selectedFramework, selectedStatus],
    queryFn: () =>
      complianceService.getAudits(user?.organization_id || '', {
        framework: selectedFramework === 'all' ? undefined : selectedFramework,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
      }),
    enabled: !!user?.organization_id,
  })

  // Filtrer les audits
  const filteredAudits = audits?.filter((audit: any) => {
    if (searchQuery && !audit.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !audit.audit_id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  // Créer un audit
  const createAuditMutation = useMutation({
    mutationFn: () =>
      complianceService.createAudit({
        ...newAudit,
        organization_id: user?.organization_id || '',
        start_date: new Date(newAudit.start_date).toISOString(),
        end_date: newAudit.end_date ? new Date(newAudit.end_date).toISOString() : undefined,
      } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-audits'] })
      setIsCreateDialogOpen(false)
      setNewAudit({
        title: '',
        audit_type: 'internal',
        framework: 'iso27001',
        auditor_name: '',
        auditor_organization: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
      })
    },
  })

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <FileCheck className="h-8 w-8" />
            Audits de sécurité
          </h1>
          <p className="text-muted-foreground">
            Audits internes et externes de conformité
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel audit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un nouvel audit</DialogTitle>
              <DialogDescription>
                Planifiez un audit de sécurité pour votre organisation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type d'audit</Label>
                  <Select
                    value={newAudit.audit_type}
                    onValueChange={(value) => setNewAudit({ ...newAudit, audit_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Interne</SelectItem>
                      <SelectItem value="external">Externe</SelectItem>
                      <SelectItem value="self_assessment">Auto-évaluation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Framework</Label>
                  <Select
                    value={newAudit.framework}
                    onValueChange={(value) => setNewAudit({ ...newAudit, framework: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iso27001">ISO 27001</SelectItem>
                      <SelectItem value="soc2">SOC 2</SelectItem>
                      <SelectItem value="gdpr">GDPR</SelectItem>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Titre</Label>
                <Input
                  value={newAudit.title}
                  onChange={(e) => setNewAudit({ ...newAudit, title: e.target.value })}
                  placeholder="Titre de l'audit"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom de l'auditeur</Label>
                  <Input
                    value={newAudit.auditor_name}
                    onChange={(e) => setNewAudit({ ...newAudit, auditor_name: e.target.value })}
                    placeholder="Nom de l'auditeur"
                  />
                </div>
                <div>
                  <Label>Organisation de l'auditeur</Label>
                  <Input
                    value={newAudit.auditor_organization}
                    onChange={(e) => setNewAudit({ ...newAudit, auditor_organization: e.target.value })}
                    placeholder="Organisation"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={newAudit.start_date}
                    onChange={(e) => setNewAudit({ ...newAudit, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Date de fin (optionnel)</Label>
                  <Input
                    type="date"
                    value={newAudit.end_date}
                    onChange={(e) => setNewAudit({ ...newAudit, end_date: e.target.value })}
                  />
                </div>
              </div>
              <Button
                onClick={() => createAuditMutation.mutate()}
                disabled={!newAudit.title}
                className="w-full"
              >
                Créer l'audit
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
            placeholder="Rechercher un audit..."
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
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="scheduled">Planifié</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des audits */}
      {filteredAudits && filteredAudits.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredAudits.map((audit: any) => (
            <Card key={audit.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{audit.title}</CardTitle>
                      <Badge variant="outline">{audit.audit_id}</Badge>
                      <Badge>{audit.framework?.toUpperCase()}</Badge>
                      <Badge className={statusColors[audit.status] || 'bg-gray-100 text-gray-800'}>
                        {audit.status === 'scheduled' ? (
                          <Clock className="h-3 w-3 mr-1" />
                        ) : audit.status === 'completed' ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {audit.status === 'scheduled'
                          ? 'Planifié'
                          : audit.status === 'in_progress'
                          ? 'En cours'
                          : audit.status === 'completed'
                          ? 'Terminé'
                          : 'Annulé'}
                      </Badge>
                    </div>
                    <CardDescription className="mt-2">
                      {audit.audit_type === 'internal'
                        ? 'Audit interne'
                        : audit.audit_type === 'external'
                        ? 'Audit externe'
                        : 'Auto-évaluation'}
                      {audit.auditor_name && ` • ${audit.auditor_name}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    {audit.overall_score !== null && (
                      <div>
                        <span className="text-sm text-muted-foreground">Score: </span>
                        <Badge className="bg-blue-100 text-blue-800">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {audit.overall_score.toFixed(1)}/100
                        </Badge>
                      </div>
                    )}
                    {audit.compliance_percentage !== null && (
                      <div>
                        <span className="text-sm text-muted-foreground">Conformité: </span>
                        <Badge className="bg-green-100 text-green-800">
                          {audit.compliance_percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    )}
                    {audit.findings_count > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">Constatations: </span>
                        <Badge variant="outline">{audit.findings_count}</Badge>
                        {audit.critical_findings_count > 0 && (
                          <Badge className="bg-red-100 text-red-800 ml-2">
                            {audit.critical_findings_count} critique(s)
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Du {formatDate(audit.start_date)}</span>
                    {audit.end_date && <span>au {formatDate(audit.end_date)}</span>}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Link href={`/dashboard/compliance/audits/${audit.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Voir les détails
                      </Button>
                    </Link>
                    {audit.report_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={audit.report_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger le rapport
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Aucun audit trouvé. {searchQuery && 'Essayez une autre recherche.'}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
