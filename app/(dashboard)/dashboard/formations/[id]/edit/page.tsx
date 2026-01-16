'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { formationService } from '@/lib/services/formation.service'
import { programService } from '@/lib/services/program.service'
import { sessionService } from '@/lib/services/session.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MultiSelect } from '@/components/ui/multi-select'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { formationSchema, type FormationFormData } from '@/lib/validations/schemas'
import { useToast } from '@/components/ui/toast'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Formation = TableRow<'formations'>

export default function EditFormationPage() {
  const params = useParams()
  const router = useRouter()
  const formationId = params.id as string
  const { user, isLoading: userLoading } = useAuth()
  const { addToast } = useToast()
  const [selectedSessions, setSelectedSessions] = useState<string[]>([])

  // Récupérer la formation existante
  const { data: formation, isLoading: formationLoading } = useQuery<Formation | null>({
    queryKey: ['formation', formationId],
    queryFn: () => formationService.getFormationById(formationId),
    enabled: !!formationId,
  })

  // Récupérer les sessions associées à la formation
  const { data: formationSessions } = useQuery({
    queryKey: ['formation-sessions', formationId],
    queryFn: async () => {
      if (!formationId) return []
      return formationService.getAllSessionsForFormation(formationId)
    },
    enabled: !!formationId,
  })

  // Récupérer les programmes pour la sélection
  const { data: programs } = useQuery({
    queryKey: ['programs', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return programService.getAllPrograms(user.organization_id, { isActive: true })
    },
    enabled: !!user?.organization_id && !userLoading,
  })

  // Récupérer les sessions pour la sélection multiple
  const { data: sessions } = useQuery({
    queryKey: ['sessions', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return sessionService.getAllSessions(user.organization_id)
    },
    enabled: !!user?.organization_id && !userLoading,
  })

  // React Hook Form avec validation Zod
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<FormationFormData>({
    resolver: zodResolver(formationSchema),
    mode: 'onChange',
  })

  // Pré-remplir le formulaire avec les données existantes
  useEffect(() => {
    if (formation) {
      reset({
        program_id: formation.program_id || '',
        code: formation.code || '',
        name: formation.name || '',
        subtitle: formation.subtitle || '',
        photo_url: formation.photo_url || '',
        category: formation.category || '',
        description: formation.description || '',
        program_version: formation.program_version || '',
        version_date: formation.version_date ? new Date(formation.version_date).toISOString().split('T')[0] : '',
        duration_hours: formation.duration_hours ? String(formation.duration_hours) : '',
        duration_days: formation.duration_days ? String(formation.duration_days) : '',
        duration_unit: (formation.duration_unit as 'hours' | 'days') || 'hours',
        price: formation.price ? String(formation.price) : '',
        currency: formation.currency || 'XOF',
        payment_plan: (formation.payment_plan as 'full' | 'installment' | 'free') || 'full',
        prerequisites: formation.prerequisites || '',
        capacity_max: formation.capacity_max ? String(formation.capacity_max) : '',
        age_min: formation.age_min ? String(formation.age_min) : '',
        age_max: formation.age_max ? String(formation.age_max) : '',
        published_online: formation.published_online || false,
        eligible_cpf: formation.eligible_cpf || false,
        cpf_code: formation.cpf_code || '',
        modalities: formation.modalities || '',
        training_action_type: formation.training_action_type || '',
        pedagogical_objectives: formation.pedagogical_objectives || '',
        learner_profile: formation.learner_profile || '',
        training_content: formation.training_content || '',
        execution_follow_up: formation.execution_follow_up || '',
        certification_modalities: formation.certification_modalities || '',
        quality: formation.quality || '',
        accounting_product_config: formation.accounting_product_config || '',
        edof_export_fields: formation.edof_export_fields ? JSON.stringify(formation.edof_export_fields) : '',
        competence_domains: formation.competence_domains || '',
        certification_issued: formation.certification_issued || false,
        is_active: formation.is_active ?? true,
      } as any)
    }
  }, [formation, reset])

  // Pré-remplir les sessions sélectionnées
  useEffect(() => {
    if (formationSessions && formationSessions.length > 0) {
      const sessionIds = formationSessions.map((s: any) => s.id).filter(Boolean)
      setSelectedSessions(sessionIds)
    }
  }, [formationSessions])

  const formData = watch()

  const updateMutation = useMutation({
    mutationFn: async (data: FormationFormData) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')

      const updateData: any = {
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
        duration_unit: data.duration_unit as 'hours' | 'days' | null,
        price: data.price ? parseFloat(data.price) || 0 : 0,
        currency: data.currency || 'XOF',
        payment_plan: data.payment_plan as 'full' | 'installment' | 'free' | null,
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
      }

      await formationService.updateFormation(formationId, updateData)

      // Mettre à jour les sessions associées
      if (user.organization_id) {
        try {
          await formationService.updateFormationSessions(
            formationId,
            selectedSessions,
            user.organization_id
          )
        } catch (error) {
          console.error('Erreur lors de la mise à jour des sessions:', error)
        }
      }

      return { id: formationId }
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Formation mise à jour',
        description: 'La formation a été mise à jour avec succès.',
      })
      router.push(`/dashboard/formations/${formationId}`)
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Une erreur est survenue lors de la mise à jour de la formation.',
      })
    },
  })

  const handleSubmit = handleFormSubmit((data) => {
    updateMutation.mutate(data)
  })

  if (userLoading || formationLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Chargement...</p>
      </div>
    )
  }

  if (!user || !user.organization_id) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Organisation manquante
          </h2>
          <p className="text-red-700">
            Votre compte n'est pas associé à une organisation.
          </p>
        </div>
      </div>
    )
  }

  if (!formation) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Formation non trouvée
          </h2>
          <Link href="/dashboard/formations">
            <Button className="mt-4">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  const sessionOptions = sessions?.map((s: any) => ({
    label: s.name,
    value: s.id
  })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/formations/${formationId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Modifier la formation</h1>
          <p className="mt-2 text-sm text-gray-600">
            {formation.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Informations de base */}
        <Card>
          <CardHeader>
            <CardTitle>Informations de base</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Programme (Optionnel - Legacy)
              </label>
              <select
                {...register('program_id')}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                  errors.program_id ? 'border-danger-primary' : ''
                }`}
              >
                <option value="">Aucun programme</option>
                {programs?.map((program: any) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
              {errors.program_id && (
                <p className="text-sm text-danger-primary mt-1">{errors.program_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Sessions associées (Nouveau - Multiples)
              </label>
              <MultiSelect
                options={sessionOptions}
                selected={selectedSessions}
                onChange={setSelectedSessions}
                placeholder="Sélectionner des sessions existantes..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Vous pourrez également créer de nouvelles sessions plus tard.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Code *
                </label>
                <input
                  type="text"
                  {...register('code')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.code ? 'border-danger-primary' : ''
                  }`}
                  placeholder="Ex: FORM-001"
                />
                {errors.code && (
                  <p className="text-sm text-danger-primary mt-1">{errors.code.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Titre de la formation *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.name ? 'border-danger-primary' : ''
                  }`}
                  placeholder="Ex: Formation en Informatique"
                />
                {errors.name && (
                  <p className="text-sm text-danger-primary mt-1">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Sous-titre
                </label>
                <input
                  type="text"
                  {...register('subtitle')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  placeholder="Sous-titre de la formation"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Catégorie
                </label>
                <input
                  type="text"
                  {...register('category')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  placeholder="Ex: Informatique, Management..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Photo de la formation (URL)
                </label>
                <input
                  type="url"
                  {...register('photo_url')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.photo_url ? 'border-danger-primary' : ''
                  }`}
                  placeholder="https://..."
                />
                {errors.photo_url && (
                  <p className="text-sm text-danger-primary mt-1">{errors.photo_url.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description de la formation</label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Description détaillée de la formation..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Version */}
        <Card>
          <CardHeader>
            <CardTitle>Version de la formation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Version de la formation
                </label>
                <input
                  type="text"
                  {...register('program_version')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  placeholder="Ex: 1.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Date de la version
                </label>
                <input
                  type="date"
                  {...register('version_date')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Durée */}
        <Card>
          <CardHeader>
            <CardTitle>Durée de la formation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Durée (heures)
                </label>
                <input
                  type="number"
                  {...register('duration_hours')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  placeholder="Ex: 120"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Durée (jours)
                </label>
                <input
                  type="number"
                  {...register('duration_days')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  placeholder="Ex: 15"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Unité de durée
                </label>
                <select
                  {...register('duration_unit')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                >
                  <option value="hours">Heure(s)</option>
                  <option value="days">Jour(s)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Tarification */}
        <Card>
          <CardHeader>
            <CardTitle>Tarification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Prix
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('price')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.price ? 'border-danger-primary' : ''
                  }`}
                  placeholder="0.00"
                />
                {errors.price && (
                  <p className="text-sm text-danger-primary mt-1">{errors.price.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Devise</label>
                <select
                  {...register('currency')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                >
                  <option value="XOF">XOF (Franc CFA Ouest)</option>
                  <option value="XAF">XAF (Franc CFA Centre)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="USD">USD (Dollar)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Plan de paiement
                </label>
                <select
                  {...register('payment_plan')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                >
                  <option value="full">Paiement unique</option>
                  <option value="installment">Échelonné</option>
                  <option value="free">Gratuit</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Configuration comptable du produit</label>
              <textarea
                {...register('accounting_product_config')}
                rows={3}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Configuration comptable..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Catalogue en ligne et CPF */}
        <Card>
          <CardHeader>
            <CardTitle>Catalogue en ligne et CPF</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="published_online"
                {...register('published_online')}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="published_online" className="text-sm font-medium">
                Publier sur le catalogue en ligne
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="eligible_cpf"
                {...register('eligible_cpf')}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="eligible_cpf" className="text-sm font-medium">
                Eligible CPF (Compte Personnel Formation)
              </label>
            </div>
            {formData.eligible_cpf && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Code CPF
                </label>
                <input
                  type="text"
                  {...register('cpf_code')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  placeholder="Ex: 236631"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 6: Formation */}
        <Card>
          <CardHeader>
            <CardTitle>Détails de la formation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Modalités</label>
              <textarea
                {...register('modalities')}
                rows={3}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Modalités de la formation..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Type d'action de formation</label>
              <input
                type="text"
                {...register('training_action_type')}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                placeholder="Type d'action de formation..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Objectifs pédagogiques</label>
              <textarea
                {...register('pedagogical_objectives')}
                rows={4}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Objectifs pédagogiques..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Profil des apprenants</label>
              <textarea
                {...register('learner_profile')}
                rows={3}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Profil des apprenants..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Contenu de la formation (progression pédagogique)</label>
              <textarea
                {...register('training_content')}
                rows={6}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Contenu de la formation..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Suivi de l'exécution</label>
              <textarea
                {...register('execution_follow_up')}
                rows={3}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Suivi de l'exécution..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Modalités de certification</label>
              <textarea
                {...register('certification_modalities')}
                rows={3}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Modalités de certification..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 7: Public cible */}
        <Card>
          <CardHeader>
            <CardTitle>Public cible</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Prérequis</label>
              <textarea
                {...register('prerequisites')}
                rows={3}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Prérequis pour suivre cette formation..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Âge minimum</label>
                <input
                  type="number"
                  {...register('age_min')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Âge maximum</label>
                <input
                  type="number"
                  {...register('age_max')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Capacité maximale
                </label>
                <input
                  type="number"
                  {...register('capacity_max')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.capacity_max ? 'border-danger-primary' : ''
                  }`}
                  placeholder="Ex: 30"
                />
                {errors.capacity_max && (
                  <p className="text-sm text-danger-primary mt-1">{errors.capacity_max.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 8: Qualité et export */}
        <Card>
          <CardHeader>
            <CardTitle>Qualité et export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Qualité</label>
              <textarea
                {...register('quality')}
                rows={3}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Informations qualité..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Champs pour l'export EDOF (JSON)</label>
              <textarea
                {...register('edof_export_fields')}
                rows={4}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                placeholder='{"field1": "value1", "field2": "value2"}'
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Domaines de compétences</label>
              <textarea
                {...register('competence_domains')}
                rows={3}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Domaines de compétences..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="certification"
                {...register('certification_issued')}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="certification" className="text-sm font-medium">
                Certificat délivré à l'issue de la formation
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                {...register('is_active')}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Formation active
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Boutons de soumission */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-warning-bg border border-warning-border rounded-lg p-4">
            <p className="text-sm text-warning-primary font-medium mb-2">
              Veuillez corriger les erreurs suivantes :
            </p>
            <ul className="list-disc list-inside text-sm text-warning-primary space-y-1">
              {errors.program_id && <li>{errors.program_id.message}</li>}
              {errors.code && <li>{errors.code.message}</li>}
              {errors.name && <li>{errors.name.message}</li>}
              {errors.photo_url && <li>{errors.photo_url.message}</li>}
              {errors.price && <li>{errors.price.message}</li>}
              {errors.capacity_max && <li>{errors.capacity_max.message}</li>}
            </ul>
          </div>
        )}

        {updateMutation.error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
            {updateMutation.error instanceof Error
              ? updateMutation.error.message
              : 'Une erreur est survenue'}
          </div>
        )}

        <div className="flex justify-end space-x-4 pt-4">
          <Link href={`/dashboard/formations/${formationId}`}>
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>
    </div>
  )
}




