'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { useEnterpriseCompany } from '@/lib/contexts/enterprise-company-context'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { motion } from '@/components/ui/motion'
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Briefcase,
  Shield,
  Lock,
  Edit2,
  Save,
  X,
  Camera,
  Globe,
  FileText
} from 'lucide-react'
import type { CompanyManager } from '@/lib/services/enterprise-portal.service'

export default function EnterpriseProfilePage() {
  const { user } = useAuth()
  const { company, isEntityContext, entityId } = useEnterpriseCompany()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isEditing, setIsEditing] = useState(false)

  // Fetch manager info
  const { data: manager, isLoading } = useQuery({
    queryKey: ['company-manager-profile', user?.id, company?.id, isEntityContext, entityId],
    queryFn: async () => {
      if (!company?.id) return null

      if (isEntityContext && entityId) {
        // Priorité au contact renseigné sur l'entité dashboard
        const { data: entityRow } = await supabase
          .from('external_entities')
          .select('*')
          .eq('id', entityId)
          .maybeSingle()

        const entity = entityRow as (Record<string, unknown> & {
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_job_title?: string | null
        }) | null

        if (entity?.contact_first_name || entity?.contact_last_name || entity?.contact_email) {
          return {
            id: `entity-contact-${entityId}`,
            company_id: company.id,
            user_id: '',
            role: 'manager',
            first_name: entity.contact_first_name || 'Contact',
            last_name: entity.contact_last_name || '',
            email: entity.contact_email || '',
            phone: entity.contact_phone || undefined,
            job_title: entity.contact_job_title || undefined,
            department: undefined,
            can_view_invoices: true,
            can_download_documents: true,
            can_request_training: true,
            can_manage_employees: true,
            is_primary_contact: true,
            is_active: true,
            invited_at: '',
            created_at: '',
            updated_at: '',
          } as CompanyManager
        }

        // Admin view: get primary manager for this company
        // Prioritize primary contact, then role hierarchy
        const { data } = await supabase
          .from('company_managers')
          .select('*')
          .eq('company_id', company.id)
          .eq('is_active', true)
          .order('is_primary_contact', { ascending: false })
          // If no primary contact, we might want to order by role or creation date
          // For now, getting the first active manager found (usually the one created first or primary)
          .limit(1)
          .maybeSingle()
        
        return data as CompanyManager | null
      } else {
        // Regular view: get current user's manager profile
        if (!user?.id) return null
        const { data } = await supabase
          .from('company_managers')
          .select('*')
          .eq('user_id', user.id)
          .eq('company_id', company.id)
          .eq('is_active', true)
          .maybeSingle()
          
        return data as CompanyManager | null
      }
    },
    enabled: !!company?.id,
  })

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    job_title: '',
    department: '',
  })

  // Initialize form when data loads
  const initForm = () => {
    if (manager) {
      setFormData({
        first_name: manager.first_name || '',
        last_name: manager.last_name || '',
        phone: manager.phone || '',
        job_title: manager.job_title || '',
        department: manager.department || '',
      })
    }
  }

  // Update effect
  useState(() => {
    if (manager) initForm()
  })

  // Mutation to update profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!manager?.id) throw new Error('Manager not found')
      
      const { error } = await supabase
        .from('company_managers')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          job_title: data.job_title,
          department: data.department,
        })
        .eq('id', manager.id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-manager-profile'] })
      queryClient.invalidateQueries({ queryKey: ['company-manager'] }) // Update header
      setIsEditing(false)
      addToast({
        type: 'success',
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées avec succès.',
      })
    },
    onError: () => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de mettre à jour le profil.',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate(formData)
  }

  const roleLabels: Record<string, string> = {
    director: 'Directeur',
    hr_manager: 'Responsable RH',
    manager: 'Manager',
    viewer: 'Observateur',
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-6 pb-24 lg:pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {isEntityContext && (
        <motion.div 
          variants={itemVariants} 
          className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <Shield className="h-5 w-5 text-amber-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700 font-medium">
                Mode Administrateur
              </p>
              <p className="text-sm text-amber-600 mt-1">
                Vous consultez le profil du responsable principal de l&apos;entreprise. 
                L&apos;édition est désactivée dans ce mode.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header Profile Card */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-6 md:p-8 relative overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#274472]/5 via-blue-50/30 to-indigo-50/20" />
          
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-[#274472] to-blue-600 flex items-center justify-center text-white text-3xl md:text-4xl font-bold shadow-xl">
                {manager?.first_name?.[0]}{manager?.last_name?.[0]}
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="absolute bottom-0 right-0 p-2.5 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <Camera className="h-4 w-4 text-[#274472]" />
              </motion.button>
            </div>

            {/* User Info */}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {manager?.first_name} {manager?.last_name}
              </h1>
              <div className="flex flex-col md:flex-row items-center gap-2 mt-2 text-gray-500">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  <Briefcase className="w-3 h-3" />
                  {roleLabels[manager?.role || 'manager']}
                </span>
                {manager?.job_title && (
                  <span className="text-sm border-l border-gray-300 pl-2 ml-1">
                    {manager.job_title}
                  </span>
                )}
              </div>
              <div className="flex flex-col md:flex-row items-center gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  {manager?.email}
                </span>
                {manager?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4" />
                    {manager.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Edit Button */}
            <div>
              {!isEntityContext && (
                !isEditing ? (
                  <Button 
                    onClick={() => {
                      initForm()
                      setIsEditing(true)
                    }}
                    className="bg-[#274472] hover:bg-[#1d3556]"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Annuler
                    </Button>
                    <Button 
                      onClick={handleSubmit} 
                      disabled={updateProfileMutation.isPending}
                      className="bg-[#274472] hover:bg-[#1d3556]"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfileMutation.isPending ? '...' : 'Enregistrer'}
                    </Button>
                  </div>
                )
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Info Form */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="h-5 w-5 text-[#274472]" />
              Informations personnelles
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Prénom</Label>
                  <Input
                    value={isEditing ? formData.first_name : manager?.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={isEditing ? formData.last_name : manager?.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Email professionnel</Label>
                  <Input
                    type="email"
                    value={manager?.email || ''}
                    disabled
                    className="mt-1 bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié</p>
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={isEditing ? formData.phone : manager?.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="+33 6..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Poste / Fonction</Label>
                  <Input
                    value={isEditing ? formData.job_title : manager?.job_title || ''}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="Ex: Responsable Formation"
                  />
                </div>
                <div>
                  <Label>Département / Service</Label>
                  <Input
                    value={isEditing ? formData.department : manager?.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="Ex: Ressources Humaines"
                  />
                </div>
              </div>
            </form>
          </GlassCard>

          {/* Company Info (Read Only) */}
          <GlassCard className="p-6 mt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#274472]" />
              Informations Entreprise
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-gray-500">Raison sociale</Label>
                <div className="mt-1 font-medium text-gray-900">{company?.name || '-'}</div>
              </div>
              <div>
                <Label className="text-gray-500">SIRET</Label>
                <div className="mt-1 font-medium text-gray-900">{company?.siret || '-'}</div>
              </div>
              <div>
                <Label className="text-gray-500">Adresse</Label>
                <div className="mt-1 text-gray-900">
                  {company?.address}<br />
                  {company?.postal_code} {company?.city}<br />
                  {company?.country}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-500">Email de contact</Label>
                  <div className="mt-1 flex items-center gap-2 text-gray-900">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {company?.email || '-'}
                  </div>
                </div>
                {company?.website && (
                  <div>
                    <Label className="text-gray-500">Site web</Label>
                    <div className="mt-1 flex items-center gap-2 text-blue-600">
                      <Globe className="w-4 h-4" />
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {company.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Informations OPCO
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <span className="text-xs text-gray-500 block">OPCO de rattachement</span>
                  <span className="font-medium text-gray-900">{company?.opco_name || 'Non renseigné'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Email contact OPCO</span>
                  <span className="font-medium text-gray-900">{company?.opco_contact_email || '-'}</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Quick Settings */}
        <motion.div variants={itemVariants} className="space-y-4">
          <GlassCard className="p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#274472]" />
              Sécurité
            </h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start hover:bg-gray-50">
                <Lock className="h-4 w-4 mr-2" />
                Changer le mot de passe
              </Button>
              <Button variant="outline" className="w-full justify-start hover:bg-gray-50">
                <Shield className="h-4 w-4 mr-2" />
                Double authentification
              </Button>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#274472]" />
              Préférences
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Notifications email</span>
                <input type="checkbox" defaultChecked className="rounded border-gray-300 text-[#274472] focus:ring-[#274472]" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Rappels de conformité</span>
                <input type="checkbox" defaultChecked className="rounded border-gray-300 text-[#274472] focus:ring-[#274472]" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Offres partenaires</span>
                <input type="checkbox" className="rounded border-gray-300 text-[#274472] focus:ring-[#274472]" />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  )
}
