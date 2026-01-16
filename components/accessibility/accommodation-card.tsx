'use client'

import { Accommodation } from '@/lib/services/accessibility.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Calendar, User, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AccommodationCardProps {
  accommodation: Accommodation
  onEdit?: () => void
  onArchive?: () => void
  showActions?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  physical: 'Physique',
  pedagogical: 'Pédagogique',
  exam: 'Examen',
  technical: 'Aide technique',
  schedule: 'Emploi du temps',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  expired: 'bg-red-100 text-red-800',
}

export function AccommodationCard({ accommodation, onEdit, onArchive, showActions = true }: AccommodationCardProps) {
  const isActive = accommodation.status === 'active'
  const isExpired = accommodation.end_date && new Date(accommodation.end_date) < new Date()

  return (
    <Card className={`${isActive ? 'border-green-200' : ''} hover:shadow-md transition-shadow`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{accommodation.title}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {TYPE_LABELS[accommodation.accommodation_type] || accommodation.accommodation_type}
              </Badge>
              <Badge className={`${STATUS_COLORS[accommodation.status]} text-xs`}>
                {accommodation.status === 'active'
                  ? 'Actif'
                  : accommodation.status === 'inactive'
                    ? 'Inactif'
                    : 'Expiré'}
              </Badge>
            </div>
          </div>
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>Modifier</DropdownMenuItem>
                <DropdownMenuItem onClick={onArchive} className="text-red-600">
                  Archiver
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {accommodation.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{accommodation.description}</p>
        )}

        {/* Période */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            {accommodation.start_date ? new Date(accommodation.start_date).toLocaleDateString('fr-FR') : 'Non défini'}
            {' → '}
            {accommodation.end_date ? new Date(accommodation.end_date).toLocaleDateString('fr-FR') : 'Indéterminé'}
          </span>
        </div>

        {/* Responsable */}
        {accommodation.assigned_to_user_id && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Responsable: {accommodation.assigned_to_user_id.slice(0, 8)}...</span>
          </div>
        )}

        {/* Progression */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium">{accommodation.completion_rate}%</span>
          </div>
          <Progress value={accommodation.completion_rate} className="h-2" />
        </div>

        {isExpired && (
          <p className="text-xs text-red-600 font-medium">⚠️ Cet aménagement a expiré</p>
        )}
      </CardContent>
    </Card>
  )
}
