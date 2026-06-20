'use client'

/**
 * Page Actions correctives Qualiopi
 * Liste et création des actions correctives liées aux indicateurs.
 * La boucle "résultat d'évaluation → action documentée" est exigée par l'indicateur 10 Qualiopi.
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { qualiopiService } from '@/lib/services/qualiopi.service.client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Sparkles, AlertTriangle, Clock, CheckCircle2, XCircle, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUS_CONFIG = {
  pending: { label: 'À faire', icon: Clock, color: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'En cours', icon: Clock, color: 'bg-[#34B9EE]/10 text-[#34B9EE] border-[#34B9EE]/20' },
  completed: { label: 'Terminée', icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'Annulée', icon: XCircle, color: 'bg-slate-100 text-slate-500 border-slate-200' },
}

const PRIORITY_CONFIG = {
  low: { label: 'Basse', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Moyenne', color: 'bg-amber-100 text-amber-700' },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critique', color: 'bg-red-100 text-red-700' },
}

const INDICATOR_OPTIONS = [
  { value: '', label: 'Indicateur non spécifié' },
  { value: '7', label: 'Indicateur 7 — Satisfaction des apprenants' },
  { value: '10', label: 'Indicateur 10 — Amélioration continue' },
  { value: '14', label: 'Indicateur 14 — Effets de la formation' },
  { value: '29', label: 'Indicateur 29 — Recueil des appréciations' },
  { value: '30', label: 'Indicateur 30 — Traitement des réclamations' },
  { value: '31', label: 'Indicateur 31 — Mesures d\'amélioration' },
  { value: '32', label: 'Indicateur 32 — Amélioration continue documentée' },
  { value: 'autre', label: 'Autre' },
]

interface FormState {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  indicator: string
  due_date: string
}

const FORM_EMPTY: FormState = {
  title: '',
  description: '',
  priority: 'medium',
  indicator: '',
  due_date: '',
}

export default function QualiopiActionsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(FORM_EMPTY)

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['qualiopi-corrective-actions', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      try {
        return await qualiopiService.getCorrectiveActions(user.organization_id)
      } catch {
        return []
      }
    },
    enabled: !!user?.organization_id,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id || !user?.id) throw new Error('Session expirée')
      if (!form.title.trim()) throw new Error('Le titre est obligatoire')
      if (!form.description.trim()) throw new Error('La description est obligatoire')
      return qualiopiService.createCorrectiveAction({
        organization_id: user.organization_id,
        created_by: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        status: 'pending',
        due_date: form.due_date || undefined,
        // Stocke le numéro d'indicateur dans le champ indicator_id en attendant une FK dédiée
        indicator_id: form.indicator || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualiopi-corrective-actions'] })
      addToast({ type: 'success', title: 'Action créée', description: 'L\'action corrective a été enregistrée.' })
      setForm(FORM_EMPTY)
      setShowForm(false)
    },
    onError: (e: Error) => {
      addToast({ type: 'error', title: 'Erreur', description: e.message })
    },
  })

  const byStatus = {
    pending: actions.filter((a) => a.status === 'pending'),
    in_progress: actions.filter((a) => a.status === 'in_progress'),
    completed: actions.filter((a) => a.status === 'completed'),
    cancelled: actions.filter((a) => a.status === 'cancelled'),
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard/qualiopi">
            <Button variant="ghost" size="sm" className="mb-2 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour au dashboard Qualiopi
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-[#274472]" />
            Actions correctives
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Boucle d&apos;amélioration continue — chaque action documente la réponse de l&apos;OF aux résultats d&apos;évaluation (Qualiopi indicateur 10).
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-[#274472] hover:bg-[#1a2f4a] gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvelle action corrective
        </Button>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <Card className="border-[#274472]/20 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nouvelle action corrective</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setForm(FORM_EMPTY) }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Documentez une action mise en œuvre suite aux résultats d&apos;évaluation ou à une réclamation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="action-title">Titre de l&apos;action *</Label>
              <Input
                id="action-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex : Révision des supports pédagogiques du module 3"
              />
            </div>
            <div>
              <Label htmlFor="action-desc">Description et plan de mise en œuvre *</Label>
              <Textarea
                id="action-desc"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Décrivez ce qui a motivé cette action (retours apprenants, score faible, réclamation…) et les mesures concrètes mises en place."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="action-indicator">Indicateur Qualiopi concerné</Label>
                <select
                  id="action-indicator"
                  value={form.indicator}
                  onChange={(e) => setForm({ ...form, indicator: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                >
                  {INDICATOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="action-priority">Priorité</Label>
                <select
                  id="action-priority"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as FormState['priority'] })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="critical">Critique</option>
                </select>
              </div>
              <div>
                <Label htmlFor="action-due">Échéance</Label>
                <Input
                  id="action-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setForm(FORM_EMPTY) }}>
                Annuler
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.title.trim() || !form.description.trim()}
                className="bg-[#274472] hover:bg-[#1a2f4a]"
              >
                {createMutation.isPending ? 'Enregistrement…' : 'Enregistrer l\'action'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">À faire</p>
            <p className="text-2xl font-bold">{byStatus.pending.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">En cours</p>
            <p className="text-2xl font-bold text-[#34B9EE]">{byStatus.in_progress.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Terminées</p>
            <p className="text-2xl font-bold text-green-600">{byStatus.completed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{actions.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des actions */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des actions</CardTitle>
          <CardDescription>
            Chaque action corrective constitue une preuve de la boucle d&apos;amélioration continue (Qualiopi indicateur 10).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Chargement…</p>
          ) : actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">Aucune action corrective</p>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Créez une action corrective pour documenter les améliorations mises en place suite aux résultats d&apos;évaluation.
              </p>
              <Button className="mt-4 bg-[#274472] hover:bg-[#1a2f4a] gap-2" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                Créer ma première action
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {actions.map((action) => {
                const statusConf = STATUS_CONFIG[action.status] ?? STATUS_CONFIG.pending
                const priorityConf = PRIORITY_CONFIG[action.priority] ?? PRIORITY_CONFIG.medium
                const StatusIcon = statusConf.icon
                return (
                  <li
                    key={action.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800">{action.title}</h3>
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                        {action.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className={statusConf.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConf.label}
                        </Badge>
                        <Badge variant="outline" className={priorityConf.color}>
                          {priorityConf.label}
                        </Badge>
                        {action.indicator_id && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Ind. {action.indicator_id}
                          </Badge>
                        )}
                        {action.due_date && (
                          <span className="text-xs text-slate-500">
                            Échéance : {format(new Date(action.due_date), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 shrink-0">
                      Créée le {format(new Date(action.created_at), 'dd MMM yyyy', { locale: fr })}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
