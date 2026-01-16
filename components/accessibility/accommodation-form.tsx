'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accessibilityService } from '@/lib/services/accessibility.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { Save, X } from 'lucide-react'

interface AccommodationFormProps {
  organizationId: string
  studentId: string
  studentNeedId?: string
  accommodationId?: string // Pour l'édition
  initialData?: any
  onSuccess?: () => void
  onCancel?: () => void
}

const ACCOMMODATION_TYPES = [
  { value: 'physical', label: 'Physique' },
  { value: 'pedagogical', label: 'Pédagogique' },
  { value: 'exam', label: 'Examen' },
  { value: 'technical', label: 'Aide technique' },
  { value: 'schedule', label: 'Emploi du temps' },
]

const ACCOMMODATION_CATEGORIES = {
  physical: [
    { value: 'accessible_room', label: 'Salle accessible' },
    { value: 'adapted_furniture', label: 'Mobilier adapté' },
    { value: 'parking', label: 'Stationnement réservé' },
    { value: 'elevator', label: 'Accès ascenseur' },
  ],
  pedagogical: [
    { value: 'extra_time', label: 'Temps supplémentaire' },
    { value: 'adapted_materials', label: 'Supports adaptés' },
    { value: 'tutoring', label: 'Tutorat renforcé' },
    { value: 'small_group', label: 'Petit groupe' },
  ],
  exam: [
    { value: 'extra_time', label: 'Tiers-temps' },
    { value: 'separate_room', label: 'Salle séparée' },
    { value: 'assistant', label: 'Assistant (lecteur/scripteur)' },
    { value: 'computer', label: 'Ordinateur' },
  ],
  technical: [
    { value: 'screen_reader', label: 'Lecteur d\'écran' },
    { value: 'magnifier', label: 'Loupe électronique' },
    { value: 'wheelchair', label: 'Fauteuil roulant' },
    { value: 'hearing_aid', label: 'Aide auditive' },
  ],
  schedule: [
    { value: 'flexible_hours', label: 'Horaires aménagés' },
    { value: 'breaks', label: 'Pauses supplémentaires' },
    { value: 'reduced_schedule', label: 'Temps partiel' },
    { value: 'remote_learning', label: 'Formation à distance' },
  ],
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'expired', label: 'Expiré' },
]

export function AccommodationForm({
  organizationId,
  studentId,
  studentNeedId,
  accommodationId,
  initialData,
  onSuccess,
  onCancel,
}: AccommodationFormProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    accommodation_type: initialData?.accommodation_type || 'pedagogical',
    category: initialData?.category || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
    end_date: initialData?.end_date || '',
    status: initialData?.status || 'active',
    completion_rate: initialData?.completion_rate || 0,
    metadata: initialData?.metadata || {},
  })

  // Mettre à jour les catégories disponibles quand le type change
  const availableCategories = ACCOMMODATION_CATEGORIES[formData.accommodation_type as keyof typeof ACCOMMODATION_CATEGORIES] || []

  useEffect(() => {
    // Réinitialiser la catégorie si elle n'est plus valide pour le type sélectionné
    if (formData.category && !availableCategories.find((c) => c.value === formData.category)) {
      setFormData((prev) => ({ ...prev, category: '' }))
    }
  }, [formData.accommodation_type])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        organization_id: organizationId,
        student_id: studentId,
        student_need_id: studentNeedId || null,
        ...formData,
      }

      if (accommodationId) {
        return await accessibilityService.updateAccommodation(accommodationId, data)
      } else {
        return await accessibilityService.createAccommodation(data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessibility-accommodations'] })
      queryClient.invalidateQueries({ queryKey: ['accessibility-stats'] })
      addToast({
        type: 'success',
        title: accommodationId ? 'Aménagement mis à jour' : 'Aménagement créé',
        description: `L'aménagement a été ${accommodationId ? 'mis à jour' : 'créé'} avec succès.`,
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Impossible de sauvegarder l\'aménagement.',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.accommodation_type || !formData.title) {
      addToast({
        type: 'error',
        title: 'Validation échouée',
        description: 'Veuillez remplir tous les champs obligatoires.',
      })
      return
    }

    saveMutation.mutate()
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{accommodationId ? 'Modifier l\'aménagement' : 'Nouvel aménagement'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type d'aménagement */}
          <div>
            <Label htmlFor="accommodation_type">Type d'aménagement *</Label>
            <select
              id="accommodation_type"
              value={formData.accommodation_type}
              onChange={(e) => handleInputChange('accommodation_type', e.target.value)}
              className="w-full px-4 py-3 border-2 border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              required
            >
              {ACCOMMODATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Catégorie */}
          <div>
            <Label htmlFor="category">Catégorie</Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-4 py-3 border-2 border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            >
              <option value="">Sélectionner une catégorie...</option>
              {availableCategories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Titre */}
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ex: Tiers-temps aux examens"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Décrivez l'aménagement en détail..."
              rows={4}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Date de début *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_date">Date de fin</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Laisser vide si indéterminé</p>
            </div>
          </div>

          {/* Statut et progression */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Statut</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-4 py-3 border-2 border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="completion_rate">Progression (%)</Label>
              <Input
                id="completion_rate"
                type="number"
                min="0"
                max="100"
                value={formData.completion_rate}
                onChange={(e) => handleInputChange('completion_rate', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground mt-1">0-100%</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            )}
            <Button type="submit" disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
