'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { programService } from '@/lib/services/program.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
    description: '',
    duration_hours: '',
    price: '',
    currency: 'XOF',
    payment_plan: 'full',
    prerequisites: '',
    capacity_max: '',
    age_min: '',
    age_max: '',
    certification_issued: false,
    is_active: true,
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
      setFormData({
        code: program.code || '',
        name: program.name || '',
        description: program.description || '',
        duration_hours: program.duration_hours?.toString() || '',
        price: program.price?.toString() || '',
        currency: program.currency || 'XOF',
        payment_plan: program.payment_plan || 'full',
        prerequisites: program.prerequisites || '',
        capacity_max: program.capacity_max?.toString() || '',
        age_min: program.age_min?.toString() || '',
        age_max: program.age_max?.toString() || '',
        certification_issued: program.certification_issued || false,
        is_active: program.is_active ?? true,
      })
    }
  }, [program])

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')

      console.log('Mise à jour du programme:', programId, formData)
      const result = await programService.updateProgram(programId, {
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
        duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : null,
        price: parseFloat(formData.price) || 0,
        currency: formData.currency,
        payment_plan: formData.payment_plan as 'full' | 'installment' | 'custom',
        prerequisites: formData.prerequisites || null,
        capacity_max: formData.capacity_max ? parseInt(formData.capacity_max) : null,
        age_min: formData.age_min ? parseInt(formData.age_min) : null,
        age_max: formData.age_max ? parseInt(formData.age_max) : null,
        certification_issued: formData.certification_issued,
        is_active: formData.is_active,
      })
      console.log('Programme mis à jour avec succès:', result)
      return result
    },
    onSuccess: (updatedProgram) => {
      console.log('onSuccess appelé avec:', updatedProgram)
      // Invalider les queries pour forcer le rafraîchissement
      queryClient.invalidateQueries({ queryKey: ['program', programId] })
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      router.push(`/dashboard/programs/${updatedProgram.id}`)
    },
    onError: (error) => {
      console.error('Erreur lors de la mise à jour du programme:', error)
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
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/programs/${programId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Modifier la formation</h1>
          <p className="mt-2 text-sm text-gray-600">
            Modifiez les informations de la formation
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations de la formation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Code de la formation *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  placeholder="EX: FORM-2024-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nom de la formation *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  placeholder="Ex: Formation en Informatique"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Description détaillée de la formation..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Durée (heures)
                </label>
                <input
                  type="number"
                  value={formData.duration_hours}
                  onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  placeholder="Ex: 120"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Prix *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Devise</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                >
                  <option value="XOF">XOF (Franc CFA Ouest)</option>
                  <option value="XAF">XAF (Franc CFA Centre)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="USD">USD (Dollar)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Plan de paiement
                </label>
                <select
                  value={formData.payment_plan}
                  onChange={(e) => setFormData({ ...formData, payment_plan: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                >
                  <option value="full">Paiement unique</option>
                  <option value="installment">Échelonné</option>
                  <option value="custom">Personnalisé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Capacité maximale
                </label>
                <input
                  type="number"
                  value={formData.capacity_max}
                  onChange={(e) => setFormData({ ...formData, capacity_max: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  placeholder="Ex: 30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Âge minimum</label>
                <input
                  type="number"
                  value={formData.age_min}
                  onChange={(e) => setFormData({ ...formData, age_min: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Âge maximum</label>
                <input
                  type="number"
                  value={formData.age_max}
                  onChange={(e) => setFormData({ ...formData, age_max: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Prérequis</label>
              <textarea
                value={formData.prerequisites}
                onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Prérequis pour suivre cette formation..."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="certification"
                  checked={formData.certification_issued}
                  onChange={(e) => setFormData({ ...formData, certification_issued: e.target.checked })}
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
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                  Formation active
                </label>
              </div>
            </div>

            {updateMutation.error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                {updateMutation.error instanceof Error
                  ? updateMutation.error.message
                  : 'Une erreur est survenue'}
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4">
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
        </CardContent>
      </Card>
    </div>
  )
}

