'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  FileText,
  MoreVertical,
  Copy,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  ClipboardList,
  Link2,
  Send,
  ExternalLink,
  X,
  Clock,
  Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import type { EnrollmentFormTemplate } from '@/lib/types/enrollment-forms'
import { sendEnrollmentFormEmail } from '@/lib/actions/enrollment-form-actions'

interface TemplateWithStats extends EnrollmentFormTemplate {
  enrollment_form_links?: Array<{ enrollment_submissions?: Array<{ count: number }> }>
}

// ── Link + email modal ──────────────────────────────────────
function ShareModal({ templateId, onClose }: { templateId: string; onClose: () => void }) {
  const { addToast } = useToast()
  const [sessionId, setSessionId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [label, setLabel] = useState('')
  const [generatedLink, setGeneratedLink] = useState<{ token: string; id: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailRecipient, setEmailRecipient] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  const { data: sessions } = useQuery({
    queryKey: ['sessions-list'],
    queryFn: async () => {
      const res = await fetch('/api/sessions/active?limit=50')
      if (!res.ok) return []
      const d = await res.json()
      return d.sessions ?? d.data ?? []
    },
  })

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const generate = async () => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { template_id: templateId, label }
      if (sessionId) body.session_id = sessionId
      if (expiresAt) body.expires_at = new Date(expiresAt).toISOString()
      if (maxUses) body.max_uses = Number(maxUses)

      const res = await fetch('/api/enrollment-forms/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setGeneratedLink({ token: data.link.token, id: data.link.id })
    } catch {
      addToast({ type: 'error', title: 'Erreur lors de la génération du lien' })
    } finally {
      setLoading(false)
    }
  }

  const formUrl = generatedLink ? `${baseUrl}/s/${generatedLink.token}` : ''

  const copyLink = () => {
    navigator.clipboard.writeText(formUrl)
    addToast({ type: 'success', title: 'Lien copié !' })
  }

  const handleSendEmail = async () => {
    if (!emailRecipient || !generatedLink) return
    setSendingEmail(true)
    try {
      const result = await sendEnrollmentFormEmail(emailRecipient, generatedLink.id, emailMessage)
      if (result.success) {
        addToast({ type: 'success', title: `Email envoyé à ${emailRecipient}` })
        setEmailRecipient('')
        setEmailMessage('')
      } else {
        addToast({ type: 'error', title: result.error ?? 'Erreur envoi email' })
      }
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-gray-900 font-semibold text-lg">Partager le formulaire</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!generatedLink ? (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">Session (optionnel)</label>
              <select
                value={sessionId}
                onChange={e => setSessionId(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Aucune session —</option>
                {(sessions ?? []).map((s: { id: string; name: string }) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <p className="text-gray-400 text-xs mt-1">
                Si sélectionnée, l'apprenant sera ajouté automatiquement à la session.
              </p>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                Date d'expiration (optionnel)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                <Hash className="w-3.5 h-3.5 inline mr-1" />
                Nombre max d'utilisations (optionnel)
              </label>
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                placeholder="Illimité"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">Commentaire interne</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Ex: Session juin 2026"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Button onClick={generate} disabled={loading} className="w-full bg-brand-blue hover:bg-brand-blue-dark">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
              Générer le lien
            </Button>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div>
              <h3 className="text-gray-600 text-sm font-medium mb-2">Lien direct</h3>
              <div className="flex gap-2">
                <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-700 text-sm truncate font-mono">
                  {formUrl}
                </div>
                <Button variant="outline" size="icon" onClick={copyLink} className="flex-shrink-0" title="Copier">
                  <Copy className="w-4 h-4" />
                </Button>
                <a href={formUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="icon" title="Ouvrir">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-gray-600 text-sm font-medium mb-2">Envoyer par email</h3>
              <div className="space-y-2">
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={e => setEmailRecipient(e.target.value)}
                  placeholder="email@exemple.fr"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  placeholder="Message personnalisé (optionnel)..."
                  rows={2}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <Button
                  onClick={handleSendEmail}
                  disabled={!emailRecipient || sendingEmail}
                  variant="outline"
                  className="w-full"
                >
                  {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Envoyer par email
                </Button>
              </div>
            </div>

            <Button variant="outline" onClick={() => { setGeneratedLink(null); setSessionId(''); setExpiresAt(''); setMaxUses(''); setLabel('') }} className="w-full">
              Générer un autre lien
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full text-gray-500">
              Fermer
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

async function fetchTemplates(): Promise<TemplateWithStats[]> {
  const res = await fetch('/api/enrollment-forms/templates')
  if (!res.ok) throw new Error('Erreur chargement')
  const data = await res.json()
  return data.templates
}

export default function EnrollmentFormsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: templates, isLoading } = useQuery({
    queryKey: ['enrollment-form-templates'],
    queryFn: fetchTemplates,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/enrollment-forms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Nouveau formulaire', fields: [] }),
      })
      if (!res.ok) throw new Error('Erreur création')
      return res.json()
    },
    onSuccess: data => {
      router.push(`/dashboard/settings/enrollment-forms/${data.template.id}`)
    },
    onError: () => addToast({ type: 'error', title: 'Erreur lors de la création' }),
  })

  const duplicateMutation = useMutation({
    mutationFn: async (template: EnrollmentFormTemplate) => {
      const res = await fetch('/api/enrollment-forms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (copie)`,
          description: template.description,
          fields: template.fields,
        }),
      })
      if (!res.ok) throw new Error('Erreur duplication')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-form-templates'] })
      addToast({ type: 'success', title: 'Formulaire dupliqué' })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (template: EnrollmentFormTemplate) => {
      const res = await fetch(`/api/enrollment-forms/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !template.is_active }),
      })
      if (!res.ok) throw new Error('Erreur mise à jour')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollment-form-templates'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/enrollment-forms/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur suppression')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-form-templates'] })
      addToast({ type: 'success', title: 'Formulaire supprimé' })
    },
    onError: () => addToast({ type: 'error', title: 'Erreur lors de la suppression' }),
  })

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [shareModal, setShareModal] = useState<string | null>(null)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Formulaires d'inscription</h1>
          <p className="text-gray-500 text-sm mt-1">
            Créez des formulaires personnalisés pour collecter les informations de vos apprenants.
          </p>
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="gap-2 bg-brand-blue hover:bg-brand-blue-dark"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Créer un formulaire
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!templates || templates.length === 0) && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-16 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-600 font-medium mb-2">Aucun formulaire créé</h3>
          <p className="text-gray-400 text-sm mb-6">
            Créez votre premier formulaire d'inscription personnalisé.
          </p>
          <Button
            onClick={() => createMutation.mutate()}
            className="bg-brand-blue hover:bg-brand-blue-dark"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un formulaire
          </Button>
        </div>
      )}

      {/* Templates list */}
      {templates && templates.length > 0 && (
        <div className="grid gap-3">
          {templates.map(template => {
            const fieldCount = template.fields?.length ?? 0
            return (
              <Card key={template.id} className="border border-gray-200 hover:border-gray-300 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-gray-900 font-semibold truncate">{template.name}</h3>
                          <Badge
                            variant={template.is_active ? 'default' : 'secondary'}
                            className={template.is_active
                              ? 'bg-green-100 text-green-700 border-0'
                              : 'bg-gray-100 text-gray-500 border-0'}
                          >
                            {template.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                        {template.description && (
                          <p className="text-gray-500 text-sm truncate mt-0.5">{template.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                          <span>{fieldCount} champ{fieldCount !== 1 ? 's' : ''}</span>
                          <span>Créé le {formatDate(template.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => setShareModal(template.id)}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Lien / Email
                      </Button>
                      <Link href={`/dashboard/settings/enrollment-forms/${template.id}/submissions`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          Soumissions
                        </Button>
                      </Link>
                      <Link href={`/dashboard/settings/enrollment-forms/${template.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Modifier
                        </Button>
                      </Link>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-gray-600">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => duplicateMutation.mutate(template)}
                            className="cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 mr-2" />
                            Dupliquer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleMutation.mutate(template)}
                            className="cursor-pointer"
                          >
                            {template.is_active ? (
                              <><ToggleLeft className="w-3.5 h-3.5 mr-2" />Désactiver</>
                            ) : (
                              <><ToggleRight className="w-3.5 h-3.5 mr-2" />Activer</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirm(template.id)}
                            className="text-red-600 cursor-pointer focus:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Delete confirm */}
                  {deleteConfirm === template.id && (
                    <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between gap-4">
                      <p className="text-red-700 text-sm">Supprimer ce formulaire définitivement ?</p>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => { deleteMutation.mutate(template.id); setDeleteConfirm(null) }}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {shareModal && (
        <ShareModal templateId={shareModal} onClose={() => setShareModal(null)} />
      )}
    </div>
  )
}
