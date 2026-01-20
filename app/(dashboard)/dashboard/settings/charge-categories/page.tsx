'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { sessionChargesService } from '@/lib/services/session-charges.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { Receipt, Plus, Edit, Trash2, X, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const BPF_CATEGORIES = [
  { value: 'subcontracting', label: 'Sous-traitance' },
  { value: 'location', label: 'Location de locaux' },
  { value: 'equipment', label: 'Équipements / Matériel' },
  { value: 'supplies', label: 'Fournitures / Restauration' },
  { value: 'other', label: 'Autres' },
] as const

export default function ChargeCategoriesPage() {
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
    bpf_category: '',
  })

  const { data: categories, isLoading } = useQuery({
    queryKey: ['charge-categories', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      let list = await sessionChargesService.getCategories(user.organization_id)
      if (list.length === 0) {
        await sessionChargesService.initDefaultCategories(user.organization_id)
        list = await sessionChargesService.getCategories(user.organization_id)
      }
      return list
    },
    enabled: !!user?.organization_id,
  })

  // Pour bpf_category, on doit lire depuis la table (getCategories ne l'expose pas forcément). On fait un select direct.
  const { data: categoriesWithBpf } = useQuery({
    queryKey: ['charge-categories-bpf', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('charge_categories' as any)
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.organization_id) throw new Error('Organisation manquante')
      const code = data.code || data.name.toUpperCase().replace(/\s+/g, '_').slice(0, 50)
      const { data: row, error } = await supabase
        .from('charge_categories' as any)
        .insert({
          organization_id: user.organization_id,
          name: data.name,
          code,
          description: data.description || null,
          is_active: data.is_active,
          bpf_category: data.bpf_category || null,
        })
        .select()
        .single()
      if (error) throw error
      return row
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charge-categories', user?.organization_id] })
      queryClient.invalidateQueries({ queryKey: ['charge-categories-bpf', user?.organization_id] })
      setShowForm(false)
      resetForm()
      addToast({ title: 'Catégorie créée', description: 'La catégorie a été créée.', type: 'success' })
    },
    onError: (e: Error) => {
      addToast({ title: 'Erreur', description: e.message, type: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      if (!user?.organization_id) throw new Error('Organisation manquante')
      const { error } = await supabase
        .from('charge_categories' as any)
        .update({
          name: data.name,
          code: data.code,
          description: data.description || null,
          is_active: data.is_active,
          bpf_category: data.bpf_category || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', user.organization_id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charge-categories', user?.organization_id] })
      queryClient.invalidateQueries({ queryKey: ['charge-categories-bpf', user?.organization_id] })
      setEditingId(null)
      resetForm()
      addToast({ title: 'Catégorie mise à jour', type: 'success' })
    },
    onError: (e: Error) => {
      addToast({ title: 'Erreur', description: e.message, type: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('charge_categories' as any)
        .delete()
        .eq('id', id)
        .eq('organization_id', user!.organization_id!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charge-categories', user?.organization_id] })
      queryClient.invalidateQueries({ queryKey: ['charge-categories-bpf', user?.organization_id] })
      addToast({ title: 'Catégorie supprimée', type: 'success' })
    },
    onError: (e: Error) => {
      addToast({ title: 'Erreur', description: e.message, type: 'error' })
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      is_active: true,
      bpf_category: '',
    })
    setEditingId(null)
  }

  const handleEdit = (c: any) => {
    setFormData({
      name: c.name || '',
      code: c.code || '',
      description: c.description || '',
      is_active: c.is_active ?? true,
      bpf_category: c.bpf_category || '',
    })
    setEditingId(c.id)
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

  const handleSaveBpf = async (id: string, bpf: string) => {
    if (!user?.organization_id) return
    const { error } = await supabase
      .from('charge_categories' as any)
      .update({ bpf_category: bpf || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', user.organization_id)
    if (error) {
      addToast({ title: 'Erreur', description: error.message, type: 'error' })
      return
    }
    queryClient.invalidateQueries({ queryKey: ['charge-categories', user.organization_id] })
    queryClient.invalidateQueries({ queryKey: ['charge-categories-bpf', user.organization_id] })
    addToast({ title: 'Catégorie BPF enregistrée', type: 'success' })
  }

  const getBpfLabel = (value: string) => BPF_CATEGORIES.find((o) => o.value === value)?.label || value

  const list = categoriesWithBpf || categories || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Catégories de charges</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gérez les catégories et leur rattachement au BPF (Bilan Pédagogique et Financier)
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
          Nouvelle catégorie
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingId ? 'Modifier' : 'Nouvelle catégorie'}</CardTitle>
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
                    placeholder="Ex: Formateur externe, Location salle..."
                  />
                </div>
                <div>
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ex: FORMATEUR_EXT, LOCATION"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                  />
                  <Label>Actif</Label>
                </div>
                <div className="flex-1">
                  <Label htmlFor="bpf_category">Catégorie BPF</Label>
                  <select
                    id="bpf_category"
                    value={formData.bpf_category}
                    onChange={(e) => setFormData({ ...formData, bpf_category: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                  >
                    <option value="">Aucune</option>
                    {BPF_CATEGORIES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Utilisée pour le calcul automatique du BPF</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
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

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-gray-500">Chargement...</CardContent></Card>
      ) : list.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(list as any[]).map((c) => (
            <GlassCard key={c.id} className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-blue/10 rounded-lg">
                    <Receipt className="h-5 w-5 text-brand-blue" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    {c.code && <p className="text-sm text-gray-500">{c.code}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => confirm('Supprimer ?') && deleteMutation.mutate(c.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              {c.description && <p className="text-sm text-gray-600 mb-3">{c.description}</p>}
              {c.bpf_category && (
                <div className="mb-3">
                  <span className="text-xs font-medium text-gray-500">Catégorie BPF:</span>
                  <span className="ml-2 text-xs px-2 py-1 bg-brand-blue/10 text-brand-blue rounded">
                    {getBpfLabel(c.bpf_category)}
                  </span>
                </div>
              )}
              <div>
                <Label className="text-xs text-gray-500">Catégorie BPF</Label>
                <select
                  value={c.bpf_category || ''}
                  onChange={(e) => handleSaveBpf(c.id, e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 text-sm rounded border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                >
                  <option value="">Aucune</option>
                  {BPF_CATEGORIES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Utilisée pour le calcul automatique du BPF</p>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune catégorie</h3>
            <p className="text-gray-500 mb-4">Les catégories par défaut seront créées à la première utilisation.</p>
            <Button
              onClick={async () => {
                if (user?.organization_id) {
                  await sessionChargesService.initDefaultCategories(user.organization_id)
                  queryClient.invalidateQueries({ queryKey: ['charge-categories', user.organization_id] })
                  queryClient.invalidateQueries({ queryKey: ['charge-categories-bpf', user.organization_id] })
                  addToast({ title: 'Catégories par défaut créées', type: 'success' })
                }
              }}
            >
              Initialiser les catégories par défaut
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
