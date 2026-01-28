'use client'

/**
 * Page de gestion des liens d'accès auditeur
 * Permet de générer, visualiser et révoquer les liens temporaires
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Shield,
  Link as LinkIcon,
  Plus,
  Copy,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  User,
  Building2,
  Sparkles,
  Eye,
  Mail,
} from 'lucide-react'
import Link from 'next/link'
import { logger, sanitizeError } from '@/lib/utils/logger'
import type { AuditorAccessLink } from '@/lib/services/auditor-portal.service'

export default function AuditorLinksPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  // État du formulaire de création
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    auditorName: '',
    auditorEmail: '',
    auditorOrganization: '',
    validityHours: 48,
    samplingMode: false,
    notes: '',
  })

  // État pour afficher le lien généré
  const [generatedLink, setGeneratedLink] = useState<{
    url: string
    expiresAt: string
  } | null>(null)

  // Récupérer les liens existants
  const { data: links = [], isLoading } = useQuery({
    queryKey: ['auditor-links'],
    queryFn: async () => {
      const response = await fetch('/api/auditor/links')
      if (!response.ok) throw new Error('Erreur lors du chargement')
      const result = await response.json()
      return result.data as AuditorAccessLink[]
    },
    enabled: !!user?.organization_id,
    staleTime: 30 * 1000, // 30 secondes
  })

  // Mutation pour générer un lien
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auditor/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditorName: formData.auditorName,
          auditorEmail: formData.auditorEmail || undefined,
          auditorOrganization: formData.auditorOrganization || undefined,
          validityHours: formData.validityHours,
          permissions: {
            sampling_mode: formData.samplingMode,
          },
          notes: formData.notes || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la génération')
      }

      return response.json()
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['auditor-links'] })
      setGeneratedLink({
        url: result.data.url,
        expiresAt: result.data.expiresAt,
      })
      addToast({
        type: 'success',
        title: 'Lien généré',
        description: 'Le lien d\'accès auditeur a été créé avec succès.',
      })
    },
    onError: (error: Error) => {
      logger.error('Error generating auditor link:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message,
      })
    },
  })

  // Mutation pour révoquer un lien
  const revokeMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const response = await fetch(`/api/auditor/links?linkId=${linkId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la révocation')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditor-links'] })
      addToast({
        type: 'success',
        title: 'Lien révoqué',
        description: 'Le lien a été désactivé avec succès.',
      })
    },
    onError: (error: Error) => {
      logger.error('Error revoking auditor link:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message,
      })
    },
  })

  // Copier le lien
  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      addToast({
        type: 'success',
        title: 'Copié',
        description: 'Le lien a été copié dans le presse-papiers.',
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de copier le lien.',
      })
    }
  }

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      auditorName: '',
      auditorEmail: '',
      auditorOrganization: '',
      validityHours: 48,
      samplingMode: false,
      notes: '',
    })
    setGeneratedLink(null)
  }

  // Fermer le dialog et réinitialiser
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    resetForm()
  }

  // Statistiques
  const activeLinks = links.filter(
    (l) => l.is_active && new Date(l.expires_at) > new Date()
  ).length
  const totalAccesses = links.reduce((sum, l) => sum + (l.access_count || 0), 0)

  return (
    <main className="w-full p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <LinkIcon className="h-8 w-8 text-blue-600" />
              Liens d'accès auditeur
            </h1>
            <p className="text-muted-foreground">
              Générez des liens temporaires sécurisés pour permettre aux auditeurs externes
              d'accéder à votre conformité Qualiopi.
            </p>
          </div>
          <Link href="/dashboard/qualiopi">
            <Button variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Retour Qualiopi
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Liens actifs</p>
                <p className="text-2xl font-bold">{activeLinks}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total liens créés</p>
                <p className="text-2xl font-bold">{links.length}</p>
              </div>
              <LinkIcon className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accès total</p>
                <p className="text-2xl font-bold">{totalAccesses}</p>
              </div>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mode échantillonnage</p>
                <p className="text-2xl font-bold">
                  {links.filter((l) => (l.permissions as any)?.sampling_mode).length}
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Liens d'accès</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Générer un lien auditeur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {generatedLink ? 'Lien généré avec succès' : 'Nouveau lien auditeur'}
              </DialogTitle>
              <DialogDescription>
                {generatedLink
                  ? 'Copiez ce lien et envoyez-le à l\'auditeur. Il expire automatiquement.'
                  : 'Créez un lien temporaire sécurisé pour un auditeur externe.'}
              </DialogDescription>
            </DialogHeader>

            {generatedLink ? (
              /* Affichage du lien généré */
              <div className="space-y-4 py-4">
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="font-medium text-emerald-900">Lien créé</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={generatedLink.url}
                      readOnly
                      className="flex-1 bg-white font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(generatedLink.url)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    Expire le{' '}
                    {new Date(generatedLink.expiresAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                  <p className="font-medium mb-1">Conseil</p>
                  <p>
                    Vous pouvez envoyer ce lien par email à l'auditeur. Il pourra
                    commencer son audit à distance avant même d'arriver sur place.
                  </p>
                </div>
              </div>
            ) : (
              /* Formulaire de création */
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="auditorName">Nom de l'auditeur *</Label>
                  <Input
                    id="auditorName"
                    placeholder="Ex: Jean Dupont"
                    value={formData.auditorName}
                    onChange={(e) =>
                      setFormData({ ...formData, auditorName: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="auditorEmail">Email (optionnel)</Label>
                    <Input
                      id="auditorEmail"
                      type="email"
                      placeholder="auditeur@exemple.com"
                      value={formData.auditorEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, auditorEmail: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auditorOrg">Organisme (optionnel)</Label>
                    <Input
                      id="auditorOrg"
                      placeholder="Ex: AFNOR"
                      value={formData.auditorOrganization}
                      onChange={(e) =>
                        setFormData({ ...formData, auditorOrganization: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validity">Durée de validité</Label>
                  <select
                    id="validity"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.validityHours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        validityHours: parseInt(e.target.value, 10),
                      })
                    }
                  >
                    <option value={24}>24 heures</option>
                    <option value={48}>48 heures (recommandé)</option>
                    <option value={72}>72 heures</option>
                    <option value={168}>7 jours</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-900">Mode échantillonnage</p>
                      <p className="text-sm text-amber-700">
                        Permet à l'auditeur de rechercher un stagiaire ou une session
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.samplingMode}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, samplingMode: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes internes (optionnel)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notes visibles uniquement par votre équipe..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              {generatedLink ? (
                <>
                  <Button variant="outline" onClick={resetForm}>
                    Créer un autre lien
                  </Button>
                  <Button onClick={handleCloseDialog}>Fermer</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Annuler
                  </Button>
                  <Button
                    onClick={() => generateMutation.mutate()}
                    disabled={!formData.auditorName || generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Générer le lien
                      </>
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table des liens */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-12">
              <LinkIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-4">Aucun lien d'accès auditeur créé</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier lien
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auditeur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Accès</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => {
                  const isExpired = new Date(link.expires_at) < new Date()
                  const isActive = link.is_active && !isExpired

                  return (
                    <TableRow key={link.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">{link.auditor_name}</span>
                          </div>
                          {link.auditor_organization && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              <span className="text-sm text-slate-500">
                                {link.auditor_organization}
                              </span>
                            </div>
                          )}
                          {link.auditor_email && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span className="text-sm text-slate-500">
                                {link.auditor_email}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Actif
                          </Badge>
                        ) : isExpired ? (
                          <Badge className="bg-slate-100 text-slate-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Expiré
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="h-3 w-3 mr-1" />
                            Révoqué
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(link.permissions as any)?.sampling_mode && (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 text-xs"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              Échantillonnage
                            </Badge>
                          )}
                          {(link.permissions as any)?.export_pdf && (
                            <Badge variant="outline" className="text-xs">
                              Export PDF
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4 text-slate-400" />
                          <span>{link.access_count || 0}</span>
                        </div>
                        {link.last_accessed_at && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Dernier:{' '}
                            {new Date(link.last_accessed_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span
                            className={
                              isExpired ? 'text-slate-500' : 'text-slate-700'
                            }
                          >
                            {new Date(link.expires_at).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(link.expires_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Révoquer ce lien ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    L'auditeur ne pourra plus accéder au portail avec ce lien.
                                    Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => revokeMutation.mutate(link.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Révoquer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info box */}
      <Card className="mt-6 border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-1">
                Comment ça fonctionne ?
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  • Générez un lien temporaire sécurisé pour chaque audit
                </li>
                <li>
                  • L'auditeur accède à une interface en lecture seule avec toutes vos
                  preuves
                </li>
                <li>
                  • Le mode échantillonnage permet de filtrer par stagiaire ou session
                </li>
                <li>
                  • Chaque accès est tracé pour votre sécurité
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
