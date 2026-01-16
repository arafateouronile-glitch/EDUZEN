'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { programService } from '@/lib/services/program.service'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Plus, Settings, Upload, Image as ImageIcon, Download, FileText, FileType } from 'lucide-react'
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
    formState: { errors },
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
        duration_hours: program.duration_hours ? String(program.duration_hours) : '',
        duration_days: program.duration_days ? String(program.duration_days) : '',
        price: program.price ? String(program.price) : '',
        price_enterprise: program.price ? String(program.price) : '',
        price_individual: program.price ? String(program.price) : '',
        price_freelance: program.price ? String(program.price) : '',
        currency: program.currency || 'XOF',
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
        certification_issued: program.certification_issued || false,
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
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

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <nav className="flex items-center text-sm text-gray-500">
          <Link href="/dashboard/programs" className="hover:text-brand-blue">Bibliothèque</Link>
          <span className="mx-2">›</span>
          <span className="hover:text-brand-blue cursor-pointer">{program.name}</span>
          <span className="mx-2">›</span>
          <span className="font-medium text-brand-blue">Modifier mon programme de formation</span>
        </nav>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
              {watch('name')}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-gray-200" disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Export...' : 'Exporter'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exporter en PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportWord}>
                  <FileType className="h-4 w-4 mr-2" />
                  Exporter en Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              onClick={handleSubmit(onSubmit)}
              className="bg-brand-blue hover:bg-brand-blue/90 text-white"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
            
            <Button variant="outline" className="border-brand-blue text-brand-blue hover:bg-brand-blue/5">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un bloc
            </Button>
            
            <Link href={`/dashboard/programs/${programId}/enrollments`}>
              <Button variant="outline" className="border-gray-200">
                <Settings className="h-4 w-4 mr-2" />
                Inscription
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Main Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-6">
              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre du programme</label>
                <input
                  type="text"
                  {...register('name')}
                  className={cn(
                    "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent",
                    errors.name ? "border-red-500" : "border-gray-200"
                  )}
                  placeholder="Ex: AIPR CONCEPTEUR"
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              {/* Sous-titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sous-titre</label>
                <input
                  type="text"
                  {...register('subtitle')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Code interne */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code interne</label>
                  <input
                    type="text"
                    {...register('code')}
                    className={cn(
                      "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent",
                      errors.code ? "border-red-500" : "border-gray-200"
                    )}
                    placeholder="Ex: PROG-2024-001"
                  />
                </div>

                {/* Catégorie */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select
                    {...register('category')}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent bg-white"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    <option value="Prevention">Prévention et Sécurité</option>
                    <option value="Informatique">Informatique</option>
                    <option value="Management">Management</option>
                    <option value="Langues">Langues</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Version & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Version du programme</label>
                    <input
                      type="text"
                      {...register('program_version')}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de la version</label>
                    <input
                      type="date"
                      {...register('version_date')}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Durée */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durée du programme</label>
                    <div className="relative">
                      <input
                        type="text"
                        {...register('duration_hours')}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">heure(s)</span>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <div className="relative w-full">
                      <input
                        type="text"
                        {...register('duration_days')}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent pr-14"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">jour(s)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prix */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  Prix de la formation <span className="text-gray-400">🔗</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">Ent.</span>
                    </div>
                    <input
                      type="text"
                      {...register('price_enterprise')}
                      className="w-full pl-10 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                      placeholder="Entreprise"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">€</span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">Par.</span>
                    </div>
                    <input
                      type="text"
                      {...register('price_individual')}
                      className="w-full pl-10 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                      placeholder="Particulier"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">€</span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">Ind.</span>
                    </div>
                    <input
                      type="text"
                      {...register('price_freelance')}
                      className="w-full pl-10 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                      placeholder="Indépendant"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">€</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Info */}
            <div className="w-full lg:w-80 space-y-6">
              {/* Photo Upload */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="font-medium text-gray-900 mb-2">Photo du programme</h3>
                <p className="text-xs text-gray-500 mb-4">JPG, PNG ou WebP, ≤ 500Ko</p>
                
                {thumbnailPreview ? (
                  <div className="relative group">
                    <img 
                      src={thumbnailPreview} 
                      alt="Preview" 
                      className="w-full h-40 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setThumbnailPreview(null)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <div className="h-4 w-4">×</div>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 font-medium">Charger</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleThumbnailChange} />
                  </label>
                )}
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                  <input
                    type="checkbox"
                    {...register('published_online')}
                    className="w-5 h-5 text-brand-blue rounded border-gray-300 focus:ring-brand-blue"
                  />
                  <span className="text-sm font-medium text-gray-700">Publier sur le catalogue en ligne</span>
                </label>
                <label className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                  <input
                    type="checkbox"
                    {...register('is_public')}
                    className="w-5 h-5 text-brand-blue rounded border-gray-300 focus:ring-brand-blue"
                  />
                  <span className="text-sm font-medium text-gray-700">Visible sur le catalogue public</span>
                </label>

                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                    <input
                      type="checkbox"
                      {...register('eligible_cpf')}
                      className="w-5 h-5 text-brand-blue rounded border-gray-300 focus:ring-brand-blue"
                    />
                    <span className="text-sm font-medium text-gray-700">Eligible CPF (Compte Personnel Formation)</span>
                  </label>
                  
                  {watch('eligible_cpf') && (
                    <input
                      type="text"
                      {...register('cpf_code')}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent ml-8 mt-1"
                      placeholder="Code CPF"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Accordion Sections */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="modalities">
              <AccordionTrigger className="px-6 hover:bg-gray-50">Modalités</AccordionTrigger>
              <AccordionContent className="px-6">
                <textarea
                  {...register('modalities')}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  placeholder="Modalités de la formation..."
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="type">
              <AccordionTrigger className="px-6 hover:bg-gray-50">Type d'action de formation</AccordionTrigger>
              <AccordionContent className="px-6">
                <textarea
                  {...register('training_action_type')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="description">
              <AccordionTrigger className="px-6 hover:bg-gray-50">Description du programme</AccordionTrigger>
              <AccordionContent className="px-6">
                <textarea
                  {...register('description')}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="objectives">
              <AccordionTrigger className="px-6 hover:bg-gray-50">Objectifs pédagogiques</AccordionTrigger>
              <AccordionContent className="px-6">
                <textarea
                  {...register('pedagogical_objectives')}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="profile">
              <AccordionTrigger className="px-6 hover:bg-gray-50">Profil des apprenants</AccordionTrigger>
              <AccordionContent className="px-6">
                <textarea
                  {...register('learner_profile')}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="content">
              <AccordionTrigger className="px-6 hover:bg-gray-50">Contenu de la formation (progression pédagogique)</AccordionTrigger>
              <AccordionContent className="px-6">
                <textarea
                  {...register('training_content')}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="followup">
              <AccordionTrigger className="px-6 hover:bg-gray-50">Suivi de l'exécution</AccordionTrigger>
              <AccordionContent className="px-6">
                <textarea
                  {...register('execution_follow_up')}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="certification">
              <AccordionTrigger className="px-6 hover:bg-gray-50">Modalités de certification</AccordionTrigger>
              <AccordionContent className="px-6">
                <textarea
                  {...register('certification_modalities')}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="quality">
              <AccordionTrigger className="px-6 hover:bg-gray-50">Qualité</AccordionTrigger>
              <AccordionContent className="px-6">
                <textarea
                  {...register('quality')}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="accounting">
              <AccordionTrigger className="px-6 hover:bg-gray-50">Configuration comptable du produit</AccordionTrigger>
              <AccordionContent className="px-6">
                <textarea
                  {...register('accounting_product_config')}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="competences">
              <AccordionTrigger className="px-6 hover:bg-gray-50">Domaines de compétences</AccordionTrigger>
              <AccordionContent className="px-6">
                <textarea
                  {...register('competence_domains')}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Floating Footer Action */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:pl-72 flex justify-between items-center z-50">
           <Button 
              onClick={handleSubmit(onSubmit)}
              className="bg-brand-blue hover:bg-brand-blue/90 text-white"
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
      </form>
    </div>
  )
}
