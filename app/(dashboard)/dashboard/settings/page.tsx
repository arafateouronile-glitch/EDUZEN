'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import {
  Settings, Users, Shield, Bell, CreditCard, Globe, FileText,
  Layout, Code, Save, Building2, Mail, Phone, MapPin,
  Calendar, DollarSign, Languages, Moon, Sun, Key,
  Briefcase, Video, GraduationCap, ChevronRight, ChevronDown, Upload, Image as ImageIcon, Award, Palette, X, Clock, Receipt, FileSignature, User,
  Lock, FileDown, ClipboardCheck, Accessibility, Plug
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { user, isLoading: authLoading, session, isAuthenticated } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('organization')
  
  // Rediriger les enseignants vers le dashboard
  useEffect(() => {
    if (!authLoading && user?.role === 'teacher') {
      logger.debug('SettingsPage - Redirection enseignant vers dashboard')
      router.push('/dashboard')
      addToast({
        title: 'Accès refusé',
        description: 'Les paramètres ne sont pas accessibles aux enseignants',
        type: 'error',
      })
    }
  }, [user, authLoading, router, addToast])
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'payments') {
      setActiveTab('payments')
    }
  }, [])
  
  // Note: Debug logs removed for production
  useEffect(() => {
    if (authLoading) {
      return
    }
    
    if (user) {
      logger.debug('✅ [SETTINGS] Utilisateur chargé:', {
        id: user.id,
        email: user.email,
        organization_id: user.organization_id,
        role: user.role,
      })
    } else if (isAuthenticated && !user) {
      logger.warn('⚠️ [SETTINGS] Session active mais aucun utilisateur dans la table users', { userId: session?.user?.id })
    } else if (!isAuthenticated) {
      logger.warn('⚠️ [SETTINGS] Utilisateur non authentifié')
    }
  }, [user, authLoading, session, isAuthenticated])
  
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // État pour les paramètres de l'organisation
  const [orgFormData, setOrgFormData] = useState({
    name: '',
    code: '',
    type: '',
    country: '',
    currency: '',
    language: 'fr',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
    logo_url: '',
    qualiopi_certificate_url: '',
    stamp_url: '',
    signature_url: '',
    brand_color: '#335ACF',
    siret: '',
    nda_number: '',
  })

  // États pour les uploads
  const [logoUploading, setLogoUploading] = useState(false)
  const [qualiopiUploading, setQualiopiUploading] = useState(false)
  const [stampSignatureUploading, setStampSignatureUploading] = useState(false)
  
  // Refs pour les inputs file
  const logoInputRef = useRef<HTMLInputElement>(null)
  const qualiopiInputRef = useRef<HTMLInputElement>(null)
  const stampSignatureInputRef = useRef<HTMLInputElement>(null)

  // État pour les paramètres de notifications
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    invoiceReminders: true,
    paymentReminders: true,
    attendanceAlerts: true,
    documentGenerated: true,
    weeklyReports: false,
  })

  // État pour les paramètres généraux
  const [generalSettings, setGeneralSettings] = useState({
    // theme supprimé - Application en mode clair uniquement
    language: 'fr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'EUR',
    timezone: 'Europe/Paris',
  })

  // Récupérer l'abonnement actif + plan + factures
  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data } = await supabase
        .from('organization_subscriptions')
        .select(`
          id,
          current_period_end,
          current_period_start,
          billing_cycle,
          status,
          trial_ends_at,
          subscription_plans(id, name, features, max_users, max_students, max_storage_gb, price_monthly, price_yearly)
        `)
        .eq('organization_id', user.organization_id)
        .eq('status', 'active')
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
    enabled: !!user?.organization_id,
  })

  const { data: invoices } = useQuery({
    queryKey: ['subscription-invoices', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data } = await supabase
        .from('subscription_invoices')
        .select('id, invoice_number, amount, currency, status, paid_at, billing_period_start, billing_period_end, pdf_url')
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false })
        .limit(10)
      return data ?? []
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer l'organisation
  const {
    data: organization,
    refetch: refetchOrg,
    isLoading: isLoadingOrg,
    isError: isErrorOrg,
    error: orgError
  } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) {
        logger.warn('⚠️ [ORG] Aucun organization_id pour l\'utilisateur', { userId: user?.id })
        return null
      }
      logger.debug('🔍 [ORG] Recherche de l\'organisation', { organizationId: user.organization_id })
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .maybeSingle()
      if (error) {
        logger.error('❌ [ORG] Erreur lors de la récupération', sanitizeError(error))
        throw error
      }
      if (!data) {
        logger.warn('⚠️ [ORG] Aucune organisation trouvée pour l\'ID', { organizationId: user.organization_id })
        return null
      }
      logger.debug('✅ [ORG] Organisation récupérée:', data)
      return data
    },
    enabled: !!user?.organization_id,
    retry: 2,
    refetchOnWindowFocus: true,
  })

  // Mettre à jour le formulaire quand organization change
  useEffect(() => {
    if (organization) {
      type OrgFormSource = {
        settings?: { postal_code?: string } | null
        name?: string; code?: string; type?: string; country?: string; currency?: string
        language?: string; address?: string; city?: string; phone?: string; email?: string
        logo_url?: string; qualiopi_certificate_url?: string; stamp_url?: string; signature_url?: string
        brand_color?: string; siret?: string; nda_number?: string
      }
      const o = organization as OrgFormSource
      const settings = (o.settings && typeof o.settings === 'object' ? o.settings : {}) as { postal_code?: string }
      setOrgFormData({
        name: o.name ?? '',
        code: o.code ?? '',
        type: o.type ?? '',
        country: o.country ?? '',
        currency: o.currency ?? 'EUR',
        language: o.language ?? 'fr',
        address: o.address ?? '',
        city: o.city ?? '',
        postal_code: settings.postal_code ?? '',
        phone: o.phone ?? '',
        email: o.email ?? '',
        logo_url: o.logo_url ?? '',
        qualiopi_certificate_url: o.qualiopi_certificate_url ?? '',
        stamp_url: o.stamp_url ?? '',
        signature_url: o.signature_url ?? '',
        brand_color: o.brand_color ?? '#335ACF',
        siret: o.siret ?? '',
        nda_number: o.nda_number ?? '',
      })
    }
  }, [organization])

  // Charger les paramètres utilisateur depuis localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNotifications = localStorage.getItem('notificationSettings')
      const savedGeneral = localStorage.getItem('generalSettings')
      
      if (savedNotifications) {
        try {
          setNotificationSettings(JSON.parse(savedNotifications))
        } catch (e) {
          logger.error('Error parsing notification settings:', e)
        }
      }
      if (savedGeneral) {
        try {
          setGeneralSettings(JSON.parse(savedGeneral))
        } catch (e) {
          logger.error('Error parsing general settings:', e)
        }
      }
    }
  }, [])

  // Mutation pour mettre à jour l'organisation
  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: typeof orgFormData) => {
      if (!user?.organization_id) throw new Error('No organization ID')
      
      // Récupérer d'abord l'organisation actuelle pour préserver les valeurs valides
      const { data: currentOrg, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .single()
      
      if (fetchError) throw fetchError
      
      // Filtrer uniquement les champs valides de la table organizations
      const validFields: Record<string, any> = {}
      
      // Champs directs de la table - ne mettre à jour que si la valeur a changé et est valide
      if (data.name && data.name.trim() && data.name.trim() !== currentOrg?.name) {
        validFields.name = data.name.trim()
      }
      if (data.code && data.code.trim() && data.code.trim() !== currentOrg?.code) {
        validFields.code = data.code.trim()
      }
      // Ne PAS mettre à jour type si la valeur est vide ou invalide
      // Le champ type a une contrainte CHECK qui n'accepte que certaines valeurs
      // On ne met à jour que si la valeur est différente ET non vide
      if (data.type && data.type.trim() && data.type.trim() !== currentOrg?.type) {
        validFields.type = data.type.trim()
      }
      if (data.country && data.country.trim() && data.country.trim() !== currentOrg?.country) {
        validFields.country = data.country.trim()
      }
      if (data.currency && data.currency.trim() && data.currency.trim() !== currentOrg?.currency) {
        validFields.currency = data.currency.trim()
      }
      if (data.language && data.language.trim() && data.language.trim() !== currentOrg?.language) {
        validFields.language = data.language.trim()
      }
      if (data.address !== undefined && data.address?.trim() !== currentOrg?.address) {
        validFields.address = data.address?.trim() || null
      }
      if (data.city !== undefined && data.city?.trim() !== currentOrg?.city) {
        validFields.city = data.city?.trim() || null
      }
      if (data.phone !== undefined && data.phone?.trim() !== currentOrg?.phone) {
        validFields.phone = data.phone?.trim() || null
      }
      if (data.email !== undefined && data.email?.trim() !== currentOrg?.email) {
        validFields.email = data.email?.trim() || null
      }
      if (data.logo_url !== undefined && data.logo_url !== currentOrg?.logo_url) {
        validFields.logo_url = data.logo_url || null
      }
      if (data.qualiopi_certificate_url !== undefined && data.qualiopi_certificate_url !== currentOrg?.qualiopi_certificate_url) {
        validFields.qualiopi_certificate_url = data.qualiopi_certificate_url || null
      }
      if (data.brand_color !== undefined && data.brand_color !== currentOrg?.brand_color) {
        validFields.brand_color = data.brand_color || '#335ACF'
      }
      if (data.stamp_url !== undefined && data.stamp_url !== (currentOrg as any)?.stamp_url) {
        validFields.stamp_url = data.stamp_url || null
      }
      if (data.signature_url !== undefined && data.signature_url !== (currentOrg as any)?.signature_url) {
        validFields.signature_url = data.signature_url || null
      }
      if (data.siret !== undefined && (data.siret?.trim() ?? '') !== ((currentOrg as any)?.siret ?? '')) {
        validFields.siret = data.siret?.trim() || null
      }
      if (data.nda_number !== undefined && (data.nda_number?.trim() ?? '') !== ((currentOrg as any)?.nda_number ?? '')) {
        validFields.nda_number = data.nda_number?.trim() || null
      }
      
      // postal_code n'existe pas dans la table, on le stocke dans settings
      if (data.postal_code !== undefined) {
        const currentSettings = (currentOrg?.settings as any) || {}
        const newPostalCode = data.postal_code?.trim() || null
        if (newPostalCode !== currentSettings.postal_code) {
          validFields.settings = {
            ...currentSettings,
            postal_code: newPostalCode,
          }
        }
      }
      
      // Si aucun champ à mettre à jour, retourner sans erreur
      if (Object.keys(validFields).length === 0) {
        return
      }
      
      const { error } = await supabase
        .from('organizations')
        .update(validFields)
        .eq('id', user.organization_id)
      
      if (error) {
        logger.error('❌ [UPDATE ORG] Erreur:', error)
        logger.error('❌ [UPDATE ORG] Champs envoyés:', validFields)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] })
      setIsEditing(false)
      setIsSaving(false)
      addToast({
        title: 'Succès',
        description: 'Les informations de l\'organisation ont été mises à jour',
        type: 'success',
      })
    },
    onError: (error: any) => {
      setIsSaving(false)
      addToast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la mise à jour',
        type: 'error',
      })
    },
  })

  const saveNotificationSettings = () => {
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings))
    addToast({
      title: 'Succès',
      description: 'Les paramètres de notifications ont été sauvegardés',
      type: 'success',
    })
  }

  const saveGeneralSettings = () => {
    localStorage.setItem('generalSettings', JSON.stringify(generalSettings))
    // S'assurer que la classe dark n'est jamais ajoutée
    document.documentElement.classList.remove('dark')
    addToast({
      title: 'Succès',
      description: 'Les paramètres généraux ont été sauvegardés',
      type: 'success',
    })
  }

  const handleSaveOrganization = () => {
    setIsSaving(true)
    updateOrganizationMutation.mutate(orgFormData)
  }

  // Fonction pour uploader le logo
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user?.organization_id) return

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      addToast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un fichier image',
        type: 'error',
      })
      return
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast({
        title: 'Erreur',
        description: 'Le fichier est trop volumineux (max 5MB)',
        type: 'error',
      })
      return
    }

    setLogoUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.organization_id}/logo.${fileExt}`
      
      // Supprimer l'ancien logo s'il existe
      if (orgFormData.logo_url) {
        const oldPath = orgFormData.logo_url.split('/').slice(-2).join('/')
        await supabase.storage.from('organizations').remove([oldPath])
      }

      // Uploader le nouveau logo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('organizations')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('organizations')
        .getPublicUrl(fileName)

      setOrgFormData({ ...orgFormData, logo_url: urlData.publicUrl })
      
      addToast({
        title: 'Succès',
        description: 'Logo téléchargé avec succès',
        type: 'success',
      })
    } catch (error: any) {
      logger.error('Erreur upload logo:', error)
      addToast({
        title: 'Erreur',
        description: error.message || 'Erreur lors du téléchargement du logo',
        type: 'error',
      })
    } finally {
      setLogoUploading(false)
    }
  }

  // Fonction pour uploader l'attestation Qualiopi
  const handleQualiopiUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user?.organization_id) return

    // Vérifier le type de fichier (PDF ou image)
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      addToast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un fichier PDF ou image',
        type: 'error',
      })
      return
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      addToast({
        title: 'Erreur',
        description: 'Le fichier est trop volumineux (max 10MB)',
        type: 'error',
      })
      return
    }

    setQualiopiUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.organization_id}/qualiopi.${fileExt}`
      
      // Supprimer l'ancienne attestation s'il existe
      if (orgFormData.qualiopi_certificate_url) {
        const oldPath = orgFormData.qualiopi_certificate_url.split('/').slice(-2).join('/')
        await supabase.storage.from('organizations').remove([oldPath])
      }

      // Uploader la nouvelle attestation
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('organizations')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('organizations')
        .getPublicUrl(fileName)

      setOrgFormData({ ...orgFormData, qualiopi_certificate_url: urlData.publicUrl })
      
      addToast({
        title: 'Succès',
        description: 'Attestation Qualiopi téléchargée avec succès',
        type: 'success',
      })
    } catch (error: any) {
      logger.error('Erreur upload Qualiopi:', error)
      addToast({
        title: 'Erreur',
        description: error.message || 'Erreur lors du téléchargement de l\'attestation',
        type: 'error',
      })
    } finally {
      setQualiopiUploading(false)
    }
  }

  // Fonction pour supprimer le logo
  const handleRemoveLogo = async () => {
    if (!orgFormData.logo_url || !user?.organization_id) return

    try {
      const path = orgFormData.logo_url.split('/').slice(-2).join('/')
      await supabase.storage.from('organizations').remove([path])
      setOrgFormData({ ...orgFormData, logo_url: '' })
      addToast({
        title: 'Succès',
        description: 'Logo supprimé',
        type: 'success',
      })
    } catch (error: any) {
      logger.error('Erreur suppression logo:', error)
      addToast({
        title: 'Erreur',
        description: 'Erreur lors de la suppression du logo',
        type: 'error',
      })
    }
  }

  // Fonction pour supprimer l'attestation Qualiopi
  const handleRemoveQualiopi = async () => {
    if (!orgFormData.qualiopi_certificate_url || !user?.organization_id) return

    try {
      const path = orgFormData.qualiopi_certificate_url.split('/').slice(-2).join('/')
      await supabase.storage.from('organizations').remove([path])
      setOrgFormData({ ...orgFormData, qualiopi_certificate_url: '' })
      addToast({
        title: 'Succès',
        description: 'Attestation Qualiopi supprimée',
        type: 'success',
      })
    } catch (error: any) {
      logger.error('Erreur suppression Qualiopi:', error)
      addToast({
        title: 'Erreur',
        description: 'Erreur lors de la suppression de l\'attestation',
        type: 'error',
      })
    }
  }

  // Une seule image : cachet + signature sur le même fichier (affiché dans la zone sig_of des documents)
  const handleStampSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user?.organization_id) return
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      addToast({ title: 'Erreur', description: 'Veuillez sélectionner une image (PNG, JPG)', type: 'error' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast({ title: 'Erreur', description: 'Le fichier est trop volumineux (max 5 Mo)', type: 'error' })
      return
    }
    setStampSignatureUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.organization_id}/stamp_signature.${fileExt}`
      const currentUrl = orgFormData.signature_url || orgFormData.stamp_url
      if (currentUrl) {
        const oldPath = currentUrl.split('/').slice(-2).join('/')
        await supabase.storage.from('organizations').remove([oldPath])
      }
      const { error: uploadError } = await supabase.storage.from('organizations').upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('organizations').getPublicUrl(fileName)
      const url = urlData.publicUrl
      setOrgFormData({ ...orgFormData, stamp_url: url, signature_url: url })
      addToast({ title: 'Succès', description: 'Cachet et signature enregistrés', type: 'success' })
    } catch (error: any) {
      logger.error('Erreur upload cachet/signature:', error)
      addToast({ title: 'Erreur', description: error.message || 'Erreur lors du téléchargement', type: 'error' })
    } finally {
      setStampSignatureUploading(false)
    }
  }

  const handleRemoveStampSignature = async () => {
    const currentUrl = orgFormData.signature_url || orgFormData.stamp_url
    if (!currentUrl || !user?.organization_id) return
    try {
      const path = currentUrl.split('/').slice(-2).join('/')
      await supabase.storage.from('organizations').remove([path])
      setOrgFormData({ ...orgFormData, stamp_url: '', signature_url: '' })
      addToast({ title: 'Succès', description: 'Cachet et signature supprimés', type: 'success' })
    } catch (error: any) {
      logger.error('Erreur suppression cachet/signature:', error)
      addToast({ title: 'Erreur', description: 'Erreur lors de la suppression', type: 'error' })
    }
  }

  // État pour gérer les sections collapsibles
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    principal: true,
    security: false,
    communications: false,
    payments: false,
    modules: false,
    compliance: false,
    developer: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Organisation des onglets par catégories
  const menuSections = [
    {
      id: 'principal',
      label: 'Principal',
      color: 'brand-blue',
      tabs: [
        { id: 'organization', label: 'Organisation', icon: Building2 },
        { id: 'billing', label: 'Abonnement', icon: CreditCard },
        { id: 'general', label: 'Général', icon: Globe },
      ]
    },
    {
      id: 'security',
      label: 'Utilisateurs & Sécurité',
      color: 'purple-600',
      tabs: [
        { id: 'profile', label: 'Mon profil', icon: User, href: '/dashboard/settings/profile' },
        { id: 'users', label: 'Utilisateurs', icon: Users, href: '/dashboard/settings/users' },
        { id: 'permissions', label: 'Permissions', icon: Shield },
        { id: 'security-page', label: 'Sécurité', icon: Key, href: '/dashboard/settings/security' },
      ]
    },
    {
      id: 'communications',
      label: 'Communications',
      color: 'orange-500',
      tabs: [
        { id: 'email-templates', label: 'Modèles d\'emails', icon: Mail, href: '/dashboard/settings/email-templates' },
        { id: 'email-schedules', label: 'Planification', icon: Clock, href: '/dashboard/settings/email-schedules' },
{ id: 'document-templates', label: 'Documents', icon: FileText, href: '/dashboard/settings/document-templates' },
      ]
    },
    {
      id: 'payments',
      label: 'Paiements & Finances',
      color: 'emerald-600',
      tabs: [
        { id: 'payment-reminders', label: 'Rappels', icon: Bell, href: '/dashboard/settings/payment-reminders' },
        { id: 'funding-types', label: 'Financements', icon: DollarSign, href: '/dashboard/settings/funding-types' },
        { id: 'charge-categories', label: 'Charges', icon: Receipt, href: '/dashboard/settings/charge-categories' },
        { id: 'accounting', label: 'Comptabilité', icon: Building2, href: '/dashboard/settings/accounting' },
      ]
    },
    {
      id: 'modules',
      label: 'Modules',
      color: 'brand-cyan',
      tabs: [
        { id: 'calendar', label: 'Calendrier', icon: Calendar, href: '/dashboard/settings/calendar' },
        { id: 'sites', label: 'Sites', icon: MapPin, href: '/dashboard/settings/sites' },
        { id: 'lms', label: 'LMS', icon: GraduationCap, href: '/dashboard/settings/lms' },
      ]
    },
    {
      id: 'compliance',
      label: 'Conformité & Réglementation',
      color: 'violet-600',
      tabs: [
        { id: 'qualiopi', label: 'Qualiopi', icon: Award, href: '/dashboard/qualiopi' },
        { id: 'qualiopi-check', label: 'Qualiopi Check', icon: ClipboardCheck, href: '/dashboard/qualiopi/check' },
        { id: 'accessibility', label: 'Accessibilité Handicap', icon: Accessibility, href: '/dashboard/accessibility' },
        { id: 'cpf', label: 'CPF', icon: GraduationCap, href: '/dashboard/cpf' },
        { id: 'certifications', label: 'Certifications RNCP/RS', icon: Award, href: '/dashboard/certifications' },
        { id: 'opco', label: 'OPCO', icon: Building2, href: '/dashboard/opco' },
        { id: 'gdpr', label: 'RGPD', icon: Lock, href: '/dashboard/gdpr' },
        { id: 'compliance-page', label: 'Conformité', icon: Shield, href: '/dashboard/compliance' },
        { id: 'exports', label: 'Historique exports', icon: FileDown, href: '/dashboard/admin/exports' },
      ]
    },
    {
      id: 'developer',
      label: 'Développeur',
      color: 'gray-600',
      tabs: [
        { id: 'api', label: 'Intégrations & API', icon: Plug, href: '/dashboard/integrations' },
      ]
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
  }

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      super_admin: 'Super Administrateur',
      admin: 'Administrateur',
      teacher: 'Enseignant',
      secretary: 'Secrétaire',
      accountant: 'Comptable',
      parent: 'Parent',
      student: 'Étudiant',
    }
    return roles[role] || role
  }

  if (!authLoading && user?.role === 'teacher') {
    return null
  }

  return (
    <motion.div
      className="space-y-8 pb-8 max-w-[1600px] mx-auto relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Animated background particles - effet subtil */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-brand-blue/15 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 0.4, 0],
              scale: [0, 1.2, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Hero Header Ultra-Premium avec gradient animé */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-[2rem] shadow-[0_20px_80px_-20px_rgba(51,90,207,0.4)]"
      >
        {/* Gradient de fond animé */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-cyan"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ backgroundSize: '200% 200%' }}
        />

        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: 'radial-gradient(at 40% 20%, rgba(255, 255, 255, 0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(52, 185, 238, 0.4) 0px, transparent 50%)',
        }} />

        {/* Floating orbs */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            x: [-10, 10, -10],
            transition: {
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"
        />

        {/* Contenu */}
        <div className="relative z-10 p-8 md:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="flex items-center gap-4"
          >
            <motion.div
              className="p-4 bg-white/15 backdrop-blur-md rounded-2xl shadow-xl border border-white/20"
              whileHover={{ scale: 1.15, rotate: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Settings className="h-8 w-8 text-white drop-shadow-lg" />
            </motion.div>
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tighter leading-none drop-shadow-2xl">
                Paramètres
              </h1>
              <p className="text-white/95 text-lg font-medium tracking-tight drop-shadow-lg mt-1">
                Configuration générale de votre établissement
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Menu latéral Premium */}
        <motion.div variants={itemVariants} className="lg:col-span-3 space-y-6">
          <GlassCard variant="premium" className="relative overflow-hidden p-6 border-2 border-gray-100/50 hover:border-brand-blue/20 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]">
            {/* Subtle gradient overlay */}
            <motion.div
              className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-blue/5 to-transparent rounded-full blur-2xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            <div className="relative z-10 space-y-2">
              {menuSections.map((section) => {
                const isExpanded = expandedSections[section.id]
                const sectionHasActiveTab = section.tabs.some(tab => activeTab === tab.id)

                return (
                  <div key={section.id} className="space-y-1">
                    {/* Section Header */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200",
                        sectionHasActiveTab
                          ? "text-brand-blue bg-brand-blue/5"
                          : "text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-1 h-4 rounded-full transition-colors",
                          sectionHasActiveTab ? `bg-${section.color}` : "bg-gray-300",
                          section.color === 'brand-blue' && "bg-brand-blue",
                          section.color === 'purple-600' && "bg-purple-600",
                          section.color === 'orange-500' && "bg-orange-500",
                          section.color === 'emerald-600' && "bg-emerald-600",
                          section.color === 'brand-cyan' && "bg-brand-cyan",
                          section.color === 'gray-600' && "bg-gray-600",
                        )} />
                        {section.label}
                        <span className="text-[10px] font-normal normal-case text-gray-400">
                          ({section.tabs.length})
                        </span>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </motion.div>
                    </button>

                    {/* Section Content */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-1 pl-2">
                            {section.tabs.map((tab) => {
                              const Icon = tab.icon
                              const isActive = activeTab === tab.id

                              if (tab.href) {
                                return (
                                  <motion.div
                                    key={tab.id}
                                    whileHover={{ x: isActive ? 0 : 4 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                  >
                                    <Link
                                      href={tab.href}
                                      className={cn(
                                        "flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 group relative overflow-hidden",
                                        isActive
                                          ? "bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white shadow-md"
                                          : "text-gray-600 hover:bg-gray-50 hover:text-brand-blue"
                                      )}
                                    >
                                      <div className="flex items-center gap-3 relative z-10">
                                        <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-white" : "text-gray-400 group-hover:text-brand-blue")} />
                                        {tab.label}
                                      </div>
                                      {!isActive && (
                                        <ChevronRight className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-all" />
                                      )}
                                    </Link>
                                  </motion.div>
                                )
                              }

                              return (
                                <motion.div
                                  key={tab.id}
                                  whileHover={{ x: isActive ? 0 : 4 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                >
                                  <button
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                      "w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 group relative overflow-hidden",
                                      isActive
                                        ? "bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white shadow-md"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-brand-blue"
                                    )}
                                  >
                                    <div className="flex items-center gap-3 relative z-10">
                                      <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-white" : "text-gray-400 group-hover:text-brand-blue")} />
                                      {tab.label}
                                    </div>
                                    {!isActive && (
                                      <ChevronRight className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-all" />
                                    )}
                                  </button>
                                </motion.div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* Contenu Principal */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            {activeTab === 'organization' && (
              <motion.div
                key="organization"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <GlassCard variant="premium" className="relative overflow-hidden p-8 border-2 border-gray-100/50 hover:border-brand-blue/20 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]">
                  {/* Shine effect on hover */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
                    initial={{ x: '-100%', y: '-100%' }}
                    whileHover={{ x: '100%', y: '100%' }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    style={{
                      background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
                    }}
                  />

                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                      <motion.div
                        className="p-3 bg-gradient-to-br from-brand-blue to-brand-blue-dark rounded-2xl shadow-xl"
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      >
                        <Building2 className="h-6 w-6 text-white drop-shadow-lg" />
                      </motion.div>
                      <div>
                        <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Informations de l'organisation</h2>
                        <p className="text-gray-600 font-semibold tracking-tight">Gérez les informations de base de votre établissement</p>
                      </div>
                    </div>
                    {!isEditing ? (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <Button
                          onClick={() => {
                            if (organization) {
                              const settings = ((organization as any).settings as any) || {}
                              setOrgFormData({
                                name: (organization as any).name ?? '',
                                code: (organization as any).code ?? '',
                                type: (organization as any).type ?? '',
                                country: (organization as any).country ?? '',
                                currency: (organization as any).currency ?? 'EUR',
                                language: (organization as any).language ?? 'fr',
                                address: (organization as any).address ?? '',
                                city: (organization as any).city ?? '',
                                postal_code: settings.postal_code ?? '',
                                phone: (organization as any).phone ?? '',
                                email: (organization as any).email ?? '',
                                logo_url: (organization as any).logo_url ?? '',
                                qualiopi_certificate_url: (organization as any).qualiopi_certificate_url ?? '',
                                stamp_url: (organization as any).stamp_url ?? '',
                                signature_url: (organization as any).signature_url ?? '',
                                brand_color: (organization as any).brand_color ?? '#335ACF',
                                siret: (organization as any).siret ?? '',
                                nda_number: (organization as any).nda_number ?? '',
                              })
                            }
                            setIsEditing(true)
                          }}
                          variant="outline"
                          className="group relative overflow-hidden border-2 border-brand-blue/20 hover:border-brand-blue shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-blue/10 to-transparent"
                            initial={{ x: '-100%' }}
                            whileHover={{ x: '100%' }}
                            transition={{ duration: 0.6 }}
                          />
                          <span className="relative z-10">Modifier</span>
                        </Button>
                      </motion.div>
                    ) : (
                      <div className="flex gap-3">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            onClick={() => {
                              setIsEditing(false)
                              if (organization) {
                                const settings = ((organization as any).settings as any) || {}
                                setOrgFormData({
                                  name: (organization as any).name ?? '',
                                  code: (organization as any).code ?? '',
                                  type: (organization as any).type ?? '',
                                  country: (organization as any).country ?? '',
                                  currency: (organization as any).currency ?? 'EUR',
                                  language: (organization as any).language ?? 'fr',
                                  address: (organization as any).address ?? '',
                                  city: (organization as any).city ?? '',
                                  postal_code: settings.postal_code ?? '',
                                  phone: (organization as any).phone ?? '',
                                  email: (organization as any).email ?? '',
                                  logo_url: (organization as any).logo_url ?? '',
                                  qualiopi_certificate_url: (organization as any).qualiopi_certificate_url ?? '',
                                  stamp_url: (organization as any).stamp_url ?? '',
                                  signature_url: (organization as any).signature_url ?? '',
                                  brand_color: (organization as any).brand_color ?? '#335ACF',
                                  siret: (organization as any).siret ?? '',
                                  nda_number: (organization as any).nda_number ?? '',
                                })
                              }
                            }}
                            variant="ghost"
                            className="hover:bg-gray-100 transition-colors"
                          >
                            Annuler
                          </Button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            onClick={handleSaveOrganization}
                            disabled={isSaving}
                            className="group relative overflow-hidden bg-gradient-to-r from-brand-blue to-brand-blue-dark shadow-lg shadow-brand-blue/30 hover:shadow-xl hover:shadow-brand-blue/40 transition-all duration-300"
                          >
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                              initial={{ x: '-100%' }}
                              animate={isSaving ? {} : { x: ['−100%', '100%'] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                            <span className="relative z-10">{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
                          </Button>
                        </motion.div>
                      </div>
                    )}
                    </div>

                    {isLoadingOrg && (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mb-4"></div>
                          <p className="text-gray-500">Chargement des informations de l'organisation...</p>
                        </div>
                      </div>
                    )}

                    {isErrorOrg && (
                      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <Settings className="h-5 w-5 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-red-900 mb-1">Erreur de chargement</h3>
                            <p className="text-sm text-red-700 mb-4">
                              {orgError instanceof Error ? orgError.message : 'Impossible de charger les informations de l\'organisation'}
                            </p>
                            <Button 
                              onClick={() => refetchOrg()} 
                              variant="outline" 
                              size="sm"
                              className="border-red-300 text-red-700 hover:bg-red-100"
                            >
                              Réessayer
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {(authLoading || isLoadingOrg) && (
                      <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          <p className="text-sm text-blue-700">Chargement des informations...</p>
                        </div>
                      </div>
                    )}
                    {!authLoading && !isLoadingOrg && !isErrorOrg && !organization && user && (
                      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-yellow-100 rounded-lg">
                            <Building2 className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-yellow-900 mb-1">Aucune organisation trouvée</h3>
                            <p className="text-sm text-yellow-700">
                              {user.organization_id 
                                ? `Aucune organisation trouvée pour l'ID: ${user.organization_id}. Veuillez contacter un administrateur.`
                                : "Aucune organisation n'est associée à votre compte. Veuillez contacter un administrateur."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {!authLoading && !user && (
                      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <Building2 className="h-5 w-5 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-red-900 mb-1">Utilisateur non authentifié</h3>
                            <p className="text-sm text-red-700">
                              Vous devez être connecté pour accéder à cette page.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isLoadingOrg && !isErrorOrg && organization && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Nom de l'organisation</Label>
                          <Input
                            value={orgFormData.name ?? ''}
                            onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                            disabled={!isEditing}
                            className="bg-gray-50/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Code établissement</Label>
                          <Input
                            value={orgFormData.code ?? ''}
                            onChange={(e) => setOrgFormData({ ...orgFormData, code: e.target.value })}
                            disabled={!isEditing}
                            className="bg-gray-50/50"
                          />
                        </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>SIRET</Label>
                          <Input
                            value={orgFormData.siret ?? ''}
                            onChange={(e) => setOrgFormData({ ...orgFormData, siret: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                            disabled={!isEditing}
                            placeholder="14 chiffres"
                            maxLength={14}
                            className="bg-gray-50/50 font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Numéro de déclaration d'activité</Label>
                          <Input
                            value={orgFormData.nda_number ?? ''}
                            onChange={(e) => setOrgFormData({ ...orgFormData, nda_number: e.target.value })}
                            disabled={!isEditing}
                            placeholder="Numéro attribué par la préfecture / DIRECCTE"
                            className="bg-gray-50/50"
                          />
                        </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Input
                            value={orgFormData.type ?? ''}
                            onChange={(e) => setOrgFormData({ ...orgFormData, type: e.target.value })}
                            disabled={!isEditing}
                            placeholder="École, Université..."
                            className="bg-gray-50/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Pays</Label>
                          <Input
                            value={orgFormData.country ?? ''}
                            onChange={(e) => setOrgFormData({ ...orgFormData, country: e.target.value })}
                            disabled={!isEditing}
                            className="bg-gray-50/50"
                          />
                        </div>
                        </div>

                      <div className="space-y-2">
                          <Label>Adresse</Label>
                          <Textarea
                            value={orgFormData.address ?? ''}
                            onChange={(e) => setOrgFormData({ ...orgFormData, address: e.target.value })}
                            disabled={!isEditing}
                          className="bg-gray-50/50 min-h-[80px]"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label>Ville</Label>
                          <Input
                            value={orgFormData.city ?? ''}
                            onChange={(e) => setOrgFormData({ ...orgFormData, city: e.target.value })}
                            disabled={!isEditing}
                            className="bg-gray-50/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Code postal</Label>
                          <Input
                            value={orgFormData.postal_code ?? ''}
                            onChange={(e) => setOrgFormData({ ...orgFormData, postal_code: e.target.value })}
                            disabled={!isEditing}
                            className="bg-gray-50/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Téléphone</Label>
                          <Input
                            value={orgFormData.phone ?? ''}
                            onChange={(e) => setOrgFormData({ ...orgFormData, phone: e.target.value })}
                            disabled={!isEditing}
                            className="bg-gray-50/50"
                          />
                        </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label>Email de contact</Label>
                          <Input
                            value={orgFormData.email ?? ''}
                            onChange={(e) => setOrgFormData({ ...orgFormData, email: e.target.value })}
                            disabled={!isEditing}
                            className="bg-gray-50/50"
                          />
                        </div>
                        <div className="space-y-2">
                            <Label>Devise</Label>
                            <select
                              value={orgFormData.currency ?? 'EUR'}
                              onChange={(e) => setOrgFormData({ ...orgFormData, currency: e.target.value })}
                              disabled={!isEditing}
                            className="w-full px-3 py-2 bg-gray-50/50 border border-input rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="EUR">EUR (€)</option>
                              <option value="USD">USD ($)</option>
                              <option value="GBP">GBP (£)</option>
                              <option value="XOF">XOF (CFA)</option>
                            </select>
                          </div>
                        <div className="space-y-2">
                          <Label>Langue par défaut</Label>
                            <select
                              value={orgFormData.language ?? 'fr'}
                              onChange={(e) => setOrgFormData({ ...orgFormData, language: e.target.value })}
                              disabled={!isEditing}
                            className="w-full px-3 py-2 bg-gray-50/50 border border-input rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="fr">Français</option>
                              <option value="en">English</option>
                              <option value="pt">Português</option>
                            </select>
                              </div>
                            </div>

                        {/* Section Branding */}
                        <motion.div
                          className="pt-8 border-t border-gray-200"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <motion.div
                              className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-xl"
                              whileHover={{ rotate: 10, scale: 1.1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            >
                              <Palette className="h-5 w-5 text-white drop-shadow-lg" />
                            </motion.div>
                            <div>
                              <h3 className="text-xl font-display font-bold text-gray-900 tracking-tight">Personnalisation des documents</h3>
                              <p className="text-sm text-gray-600 font-semibold">Configurez l'identité visuelle de vos documents</p>
                            </div>
                          </div>
                          
                          <div className="space-y-6">
                            {/* Logo de l'organisation */}
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" aria-hidden />
                                Logo de l'organisation
                              </Label>
                              <div className="flex items-center gap-4">
                                {orgFormData.logo_url ? (
                                  <div className="relative">
                                    <img 
                                      src={orgFormData.logo_url} 
                                      alt="Logo" 
                                      className="h-20 w-auto object-contain border border-gray-200 rounded-lg p-2 bg-white"
                                    />
                                    {isEditing && (
                                      <button
                                        onClick={handleRemoveLogo}
                                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                        type="button"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-20 w-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                                    Aucun logo
                                  </div>
                                )}
                                {isEditing && (
                                  <div>
                                    <input
                                      ref={logoInputRef}
                                      type="file"
                                      accept="image/*"
                                      onChange={handleLogoUpload}
                                      disabled={logoUploading}
                                      className="hidden"
                                      id="logo-upload"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={logoUploading}
                                      className="cursor-pointer"
                                      onClick={() => logoInputRef.current?.click()}
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      {logoUploading ? 'Téléchargement...' : orgFormData.logo_url ? 'Remplacer' : 'Télécharger'}
                                    </Button>
                                    <p className="text-xs text-gray-500 mt-1">PNG, JPG max 5MB</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Attestation Qualiopi */}
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Award className="h-4 w-4" />
                                Attestation Qualiopi
                              </Label>
                              <div className="flex items-center gap-4">
                                {orgFormData.qualiopi_certificate_url ? (
                                  <div className="relative">
                                    <a
                                      href={orgFormData.qualiopi_certificate_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block"
                                    >
                                      <div className="h-20 w-32 border border-gray-200 rounded-lg p-2 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors">
                                        <FileText className="h-8 w-8 text-gray-400" />
                                      </div>
                                    </a>
                                    {isEditing && (
                                      <button
                                        onClick={handleRemoveQualiopi}
                                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                        type="button"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-20 w-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                                    Aucune attestation
                                  </div>
                                )}
                                {isEditing && (
                                  <div>
                                    <input
                                      ref={qualiopiInputRef}
                                      type="file"
                                      accept=".pdf,image/*"
                                      onChange={handleQualiopiUpload}
                                      disabled={qualiopiUploading}
                                      className="hidden"
                                      id="qualiopi-upload"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={qualiopiUploading}
                                      className="cursor-pointer"
                                      onClick={() => qualiopiInputRef.current?.click()}
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      {qualiopiUploading ? 'Téléchargement...' : orgFormData.qualiopi_certificate_url ? 'Remplacer' : 'Télécharger'}
                                    </Button>
                                    <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG max 10MB</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Cachet et signature de l'organisme (une seule image) */}
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <FileSignature className="h-4 w-4" />
                                Cachet et signature de l'organisme
                              </Label>
                              <p className="text-xs text-gray-500">Une seule image contenant le cachet et la signature. Elle sera placée automatiquement dans la zone prévue sur les documents à signer par les deux parties (conventions, contrats).</p>
                              <div className="flex items-center gap-4">
                                {(orgFormData.signature_url || orgFormData.stamp_url) ? (
                                  <div className="relative">
                                    <img
                                      src={orgFormData.signature_url || orgFormData.stamp_url}
                                      alt="Cachet et signature"
                                      className="h-20 w-32 object-contain border border-gray-200 rounded-lg p-2 bg-white"
                                    />
                                    {isEditing && (
                                      <button
                                        onClick={handleRemoveStampSignature}
                                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                        type="button"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-20 w-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                                    Aucune image
                                  </div>
                                )}
                                {isEditing && (
                                  <div>
                                    <input
                                      ref={stampSignatureInputRef}
                                      type="file"
                                      accept="image/png,image/jpeg,image/jpg"
                                      onChange={handleStampSignatureUpload}
                                      disabled={stampSignatureUploading}
                                      className="hidden"
                                      id="stamp-signature-upload"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={stampSignatureUploading}
                                      className="cursor-pointer"
                                      onClick={() => stampSignatureInputRef.current?.click()}
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      {stampSignatureUploading ? 'Téléchargement...' : (orgFormData.signature_url || orgFormData.stamp_url) ? 'Remplacer' : 'Télécharger'}
                                    </Button>
                                    <p className="text-xs text-gray-500 mt-1">PNG, JPG max 5 Mo — une image avec cachet + signature</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Couleur de personnalisation */}
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Palette className="h-4 w-4" />
                                Couleur de personnalisation
                              </Label>
                              <div className="flex items-center gap-4">
                                <input
                                  type="color"
                                  value={orgFormData.brand_color || '#335ACF'}
                                  onChange={(e) => setOrgFormData({ ...orgFormData, brand_color: e.target.value || '#335ACF' })}
                                  disabled={!isEditing}
                                  className="h-12 w-24 rounded-lg border border-gray-300 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <Input
                                  type="text"
                                  value={orgFormData.brand_color}
                                  onChange={(e) => setOrgFormData({ ...orgFormData, brand_color: e.target.value })}
                                  disabled={!isEditing}
                                  className="bg-gray-50/50 w-32"
                                  placeholder="#335ACF"
                                />
                                <div 
                                  className="h-12 w-12 rounded-lg border border-gray-300"
                                  style={{ backgroundColor: orgFormData.brand_color || '#335ACF' }}
                                />
                              </div>
                              <p className="text-xs text-gray-500">Cette couleur sera utilisée pour personnaliser vos documents</p>
                            </div>
                          </div>
                        </motion.div>
                          </div>
                        )}
                </GlassCard>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <GlassCard variant="premium" className="p-8">
                  <div className="flex items-center justify-between mb-8">
                      <div>
                      <h2 className="text-2xl font-bold text-gray-900">Préférences de notifications</h2>
                      <p className="text-gray-500">Configurez comment et quand vous recevez des alertes</p>
                      </div>
                    <Button onClick={saveNotificationSettings} className="shadow-lg shadow-brand-blue/20">
                        Enregistrer
                      </Button>
                    </div>

                  <div className="space-y-8">
                      <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                        <div className="p-1.5 bg-brand-blue-ghost rounded-lg">
                          <Bell className="h-4 w-4 text-brand-blue" />
                        </div>
                          Canaux de notification
                        </h3>
                      <div className="grid gap-4">
                        {[
                          { label: 'Email', desc: 'Recevoir par email', key: 'emailNotifications', icon: Mail },
                          { label: 'Push', desc: 'Notifications navigateur', key: 'pushNotifications', icon: Bell },
                          { label: 'SMS', desc: 'Recevoir par SMS', key: 'smsNotifications', icon: Phone },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-white hover:shadow-md transition-all duration-300">
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                                <item.icon className="h-5 w-5" />
                              </div>
                              <div>
                                <Label className="text-base font-medium text-gray-900">{item.label}</Label>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                              </div>
                            </div>
                            <Switch
                              checked={notificationSettings[item.key as keyof typeof notificationSettings]}
                              onCheckedChange={(checked) => 
                                setNotificationSettings({ ...notificationSettings, [item.key]: checked })
                              }
                            />
                          </div>
                        ))}
                        </div>
                      </div>

                    <div className="space-y-4 pt-6 border-t border-gray-100">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                        <div className="p-1.5 bg-purple-50 rounded-lg">
                          <Settings className="h-4 w-4 text-purple-600" />
                        </div>
                        Types d'alertes
                        </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { label: 'Factures', desc: 'Rappels de facturation', key: 'invoiceReminders' },
                          { label: 'Paiements', desc: 'Retards de paiement', key: 'paymentReminders' },
                          { label: 'Présence', desc: 'Absences et retards', key: 'attendanceAlerts' },
                          { label: 'Documents', desc: 'Génération de docs', key: 'documentGenerated' },
                          { label: 'Rapports', desc: 'Résumé hebdomadaire', key: 'weeklyReports' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-white hover:shadow-md transition-all duration-300">
                            <div>
                              <Label className="text-base font-medium text-gray-900">{item.label}</Label>
                              <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                            <Switch
                              checked={notificationSettings[item.key as keyof typeof notificationSettings]}
                              onCheckedChange={(checked) => 
                                setNotificationSettings({ ...notificationSettings, [item.key]: checked })
                              }
                            />
                          </div>
                        ))}
                            </div>
                          </div>
                            </div>
                </GlassCard>
              </motion.div>
            )}

            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <GlassCard variant="premium" className="p-8">
                  <div className="flex items-center justify-between mb-8">
                      <div>
                      <h2 className="text-2xl font-bold text-gray-900">Paramètres généraux</h2>
                      <p className="text-gray-500">Personnalisez votre expérience</p>
                      </div>
                    <Button onClick={saveGeneralSettings} className="shadow-lg shadow-brand-blue/20">
                        Enregistrer
                      </Button>
                    </div>

                  <div className="space-y-8">
                      <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                        <div className="p-1.5 bg-orange-50 rounded-lg">
                          <Globe className="h-4 w-4 text-orange-600" />
                            </div>
                        Localisation & Affichage
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Thème supprimé - Application en mode clair uniquement */}
                        <div className="space-y-2">
                            <Label>Langue</Label>
                            <select
                              value={generalSettings.language}
                              onChange={(e) => setGeneralSettings({ ...generalSettings, language: e.target.value })}
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                          >
                            <option value="fr">Français 🇫🇷</option>
                            <option value="en">English 🇬🇧</option>
                            <option value="pt">Português 🇵🇹</option>
                            </select>
                          </div>
                        <div className="space-y-2">
                            <Label>Format de date</Label>
                            <select
                              value={generalSettings.dateFormat}
                              onChange={(e) => setGeneralSettings({ ...generalSettings, dateFormat: e.target.value })}
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                            >
                              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            </select>
                          </div>
                        <div className="space-y-2">
                          <Label>Fuseau horaire</Label>
                            <select
                            value={generalSettings.timezone}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                          >
                            <option value="Europe/Paris">Europe/Paris</option>
                            <option value="Europe/London">Europe/London</option>
                            <option value="America/New_York">America/New_York</option>
                            <option value="Africa/Abidjan">Africa/Abidjan</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                </GlassCard>
              </motion.div>
            )}

            {activeTab === 'billing' && (
              <motion.div
                key="billing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <GlassCard variant="premium" className="relative overflow-hidden p-8 border-2 border-gray-100/50 hover:border-brand-blue/20 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]">
                  <div className="mb-8 flex items-center gap-4">
                    <motion.div
                      className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl"
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <CreditCard className="h-6 w-6 text-white drop-shadow-lg" />
                    </motion.div>
                    <div>
                      <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Abonnement & Facturation</h2>
                      <p className="text-gray-600 font-semibold tracking-tight">Gérez votre plan et accédez à vos factures</p>
                    </div>
                  </div>

                  {organization && (
                    <div className="space-y-8">
                      <motion.div
                        className="p-8 bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-cyan rounded-2xl text-white shadow-xl shadow-brand-blue/30 relative overflow-hidden"
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        {/* Animated gradient overlay */}
                        <motion.div
                          className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 0.8, 0.5],
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />

                        {/* Floating orb */}
                        <motion.div
                          className="absolute bottom-0 left-0 w-48 h-48 bg-brand-cyan/20 rounded-full blur-3xl"
                          animate={{
                            y: [0, -20, 0],
                            x: [0, 20, 0],
                          }}
                          transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />

                        {(() => {
                          const plan = subscriptionData
                            ? (Array.isArray((subscriptionData as any).subscription_plans)
                                ? (subscriptionData as any).subscription_plans[0]
                                : (subscriptionData as any).subscription_plans)
                            : null
                          const renewalDate = subscriptionData?.current_period_end
                            ? new Date(subscriptionData.current_period_end).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            : null
                          const planFeatures: string[] = Array.isArray(plan?.features)
                            ? plan.features as string[]
                            : plan?.features && typeof plan.features === 'object'
                              ? Object.values(plan.features as Record<string, string>)
                              : []
                          const tierLabel = plan?.name
                            ?? (organization.subscription_tier === 'free' ? 'Gratuit'
                              : organization.subscription_tier === 'starter' ? 'Starter'
                              : organization.subscription_tier === 'professional' ? 'Professionnel'
                              : organization.subscription_tier === 'enterprise' ? 'Enterprise'
                              : organization.subscription_tier ?? 'Gratuit')

                          return (
                            <>
                              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                  <div className="flex items-center gap-3 mb-3">
                                    <motion.span
                                      className="text-sm font-bold bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/30 shadow-lg"
                                      whileHover={{ scale: 1.05 }}
                                    >
                                      Plan Actuel
                                    </motion.span>
                                    {(organization.subscription_status === 'active' || subscriptionData?.status === 'active') && (
                                      <motion.span
                                        className="flex items-center gap-2 text-sm font-bold text-emerald-300 bg-emerald-900/40 px-4 py-1.5 rounded-full backdrop-blur-sm border border-emerald-400/40 shadow-lg"
                                        whileHover={{ scale: 1.05 }}
                                      >
                                        <motion.span
                                          className="w-2 h-2 rounded-full bg-emerald-400"
                                          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                        Actif
                                      </motion.span>
                                    )}
                                    {subscriptionData?.billing_cycle && (
                                      <span className="text-xs bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20 text-white/80">
                                        {subscriptionData.billing_cycle === 'yearly' ? 'Annuel' : 'Mensuel'}
                                      </span>
                                    )}
                                  </div>
                                  <motion.h3
                                    className="text-5xl font-display font-bold mb-2 tracking-tight drop-shadow-lg"
                                    whileHover={{ scale: 1.02 }}
                                  >
                                    {tierLabel}
                                  </motion.h3>
                                  {renewalDate ? (
                                    <p className="text-white/90 font-semibold drop-shadow-md">Renouvellement le {renewalDate}</p>
                                  ) : (
                                    <p className="text-white/60 font-medium drop-shadow-md text-sm">Aucun renouvellement planifié</p>
                                  )}
                                </div>

                                <div className="flex flex-col gap-3 w-full md:w-auto">
                                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
                                    <Button className="group relative overflow-hidden bg-white text-brand-blue hover:bg-white shadow-xl hover:shadow-2xl border-0 w-full md:w-auto font-bold">
                                      <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-blue/10 to-transparent"
                                        initial={{ x: '-100%' }}
                                        whileHover={{ x: '100%' }}
                                        transition={{ duration: 0.6 }}
                                      />
                                      <span className="relative z-10">Changer de plan</span>
                                    </Button>
                                  </motion.div>
                                </div>
                              </div>

                              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Fonctionnalités du plan */}
                                <div className="p-6 border border-gray-100 rounded-xl bg-gray-50/50">
                                  <h4 className="font-semibold text-gray-900 mb-4">Inclus dans votre offre</h4>
                                  {planFeatures.length > 0 ? (
                                    <ul className="space-y-3 text-sm text-gray-600">
                                      {planFeatures.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                          <Shield className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                          <span>{feature}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <ul className="space-y-3 text-sm text-gray-600">
                                      {plan?.max_users && (
                                        <li className="flex items-center gap-2">
                                          <Users className="h-4 w-4 text-emerald-600" />
                                          <span>{plan.max_users === -1 ? 'Utilisateurs illimités' : `${plan.max_users} utilisateurs max`}</span>
                                        </li>
                                      )}
                                      {plan?.max_students && (
                                        <li className="flex items-center gap-2">
                                          <GraduationCap className="h-4 w-4 text-emerald-600" />
                                          <span>{plan.max_students === -1 ? 'Apprenants illimités' : `${plan.max_students} apprenants max`}</span>
                                        </li>
                                      )}
                                      {plan?.max_storage_gb && (
                                        <li className="flex items-center gap-2">
                                          <Globe className="h-4 w-4 text-emerald-600" />
                                          <span>{plan.max_storage_gb} Go de stockage</span>
                                        </li>
                                      )}
                                      {!plan && (
                                        <li className="text-gray-400 text-sm italic">Aucune information disponible</li>
                                      )}
                                    </ul>
                                  )}
                                </div>

                                {/* Historique des factures */}
                                <div className="p-6 border border-gray-100 rounded-xl bg-gray-50/50">
                                  <h4 className="font-semibold text-gray-900 mb-4">Historique des factures</h4>
                                  {invoices && invoices.length > 0 ? (
                                    <ul className="space-y-2 text-sm">
                                      {invoices.map((inv) => (
                                        <li key={inv.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                                          <div className="flex flex-col">
                                            <span className="font-medium text-gray-800">{inv.invoice_number}</span>
                                            <span className="text-xs text-gray-400">
                                              {inv.billing_period_start
                                                ? new Date(inv.billing_period_start).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
                                                : inv.paid_at
                                                  ? new Date(inv.paid_at).toLocaleDateString('fr-FR')
                                                  : '—'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <span className="font-semibold text-gray-900">
                                              {(inv.amount / 100).toLocaleString('fr-FR', { style: 'currency', currency: inv.currency?.toUpperCase() ?? 'EUR' })}
                                            </span>
                                            <span className={cn(
                                              'text-xs px-2 py-0.5 rounded-full font-medium',
                                              inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'
                                            )}>
                                              {inv.status === 'paid' ? 'Payée' : inv.status}
                                            </span>
                                            {inv.pdf_url && (
                                              <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline text-xs">
                                                PDF
                                              </a>
                                            )}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-sm text-gray-400 italic">Aucune facture disponible</p>
                                  )}
                                </div>
                              </div>
                            </>
                          )
                        })()}
                      </motion.div>
                          </div>
                        )}
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
                      </div>
                    </div>
    </motion.div>
  )
}

