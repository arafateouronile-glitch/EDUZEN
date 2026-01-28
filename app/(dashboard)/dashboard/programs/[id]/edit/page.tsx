'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { programService } from '@/lib/services/program.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, TrendingUp, Users, Star, Award, Eye, EyeOff, Globe, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function EditProgramPage() {
  const router = useRouter()
  const params = useParams()
  const programId = params.id as string
  const queryClient = useQueryClient()
  const { user, isLoading: userLoading } = useAuth()

  // Tous les hooks doivent être appelés de manière inconditionnelle, avant les retours conditionnels
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
    price: '',
    currency: 'XOF',
    payment_plan: 'full',
    prerequisites: '',
    capacity_max: '',
    age_min: '',
    age_max: '',
    certification_issued: false,
    is_active: true,
    is_public: false,
    eligible_cpf: false,
    cpf_code: '',
    // Objectifs et contenu
    pedagogical_objectives: '',
    learner_profile: '',
    training_content: '',
    execution_follow_up: '',
    certification_modalities: '',
    // Statistiques
    success_rate: '',
    satisfaction_rate: '',
    total_learners: '',
    completion_rate: '',
  })

  // Charger les données du programme existant
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['program', programId],
    queryFn: () => programService.getProgramById(programId),
    enabled: !!programId,
  })

  // Pré-remplir le formulaire avec les données existantes
  useEffect(() => {
    if (program) {
      const firstFormation = program.formations?.[0]
      setFormData({
        code: program.code || '',
        name: program.name || '',
        subtitle: (program as any).subtitle || '',
        description: program.description || '',
        public_description: (program as any).public_description || '',
        public_image_url: (program as any).public_image_url || '',
        category: (program as any).category || '',
        duration_hours: (firstFormation as any)?.duration_hours?.toString() || '',
        duration_days: (program as any).duration_days?.toString() || '',
        duration_unit: (program as any).duration_unit || 'days',
        modalities: (program as any).modalities || '',
        price: (firstFormation as any)?.price?.toString() || '',
        currency: (firstFormation as any)?.currency || 'XOF',
        payment_plan: (firstFormation as any)?.payment_plan || 'full',
        prerequisites: (firstFormation as any)?.prerequisites || '',
        capacity_max: (firstFormation as any)?.capacity_max?.toString() || '',
        age_min: (firstFormation as any)?.age_min?.toString() || '',
        age_max: (firstFormation as any)?.age_max?.toString() || '',
        certification_issued: (firstFormation as any)?.certification_issued || false,
        is_active: program.is_active ?? true,
        is_public: (program as any).is_public ?? false,
        eligible_cpf: (program as any).eligible_cpf ?? false,
        cpf_code: (program as any).cpf_code || '',
        // Objectifs et contenu
        pedagogical_objectives: (program as any).pedagogical_objectives || '',
        learner_profile: (program as any).learner_profile || '',
        training_content: (program as any).training_content || '',
        execution_follow_up: (program as any).execution_follow_up || '',
        certification_modalities: (program as any).certification_modalities || '',
        // Statistiques
        success_rate: (program as any).success_rate?.toString() || '',
        satisfaction_rate: (program as any).satisfaction_rate?.toString() || '',
        total_learners: (program as any).total_learners?.toString() || '',
        completion_rate: (program as any).completion_rate?.toString() || '',
      })
    }
  }, [program])

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')

      logger.debug('Mise à jour du programme', { programId, formData })
      const result = await programService.updateProgram(programId, {
        code: formData.code,
        name: formData.name,
        subtitle: formData.subtitle || null,
        description: formData.description || null,
        public_description: formData.public_description || null,
        public_image_url: formData.public_image_url || null,
        category: formData.category || null,
        duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
        duration_unit: formData.duration_unit || null,
        modalities: formData.modalities || null,
        is_active: formData.is_active,
        is_public: formData.is_public,
        eligible_cpf: formData.eligible_cpf,
        cpf_code: formData.cpf_code || null,
        // Objectifs et contenu
        pedagogical_objectives: formData.pedagogical_objectives || null,
        learner_profile: formData.learner_profile || null,
        training_content: formData.training_content || null,
        execution_follow_up: formData.execution_follow_up || null,
        certification_modalities: formData.certification_modalities || null,
        // Statistiques
        success_rate: formData.success_rate ? parseInt(formData.success_rate) : null,
        satisfaction_rate: formData.satisfaction_rate ? parseFloat(formData.satisfaction_rate) : null,
        total_learners: formData.total_learners ? parseInt(formData.total_learners) : null,
        completion_rate: formData.completion_rate ? parseInt(formData.completion_rate) : null,
      } as any)
      logger.debug('Programme mis à jour avec succès', { result })
      return result
    },
    onSuccess: (updatedProgram) => {
      logger.debug('onSuccess appelé', { updatedProgram })
      queryClient.invalidateQueries({ queryKey: ['program', programId] })
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      router.push(`/dashboard/programs/${updatedProgram.id}`)
    },
    onError: (error) => {
      logger.error('Erreur lors de la mise à jour du programme', sanitizeError(error))
    },
  })

  // Vérifications conditionnelles APRÈS tous les hooks
  if (userLoading || programLoading) {
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

  if (!program) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Formation non trouvée</p>
          <Link href="/dashboard/programs">
            <Button>Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/programs/${programId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Modifier le programme</h1>
            <p className="mt-1 text-sm text-gray-600">
              Configurez tous les aspects de votre programme de formation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {formData.is_public ? (
            <Badge className="bg-green-100 text-green-700">
              <Globe className="w-3 h-3 mr-1" />
              Public
            </Badge>
          ) : (
            <Badge variant="secondary">
              <EyeOff className="w-3 h-3 mr-1" />
              Privé
            </Badge>
          )}
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
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Ex: Informatique, Management..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Modalité</label>
                    <select
                      value={formData.modalities}
                      onChange={(e) => setFormData({ ...formData, modalities: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="présentiel">Présentiel</option>
                      <option value="distanciel">Distanciel</option>
                      <option value="hybride">Hybride</option>
                      <option value="e-learning">E-learning</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium mb-2">Capacité max</label>
                    <input
                      type="number"
                      value={formData.capacity_max}
                      onChange={(e) => setFormData({ ...formData, capacity_max: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Ex: 12"
                    />
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
              <CardHeader>
                <CardTitle>Objectifs pédagogiques</CardTitle>
                <CardDescription>Ce que les apprenants sauront faire à l'issue de la formation</CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.pedagogical_objectives}
                  onChange={(e) => setFormData({ ...formData, pedagogical_objectives: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="- Maîtriser les fondamentaux du développement web&#10;- Créer des applications React performantes&#10;- Déployer des applications en production"
                />
                <p className="text-xs text-gray-500 mt-2">Séparez chaque objectif par une nouvelle ligne</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Public visé</CardTitle>
                  <CardDescription>À qui s'adresse cette formation</CardDescription>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={formData.learner_profile}
                    onChange={(e) => setFormData({ ...formData, learner_profile: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Développeurs juniors, reconversion professionnelle, étudiants en informatique..."
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Prérequis</CardTitle>
                  <CardDescription>Connaissances nécessaires avant la formation</CardDescription>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={formData.execution_follow_up}
                    onChange={(e) => setFormData({ ...formData, execution_follow_up: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Connaissances de base en HTML/CSS, logique de programmation..."
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Contenu de la formation</CardTitle>
                <CardDescription>Programme détaillé (modules, chapitres...)</CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.training_content}
                  onChange={(e) => setFormData({ ...formData, training_content: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Module 1 : Introduction&#10;- Présentation du framework&#10;- Installation de l'environnement&#10;&#10;Module 2 : Les bases&#10;- Composants React&#10;- État et props"
                />
                <p className="text-xs text-gray-500 mt-2">Commencez par "Module", "Chapitre", "Partie" ou "Jour" pour créer des sections</p>
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

                {formData.is_public && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-700">
                      <Eye className="w-4 h-4" />
                      <span className="font-medium">Aperçu de la page publique</span>
                    </div>
                    <a
                      href={`/programmes/${programId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                    >
                      Voir la page publique →
                    </a>
                  </div>
                )}
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

        {updateMutation.error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
            {updateMutation.error instanceof Error
              ? updateMutation.error.message
              : 'Une erreur est survenue'}
          </div>
        )}

        <div className="flex justify-end space-x-4 pt-4 sticky bottom-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border">
          <Link href={`/dashboard/programs/${programId}`}>
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>
    </div>
  )
}

