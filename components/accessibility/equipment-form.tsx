'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accessibilityService } from '@/lib/services/accessibility.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { Save, X } from 'lucide-react'

interface EquipmentFormProps {
  organizationId: string
  equipmentId?: string // Pour l'édition
  initialData?: any
  onSuccess?: () => void
  onCancel?: () => void
}

const EQUIPMENT_CATEGORIES = [
  { value: 'mobility', label: 'Mobilité' },
  { value: 'visual', label: 'Visuel' },
  { value: 'auditory', label: 'Auditif' },
  { value: 'ergonomic', label: 'Ergonomique' },
  { value: 'software', label: 'Logiciel' },
  { value: 'other', label: 'Autre' },
]

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponible' },
  { value: 'in_use', label: 'En utilisation' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retiré' },
]

const MAINTENANCE_SCHEDULES = [
  { value: 'none', label: 'Aucune' },
  { value: 'monthly', label: 'Mensuelle' },
  { value: 'quarterly', label: 'Trimestrielle' },
  { value: 'biannual', label: 'Semestrielle' },
  { value: 'annual', label: 'Annuelle' },
]

export function EquipmentForm({
  organizationId,
  equipmentId,
  initialData,
  onSuccess,
  onCancel,
}: EquipmentFormProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    category: initialData?.category || 'mobility',
    description: initialData?.description || '',
    location: initialData?.location || '',
    quantity_total: initialData?.quantity_total || 1,
    quantity_available: initialData?.quantity_available || 1,
    status: initialData?.status || 'available',
    purchase_date: initialData?.purchase_date || '',
    warranty_expiry_date: initialData?.warranty_expiry_date || '',
    maintenance_schedule: initialData?.maintenance_schedule || 'none',
    last_maintenance_date: initialData?.last_maintenance_date || '',
    next_maintenance_date: initialData?.next_maintenance_date || '',
    notes: initialData?.notes || '',
    metadata: initialData?.metadata || {},
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        organization_id: organizationId,
        ...formData,
        // Convertir les chaînes vides en null pour les dates
        purchase_date: formData.purchase_date || null,
        warranty_expiry_date: formData.warranty_expiry_date || null,
        last_maintenance_date: formData.last_maintenance_date || null,
        next_maintenance_date: formData.next_maintenance_date || null,
      }

      if (equipmentId) {
        return await accessibilityService.updateEquipment(equipmentId, data)
      } else {
        return await accessibilityService.createEquipment(data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessibility-equipment'] })
      queryClient.invalidateQueries({ queryKey: ['accessibility-stats'] })
      addToast({
        type: 'success',
        title: equipmentId ? 'Équipement mis à jour' : 'Équipement créé',
        description: `L'équipement a été ${equipmentId ? 'mis à jour' : 'créé'} avec succès.`,
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Impossible de sauvegarder l\'équipement.',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name || !formData.category) {
      addToast({
        type: 'error',
        title: 'Validation échouée',
        description: 'Veuillez remplir tous les champs obligatoires.',
      })
      return
    }

    if (formData.quantity_available > formData.quantity_total) {
      addToast({
        type: 'error',
        title: 'Validation échouée',
        description: 'La quantité disponible ne peut pas dépasser la quantité totale.',
      })
      return
    }

    saveMutation.mutate()
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Synchroniser quantity_available avec quantity_total pour les nouveaux équipements
  const handleQuantityTotalChange = (value: number) => {
    setFormData((prev) => ({
      ...prev,
      quantity_total: value,
      // Si c'est un nouvel équipement, synchroniser quantity_available
      quantity_available: !equipmentId ? value : prev.quantity_available,
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{equipmentId ? 'Modifier l\'équipement' : 'Nouvel équipement'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom de l'équipement *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Fauteuil roulant électrique"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Catégorie *</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-4 py-3 border-2 border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                required
              >
                {EQUIPMENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Caractéristiques techniques, modèle, etc."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="location">Localisation</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Ex: Salle A12, Bâtiment B"
              />
            </div>
          </div>

          {/* Quantités et statut */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium">Disponibilité</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quantity_total">Quantité totale *</Label>
                <Input
                  id="quantity_total"
                  type="number"
                  min="1"
                  value={formData.quantity_total}
                  onChange={(e) => handleQuantityTotalChange(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="quantity_available">Quantité disponible *</Label>
                <Input
                  id="quantity_available"
                  type="number"
                  min="0"
                  max={formData.quantity_total}
                  value={formData.quantity_available}
                  onChange={(e) => handleInputChange('quantity_available', parseInt(e.target.value) || 0)}
                  required
                />
              </div>

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
            </div>
          </div>

          {/* Dates d'achat et garantie */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium">Achat et garantie</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase_date">Date d'achat</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="warranty_expiry_date">Fin de garantie</Label>
                <Input
                  id="warranty_expiry_date"
                  type="date"
                  value={formData.warranty_expiry_date}
                  onChange={(e) => handleInputChange('warranty_expiry_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Maintenance */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium">Maintenance</h3>

            <div>
              <Label htmlFor="maintenance_schedule">Fréquence de maintenance</Label>
              <select
                id="maintenance_schedule"
                value={formData.maintenance_schedule}
                onChange={(e) => handleInputChange('maintenance_schedule', e.target.value)}
                className="w-full px-4 py-3 border-2 border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                {MAINTENANCE_SCHEDULES.map((schedule) => (
                  <option key={schedule.value} value={schedule.value}>
                    {schedule.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.maintenance_schedule !== 'none' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="last_maintenance_date">Dernière maintenance</Label>
                  <Input
                    id="last_maintenance_date"
                    type="date"
                    value={formData.last_maintenance_date}
                    onChange={(e) => handleInputChange('last_maintenance_date', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="next_maintenance_date">Prochaine maintenance</Label>
                  <Input
                    id="next_maintenance_date"
                    type="date"
                    value={formData.next_maintenance_date}
                    onChange={(e) => handleInputChange('next_maintenance_date', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes internes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Informations complémentaires, remarques..."
              rows={3}
            />
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
