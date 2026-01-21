'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { programService } from '@/lib/services/program.service'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Plus, Settings, Upload, Image as ImageIcon, Download, FileText, FileType, Check, ChevronRight, LayoutDashboard, BookOpen, GraduationCap, Clock, Calendar, Euro, Globe, Shield, FileCheck, ListChecks, Award, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { programSchema, type ProgramFormData } from '@/lib/validations/schemas'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { generatePDFFromHTML } from '@/lib/utils/pdf-generator'
import { generateProgramDOCX, generateProgramHTML } from '@/lib/utils/program-export'
import { GlassCard } from '@/components/ui/glass-card'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

export default function ProgramDetailPage() {
  const params = useParams()
  const programId = params.id as string
  const router = useRouter()
  const { user, isLoading: userLoading } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Récupération des données du programme
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['program', programId],
    queryFn: () => programService.getProgramById(programId),
    enabled: !!programId,
  })

  // React Hook Form avec validation Zod
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
    reset
  } = useForm<ProgramFormData>({
    resolver: zodResolver(programSchema),
    mode: 'onChange',
  })

  // Pré-remplissage du formulaire
  useEffect(() => {
    if (program) {
      reset({
        code: program.code,
        name: program.name,
        subtitle: program.subtitle || '',
        description: program.description || '',
        category: program.category || '',
        program_version: program.program_version || '1',
        version_date: program.version_date || new Date().toISOString().split('T')[0],
        duration_hours: (program as any).duration_hours ? String((program as any).duration_hours) : '',
        duration_days: program.duration_days ? String(program.duration_days) : '',
        price: (program as any).price ? String((program as any).price) : '',
        price_enterprise: (program as any).price ? String((program as any).price) : '',
        price_individual: (program as any).price ? String((program as any).price) : '',
        price_freelance: (program as any).price ? String((program as any).price) : '',
        currency: (program as any).currency || 'XOF',
        published_online: program.published_online || false,
        is_public: program.is_public || false,
        eligible_cpf: program.eligible_cpf || false,
        cpf_code: program.cpf_code || '',
        modalities: program.modalities || '',
        training_action_type: program.training_action_type || '',
        pedagogical_objectives: program.pedagogical_objectives || '',
        learner_profile: program.learner_profile || '',
        training_content: program.training_content || '',
        execution_follow_up: program.execution_follow_up || '',
        certification_modalities: program.certification_modalities || '',
        quality: program.quality || '',
        accounting_product_config: program.accounting_product_config || '',
        competence_domains: program.competence_domains || '',
        photo_url: program.photo_url || '',
        certification_issued: (program as any).certification_issued || false,
        is_active: program.is_active ?? true,
      })

      if (program.photo_url) {
        setThumbnailPreview(program.photo_url)
      }
    }
  }, [program, reset])

  const updateMutation = useMutation({
    mutationFn: async (data: ProgramFormData) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')

      const duration_days = data.duration_days ? parseInt(data.duration_days, 10) : null

      return programService.updateProgram(programId, {
        code: data.code,
        name: data.name,
        subtitle: data.subtitle || null,
        description: data.description || null,
        category: data.category || null,
        program_version: data.program_version || null,
        version_date: data.version_date || null,
        duration_days: duration_days,
        published_online: data.published_online,
        is_public: data.is_public || false,
        eligible_cpf: data.eligible_cpf,
        cpf_code: data.cpf_code,
        modalities: data.modalities,
        training_action_type: data.training_action_type,
        pedagogical_objectives: data.pedagogical_objectives,
        learner_profile: data.learner_profile,
        training_content: data.training_content,
        execution_follow_up: data.execution_follow_up,
        certification_modalities: data.certification_modalities,
        quality: data.quality,
        accounting_product_config: data.accounting_product_config,
        competence_domains: data.competence_domains,
        photo_url: data.photo_url,
        is_active: true,
      })
    },
    onSuccess: (updatedProgram) => {
      addToast({
        type: 'success',
        title: 'Programme mis à jour',
        description: 'Les modifications ont été enregistrées avec succès.',
      })
      queryClient.invalidateQueries({ queryKey: ['program', programId] })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      })
    }
  })

  const handleExportPDF = async () => {
    if (!program) return
    setIsExporting(true)
    try {
      const html = generateProgramHTML(program)
      const container = document.createElement('div')
      container.id = 'temp-pdf-container'
      container.innerHTML = html
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '0'
      document.body.appendChild(container)

      await generatePDFFromHTML('program-pdf-content', `Programme_${program.code}.pdf`)
      
      document.body.removeChild(container)
      addToast({ type: 'success', title: 'Export PDF réussi', description: 'Le fichier a été téléchargé.' })
    } catch (error) {
      console.error(error)
      addToast({ type: 'error', title: 'Erreur export', description: 'Impossible de générer le PDF.' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportWord = async () => {
    if (!program) return
    setIsExporting(true)
    try {
      await generateProgramDOCX(program)
      addToast({ type: 'success', title: 'Export Word réussi', description: 'Le fichier a été téléchargé.' })
    } catch (error) {
       console.error(error)
       addToast({ type: 'error', title: 'Erreur export', description: 'Impossible de générer le Word.' })
    } finally {
      setIsExporting(false)
    }
  }

  if (userLoading || programLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-xl font-semibold text-gray-900">Programme introuvable</div>
        <Link href="/dashboard/programs">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Button>
        </Link>
      </div>
    )
  }

  const onSubmit = (data: ProgramFormData) => {
    updateMutation.mutate(data)
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
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
      transition: { duration: 0.5 }
    }
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

      {/* Header Section */}
      <motion.div variants={itemVariants} className="mb-8 space-y-4">
        <nav className="flex items-center text-sm text-gray-500 mb-4">
          <Link href="/dashboard/programs" className="hover:text-brand-blue transition-colors flex items-center gap-1">
            <LayoutDashboard className="h-4 w-4" />
            Bibliothèque
          </Link>
          <ChevronRight className="h-4 w-4 mx-2 text-gray-300" />
          <span className="font-medium text-gray-900 truncate max-w-[200px]">{program.name}</span>
          <ChevronRight className="h-4 w-4 mx-2 text-gray-300" />
          <span className="text-brand-blue font-medium bg-brand-blue/10 px-2 py-0.5 rounded-full text-xs">Édition</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-lg shadow-lg shadow-brand-blue/20">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight">
                {watch('name') || 'Nouveau programme'}
              </h1>
            </div>
            <p className="text-gray-500 pl-[3.25rem]">
              Gérez les détails, le contenu et les paramètres de votre formation.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white hover:bg-gray-50 border-gray-200 shadow-sm transition-all duration-200" disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2 text-gray-500" />
                  {isExporting ? 'Export...' : 'Exporter'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2 text-red-500" />
                  Exporter en PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportWord} className="cursor-pointer">
                  <FileType className="h-4 w-4 mr-2 text-blue-600" />
                  Exporter en Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href={`/dashboard/programs/${programId}/enrollments`}>
              <Button variant="outline" className="bg-white hover:bg-gray-50 border-gray-200 shadow-sm transition-all duration-200">
                <Settings className="h-4 w-4 mr-2 text-gray-500" />
                Paramètres
              </Button>
            </Link>

            <Button 
              onClick={handleSubmit(onSubmit)}
              className="bg-gradient-to-r from-brand-blue to-brand-blue-dark hover:from-brand-blue-dark hover:to-brand-blue-darker text-white shadow-lg shadow-brand-blue/25 transition-all duration-300 hover:scale-[1.02]"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* General Info Card */}
            <motion.div variants={itemVariants}>
              <GlassCard variant="premium" className="p-8 space-y-8">
                <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                  <Sparkles className="h-5 w-5 text-brand-blue" />
                  <h2 className="text-xl font-bold text-gray-900">Informations générales</h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Titre du programme</label>
                    <input
                      type="text"
                      {...register('name')}
                      className={cn(
                        "w-full px-4 py-3 bg-white/50 border rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all duration-200",
                        errors.name ? "border-red-500" : "border-gray-200"
                      )}
                      placeholder="Ex: AIPR CONCEPTEUR"
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Sous-titre</label>
                    <input
                      type="text"
                      {...register('subtitle')}
                      className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all duration-200"
                      placeholder="Une brève description accrocheuse"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Code interne</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Badge variant="outline" className="bg-gray-50 text-xs font-mono">ID</Badge>
                        </div>
                        <input
                          type="text"
                          {...register('code')}
                          className="w-full pl-12 px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all duration-200 font-mono text-sm"
                          placeholder="PROG-2024-001"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Catégorie</label>
                      <div className="relative">
                        <select
                          {...register('category')}
                          className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all duration-200 appearance-none"
                        >
                          <option value="">Sélectionner une catégorie</option>
                          <option value="Prevention">Prévention et Sécurité</option>
                          <option value="Informatique">Informatique</option>
                          <option value="Management">Management</option>
                          <option value="Langues">Langues</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                          <ChevronRight className="h-4 w-4 rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-brand-blue" />
                        Durée
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <input
                            type="text"
                            {...register('duration_hours')}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-center font-medium"
                            placeholder="0"
                          />
                          <span className="text-xs text-gray-500 text-center block mt-1">Heures</span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            {...register('duration_days')}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-center font-medium"
                            placeholder="0"
                          />
                          <span className="text-xs text-gray-500 text-center block mt-1">Jours</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-brand-blue" />
                        Version
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <input
                            type="text"
                            {...register('program_version')}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-center font-medium"
                            placeholder="v1.0"
                          />
                          <span className="text-xs text-gray-500 text-center block mt-1">Version</span>
                        </div>
                        <div className="relative">
                          <input
                            type="date"
                            {...register('version_date')}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-center font-medium text-sm"
                          />
                          <span className="text-xs text-gray-500 text-center block mt-1">Date</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Euro className="h-4 w-4 text-brand-blue" />
                      Tarification
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: 'Entreprise', name: 'price_enterprise', placeholder: '0.00' },
                        { label: 'Particulier', name: 'price_individual', placeholder: '0.00' },
                        { label: 'Indépendant', name: 'price_freelance', placeholder: '0.00' }
                      ].map((field) => (
                        <div key={field.name} className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-400 text-xs font-medium uppercase">{field.label.slice(0, 3)}</span>
                          </div>
                          <input
                            type="text"
                            {...register(field.name as any)}
                            className="w-full pl-10 pr-8 px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all duration-200 text-right font-mono"
                            placeholder={field.placeholder}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 font-medium">€</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Accordion Sections */}
            <motion.div variants={itemVariants}>
              <GlassCard variant="default" className="overflow-hidden">
                <Accordion type="multiple" className="w-full divide-y divide-gray-100">
                  {[
                    { id: 'description', title: 'Description du programme', icon: FileText, rows: 6 },
                    { id: 'objectives', title: 'Objectifs pédagogiques', icon: ListChecks, rows: 4 },
                    { id: 'content', title: 'Contenu de la formation', icon: BookOpen, rows: 8 },
                    { id: 'modalities', title: 'Modalités', icon: Settings, rows: 4 },
                    { id: 'profile', title: 'Profil des apprenants', icon: GraduationCap, rows: 4 },
                    { id: 'type', title: 'Type d\'action de formation', icon: Award, rows: 3 },
                    { id: 'followup', title: 'Suivi de l\'exécution', icon: FileCheck, rows: 4 },
                    { id: 'certification', title: 'Modalités de certification', icon: Award, rows: 4 },
                    { id: 'quality', title: 'Qualité', icon: Shield, rows: 4 },
                    { id: 'accounting', title: 'Configuration comptable', icon: Euro, rows: 2 },
                    { id: 'competences', title: 'Domaines de compétences', icon: GraduationCap, rows: 2 },
                  ].map((section) => (
                    <AccordionItem key={section.id} value={section.id} className="border-none">
                      <AccordionTrigger className="px-6 py-4 hover:bg-gray-50/50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-brand-blue/5 rounded-lg text-brand-blue group-hover:bg-brand-blue/10 transition-colors">
                            <section.icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-gray-900 group-hover:text-brand-blue transition-colors">{section.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <textarea
                          {...register(section.id as any)}
                          rows={section.rows}
                          className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all duration-200 resize-y"
                          placeholder={`Saisissez ${section.title.toLowerCase()}...`}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </GlassCard>
            </motion.div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <motion.div variants={itemVariants} className="sticky top-6 space-y-6">
              {/* Photo Upload Card */}
              <GlassCard className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-brand-blue" />
                    Visuel
                  </h3>
                  <Badge variant="secondary" className="text-xs">Optionnel</Badge>
                </div>
                
                {thumbnailPreview ? (
                  <div className="relative group rounded-xl overflow-hidden shadow-md border border-gray-200">
                    <img 
                      src={thumbnailPreview} 
                      alt="Preview" 
                      className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setThumbnailPreview(null)}
                        className="p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-colors"
                      >
                        <div className="h-5 w-5 flex items-center justify-center">×</div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-brand-blue/50 transition-all duration-300 group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="p-3 bg-brand-blue/5 rounded-full mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Upload className="w-6 h-6 text-brand-blue" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium group-hover:text-brand-blue transition-colors">Charger une image</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG ≤ 500Ko</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleThumbnailChange} />
                  </label>
                )}
              </GlassCard>

              {/* Settings Card */}
              <GlassCard className="p-5 space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-brand-blue" />
                  Paramètres
                </h3>
                
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-gray-100 hover:border-brand-blue/30 hover:bg-white transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg text-green-600">
                        <Globe className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Catalogue en ligne</span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('published_online')}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-blue"></div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-gray-100 hover:border-brand-blue/30 hover:bg-white transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <Globe className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Catalogue public</span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('is_public')}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-blue"></div>
                    </div>
                  </label>

                  <div className="p-3 rounded-xl bg-white/50 border border-gray-100 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                          <Award className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Éligible CPF</span>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          {...register('eligible_cpf')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-blue"></div>
                      </div>
                    </label>
                    
                    <AnimatePresence>
                      {watch('eligible_cpf') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <input
                            type="text"
                            {...register('cpf_code')}
                            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                            placeholder="Code CPF (ex: 237482)"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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
                  onClick={handleSubmit(onSubmit)}
                  size="sm"
                  className="bg-white text-gray-900 hover:bg-gray-100 font-bold rounded-full px-4"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900 mr-2"></div>
                  ) : (
                    <Check className="h-3 w-3 mr-2" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  )
}
