'use client'

import { Equipment } from '@/lib/services/accessibility.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, MapPin, Calendar, AlertCircle } from 'lucide-react'

interface EquipmentCardProps {
  equipment: Equipment
  onAssign?: () => void
  onEdit?: () => void
  showActions?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  mobility: 'Mobilité',
  visual: 'Visuel',
  auditory: 'Auditif',
  ergonomic: 'Ergonomique',
  software: 'Logiciel',
  other: 'Autre',
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  in_use: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  retired: 'bg-gray-100 text-gray-800',
}

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  in_use: 'En utilisation',
  maintenance: 'Maintenance',
  retired: 'Retiré',
}

export function EquipmentCard({ equipment, onAssign, onEdit, showActions = true }: EquipmentCardProps) {
  const isAvailable = equipment.status === 'available' && equipment.quantity_available > 0
  const needsMaintenance =
    equipment.next_maintenance_date && new Date(equipment.next_maintenance_date) < new Date()

  return (
    <Card className={`${isAvailable ? 'border-green-200' : ''} hover:shadow-md transition-shadow`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              {equipment.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              {equipment.category && (
                <Badge variant="outline" className="text-xs">
                  {CATEGORY_LABELS[equipment.category] || equipment.category}
                </Badge>
              )}
              <Badge className={`${STATUS_COLORS[equipment.status]} text-xs`}>
                {STATUS_LABELS[equipment.status]}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {equipment.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{equipment.description}</p>
        )}

        {/* Disponibilité */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <span className="text-sm text-muted-foreground">Disponibilité</span>
          <span className={`text-sm font-medium ${isAvailable ? 'text-green-600' : 'text-gray-600'}`}>
            {equipment.quantity_available} / {equipment.quantity_total}
          </span>
        </div>

        {/* Localisation */}
        {equipment.location && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{equipment.location}</span>
          </div>
        )}

        {/* Maintenance */}
        {equipment.next_maintenance_date && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              Prochaine maintenance : {new Date(equipment.next_maintenance_date).toLocaleDateString('fr-FR')}
            </span>
          </div>
        )}

        {needsMaintenance && (
          <div className="flex items-center gap-2 text-xs text-yellow-600 font-medium">
            <AlertCircle className="h-3 w-3" />
            <span>Maintenance requise</span>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            {isAvailable && onAssign && (
              <Button onClick={onAssign} size="sm" className="flex-1">
                Attribuer
              </Button>
            )}
            {onEdit && (
              <Button onClick={onEdit} variant="outline" size="sm" className={isAvailable ? '' : 'flex-1'}>
                Modifier
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
