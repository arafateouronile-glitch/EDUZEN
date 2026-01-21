'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { 
  Building2, Plus, Search, Edit, Trash2, Users, Mail, Phone, MapPin, 
  Briefcase, Save, Loader2, Filter, Globe, Building, School, MoreHorizontal
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RoleGuard, ADMIN_ROLES } from '@/components/auth/role-guard'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { cn } from '@/lib/utils'

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

  const getTypeIcon = (type: ExternalEntity['type']) => {
    const icons: Record<ExternalEntity['type'], any> = {
      company: Building2,
      organization: Building,
      institution: School,
      partner: Briefcase,
      other: MoreHorizontal,
    }
    return icons[type] || Building2
  }

  const getTypeColor = (type: ExternalEntity['type']) => {
    const colors: Record<ExternalEntity['type'], string> = {
      company: 'bg-blue-100 text-blue-800 border-blue-200',
      organization: 'bg-green-100 text-green-800 border-green-200',
      institution: 'bg-purple-100 text-purple-800 border-purple-200',
      partner: 'bg-orange-100 text-orange-800 border-orange-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200',
    }
    return colors[type]
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }
    }
  }

  return (
    <motion.div 
      className="min-h-screen pb-12 relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-cyan/5 rounded-full blur-3xl" />
      </div>

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg shadow-brand-blue/20">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight">
                Entreprises & Organismes
              </h1>
            </div>
            <p className="text-gray-500 pl-[4.25rem]">
              Gérez votre réseau de partenaires, entreprises et lieux de formation.
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Button 
              onClick={() => { resetForm(); setIsDialogOpen(true) }}
              className="bg-gradient-to-r from-brand-blue to-brand-blue-dark hover:from-brand-blue-dark hover:to-brand-blue-darker text-white shadow-lg shadow-brand-blue/25 transition-all hover:scale-[1.02] rounded-xl px-6 py-6 h-auto text-base"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle entité
            </Button>
          </motion.div>
        </div>

        {/* Filtres */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, code ou SIRET..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue rounded-xl"
                />
              </div>
              <div className="w-full md:w-[250px] relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="pl-10 bg-white/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue rounded-xl">
                    <SelectValue placeholder="Type d'entité" />
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
            </div>
          </GlassCard>
        </motion.div>

        {/* Liste des entités */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-20"
            >
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
            </motion.div>
          ) : entities && entities.length > 0 ? (
            <motion.div 
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {entities.map((entity) => {
                const Icon = getTypeIcon(entity.type)
                return (
                  <motion.div key={entity.id} variants={itemVariants}>
                    <GlassCard 
                      className={cn(
                        "h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-brand-blue/5 hover:-translate-y-1 group relative overflow-hidden",
                        !entity.is_active && "opacity-75 grayscale-[0.5]"
                      )}
                    >
                      {/* Decorative gradient blob */}
                      <div className="absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />

                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex gap-3">
                          <div className={cn("p-2.5 rounded-xl h-fit", getTypeColor(entity.type).split(' ')[0])}>
                            <Icon className={cn("h-5 w-5", getTypeColor(entity.type).split(' ')[1])} />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 line-clamp-1 text-lg group-hover:text-brand-blue transition-colors">
                              {entity.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={cn("text-xs font-normal", getTypeColor(entity.type))}>
                                {getTypeLabel(entity.type)}
                              </Badge>
                              {!entity.is_active && (
                                <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                                  Inactif
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(entity)}
                            className="h-8 w-8 rounded-lg hover:bg-brand-blue/10 hover:text-brand-blue"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(entity)}
                            className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3 flex-1 relative z-10">
                        {entity.activity_sector && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Briefcase className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="truncate">{entity.activity_sector}</span>
                          </div>
                        )}
                        
                        {(entity.address || entity.city) && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="truncate">
                              {[entity.address, entity.city].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}

                        {(entity.email || entity.phone) && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {entity.email ? (
                              <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                            ) : (
                              <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                            )}
                            <span className="truncate">
                              {entity.email || entity.phone}
                            </span>
                          </div>
                        )}

                        {entity.siret && (
                          <div className="text-xs text-gray-400 font-mono mt-1">
                            SIRET: {entity.siret}
                          </div>
                        )}
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Users className="h-4 w-4 text-brand-blue" />
                          <span>{studentCounts?.[entity.id] || 0}</span>
                          <span className="text-gray-400 font-normal">apprenants</span>
                        </div>
                        
                        <Link href={`/dashboard/entities/${entity.id}/students`}>
                          <Button variant="ghost" size="sm" className="text-brand-blue hover:text-brand-blue-dark hover:bg-brand-blue/5 -mr-2">
                            Voir détails
                          </Button>
                        </Link>
                      </div>
                    </GlassCard>
                  </motion.div>
                )
              })}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <Building2 className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune entité trouvée</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                Commencez par ajouter une entreprise, un organisme ou un partenaire pour gérer vos relations externes.
              </p>
              <Button 
                onClick={() => { resetForm(); setIsDialogOpen(true) }}
                className="bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer une première entité
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dialog de création/édition */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl font-display">
                <div className="p-2 bg-brand-blue/10 rounded-lg">
                  {editingEntity ? <Edit className="h-5 w-5 text-brand-blue" /> : <Plus className="h-5 w-5 text-brand-blue" />}
                </div>
                {editingEntity ? 'Modifier l\'entité' : 'Nouvelle entité'}
              </DialogTitle>
              <DialogDescription>
                Renseignez les informations détaillées de l'entreprise ou de l'organisme.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de l'entité *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue"
                    placeholder="Ex: ACME Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type d'entité *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as ExternalEntity['type'] })}
                  >
                    <SelectTrigger className="bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="code">Code interne</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue"
                    placeholder="Ex: ENT-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET</Label>
                  <Input
                    id="siret"
                    value={formData.siret}
                    onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                    maxLength={14}
                    className="bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue"
                    placeholder="14 chiffres"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email de contact</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10 bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue"
                      placeholder="contact@exemple.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10 bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue"
                      placeholder="+33..."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="pl-10 bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue"
                    placeholder="Numéro et nom de rue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Code postal</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="activity_sector">Secteur d'activité</Label>
                  <Input
                    id="activity_sector"
                    value={formData.activity_sector}
                    onChange={(e) => setFormData({ ...formData, activity_sector: e.target.value })}
                    className="bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue"
                    placeholder="Ex: Informatique, Commerce..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee_count">Effectif</Label>
                  <Select
                    value={formData.employee_count}
                    onValueChange={(value) => setFormData({ ...formData, employee_count: value })}
                  >
                    <SelectTrigger className="bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 salariés</SelectItem>
                      <SelectItem value="11-50">11-50 salariés</SelectItem>
                      <SelectItem value="51-250">51-250 salariés</SelectItem>
                      <SelectItem value="251-500">251-500 salariés</SelectItem>
                      <SelectItem value="500+">500+ salariés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description / Notes</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue resize-none"
                  placeholder="Informations complémentaires..."
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                />
                <Label htmlFor="is_active" className="cursor-pointer font-medium text-gray-700">
                  Entité active
                </Label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setIsDialogOpen(false); resetForm() }}
                  className="hover:bg-gray-50 border-gray-200"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-brand-blue hover:bg-brand-blue-dark text-white shadow-lg shadow-brand-blue/20"
                >
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
    </motion.div>
  )
}
