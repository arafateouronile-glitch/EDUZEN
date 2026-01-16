/**
 * Page d'administration - Gestion des sites/antennes (multi-sites)
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { siteService } from '@/lib/services/site.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { Plus, MapPin, Building2, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { RoleGuard, FORMATION_MANAGEMENT_ROLES } from '@/components/auth/role-guard'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Site = TableRow<'sites'>

export default function SitesPage() {
  return (
    <RoleGuard allowedRoles={FORMATION_MANAGEMENT_ROLES}>
      <SitesPageContent />
    </RoleGuard>
  )
}

function SitesPageContent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)

  const { data: sites, isLoading } = useQuery({
    queryKey: ['sites', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return siteService.getAll(user.organization_id)
    },
    enabled: !!user?.organization_id,
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.organization_id) throw new Error('Organization ID missing')
      return siteService.create({ ...data, organization_id: user.organization_id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      setShowForm(false)
      addToast({
        title: 'Succès',
        description: 'Site créé avec succès',
        type: 'success',
      })
    },
    onError: (error: any) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la création du site',
        type: 'error',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return siteService.update(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      setShowForm(false)
      setEditingSite(null)
      addToast({
        title: 'Succès',
        description: 'Site mis à jour avec succès',
        type: 'success',
      })
    },
    onError: (error: any) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la mise à jour',
        type: 'error',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return siteService.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      addToast({
        title: 'Succès',
        description: 'Site supprimé avec succès',
        type: 'success',
      })
    },
    onError: (error: any) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la suppression',
        type: 'error',
      })
    },
  })

  const handleEdit = (site: Site) => {
    setEditingSite(site)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce site ?')) return
    deleteMutation.mutate(id)
  }

  if (!user?.organization_id) {
    return (
      <div className="p-6">
        <p>Aucune organisation</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sites et Antennes</h1>
          <p className="text-gray-600 mt-1">Gérez les sites et antennes de votre organisation</p>
        </div>
        <Button
          onClick={() => {
            setEditingSite(null)
            setShowForm(true)
          }}
          className="bg-brand-blue hover:bg-brand-blue-dark"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau site
        </Button>
      </div>

      {/* Liste des sites */}
      {isLoading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : sites && sites.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site) => (
            <Card key={site.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-brand-blue" />
                      {site.name}
                    </CardTitle>
                    {site.is_headquarters && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Siège principal
                      </span>
                    )}
                    <span className="inline-block mt-2 ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {site.type}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(site)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(site.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {site.address && (
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                    <div>
                      <div>{site.address}</div>
                      {site.postal_code && site.city && (
                        <div>
                          {site.postal_code} {site.city}
                        </div>
                      )}
                      {site.country && <div>{site.country}</div>}
                    </div>
                  </div>
                )}

                {site.phone && (
                  <div className="text-sm text-gray-600">📞 {site.phone}</div>
                )}

                {site.email && (
                  <div className="text-sm text-gray-600">✉️ {site.email}</div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t">
                  {site.is_active ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Actif</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">Inactif</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600">Aucun site configuré</p>
            <Button
              onClick={() => setShowForm(true)}
              className="mt-4 bg-brand-blue hover:bg-brand-blue-dark"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer le premier site
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Formulaire */}
      <SiteFormDialog
        open={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingSite(null)
        }}
        site={editingSite}
        onSubmit={(data) => {
          if (editingSite) {
            updateMutation.mutate({ id: editingSite.id, data })
          } else {
            createMutation.mutate(data)
          }
        }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}

interface SiteFormDialogProps {
  open: boolean
  onClose: () => void
  site: Site | null
  onSubmit: (data: any) => void
  isSubmitting: boolean
}

function SiteFormDialog({ open, onClose, site, onSubmit, isSubmitting }: SiteFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'site' as 'headquarters' | 'site' | 'antenna',
    address: '',
    city: '',
    postal_code: '',
    country: 'FR',
    phone: '',
    email: '',
    is_active: true,
    is_headquarters: false,
    description: '',
    latitude: '',
    longitude: '',
  })

  // Pré-remplir le formulaire si édition
  useEffect(() => {
    if (site) {
      setFormData({
        name: site.name || '',
        code: site.code || '',
        type: (site.type as any) || 'site',
        address: site.address || '',
        city: site.city || '',
        postal_code: site.postal_code || '',
        country: site.country || 'FR',
        phone: site.phone || '',
        email: site.email || '',
        is_active: site.is_active ?? true,
        is_headquarters: site.is_headquarters ?? false,
        description: site.description || '',
        latitude: site.latitude?.toString() || '',
        longitude: site.longitude?.toString() || '',
      })
    } else {
      // Réinitialiser le formulaire
      setFormData({
        name: '',
        code: '',
        type: 'site',
        address: '',
        city: '',
        postal_code: '',
        country: 'FR',
        phone: '',
        email: '',
        is_active: true,
        is_headquarters: false,
        description: '',
        latitude: '',
        longitude: '',
      })
    }
  }, [site, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: any = {
      ...formData,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
    }
    onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{site ? 'Modifier le site' : 'Nouveau site'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">
                Nom du site <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="code">Code (optionnel)</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={isSubmitting}
              >
                <option value="headquarters">Siège</option>
                <option value="site">Site</option>
                <option value="antenna">Antenne</option>
              </select>
            </div>

            <div className="flex items-center gap-4 pt-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_headquarters"
                  checked={formData.is_headquarters}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_headquarters: checked })
                  }
                  disabled={isSubmitting}
                />
                <Label htmlFor="is_headquarters">Siège principal</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                  disabled={isSubmitting}
                />
                <Label htmlFor="is_active">Actif</Label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="postal_code">Code postal</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="country">Pays</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="latitude">Latitude (GPS)</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="longitude">Longitude (GPS)</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-brand-blue hover:bg-brand-blue-dark">
              {site ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

