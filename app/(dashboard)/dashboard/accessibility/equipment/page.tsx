'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { accessibilityService } from '@/lib/services/accessibility.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EquipmentCard } from '@/components/accessibility/equipment-card'
import { EquipmentForm } from '@/components/accessibility/equipment-form'
import { Package, Plus, Search, Filter, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function EquipmentPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'mobility' | 'visual' | 'auditory' | 'ergonomic' | 'software' | 'other' | ''>('')
  const [statusFilter, setStatusFilter] = useState<'available' | 'in_use' | 'maintenance' | 'retired' | ''>('')
  const [showForm, setShowForm] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<any>(null)

  // Query équipements
  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['accessibility-equipment', user?.organization_id, categoryFilter, statusFilter],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return await accessibilityService.getEquipment(user.organization_id, {
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      })
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Filtrer par recherche textuelle
  const filteredEquipment = equipment.filter((eq) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      eq.name?.toLowerCase().includes(searchLower) ||
      eq.description?.toLowerCase().includes(searchLower) ||
      eq.location?.toLowerCase().includes(searchLower)
    )
  })

  // Statistiques
  const stats = {
    total: equipment.length,
    available: equipment.filter((eq) => eq.status === 'available' && eq.quantity_available > 0).length,
    in_use: equipment.filter((eq) => eq.status === 'in_use').length,
    maintenance: equipment.filter((eq) => eq.status === 'maintenance').length,
    total_capacity: equipment.reduce((sum, eq) => sum + (eq.quantity_total || 0), 0),
    total_available: equipment.reduce((sum, eq) => sum + (eq.quantity_available || 0), 0),
  }

  const categories = [
    { value: '', label: 'Toutes catégories' },
    { value: 'mobility', label: 'Mobilité' },
    { value: 'visual', label: 'Visuel' },
    { value: 'auditory', label: 'Auditif' },
    { value: 'ergonomic', label: 'Ergonomique' },
    { value: 'software', label: 'Logiciel' },
    { value: 'other', label: 'Autre' },
  ]

  const statuses = [
    { value: '', label: 'Tous statuts' },
    { value: 'available', label: 'Disponible' },
    { value: 'in_use', label: 'En utilisation' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'retired', label: 'Retiré' },
  ]

  const handleEdit = (eq: any) => {
    setEditingEquipment(eq)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingEquipment(null)
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/accessibility">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              Gestion des Équipements
            </h1>
            <p className="text-muted-foreground mt-1">
              Inventaire et suivi des équipements adaptés
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un équipement
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total équipements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.available}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En utilisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.in_use}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{stats.maintenance}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Capacité totale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.total_available} / {stats.total_capacity}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, description ou localisation..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
                className="w-full px-4 py-2 border-2 border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-full px-4 py-2 border-2 border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(search || categoryFilter || statusFilter) && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground">Filtres actifs:</span>
              {search && (
                <Badge variant="outline">
                  Recherche: {search}
                  <button onClick={() => setSearch('')} className="ml-2">×</button>
                </Badge>
              )}
              {categoryFilter && (
                <Badge variant="outline">
                  {categories.find((c) => c.value === categoryFilter)?.label}
                  <button onClick={() => setCategoryFilter('')} className="ml-2">×</button>
                </Badge>
              )}
              {statusFilter && (
                <Badge variant="outline">
                  {statuses.find((s) => s.value === statusFilter)?.label}
                  <button onClick={() => setStatusFilter('')} className="ml-2">×</button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des équipements */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Chargement des équipements...</p>
          </CardContent>
        </Card>
      ) : filteredEquipment.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun équipement trouvé</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {equipment.length === 0
                ? 'Commencez par ajouter votre premier équipement adapté'
                : 'Aucun équipement ne correspond à vos critères de recherche'}
            </p>
            {equipment.length === 0 && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un équipement
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map((eq) => (
            <EquipmentCard
              key={eq.id}
              equipment={eq}
              onEdit={() => handleEdit(eq)}
              showActions
            />
          ))}
        </div>
      )}

      {/* Dialog formulaire */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEquipment ? 'Modifier l\'équipement' : 'Nouvel équipement'}
            </DialogTitle>
            <DialogDescription>
              {editingEquipment
                ? 'Modifiez les informations de l\'équipement'
                : 'Ajoutez un nouvel équipement adapté à votre inventaire'}
            </DialogDescription>
          </DialogHeader>
          <EquipmentForm
            organizationId={user.organization_id || ''}
            equipmentId={editingEquipment?.id}
            initialData={editingEquipment}
            onSuccess={handleCloseForm}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
