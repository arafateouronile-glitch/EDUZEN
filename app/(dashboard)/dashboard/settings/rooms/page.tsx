'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { roomService } from '@/lib/services/room.service.client'
import type { Room, RoomInsert, RoomUpdate } from '@/lib/services/room.service.client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { Plus, DoorOpen, Car, Edit, Trash2, Users, MapPin } from 'lucide-react'
import { RoleGuard, FORMATION_MANAGEMENT_ROLES } from '@/components/auth/role-guard'

const supabase = createClient()

const LABEL_OPTIONS = [
  { singular: 'Salle', plural: 'Salles', icon: 'room' },
  { singular: 'Véhicule', plural: 'Véhicules', icon: 'car' },
  { singular: 'Espace', plural: 'Espaces', icon: 'room' },
  { singular: 'Studio', plural: 'Studios', icon: 'room' },
  { singular: 'Atelier', plural: 'Ateliers', icon: 'room' },
]

interface RoomFormData {
  name: string
  code: string
  description: string
  capacity: string
  location: string
  is_active: boolean
}

const emptyForm: RoomFormData = {
  name: '',
  code: '',
  description: '',
  capacity: '',
  location: '',
  is_active: true,
}

export default function RoomsSettingsPage() {
  return (
    <RoleGuard allowedRoles={FORMATION_MANAGEMENT_ROLES}>
      <RoomsPageContent />
    </RoleGuard>
  )
}

function RoomsPageContent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [formData, setFormData] = useState<RoomFormData>(emptyForm)
  const [showInactive, setShowInactive] = useState(false)

  const { data: org } = useQuery({
    queryKey: ['organization-room-label', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data } = await supabase
        .from('organizations')
        .select('id, settings')
        .eq('id', user.organization_id)
        .maybeSingle()
      return data
    },
    enabled: !!user?.organization_id,
  })

  const settings = (org?.settings as Record<string, any>) ?? {}
  const labelSingular: string = settings.room_label ?? 'Salle'
  const labelPlural: string = settings.room_label_plural ?? 'Salles'
  const isVehicle = labelSingular === 'Véhicule'
  const RoomIcon = isVehicle ? Car : DoorOpen

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms', user?.organization_id, showInactive],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return roomService.getAll(user.organization_id, showInactive ? undefined : { isActive: true })
    },
    enabled: !!user?.organization_id,
  })

  const createMutation = useMutation({
    mutationFn: async (data: RoomFormData) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      const payload: RoomInsert = {
        organization_id: user.organization_id,
        name: data.name.trim(),
        code: data.code.trim() || null,
        description: data.description.trim() || null,
        capacity: data.capacity ? parseInt(data.capacity) : null,
        location: data.location.trim() || null,
        is_active: data.is_active,
      }
      return roomService.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setShowForm(false)
      setFormData(emptyForm)
      addToast({ title: 'Succès', description: `${labelSingular} créé(e) avec succès`, type: 'success' })
    },
    onError: (error: any) => {
      addToast({ title: 'Erreur', description: error.message || 'Erreur lors de la création', type: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RoomFormData }) => {
      const payload: RoomUpdate = {
        name: data.name.trim(),
        code: data.code.trim() || null,
        description: data.description.trim() || null,
        capacity: data.capacity ? parseInt(data.capacity) : null,
        location: data.location.trim() || null,
        is_active: data.is_active,
      }
      return roomService.update(id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setShowForm(false)
      setEditingRoom(null)
      setFormData(emptyForm)
      addToast({ title: 'Succès', description: `${labelSingular} mis(e) à jour`, type: 'success' })
    },
    onError: (error: any) => {
      addToast({ title: 'Erreur', description: error.message || 'Erreur lors de la mise à jour', type: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roomService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      addToast({ title: 'Succès', description: `${labelSingular} désactivé(e)`, type: 'success' })
    },
    onError: (error: any) => {
      addToast({ title: 'Erreur', description: error.message, type: 'error' })
    },
  })

  const updateLabelMutation = useMutation({
    mutationFn: async (option: typeof LABEL_OPTIONS[0]) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      const currentSettings = settings ?? {}
      const { error } = await supabase
        .from('organizations')
        .update({
          settings: {
            ...currentSettings,
            room_label: option.singular,
            room_label_plural: option.plural,
          },
        } as any)
        .eq('id', user.organization_id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-room-label'] })
      addToast({ title: 'Nomenclature mise à jour', type: 'success' })
    },
    onError: (error: any) => {
      addToast({ title: 'Erreur', description: error.message, type: 'error' })
    },
  })

  const handleEdit = (room: Room) => {
    setEditingRoom(room)
    setFormData({
      name: room.name,
      code: room.code ?? '',
      description: room.description ?? '',
      capacity: room.capacity?.toString() ?? '',
      location: room.location ?? '',
      is_active: room.is_active,
    })
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (!confirm(`Désactiver ce(tte) ${labelSingular.toLowerCase()} ?`)) return
    deleteMutation.mutate(id)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const openCreate = () => {
    setEditingRoom(null)
    setFormData(emptyForm)
    setShowForm(true)
  }

  const activeRooms = rooms?.filter(r => r.is_active) ?? []
  const inactiveRooms = rooms?.filter(r => !r.is_active) ?? []

  return (
    <div className="p-6 space-y-8">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{labelPlural}</h1>
          <p className="text-gray-600 mt-1">
            Gérez les {labelPlural.toLowerCase()} disponibles dans votre organisation
          </p>
        </div>
        <Button onClick={openCreate} className="bg-brand-blue hover:bg-brand-blue-dark">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau(elle) {labelSingular}
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3">
        <Switch
          checked={showInactive}
          onCheckedChange={setShowInactive}
          id="show-inactive"
        />
        <Label htmlFor="show-inactive" className="cursor-pointer text-sm text-gray-600">
          Afficher les {labelPlural.toLowerCase()} désactivé(e)s
        </Label>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : (rooms?.length ?? 0) === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <RoomIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune {labelSingular.toLowerCase()} pour l'instant</p>
          <p className="text-gray-400 text-sm mt-1">Cliquez sur "Nouveau(elle) {labelSingular}" pour commencer</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeRooms.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  labelSingular={labelSingular}
                  RoomIcon={RoomIcon}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
          {showInactive && inactiveRooms.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-3">Désactivé(e)s</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {inactiveRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    labelSingular={labelSingular}
                    RoomIcon={RoomIcon}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section nomenclature */}
      <div className="border-t pt-8">
        <h2 className="text-lg font-semibold mb-1">Nomenclature</h2>
        <p className="text-sm text-gray-500 mb-4">
          Choisissez comment appeler ces espaces dans toute l'application.
        </p>
        <div className="flex items-center gap-4">
          <Select
            value={labelSingular}
            onValueChange={(val) => {
              const opt = LABEL_OPTIONS.find(o => o.singular === val)
              if (opt) updateLabelMutation.mutate(opt)
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LABEL_OPTIONS.map((opt) => (
                <SelectItem key={opt.singular} value={opt.singular}>
                  {opt.singular} / {opt.plural}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500">
            Actuellement : <strong>{labelSingular}</strong> / <strong>{labelPlural}</strong>
          </span>
        </div>
      </div>

      {/* Dialog création / édition */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingRoom(null); setFormData(emptyForm) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? `Modifier la ${labelSingular.toLowerCase()}` : `Nouveau(elle) ${labelSingular}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="room-name">Nom *</Label>
                <Input
                  id="room-name"
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder={`Ex: ${labelSingular} A, ${labelSingular} 12...`}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="room-code">Code</Label>
                <Input
                  id="room-code"
                  value={formData.code}
                  onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
                  placeholder="Ex: R01, SA..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="room-capacity">
                  {isVehicle ? 'Nb de places' : 'Capacité (personnes)'}
                </Label>
                <Input
                  id="room-capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={e => setFormData(p => ({ ...p, capacity: e.target.value }))}
                  placeholder="Ex: 20"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="room-location">Localisation</Label>
                <Input
                  id="room-location"
                  value={formData.location}
                  onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                  placeholder={isVehicle ? 'Ex: Parking principal' : 'Ex: Bâtiment A, 2ème étage'}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="room-description">Description</Label>
                <Textarea
                  id="room-description"
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder={isVehicle ? 'Ex: Renault Clio, boîte automatique...' : 'Ex: Équipée d\'un vidéoprojecteur et tableau interactif'}
                  rows={3}
                />
              </div>
              {editingRoom && (
                <div className="col-span-2 flex items-center gap-3">
                  <Switch
                    id="room-active"
                    checked={formData.is_active}
                    onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))}
                  />
                  <Label htmlFor="room-active">Active</Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingRoom(null); setFormData(emptyForm) }}>
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-brand-blue hover:bg-brand-blue-dark"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingRoom ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RoomCard({
  room,
  labelSingular,
  RoomIcon,
  onEdit,
  onDelete,
}: {
  room: Room
  labelSingular: string
  RoomIcon: React.ElementType
  onEdit: (room: Room) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <RoomIcon className="w-4 h-4 text-brand-blue flex-shrink-0" />
              <span className="truncate">{room.name}</span>
            </CardTitle>
            {room.code && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded font-mono">
                {room.code}
              </span>
            )}
          </div>
          <div className="flex gap-1 ml-2 flex-shrink-0">
            <Button variant="outline" size="icon" onClick={() => onEdit(room)}>
              <Edit className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => onDelete(room.id)}>
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm text-gray-600">
        {room.capacity && (
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span>{room.capacity} place{room.capacity > 1 ? 's' : ''}</span>
          </div>
        )}
        {room.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span className="truncate">{room.location}</span>
          </div>
        )}
        {room.description && (
          <p className="text-gray-500 text-xs line-clamp-2 pt-1">{room.description}</p>
        )}
        {!room.is_active && (
          <span className="inline-block px-2 py-0.5 text-xs bg-red-50 text-red-600 rounded">
            Inactif(ve)
          </span>
        )}
      </CardContent>
    </Card>
  )
}
