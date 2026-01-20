'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { DollarSign, Plus, Edit, Trash2, X, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from '@/components/ui/motion'

export default function FundingTypesPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    is_active: true,
    requires_documentation: false,
    requires_approval: false,
    display_order: 0,
    bpf_category: '',
  })

  // Récupérer les types de financement
  const { data: fundingTypes, isLoading } = useQuery({
    queryKey: ['funding-types', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('funding_types' as any)
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Mutation pour créer un type de financement
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      const { data: result, error } = await supabase
        .from('funding_types' as any)
        .insert({
          ...data,
          bpf_category: data.bpf_category || null,
          organization_id: user.organization_id,
          created_by: user.id,
        })
        .select()
        .single()
      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding-types', user?.organization_id] })
      setShowForm(false)
      resetForm()
      addToast({
        title: 'Type de financement créé',
        description: 'Le type de financement a été créé avec succès.',
        type: 'success',
      })
    },
    onError: (error: Error) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la création.',
        type: 'error',
      })
    },
  })

  // Mutation pour mettre à jour un type de financement
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      const { data: result, error } = await supabase
        .from('funding_types' as any)
        .update({
          ...data,
          bpf_category: data.bpf_category || null,
          updated_by: user.id,
        })
        .eq('id', id)
        .eq('organization_id', user.organization_id)
        .select()
        .single()
      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding-types', user?.organization_id] })
      setEditingId(null)
      resetForm()
      addToast({
        title: 'Type de financement mis à jour',
        description: 'Le type de financement a été mis à jour avec succès.',
        type: 'success',
      })
    },
    onError: (error: Error) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la mise à jour.',
        type: 'error',
      })
    },
  })

  // Mutation pour supprimer un type de financement
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      const { error } = await supabase
        .from('funding_types' as any)
        .delete()
        .eq('id', id)
        .eq('organization_id', user.organization_id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding-types', user?.organization_id] })
      addToast({
        title: 'Type de financement supprimé',
        description: 'Le type de financement a été supprimé avec succès.',
        type: 'success',
      })
    },
    onError: (error: Error) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la suppression.',
        type: 'error',
      })
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      is_active: true,
      requires_documentation: false,
      requires_approval: false,
      display_order: 0,
      bpf_category: '',
    })
    setEditingId(null)
  }

  const handleEdit = (type: any) => {
    setFormData({
      name: type.name || '',
      code: type.code || '',
      description: type.description || '',
      is_active: type.is_active ?? true,
      requires_documentation: type.requires_documentation ?? false,
      requires_approval: type.requires_approval ?? false,
      display_order: type.display_order || 0,
      bpf_category: type.bpf_category || '',
    })
    setEditingId(type.id)
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce type de financement ?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Types de financement</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gérez les types de financement disponibles pour les inscriptions
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouveau type
        </Button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingId ? 'Modifier le type' : 'Nouveau type de financement'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ex: CPF, OPCO, Personnel..."
                  />
                </div>
                <div>
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ex: CPF, OPCO, PERS"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du type de financement..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Actif</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.requires_documentation}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_documentation: checked })}
                  />
                  <Label htmlFor="requires_documentation">Documentation requise</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.requires_approval}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: checked })}
                  />
                  <Label htmlFor="requires_approval">Approbation requise</Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="display_order">Ordre d'affichage</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="bpf_category">Catégorie BPF</Label>
                  <select
                    id="bpf_category"
                    value={formData.bpf_category}
                    onChange={(e) => setFormData({ ...formData, bpf_category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    <option value="cpf">CPF (Mon Compte Formation)</option>
                    <option value="opco">OPCO (Opérateurs de compétences)</option>
                    <option value="companies">Entreprises</option>
                    <option value="individuals">Particuliers</option>
                    <option value="pole_emploi">Pôle Emploi</option>
                    <option value="regions">Régions</option>
                    <option value="state">État</option>
                    <option value="other">Autres</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Cette catégorie sera utilisée pour le calcul automatique du BPF
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {editingId ? 'Enregistrer' : 'Créer'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Liste des types de financement */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">Chargement...</p>
          </CardContent>
        </Card>
      ) : fundingTypes && fundingTypes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fundingTypes.map((type: any) => (
            <GlassCard key={type.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-brand-blue/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-brand-blue" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{type.name}</h3>
                    {type.code && (
                      <p className="text-sm text-gray-500">Code: {type.code}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(type)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(type.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              {type.description && (
                <p className="text-sm text-gray-600 mb-4">{type.description}</p>
              )}
              {type.bpf_category && (
                <div className="mb-3">
                  <span className="text-xs font-medium text-gray-500">Catégorie BPF:</span>
                  <span className="ml-2 text-xs px-2 py-1 bg-brand-blue/10 text-brand-blue rounded">
                    {type.bpf_category === 'cpf' && 'CPF'}
                    {type.bpf_category === 'opco' && 'OPCO'}
                    {type.bpf_category === 'companies' && 'Entreprises'}
                    {type.bpf_category === 'individuals' && 'Particuliers'}
                    {type.bpf_category === 'pole_emploi' && 'Pôle Emploi'}
                    {type.bpf_category === 'regions' && 'Régions'}
                    {type.bpf_category === 'state' && 'État'}
                    {type.bpf_category === 'other' && 'Autres'}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {type.is_active ? (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                    Actif
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    Inactif
                  </span>
                )}
                {type.requires_documentation && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                    Documentation requise
                  </span>
                )}
                {type.requires_approval && (
                  <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded">
                    Approbation requise
                  </span>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun type de financement
            </h3>
            <p className="text-gray-500 mb-4">
              Créez votre premier type de financement pour commencer.
            </p>
            <Button
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Créer un type de financement
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
