'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { RoleGuard, FORMATION_MANAGEMENT_ROLES } from '@/components/auth/role-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { ShieldCheck, Plus, Edit, Trash2, X, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const supabase = createClient()

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'diploma', label: 'Diplôme' },
  { value: 'certification', label: 'Certification' },
  { value: 'administrative', label: 'Administratif' },
  { value: 'identity', label: "Pièce d'identité" },
  { value: 'other', label: 'Autre' },
] as const

const REQUIRED_FOR_LABELS: Record<string, string> = {
  independant: 'Indépendant',
  salarie: 'Salarié',
  both: 'Les deux',
}

interface RequiredDocType {
  id: string
  code: string
  label: string
  required_for: 'independant' | 'salarie' | 'both'
  document_type: string
  renewal_months: number | null
  is_active: boolean
  sort_order: number
}

interface FormData {
  code: string
  label: string
  required_for: 'independant' | 'salarie' | 'both'
  document_type: string
  renewal_months: string
  is_active: boolean
}

const EMPTY_FORM: FormData = {
  code: '',
  label: '',
  required_for: 'both',
  document_type: 'administrative',
  renewal_months: '',
  is_active: true,
}

export default function TeacherDocumentTypesPage() {
  return (
    <RoleGuard allowedRoles={FORMATION_MANAGEMENT_ROLES}>
      <TeacherDocumentTypesContent />
    </RoleGuard>
  )
}

function TeacherDocumentTypesContent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)

  const { data: types, isLoading } = useQuery({
    queryKey: ['teacher-required-document-types-admin', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('teacher_required_document_types' as any)
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as RequiredDocType[]
    },
    enabled: !!user?.organization_id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher-required-document-types-admin', user?.organization_id] })
    // Les pages formateurs/teacher-documents dérivent leur catalogue de la même table
    queryClient.invalidateQueries({ queryKey: ['teacher-compliance'] })
  }

  const resetForm = () => {
    setFormData(EMPTY_FORM)
    setEditingId(null)
  }

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!user?.organization_id) throw new Error('Organisation manquante')
      const code = data.code.trim() || data.label.toUpperCase().replace(/\s+/g, '_').slice(0, 50)
      const { error } = await supabase
        .from('teacher_required_document_types' as any)
        .insert({
          organization_id: user.organization_id,
          code,
          label: data.label.trim(),
          required_for: data.required_for,
          document_type: data.document_type,
          renewal_months: data.renewal_months ? Number(data.renewal_months) : null,
          is_active: data.is_active,
          sort_order: types?.length ?? 0,
        } as any)
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      setShowForm(false)
      resetForm()
      addToast({ title: 'Document requis créé', type: 'success' })
    },
    onError: (e: any) => addToast({ title: 'Erreur', description: e.message, type: 'error' }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const { error } = await supabase
        .from('teacher_required_document_types' as any)
        .update({
          code: data.code.trim(),
          label: data.label.trim(),
          required_for: data.required_for,
          document_type: data.document_type,
          renewal_months: data.renewal_months ? Number(data.renewal_months) : null,
          is_active: data.is_active,
        } as any)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      setShowForm(false)
      resetForm()
      addToast({ title: 'Document requis mis à jour', type: 'success' })
    },
    onError: (e: any) => addToast({ title: 'Erreur', description: e.message, type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete : on désactive plutôt que supprimer, pour ne pas casser
      // l'historique des documents déjà rattachés (teacher_documents.required_document_type_id).
      const { error } = await supabase
        .from('teacher_required_document_types' as any)
        .update({ is_active: false } as any)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      addToast({ title: 'Document requis désactivé', type: 'success' })
    },
    onError: (e: any) => addToast({ title: 'Erreur', description: e.message, type: 'error' }),
  })

  const handleEdit = (t: RequiredDocType) => {
    setFormData({
      code: t.code,
      label: t.label,
      required_for: t.required_for,
      document_type: t.document_type,
      renewal_months: t.renewal_months?.toString() ?? '',
      is_active: t.is_active,
    })
    setEditingId(t.id)
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/formateurs">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Documents requis pour les formateurs</h1>
            <p className="mt-1 text-sm text-gray-600">
              Gérez la liste des documents de conformité exigés selon le statut (indépendant/salarié)
            </p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau document requis
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingId ? 'Modifier' : 'Nouveau document requis'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm() }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="label">Libellé *</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    required
                    placeholder="Ex: Assurance RC Pro"
                  />
                </div>
                <div>
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ex: rc_pro (généré automatiquement si vide)"
                  />
                </div>
                <div>
                  <Label>Requis pour</Label>
                  <Select
                    value={formData.required_for}
                    onValueChange={(v) => setFormData({ ...formData, required_for: v as FormData['required_for'] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent portal={false}>
                      <SelectItem value="both">Les deux</SelectItem>
                      <SelectItem value="independant">Indépendant</SelectItem>
                      <SelectItem value="salarie">Salarié</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type de document</Label>
                  <Select
                    value={formData.document_type}
                    onValueChange={(v) => setFormData({ ...formData, document_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent portal={false}>
                      {DOCUMENT_TYPE_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="renewal_months">Renouvellement (mois)</Label>
                  <Input
                    id="renewal_months"
                    type="number"
                    min="0"
                    value={formData.renewal_months}
                    onChange={(e) => setFormData({ ...formData, renewal_months: e.target.value })}
                    placeholder="Ex: 12 (laisser vide si pas de renouvellement)"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                  />
                  <Label>Actif</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm() }}>
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
      ) : types && types.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => (
            <GlassCard key={t.id} className={`p-6 ${!t.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-brand-blue/10 rounded-lg flex-shrink-0">
                    <ShieldCheck className="h-5 w-5 text-brand-blue" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{t.label}</h3>
                    <p className="text-sm text-gray-500">{t.code}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => confirm('Désactiver ce document requis ?') && deleteMutation.mutate(t.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                  {REQUIRED_FOR_LABELS[t.required_for]}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {DOCUMENT_TYPE_OPTIONS.find(o => o.value === t.document_type)?.label ?? t.document_type}
                </span>
                {t.renewal_months && (
                  <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded">
                    Renouvellement {t.renewal_months} mois
                  </span>
                )}
                {!t.is_active && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded">Inactif</span>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun document requis configuré</h3>
            <p className="text-gray-500 mb-4">
              Le catalogue par défaut se crée automatiquement à la première visite de la page Formateurs.
            </p>
            <Link href="/dashboard/formateurs">
              <Button>Aller à la page Formateurs</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
