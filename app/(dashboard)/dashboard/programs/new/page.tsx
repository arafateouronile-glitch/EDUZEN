'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { programService } from '@/lib/services/program.service.client'
import { formationService } from '@/lib/services/formation.service.client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp, Users, Star, Award, Globe, Image as ImageIcon, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { CategorySelect } from '@/components/ui/category-select'
import { LocationSelect } from '@/components/ui/location-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function NewProgramPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isLoading: userLoading } = useAuth()

  const [objectiveTabs, setObjectiveTabs] = useState<{ id: string; title: string; content: string }[]>([
    { id: '1', title: 'Objectifs', content: '' },
  ])
  const [activeObjectiveTab, setActiveObjectiveTab] = useState('1')

  const [learnerProfileTabs, setLearnerProfileTabs] = useState<{ id: string; title: string; content: string }[]>([
    { id: '1', title: 'Profil', content: '' },
  ])
  const [activeLearnerProfileTab, setActiveLearnerProfileTab] = useState('1')

  const [trainingContentTabs, setTrainingContentTabs] = useState<{ id: string; title: string; content: string }[]>([
    { id: '1', title: 'Module 1', content: '' },
  ])
  const [activeTrainingContentTab, setActiveTrainingContentTab] = useState('1')

  const [executionFollowUpTabs, setExecutionFollowUpTabs] = useState<{ id: string; title: string; content: string }[]>([
    { id: '1', title: 'Suivi', content: '' },
  ])
  const [activeExecutionFollowUpTab, setActiveExecutionFollowUpTab] = useState('1')

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    subtitle: '',
    description: '',
    public_description: '',
    public_image_url: '',
    category: '',
    duration_hours: '',
    duration_days: '',
    duration_unit: 'days',
    modalities: '',
    price_enterprise: '',
    price_individual: '',
    price_freelance: '',
    currency: 'EUR',
    payment_plan: 'full',
    prerequisites: '',
    capacity_max: '',
    capacity_min: '',
    age_min: '',
    age_max: '',
    certification_issued: false,
    is_active: true,
    is_public: false,
    eligible_cpf: false,
    cpf_code: '',
    // Modalité détaillée
    lieu: '',
    access_delay_days: '15',
    accessibility_info: 'Formation accessible aux personnes en situation de handicap. Pour toutes demandes d\'adaptation, veuillez contacter notre référent handicap.',
    edof_hours: '',
    // Type d'action de formation
    training_action_type: '',
    rs_title_name: '',
    rs_code: '',
    // Objectifs et contenu
    pedagogical_objectives: '',
    learner_profile: '',
    training_content: '',
    execution_follow_up: '',
    certification_modalities: '',
    // Qualiopi
    pedagogical_methods: '',
    // Statistiques
    success_rate: '',
    satisfaction_rate: '',
    total_learners: '',
    completion_rate: '',
  })

  // Suggère un code interne libre pour éviter les collisions avec un code déjà utilisé
  // (ex: réutiliser "0001" par erreur alors qu'un autre programme l'a déjà) — l'utilisateur
  // peut toujours le modifier, ce n'est qu'une valeur de départ.
  const { data: existingCodes } = useQuery({
    queryKey: ['program-codes', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const result = await programService.getAllPrograms(user.organization_id)
      const programs = Array.isArray(result) ? result : result.data
      return programs.map((p) => p.code).filter(Boolean)
    },
    enabled: !!user?.organization_id,
  })

  useEffect(() => {
    if (!existingCodes || formData.code) return
    const numericCodes = existingCodes.filter((c) => /^\d+$/.test(c))
    const width = numericCodes.length > 0 ? numericCodes[0].length : 4
    const maxNumeric = numericCodes.reduce((max, c) => Math.max(max, parseInt(c, 10)), 0)
    const nextCode = String(maxNumeric + 1).padStart(width, '0')
    if (!existingCodes.includes(nextCode)) {
      setFormData((prev) => ({ ...prev, code: nextCode }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingCodes])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')

      const duration_days = formData.duration_days ? parseInt(formData.duration_days, 10) : null
      const duration_hours = formData.duration_hours ? parseInt(formData.duration_hours, 10) : null
      const price_enterprise = formData.price_enterprise ? parseFloat(formData.price_enterprise.replace(',', '.')) : null
      const price_individual = formData.price_individual ? parseFloat(formData.price_individual.replace(',', '.')) : null
      const price_freelance = formData.price_freelance ? parseFloat(formData.price_freelance.replace(',', '.')) : null
      const price = price_enterprise ?? price_individual ?? price_freelance ?? null

      logger.debug('Création du programme', { formData })

      const program = await programService.createProgram({
        organization_id: user.organization_id,
        code: formData.code,
        name: formData.name,
        subtitle: formData.subtitle || null,
        description: formData.description || null,
        public_description: formData.public_description || null,
        public_image_url: formData.public_image_url || null,
        category: formData.category || null,
        duration_days: duration_days,
        duration_hours: duration_hours,
        duration_unit: formData.duration_unit || null,
        modalities: formData.modalities || null,
        price,
        price_enterprise,
        price_individual,
        price_freelance,
        is_active: formData.is_active,
        is_public: formData.is_public,
        eligible_cpf: formData.eligible_cpf,
        cpf_code: formData.cpf_code || null,
        // Modalité détaillée
        lieu: formData.lieu || null,
        access_delay_days: formData.access_delay_days ? parseInt(formData.access_delay_days) : null,
        accessibility_info: formData.accessibility_info || null,
        prerequisites: formData.prerequisites || null,
        pedagogical_methods: formData.pedagogical_methods || null,
        edof_hours: formData.edof_hours ? parseInt(formData.edof_hours) : null,
        capacity_min: formData.capacity_min ? parseInt(formData.capacity_min) : null,
        capacity_max: formData.capacity_max ? parseInt(formData.capacity_max) : null,
        // Type d'action de formation
        training_action_type: formData.training_action_type || null,
        rs_title_name: formData.rs_title_name || null,
        rs_code: formData.rs_code || null,
        // Objectifs et contenu — les champs texte sont sérialisés depuis les tabs
        pedagogical_objectives_tabs: objectiveTabs as any,
        pedagogical_objectives: objectiveTabs.map((t) => t.content).filter(Boolean).join('\n\n') || formData.pedagogical_objectives || null,
        learner_profile_tabs: learnerProfileTabs as any,
        training_content_tabs: trainingContentTabs as any,
        execution_follow_up_tabs: executionFollowUpTabs as any,
        learner_profile: learnerProfileTabs.map((t) => t.content).filter(Boolean).join('\n\n') || formData.learner_profile || null,
        training_content: trainingContentTabs.map((t) => t.content).filter(Boolean).join('\n\n') || formData.training_content || null,
        execution_follow_up: executionFollowUpTabs.map((t) => t.content).filter(Boolean).join('\n\n') || formData.execution_follow_up || null,
        certification_modalities: formData.certification_modalities || null,
        // Statistiques
        success_rate: formData.success_rate ? parseInt(formData.success_rate) : null,
        satisfaction_rate: formData.satisfaction_rate ? parseFloat(formData.satisfaction_rate) : null,
        total_learners: formData.total_learners ? parseInt(formData.total_learners) : null,
        completion_rate: formData.completion_rate ? parseInt(formData.completion_rate) : null,
      } as any)

      // Créer la formation par défaut avec duration_hours/price/currency — ces champs
      // sont dupliqués sur programs (ci-dessus) ET formations : la fiche programme lit
      // depuis programs, mais l'inscription en session lit le prix depuis formations.
      try {
        await formationService.createFormation({
          program_id: program.id,
          organization_id: user.organization_id,
          code: formData.code,
          name: formData.name,
          duration_hours: duration_hours,
          price: price ?? 0,
          currency: formData.currency || 'EUR',
        })
      } catch (formationError) {
        // La formation n'a pas pu être créée (ex: code déjà utilisé côté formations) :
        // on retire le programme pour éviter une ligne orpheline qui bloquerait toute
        // nouvelle tentative avec le même code.
        await programService.deleteProgram(program.id).catch(() => {})
        throw formationError
      }

      logger.debug('Programme créé avec succès', { program })
      return program
    },
    onSuccess: (createdProgram) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      router.push(`/dashboard/programs/${createdProgram.id}`)
    },
    onError: (error) => {
      logger.error('Erreur lors de la création du programme', sanitizeError(error))
    },
  })

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Chargement...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="bg-warning-bg border border-warning-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-warning-primary mb-2">
            Utilisateur non trouvé
          </h2>
          <p className="text-warning-primary">
            Votre compte n'existe pas encore dans la base de données. Déconnectez-vous et créez un nouveau compte.
          </p>
        </div>
      </div>
    )
  }

  if (!user.organization_id) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Organization ID manquant
          </h2>
          <p className="text-red-700 mb-4">
            Votre compte n'est pas associé à une organisation.
          </p>
        </div>
      </div>
    )
  }

  const isDuplicateCode = createMutation.error
    ? (createMutation.error as { code?: string })?.code === '23505'
      || /duplicate key|already exists/i.test(createMutation.error instanceof Error ? createMutation.error.message : '')
    : false

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/programs">
            <Button variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nouveau programme</h1>
            <p className="mt-1 text-sm text-gray-600">
              Configurez tous les aspects de votre programme de formation
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="public">Page publique</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>

          {/* Onglet Général */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
                <CardDescription>Les informations de base du programme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="EX: PROG-2024-001"
                    />
                    {isDuplicateCode && (
                      <p className="text-sm text-red-500 mt-1">Ce code est déjà utilisé par un autre programme. Choisissez-en un autre.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Nom *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Ex: Formation Développeur Web"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Sous-titre</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Ex: Devenez développeur web en 6 mois"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Catégorie</label>
                    <CategorySelect
                      value={formData.category}
                      onChange={(val) => setFormData({ ...formData, category: val })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-3">Modalité</label>
                    {/* Sous-onglets modalité */}
                    <div className="border rounded-xl overflow-hidden">
                      <div className="flex border-b bg-gray-50">
                        {['présentiel', 'distanciel', 'hybride', 'e-learning'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setFormData({ ...formData, modalities: m })}
                            className={`flex-1 px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                              formData.modalities === m
                                ? 'bg-white text-primary border-b-2 border-primary'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                          </button>
                        ))}
                      </div>
                      <div className="p-4 space-y-4 bg-white">
                        {/* Lieu */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Lieu</label>
                          <LocationSelect
                            value={formData.lieu}
                            onChange={(val) => setFormData({ ...formData, lieu: val })}
                            inputClassName="text-sm py-2"
                          />
                        </div>
                        {/* Délai d'accès */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Délai d'accès</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              value={formData.access_delay_days}
                              onChange={(e) => setFormData({ ...formData, access_delay_days: e.target.value })}
                              className="w-24 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="15"
                            />
                            <span className="text-sm text-gray-500">jours</span>
                          </div>
                        </div>
                        {/* Accessibilité */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Accessibilité handicap <span className="text-amber-600 font-normal">(Qualiopi ind. 7)</span>
                          </label>
                          <textarea
                            value={formData.accessibility_info}
                            onChange={(e) => setFormData({ ...formData, accessibility_info: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                            placeholder="Formation accessible aux personnes en situation de handicap..."
                          />
                        </div>
                        {/* Prérequis */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Prérequis et niveau d'entrée <span className="text-amber-600 font-normal">(Qualiopi ind. 3)</span>
                          </label>
                          <textarea
                            value={formData.prerequisites}
                            onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                            placeholder="Ex : Aucun prérequis. / Niveau Bac requis. Maîtrise des bases de..."
                          />
                        </div>
                        {/* Méthodes pédagogiques */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Méthodes pédagogiques <span className="text-amber-600 font-normal">(Qualiopi ind. 5)</span>
                          </label>
                          <textarea
                            value={formData.pedagogical_methods}
                            onChange={(e) => setFormData({ ...formData, pedagogical_methods: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                            placeholder="Ex : Cours magistraux, travaux pratiques, études de cas, e-learning..."
                          />
                        </div>
                        {/* EDOF */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">EDOF</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={250}
                              value={formData.edof_hours}
                              onChange={(e) => setFormData({ ...formData, edof_hours: e.target.value })}
                              className="w-24 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="0"
                            />
                            <span className="text-sm text-gray-400">/ 250</span>
                          </div>
                        </div>
                        {/* Limites d'effectif */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Limites d'effectif</label>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Min</span>
                              <input
                                type="number"
                                min={0}
                                value={formData.capacity_min}
                                onChange={(e) => setFormData({ ...formData, capacity_min: e.target.value })}
                                className="w-20 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="—"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Max</span>
                              <input
                                type="number"
                                min={0}
                                value={formData.capacity_max}
                                onChange={(e) => setFormData({ ...formData, capacity_max: e.target.value })}
                                className="w-20 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="—"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Durée</label>
                    <input
                      type="number"
                      value={formData.duration_days}
                      onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Ex: 30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Unité</label>
                    <select
                      value={formData.duration_unit}
                      onChange={(e) => setFormData({ ...formData, duration_unit: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="days">Jours</option>
                      <option value="hours">Heures</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Durée en heures</label>
                  <input
                    type="number"
                    value={formData.duration_hours}
                    onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                    className="w-full md:w-1/2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Ex: 210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                    <span>Tarification</span>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="px-2 py-1 text-xs border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="EUR">EUR</option>
                      <option value="XOF">XOF</option>
                    </select>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Entreprise</label>
                      <input
                        type="text"
                        value={formData.price_enterprise}
                        onChange={(e) => setFormData({ ...formData, price_enterprise: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Ex: 1590"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Particulier</label>
                      <input
                        type="text"
                        value={formData.price_individual}
                        onChange={(e) => setFormData({ ...formData, price_individual: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Ex: 1290"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
                      <input
                        type="text"
                        value={formData.price_freelance}
                        onChange={(e) => setFormData({ ...formData, price_freelance: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Ex: 1290"
                      />
                    </div>
                  </div>
                </div>

                {/* Type d'action de formation */}
                <div>
                  <label className="block text-sm font-medium mb-3">Type d'action de formation</label>
                  <div className="border rounded-xl overflow-hidden">
                    <div className="grid grid-cols-2 border-b bg-gray-50">
                      {[
                        { value: 'action_formation', label: 'Action de formation' },
                        { value: 'bloc_competences', label: 'Bloc de compétences' },
                        { value: 'specialite', label: 'Spécialité de formation' },
                        { value: 'certification_rs', label: 'Certification / RS' },
                      ].map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, training_action_type: t.value })}
                          className={`px-4 py-2.5 text-sm font-medium text-left transition-colors border-b border-r last:border-r-0 ${
                            formData.training_action_type === t.value
                              ? 'bg-white text-primary border-b-2 border-b-primary'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    {formData.training_action_type === 'certification_rs' && (
                      <div className="p-4 space-y-4 bg-white">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Nom du titre visé</label>
                          <input
                            type="text"
                            value={formData.rs_title_name}
                            onChange={(e) => setFormData({ ...formData, rs_title_name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Ex : Titre Professionnel Développeur Web"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Code RS</label>
                          <input
                            type="text"
                            value={formData.rs_code}
                            onChange={(e) => setFormData({ ...formData, rs_code: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Ex : RS12345"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description interne</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Description interne (non visible publiquement)..."
                  />
                </div>

                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium">Programme actif</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_public"
                      checked={formData.is_public}
                      onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="is_public" className="text-sm font-medium">Visible sur le catalogue public</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="eligible_cpf"
                      checked={formData.eligible_cpf}
                      onChange={(e) => setFormData({ ...formData, eligible_cpf: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="eligible_cpf" className="text-sm font-medium">Éligible CPF</label>
                  </div>
                </div>

                {formData.eligible_cpf && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Code CPF</label>
                    <input
                      type="text"
                      value={formData.cpf_code}
                      onChange={(e) => setFormData({ ...formData, cpf_code: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Ex: RS12345"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Contenu */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Objectifs pédagogiques</CardTitle>
                  <CardDescription>Ce que les apprenants sauront faire à l'issue de la formation</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-xl overflow-hidden">
                  {/* Barre d'onglets */}
                  <div className="flex items-center border-b bg-gray-50 overflow-x-auto">
                    {objectiveTabs.map((tab) => (
                      <div
                        key={tab.id}
                        className={`group flex items-center gap-1 px-4 py-2.5 text-sm font-medium border-r cursor-pointer whitespace-nowrap transition-colors flex-shrink-0 ${
                          activeObjectiveTab === tab.id
                            ? 'bg-white text-primary border-b-2 border-b-primary'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setActiveObjectiveTab(tab.id)}
                      >
                        <input
                          type="text"
                          value={tab.title}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            setObjectiveTabs((tabs) =>
                              tabs.map((t) => (t.id === tab.id ? { ...t, title: e.target.value } : t))
                            )
                          }
                          className="bg-transparent border-none outline-none w-24 text-sm font-medium cursor-text"
                        />
                        {objectiveTabs.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              const remaining = objectiveTabs.filter((t) => t.id !== tab.id)
                              setObjectiveTabs(remaining)
                              if (activeObjectiveTab === tab.id) setActiveObjectiveTab(remaining[0].id)
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newId = Date.now().toString()
                        const newTab = { id: newId, title: 'Objectifs', content: '' }
                        setObjectiveTabs((tabs) => [...tabs, newTab])
                        setActiveObjectiveTab(newId)
                      }}
                      className="flex-shrink-0 px-3 py-2.5 text-gray-400 hover:text-primary hover:bg-gray-100 transition-colors"
                      title="Ajouter un groupe d'objectifs"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Contenu de l'onglet actif */}
                  {objectiveTabs.map((tab) =>
                    tab.id === activeObjectiveTab ? (
                      <div key={tab.id} className="bg-white p-4">
                        <textarea
                          value={tab.content}
                          onChange={(e) =>
                            setObjectiveTabs((tabs) =>
                              tabs.map((t) => (t.id === tab.id ? { ...t, content: e.target.value } : t))
                            )
                          }
                          rows={6}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                          placeholder="- Maîtriser les fondamentaux du développement web&#10;- Créer des applications React performantes&#10;- Déployer des applications en production"
                        />
                        <p className="text-xs text-gray-400 mt-2">Séparez chaque objectif par une nouvelle ligne · Double-cliquez sur le nom de l'onglet pour le renommer</p>
                      </div>
                    ) : null
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profil des apprenants</CardTitle>
                  <CardDescription>À qui s'adresse cette formation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-xl overflow-hidden">
                    <div className="flex items-center border-b bg-gray-50 overflow-x-auto">
                      {learnerProfileTabs.map((tab) => (
                        <div
                          key={tab.id}
                          className={`group flex items-center gap-1 px-4 py-2.5 text-sm font-medium border-r cursor-pointer whitespace-nowrap transition-colors flex-shrink-0 ${
                            activeLearnerProfileTab === tab.id
                              ? 'bg-white text-primary border-b-2 border-b-primary'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                          onClick={() => setActiveLearnerProfileTab(tab.id)}
                        >
                          <input
                            type="text"
                            value={tab.title}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              setLearnerProfileTabs((tabs) =>
                                tabs.map((t) => (t.id === tab.id ? { ...t, title: e.target.value } : t))
                              )
                            }
                            className="bg-transparent border-none outline-none w-20 text-sm font-medium cursor-text"
                          />
                          {learnerProfileTabs.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                const remaining = learnerProfileTabs.filter((t) => t.id !== tab.id)
                                setLearnerProfileTabs(remaining)
                                if (activeLearnerProfileTab === tab.id) setActiveLearnerProfileTab(remaining[0].id)
                              }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity ml-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newId = Date.now().toString()
                          const newTab = { id: newId, title: 'Profil', content: '' }
                          setLearnerProfileTabs((tabs) => [...tabs, newTab])
                          setActiveLearnerProfileTab(newId)
                        }}
                        className="flex-shrink-0 px-3 py-2.5 text-gray-400 hover:text-primary hover:bg-gray-100 transition-colors"
                        title="Ajouter un profil"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {learnerProfileTabs.map((tab) =>
                      tab.id === activeLearnerProfileTab ? (
                        <div key={tab.id} className="bg-white p-4">
                          <textarea
                            value={tab.content}
                            onChange={(e) =>
                              setLearnerProfileTabs((tabs) =>
                                tabs.map((t) => (t.id === tab.id ? { ...t, content: e.target.value } : t))
                              )
                            }
                            rows={5}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                            placeholder="Développeurs juniors, reconversion professionnelle, étudiants en informatique..."
                          />
                          <p className="text-xs text-gray-400 mt-2">Séparez chaque profil par une nouvelle ligne</p>
                        </div>
                      ) : null
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Suivi de l'exécution</CardTitle>
                  <CardDescription>Modalités de suivi et d'accompagnement des apprenants</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-xl overflow-hidden">
                    <div className="flex items-center border-b bg-gray-50 overflow-x-auto">
                      {executionFollowUpTabs.map((tab) => (
                        <div
                          key={tab.id}
                          className={`group flex items-center gap-1 px-4 py-2.5 text-sm font-medium border-r cursor-pointer whitespace-nowrap transition-colors flex-shrink-0 ${
                            activeExecutionFollowUpTab === tab.id
                              ? 'bg-white text-primary border-b-2 border-b-primary'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                          onClick={() => setActiveExecutionFollowUpTab(tab.id)}
                        >
                          <input
                            type="text"
                            value={tab.title}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              setExecutionFollowUpTabs((tabs) =>
                                tabs.map((t) => (t.id === tab.id ? { ...t, title: e.target.value } : t))
                              )
                            }
                            className="bg-transparent border-none outline-none w-20 text-sm font-medium cursor-text"
                          />
                          {executionFollowUpTabs.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                const remaining = executionFollowUpTabs.filter((t) => t.id !== tab.id)
                                setExecutionFollowUpTabs(remaining)
                                if (activeExecutionFollowUpTab === tab.id) setActiveExecutionFollowUpTab(remaining[0].id)
                              }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity ml-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newId = Date.now().toString()
                          const newTab = { id: newId, title: 'Suivi', content: '' }
                          setExecutionFollowUpTabs((tabs) => [...tabs, newTab])
                          setActiveExecutionFollowUpTab(newId)
                        }}
                        className="flex-shrink-0 px-3 py-2.5 text-gray-400 hover:text-primary hover:bg-gray-100 transition-colors"
                        title="Ajouter un suivi"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {executionFollowUpTabs.map((tab) =>
                      tab.id === activeExecutionFollowUpTab ? (
                        <div key={tab.id} className="bg-white p-4">
                          <textarea
                            value={tab.content}
                            onChange={(e) =>
                              setExecutionFollowUpTabs((tabs) =>
                                tabs.map((t) => (t.id === tab.id ? { ...t, content: e.target.value } : t))
                              )
                            }
                            rows={5}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                            placeholder="- Entretiens individuels réguliers&#10;- Points de progression hebdomadaires&#10;- Rapport de fin de formation"
                          />
                          <p className="text-xs text-gray-400 mt-2">Séparez chaque modalité par une nouvelle ligne</p>
                        </div>
                      ) : null
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Contenu de la formation</CardTitle>
                <CardDescription>Progression pédagogique (modules, chapitres...)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-xl overflow-hidden">
                  <div className="flex items-center border-b bg-gray-50 overflow-x-auto">
                    {trainingContentTabs.map((tab) => (
                      <div
                        key={tab.id}
                        className={`group flex items-center gap-1 px-4 py-2.5 text-sm font-medium border-r cursor-pointer whitespace-nowrap transition-colors flex-shrink-0 ${
                          activeTrainingContentTab === tab.id
                            ? 'bg-white text-primary border-b-2 border-b-primary'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setActiveTrainingContentTab(tab.id)}
                      >
                        <input
                          type="text"
                          value={tab.title}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            setTrainingContentTabs((tabs) =>
                              tabs.map((t) => (t.id === tab.id ? { ...t, title: e.target.value } : t))
                            )
                          }
                          className="bg-transparent border-none outline-none w-20 text-sm font-medium cursor-text"
                        />
                        {trainingContentTabs.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              const remaining = trainingContentTabs.filter((t) => t.id !== tab.id)
                              setTrainingContentTabs(remaining)
                              if (activeTrainingContentTab === tab.id) setActiveTrainingContentTab(remaining[0].id)
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newId = Date.now().toString()
                        const idx = trainingContentTabs.length + 1
                        const newTab = { id: newId, title: `Module ${idx}`, content: '' }
                        setTrainingContentTabs((tabs) => [...tabs, newTab])
                        setActiveTrainingContentTab(newId)
                      }}
                      className="flex-shrink-0 px-3 py-2.5 text-gray-400 hover:text-primary hover:bg-gray-100 transition-colors"
                      title="Ajouter un module"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {trainingContentTabs.map((tab) =>
                    tab.id === activeTrainingContentTab ? (
                      <div key={tab.id} className="bg-white p-4">
                        <textarea
                          value={tab.content}
                          onChange={(e) =>
                            setTrainingContentTabs((tabs) =>
                              tabs.map((t) => (t.id === tab.id ? { ...t, content: e.target.value } : t))
                            )
                          }
                          rows={7}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                          placeholder="- Présentation du module&#10;- Objectif spécifique&#10;- Exercices pratiques"
                        />
                        <p className="text-xs text-gray-400 mt-2">Séparez chaque point par une nouvelle ligne</p>
                      </div>
                    ) : null
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Modalités d'évaluation et certification</CardTitle>
                <CardDescription>Comment les apprenants sont évalués</CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.certification_modalities}
                  onChange={(e) => setFormData({ ...formData, certification_modalities: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Évaluation continue, projet final, certification délivrée..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Page publique */}
          <TabsContent value="public" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Présentation publique
                </CardTitle>
                <CardDescription>
                  Ces informations apparaissent sur la page publique du programme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <ImageIcon className="w-4 h-4 inline mr-1" />
                    URL de l'image de couverture
                  </label>
                  <input
                    type="url"
                    value={formData.public_image_url}
                    onChange={(e) => setFormData({ ...formData, public_image_url: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="https://..."
                  />
                  {formData.public_image_url && (
                    <div className="mt-3">
                      <img
                        src={formData.public_image_url}
                        alt="Aperçu"
                        className="h-32 w-auto rounded-lg object-cover"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description publique</label>
                  <textarea
                    value={formData.public_description}
                    onChange={(e) => setFormData({ ...formData, public_description: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Description attractive pour les visiteurs du catalogue public..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Cette description remplace la description interne sur la page publique
                  </p>
                </div>

                <p className="text-xs text-gray-400 italic">
                  L'aperçu de la page publique sera disponible une fois le programme créé.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Statistiques */}
          <TabsContent value="stats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Indicateurs de performance
                </CardTitle>
                <CardDescription>
                  Ces statistiques sont affichées sur la page publique pour rassurer les visiteurs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Award className="w-5 h-5 text-green-600" />
                      </div>
                      <label className="font-medium text-gray-900">Taux de réussite</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.success_rate}
                        onChange={(e) => setFormData({ ...formData, success_rate: e.target.value })}
                        className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-bold"
                        placeholder="94"
                      />
                      <span className="text-lg font-bold text-gray-400">%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Pourcentage d'apprenants ayant réussi</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-5 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Star className="w-5 h-5 text-amber-600" />
                      </div>
                      <label className="font-medium text-gray-900">Note de satisfaction</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={formData.satisfaction_rate}
                        onChange={(e) => setFormData({ ...formData, satisfaction_rate: e.target.value })}
                        className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg font-bold"
                        placeholder="4.8"
                      />
                      <span className="text-lg font-bold text-gray-400">/ 5</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Note moyenne des évaluations</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <label className="font-medium text-gray-900">Apprenants formés</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={formData.total_learners}
                        onChange={(e) => setFormData({ ...formData, total_learners: e.target.value })}
                        className="w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold"
                        placeholder="1250"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Nombre total d'apprenants</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-5 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                      </div>
                      <label className="font-medium text-gray-900">Taux de complétion</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.completion_rate}
                        onChange={(e) => setFormData({ ...formData, completion_rate: e.target.value })}
                        className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-bold"
                        placeholder="98"
                      />
                      <span className="text-lg font-bold text-gray-400">%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Pourcentage ayant terminé la formation</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Conseil :</strong> Ces statistiques renforcent la crédibilité de votre programme.
                    Laissez vide si vous ne souhaitez pas les afficher.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {createMutation.error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
            {isDuplicateCode
              ? 'Ce code interne est déjà utilisé par un autre programme. Choisissez-en un autre.'
              : createMutation.error instanceof Error
                ? createMutation.error.message
                : 'Une erreur est survenue'}
          </div>
        )}

        <div className="flex justify-end space-x-4 pt-4 sticky bottom-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border">
          <Link href="/dashboard/programs">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Création...' : 'Créer le programme'}
          </Button>
        </div>
      </form>
    </div>
  )
}
