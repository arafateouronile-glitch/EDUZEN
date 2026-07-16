'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { formationService } from '@/lib/services/formation.service.client'
import { programService } from '@/lib/services/program.service.client'
import { sessionService } from '@/lib/services/session.service.client'
import { Button } from '@/components/ui/button'
import { CardTitle } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { MultiSelect } from '@/components/ui/multi-select'
import { 
  ArrowLeft, 
  Save, 
  BookOpen, 
  Calendar, 
  Clock, 
  DollarSign, 
  Users, 
  FileText, 
  Check, 
  GraduationCap, 
  Target, 
  List, 
  Award, 
  Shield, 
  Globe, 
  AlertCircle,
  Sparkles,
  ChevronRight,
  Search,
  ArrowRight,
  FilePlus2
} from 'lucide-react'
import Link from 'next/link'
import { formationSchema, type FormationFormData } from '@/lib/validations/schemas'
import { CategorySelect } from '@/components/ui/category-select'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { logger, sanitizeError } from '@/lib/utils/logger'

type Formation = TableRow<'formations'>

const BLANK_FORMATION_DEFAULTS: FormationFormData = {
  // Informations de base
  program_id: '',
  code: '',
  name: '',
  subtitle: '',
  photo_url: '',
  category: '',
  description: '',

  // Version
  program_version: '',
  version_date: '',

  // Durée
  duration_hours: '',
  duration_days: '',
  duration_unit: 'hours',

  // Tarification
  price: '',
  currency: 'EUR',
  payment_plan: 'full',

  // Public cible
  prerequisites: '',
  capacity_max: '',
  age_min: '',
  age_max: '',

  // Catalogue et CPF
  published_online: false,
  eligible_cpf: false,
  cpf_code: '',

  // Formation
  modalities: '',
  training_action_type: '',
  pedagogical_objectives: '',
  learner_profile: '',
  training_content: '',
  execution_follow_up: '',
  certification_modalities: '',

  // Qualité et comptabilité
  quality: '',
  accounting_product_config: '',
  edof_export_fields: '',
  competence_domains: '',

  // Certification
  certification_issued: false,
  is_active: true,
}

export default function NewFormationPage() {
  const router = useRouter()
  const { user, isLoading: userLoading } = useAuth()
  const [selectedSessions, setSelectedSessions] = useState<string[]>([])

  // Étape préalable : choisir un programme existant pour pré-remplir la formation,
  // ou passer directement au formulaire vierge.
  const [step, setStep] = useState<'pick' | 'form'>('pick')
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [pickerSearch, setPickerSearch] = useState('')

  // Récupérer les programmes pour la sélection
  const { data: programs } = useQuery({
    queryKey: ['programs', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const result = await programService.getAllPrograms(user.organization_id, { isActive: true })
      return Array.isArray(result) ? result : result.data
    },
    enabled: !!user?.organization_id && !userLoading,
  })

  // Détails complets du programme choisi, pour pré-remplir le formulaire
  const { data: selectedProgram, isFetching: isLoadingProgramPrefill } = useQuery({
    queryKey: ['program-prefill', selectedProgramId],
    queryFn: () => programService.getProgramById(selectedProgramId),
    enabled: !!selectedProgramId,
  })

  // Codes déjà utilisés, pour suggérer un code interne libre au moment du pré-remplissage —
  // sans ça le code (obligatoire) reste vide après un pré-remplissage depuis un programme et
  // "Créer la formation" ne fait rien de visible (erreur de validation loin du bouton).
  const { data: existingFormationCodes } = useQuery({
    queryKey: ['formation-codes', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const result = await formationService.getAllFormations(user.organization_id)
      const formations = Array.isArray(result) ? result : (result as any).data
      return (formations ?? []).map((f: any) => f.code).filter(Boolean) as string[]
    },
    enabled: !!user?.organization_id,
  })

  const suggestNextCode = () => {
    const codes = existingFormationCodes ?? []
    const numericCodes = codes.filter((c) => /^\d+$/.test(c))
    const width = numericCodes.length > 0 ? numericCodes[0].length : 4
    const maxNumeric = numericCodes.reduce((max, c) => Math.max(max, parseInt(c, 10)), 0)
    let candidate = String(maxNumeric + 1).padStart(width, '0')
    while (codes.includes(candidate)) {
      candidate = String(parseInt(candidate, 10) + 1).padStart(width, '0')
    }
    return candidate
  }

  // Récupérer les sessions pour la sélection multiple
  const { data: sessions } = useQuery({
    queryKey: ['sessions', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const result = await sessionService.getAllSessions(user.organization_id)
      return Array.isArray(result) ? result : result.data
    },
    enabled: !!user?.organization_id && !userLoading,
  })

  // React Hook Form avec validation Zod
  const {
    register,
    handleSubmit: handleFormSubmit,
    control,
    formState: { errors, isDirty },
    watch,
    setValue,
    reset,
  } = useForm<FormationFormData>({
    resolver: zodResolver(formationSchema),
    mode: 'onChange',
    defaultValues: BLANK_FORMATION_DEFAULTS,
  })

  const formData = watch()

  // Pré-remplit le formulaire dès que les détails du programme choisi sont chargés,
  // puis affiche le formulaire (étape 2). Le code interne n'est jamais recopié tel quel
  // depuis le programme (un programme crée déjà une formation par défaut avec ce même
  // code, le recopier provoquerait systématiquement une collision) — un code libre est
  // suggéré à la place, sinon le champ obligatoire resterait vide et "Créer la formation"
  // échouerait silencieusement à la validation.
  useEffect(() => {
    if (!selectedProgram) return
    const p = selectedProgram as any
    const price = p.price_enterprise ?? p.price ?? p.price_individual ?? p.price_freelance ?? null
    reset({
      ...BLANK_FORMATION_DEFAULTS,
      program_id: selectedProgramId,
      code: suggestNextCode(),
      name: p.name || '',
      subtitle: p.subtitle || '',
      photo_url: p.photo_url || '',
      category: p.category || '',
      description: p.description || '',
      program_version: p.program_version || '',
      version_date: p.version_date || '',
      duration_hours: p.duration_hours != null ? String(p.duration_hours) : '',
      duration_days: p.duration_days != null ? String(p.duration_days) : '',
      duration_unit: p.duration_unit || 'hours',
      price: price != null ? String(price) : '',
      currency: p.currency || 'EUR',
      prerequisites: p.prerequisites || '',
      capacity_max: p.capacity_max != null ? String(p.capacity_max) : '',
      published_online: p.published_online ?? false,
      eligible_cpf: p.eligible_cpf ?? false,
      cpf_code: p.cpf_code || '',
      modalities: p.modalities || '',
      training_action_type: p.training_action_type || '',
      pedagogical_objectives: p.pedagogical_objectives || '',
      learner_profile: p.learner_profile || '',
      training_content: p.training_content || '',
      execution_follow_up: p.execution_follow_up || '',
      certification_modalities: p.certification_modalities || '',
      quality: p.quality || '',
      accounting_product_config: p.accounting_product_config || '',
      edof_export_fields: p.edof_export_fields ? JSON.stringify(p.edof_export_fields) : '',
      competence_domains: p.competence_domains || '',
    })
    setStep('form')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgram])

  const handleSkipPicker = () => {
    reset({ ...BLANK_FORMATION_DEFAULTS, code: suggestNextCode() })
    setStep('form')
  }

  const handleBackToPicker = () => {
    setSelectedProgramId('')
    reset(BLANK_FORMATION_DEFAULTS)
    setStep('pick')
  }

  const createMutation = useMutation({
    mutationFn: async (data: FormationFormData) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')

      return formationService.createFormation({
        organization_id: user.organization_id,
        program_id: data.program_id || null,
        code: data.code,
        name: data.name,
        subtitle: data.subtitle || null,
        photo_url: data.photo_url || null,
        category: data.category || null,
        description: data.description || null,
        program_version: data.program_version || null,
        version_date: data.version_date || null,
        duration_hours: data.duration_hours ? parseInt(data.duration_hours) : null,
        duration_days: data.duration_days ? parseInt(data.duration_days) : null,
        duration_unit: data.duration_unit,
        price: data.price ? parseFloat(data.price) || 0 : 0,
        currency: data.currency || 'EUR',
        payment_plan: data.payment_plan as Formation['payment_plan'],
        prerequisites: data.prerequisites || null,
        capacity_max: data.capacity_max ? parseInt(data.capacity_max) : null,
        age_min: data.age_min ? parseInt(data.age_min) : null,
        age_max: data.age_max ? parseInt(data.age_max) : null,
        published_online: data.published_online,
        eligible_cpf: data.eligible_cpf,
        cpf_code: data.cpf_code || null,
        modalities: data.modalities || null,
        training_action_type: data.training_action_type || null,
        pedagogical_objectives: data.pedagogical_objectives || null,
        learner_profile: data.learner_profile || null,
        training_content: data.training_content || null,
        execution_follow_up: data.execution_follow_up || null,
        certification_modalities: data.certification_modalities || null,
        quality: data.quality || null,
        accounting_product_config: data.accounting_product_config || null,
        edof_export_fields: data.edof_export_fields ? JSON.parse(data.edof_export_fields) : null,
        competence_domains: data.competence_domains || null,
        certification_issued: data.certification_issued,
        is_active: data.is_active ?? true,
      })
    },
    onSuccess: async (formation: any) => {
      // Associer les sessions sélectionnées
      if (selectedSessions.length > 0 && user?.organization_id && formation?.id) {
        try {
          await formationService.addSessionsToFormation(
            formation.id,
            selectedSessions,
            user.organization_id
          )
        } catch (error) {
          logger.error('Erreur lors de l\'ajout des sessions:', error)
        }
      }
      if (formation?.id) {
        router.push(`/dashboard/formations/${formation.id}`)
      }
    },
  })

  const handleSubmit = handleFormSubmit((data) => {
    createMutation.mutate(data)
  })

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    )
  }

  if (!user || !user.organization_id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-red-800 mb-2">
            Organisation manquante
          </h2>
          <p className="text-red-700">
            Votre compte n'est pas associé à une organisation. Veuillez contacter le support.
          </p>
        </div>
      </div>
    )
  }

  const sessionOptions = sessions?.map((s: any) => ({
    label: s.name,
    value: s.id
  })) || []

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
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
    }
  }

  if (step === 'pick') {
    const filteredPrograms = (programs ?? []).filter((p: any) =>
      !pickerSearch.trim() || p.name?.toLowerCase().includes(pickerSearch.trim().toLowerCase()) || p.code?.toLowerCase().includes(pickerSearch.trim().toLowerCase())
    )

    return (
      <motion.div
        className="min-h-screen pb-24 relative max-w-4xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="mb-8 space-y-4">
          <nav className="flex items-center text-sm text-gray-500 mb-4">
            <Link href="/dashboard/formations" className="hover:text-brand-blue transition-colors flex items-center gap-1">
              <GraduationCap className="h-4 w-4" />
              Formations
            </Link>
            <ChevronRight className="h-4 w-4 mx-2 text-gray-300" />
            <span className="text-brand-blue font-medium bg-brand-blue/10 px-2 py-0.5 rounded-full text-xs">Création</span>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/dashboard/formations">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/50">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-lg shadow-lg shadow-brand-blue/20">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight">
                  Nouvelle formation
                </h1>
              </div>
              <p className="text-gray-500 pl-[3.25rem]">
                Partez d'un programme existant pour pré-remplir la formation, ou créez-la de zéro.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder="Rechercher un programme..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {filteredPrograms.map((program: any) => (
            <button
              key={program.id}
              type="button"
              disabled={isLoadingProgramPrefill}
              onClick={() => setSelectedProgramId(program.id)}
              className={cn(
                "text-left p-5 bg-white border border-gray-200 rounded-xl hover:border-brand-blue hover:shadow-md transition-all group disabled:opacity-50 disabled:cursor-wait",
                selectedProgramId === program.id && isLoadingProgramPrefill && "border-brand-blue shadow-md"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{program.name}</p>
                  {program.code && <p className="text-xs text-gray-400 font-mono mt-0.5">{program.code}</p>}
                  {program.category && (
                    <Badge variant="outline" className="mt-2 text-xs">{program.category}</Badge>
                  )}
                </div>
                {selectedProgramId === program.id && isLoadingProgramPrefill ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-blue shrink-0 mt-1" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-brand-blue transition-colors shrink-0 mt-1" />
                )}
              </div>
            </button>
          ))}
          {programs && filteredPrograms.length === 0 && (
            <div className="md:col-span-2 text-center py-8 text-sm text-gray-400 italic">
              Aucun programme ne correspond à cette recherche.
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={handleSkipPicker}
            className="bg-white hover:bg-gray-50 border-gray-200"
          >
            <FilePlus2 className="h-4 w-4 mr-2" />
            Créer une formation sans modèle
          </Button>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="min-h-screen pb-24 relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-cyan/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8 space-y-4">
        <nav className="flex items-center text-sm text-gray-500 mb-4">
          <Link href="/dashboard/formations" className="hover:text-brand-blue transition-colors flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            Formations
          </Link>
          <ChevronRight className="h-4 w-4 mx-2 text-gray-300" />
          <span className="text-brand-blue font-medium bg-brand-blue/10 px-2 py-0.5 rounded-full text-xs">Création</span>
        </nav>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/formations">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/50">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-lg shadow-lg shadow-brand-blue/20">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight">
                  Nouvelle formation
                </h1>
              </div>
              <p className="text-gray-500 pl-[3.25rem]">
                {selectedProgramId ? (
                  <>
                    Pré-rempli depuis <span className="font-medium text-gray-700">{(selectedProgram as any)?.name}</span> ·{' '}
                    <button type="button" onClick={handleBackToPicker} className="text-brand-blue hover:underline">
                      Changer de programme
                    </button>
                  </>
                ) : (
                  'Configurez les détails et le contenu de votre nouvelle formation.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/formations">
              <Button variant="outline" className="bg-white hover:bg-gray-50 border-gray-200">
                Annuler
              </Button>
            </Link>
            <Button 
              onClick={handleSubmit}
              className="bg-gradient-to-r from-brand-blue to-brand-blue-dark hover:from-brand-blue-dark hover:to-brand-blue-darker text-white shadow-lg shadow-brand-blue/25 transition-all hover:scale-[1.02]"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Créer la formation
            </Button>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Informations de base */}
            <motion.div variants={itemVariants}>
              <GlassCard variant="premium" className="p-8 space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                  <Sparkles className="h-5 w-5 text-brand-blue" />
                  <h2 className="text-xl font-bold text-gray-900">Informations principales</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Titre de la formation *</label>
                    <input
                      type="text"
                      {...register('name')}
                      className={cn(
                        "w-full px-4 py-3 bg-white/50 border rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all",
                        errors.name ? "border-red-500" : "border-gray-200"
                      )}
                      placeholder="Ex: Formation en Management"
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Code interne *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Badge variant="outline" className="bg-gray-50 text-xs font-mono">ID</Badge>
                      </div>
                      <input
                        type="text"
                        {...register('code')}
                        className={cn(
                          "w-full pl-12 px-4 py-3 bg-white/50 border rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all font-mono text-sm",
                          errors.code ? "border-red-500" : "border-gray-200"
                        )}
                        placeholder="FORM-001"
                      />
                    </div>
                    {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Sous-titre</label>
                  <input
                    type="text"
                    {...register('subtitle')}
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                    placeholder="Une brève description accrocheuse"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Catégorie</label>
                    <Controller
                      name="category"
                      control={control}
                      render={({ field }) => (
                        <CategorySelect
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          selectClassName="py-3 bg-white/50 rounded-xl"
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Programme associé</label>
                    <div className="relative">
                      <select
                        {...register('program_id')}
                        className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all appearance-none"
                      >
                        <option value="">Sélectionner un programme</option>
                        {programs?.map((program: any) => (
                          <option key={program.id} value={program.id}>
                            {program.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400">
                        <BookOpen className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Description détaillée</label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all resize-y"
                    placeholder="Description complète de la formation..."
                  />
                </div>
              </GlassCard>
            </motion.div>

            {/* Détails Pédagogiques */}
            <motion.div variants={itemVariants}>
              <GlassCard variant="default" className="p-8 space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  <h2 className="text-xl font-bold text-gray-900">Contenu pédagogique</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Target className="h-4 w-4 text-brand-blue" />
                      Objectifs pédagogiques
                    </label>
                    <textarea
                      {...register('pedagogical_objectives')}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      placeholder="À la fin de la formation, l'apprenant sera capable de..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Users className="h-4 w-4 text-brand-blue" />
                      Profil des apprenants
                    </label>
                    <textarea
                      {...register('learner_profile')}
                      rows={2}
                      className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      placeholder="Public cible, niveau requis..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <List className="h-4 w-4 text-brand-blue" />
                      Contenu de la formation
                    </label>
                    <textarea
                      {...register('training_content')}
                      rows={5}
                      className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      placeholder="Programme détaillé, modules, chapitres..."
                    />
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Modalités et Suivi */}
            <motion.div variants={itemVariants}>
              <GlassCard variant="default" className="p-8 space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                  <Check className="h-5 w-5 text-green-600" />
                  <h2 className="text-xl font-bold text-gray-900">Modalités et Suivi</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Modalités pédagogiques</label>
                    <textarea
                      {...register('modalities')}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      placeholder="Présentiel, distanciel, mixte..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Suivi de l'exécution</label>
                    <textarea
                      {...register('execution_follow_up')}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      placeholder="Feuilles d'émargement, rapports..."
                    />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Paramètres Clés */}
            <motion.div variants={itemVariants} className="sticky top-6 space-y-6">
              <GlassCard className="p-6 space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Clock className="h-5 w-5 text-brand-blue" />
                  <h3 className="font-bold text-gray-900">Paramètres</h3>
                </div>

                {/* Durée */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700">Durée</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        {...register('duration_hours')}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-center"
                        placeholder="0"
                      />
                      <span className="text-xs text-gray-500 text-center block mt-1">Heures</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        {...register('duration_days')}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-center"
                        placeholder="0"
                      />
                      <span className="text-xs text-gray-500 text-center block mt-1">Jours</span>
                    </div>
                  </div>
                </div>

                {/* Prix */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700">Tarification</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      {...register('price')}
                      className="w-full pl-4 pr-12 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                      placeholder="0.00"
                    />
                    <div className="absolute right-0 top-0 bottom-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 font-medium text-sm">
                        {watch('currency') === 'EUR' ? '€' : watch('currency')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Capacité */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700">Capacité</label>
                  <div className="relative">
                    <input
                      type="number"
                      {...register('capacity_max')}
                      className="w-full pl-10 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                      placeholder="Illimité"
                    />
                    <Users className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm font-medium text-gray-700 group-hover:text-brand-blue transition-colors">Catalogue en ligne</span>
                    <input
                      type="checkbox"
                      {...register('published_online')}
                      className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue h-4 w-4"
                    />
                  </label>
                  
                  <div className="space-y-2">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm font-medium text-gray-700 group-hover:text-brand-blue transition-colors">Éligible CPF</span>
                      <input
                        type="checkbox"
                        {...register('eligible_cpf')}
                        className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue h-4 w-4"
                      />
                    </label>
                    {watch('eligible_cpf') && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="overflow-hidden"
                      >
                        <input
                          type="text"
                          {...register('cpf_code')}
                          className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                          placeholder="Code CPF"
                        />
                      </motion.div>
                    )}
                  </div>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm font-medium text-gray-700 group-hover:text-brand-blue transition-colors">Certifiante</span>
                    <input
                      type="checkbox"
                      {...register('certification_issued')}
                      className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue h-4 w-4"
                    />
                  </label>
                </div>
              </GlassCard>

              {/* Sessions existantes */}
              <GlassCard className="p-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Calendar className="h-5 w-5 text-brand-cyan" />
                  <h3 className="font-bold text-gray-900">Sessions existantes</h3>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Associer des sessions</label>
                  <MultiSelect
                    options={sessionOptions}
                    selected={selectedSessions}
                    onChange={setSelectedSessions}
                    placeholder="Choisir..."
                    className="bg-white"
                  />
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>

        {/* Floating Footer Action */}
        <AnimatePresence>
          {isDirty && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="bg-gray-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-white/10">
                <span className="text-sm font-medium">Modifications non enregistrées</span>
                <div className="h-4 w-px bg-white/20" />
                <Button 
                  onClick={handleSubmit}
                  size="sm"
                  className="bg-white text-gray-900 hover:bg-gray-100 font-bold rounded-full px-4"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900 mr-2"></div>
                  ) : (
                    <Check className="h-3 w-3 mr-2" />
                  )}
                  Créer la formation
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  )
}
