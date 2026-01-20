'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { 
  Building2, Plus, Search, Edit, Trash2, Users, Mail, Phone, MapPin, 
  ExternalLink, Briefcase, X, Save, Loader2
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RoleGuard, ADMIN_ROLES } from '@/components/auth/role-guard'
import Link from 'next/link'

type ExternalEntity = {
  id: string
  organization_id: string
  name: string
  type: 'company' | 'organization' | 'institution' | 'partner' | 'other'
  code: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  country: string | null
  siret: string | null
  siren: string | null
  vat_number: string | null
  legal_form: string | null
  website: string | null
  description: string | null
  activity_sector: string | null
  employee_count: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function EntitiesPage() {
  return (
    <RoleGuard allowedRoles={ADMIN_ROLES}>
      <EntitiesPageContent />
    </RoleGuard>
  )
}

function EntitiesPageContent() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEntity, setEditingEntity] = useState<ExternalEntity | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Formulaire
  const [formData, setFormData] = useState({
    name: '',
    type: 'company' as ExternalEntity['type'],
    code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    siret: '',
    siren: '',
    vat_number: '',
    legal_form: '',
    website: '',
    description: '',
    activity_sector: '',
    employee_count: '',
    is_active: true,
  })

  // Récupérer les entités
  const { data: entities, isLoading } = useQuery({
    queryKey: ['external-entities', user?.organization_id, search, typeFilter],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      let query = supabase
        .from('external_entities')
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('name', { ascending: true })

      if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,siret.ilike.%${search}%`)
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as ExternalEntity[]
    },
    enabled: !!user?.organization_id,
  })

  // Compter les apprenants par entité
  const { data: studentCounts } = useQuery({
    queryKey: ['student-entity-counts', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return {}
      
      const { data, error } = await supabase
        .from('student_entities')
        .select('entity_id, is_current')
        .eq('is_current', true)
      
      if (error) throw error
      
      const counts: Record<string, number> = {}
      data?.forEach((se: any) => {
        counts[se.entity_id] = (counts[se.entity_id] || 0) + 1
      })
      
      return counts
    },
    enabled: !!user?.organization_id,
  })

  // Créer ou modifier une entité
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')

      const payload: any = {
        organization_id: user.organization_id,
        name: data.name,
        type: data.type,
        code: data.code || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        postal_code: data.postal_code || null,
        country: data.country || 'France',
        siret: data.siret || null,
        siren: data.siren || null,
        vat_number: data.vat_number || null,
        legal_form: data.legal_form || null,
        website: data.website || null,
        description: data.description || null,
        activity_sector: data.activity_sector || null,
        employee_count: data.employee_count || null,
        is_active: data.is_active,
        created_by: user.id,
      }

      if (editingEntity) {
        const { error } = await supabase
          .from('external_entities')
          .update(payload)
          .eq('id', editingEntity.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('external_entities')
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      setIsDialogOpen(false)
      resetForm()
      addToast({
        title: 'Succès',
        description: editingEntity ? 'Entité modifiée avec succès' : 'Entité créée avec succès',
        type: 'success',
      })
    },
    onError: (error: any) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        type: 'error',
      })
    },
  })

  // Supprimer une entité
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('external_entities')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      addToast({
        title: 'Succès',
        description: 'Entité supprimée avec succès',
        type: 'success',
      })
    },
    onError: (error: any) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        type: 'error',
      })
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'company',
      code: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postal_code: '',
      country: 'France',
      siret: '',
      siren: '',
      vat_number: '',
      legal_form: '',
      website: '',
      description: '',
      activity_sector: '',
      employee_count: '',
      is_active: true,
    })
    setEditingEntity(null)
  }

  const handleEdit = (entity: ExternalEntity) => {
    setEditingEntity(entity)
    setFormData({
      name: entity.name,
      type: entity.type,
      code: entity.code || '',
      email: entity.email || '',
      phone: entity.phone || '',
      address: entity.address || '',
      city: entity.city || '',
      postal_code: entity.postal_code || '',
      country: entity.country || 'France',
      siret: entity.siret || '',
      siren: entity.siren || '',
      vat_number: entity.vat_number || '',
      legal_form: entity.legal_form || '',
      website: entity.website || '',
      description: entity.description || '',
      activity_sector: entity.activity_sector || '',
      employee_count: entity.employee_count || '',
      is_active: entity.is_active,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (entity: ExternalEntity) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${entity.name}" ?`)) {
      deleteMutation.mutate(entity.id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    saveMutation.mutate(formData, {
      onSettled: () => setIsSubmitting(false),
    })
  }

  const getTypeLabel = (type: ExternalEntity['type']) => {
    const labels: Record<ExternalEntity['type'], string> = {
      company: 'Entreprise',
      organization: 'Organisme',
      institution: 'Établissement',
      partner: 'Partenaire',
      other: 'Autre',
    }
    return labels[type]
  }

  const getTypeColor = (type: ExternalEntity['type']) => {
    const colors: Record<ExternalEntity['type'], string> = {
      company: 'bg-blue-100 text-blue-800',
      organization: 'bg-green-100 text-green-800',
      institution: 'bg-purple-100 text-purple-800',
      partner: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return colors[type]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-8 w-8 text-brand-blue" />
            Entreprises & Organismes
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Gérez les entreprises, organismes et autres entités externes
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle entité
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, code ou SIRET..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="company">Entreprises</SelectItem>
                <SelectItem value="organization">Organismes</SelectItem>
                <SelectItem value="institution">Établissements</SelectItem>
                <SelectItem value="partner">Partenaires</SelectItem>
                <SelectItem value="other">Autres</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des entités */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : entities && entities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map((entity) => (
            <Card key={entity.id} className={!entity.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{entity.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getTypeColor(entity.type)}>
                        {getTypeLabel(entity.type)}
                      </Badge>
                      {!entity.is_active && (
                        <Badge variant="outline">Inactif</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(entity)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(entity)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {entity.code && (
                    <div className="text-gray-600">Code: {entity.code}</div>
                  )}
                  {entity.siret && (
                    <div className="text-gray-600">SIRET: {entity.siret}</div>
                  )}
                  {entity.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4" />
                      {entity.email}
                    </div>
                  )}
                  {entity.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      {entity.phone}
                    </div>
                  )}
                  {(entity.address || entity.city) && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {[entity.address, entity.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {entity.activity_sector && (
                    <div className="text-gray-600">
                      <Briefcase className="h-4 w-4 inline mr-1" />
                      {entity.activity_sector}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {studentCounts?.[entity.id] || 0} apprenant(s) rattaché(s)
                    </span>
                  </div>
                  <Link href={`/dashboard/entities/${entity.id}/students`}>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      Gérer les apprenants
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Aucune entité trouvée</p>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Créer une entité
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog de création/édition */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntity ? 'Modifier l\'entité' : 'Nouvelle entité'}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations de l'entreprise ou de l'organisme
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as ExternalEntity['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Entreprise</SelectItem>
                    <SelectItem value="organization">Organisme</SelectItem>
                    <SelectItem value="institution">Établissement</SelectItem>
                    <SelectItem value="partner">Partenaire</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="siret">SIRET</Label>
                <Input
                  id="siret"
                  value={formData.siret}
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  maxLength={14}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="siren">SIREN</Label>
                <Input
                  id="siren"
                  value={formData.siren}
                  onChange={(e) => setFormData({ ...formData, siren: e.target.value })}
                  maxLength={9}
                />
              </div>
              <div>
                <Label htmlFor="legal_form">Forme juridique</Label>
                <Input
                  id="legal_form"
                  value={formData.legal_form}
                  onChange={(e) => setFormData({ ...formData, legal_form: e.target.value })}
                  placeholder="SARL, SA, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Code postal</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="website">Site web</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="vat_number">N° TVA</Label>
                <Input
                  id="vat_number"
                  value={formData.vat_number}
                  onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="activity_sector">Secteur d'activité</Label>
                <Input
                  id="activity_sector"
                  value={formData.activity_sector}
                  onChange={(e) => setFormData({ ...formData, activity_sector: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="employee_count">Effectif</Label>
                <Select
                  value={formData.employee_count}
                  onValueChange={(value) => setFormData({ ...formData, employee_count: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10</SelectItem>
                    <SelectItem value="11-50">11-50</SelectItem>
                    <SelectItem value="51-250">51-250</SelectItem>
                    <SelectItem value="251-500">251-500</SelectItem>
                    <SelectItem value="500+">500+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Entité active
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsDialogOpen(false); resetForm() }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
