'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Save,
  Eye,
  Link2,
  ArrowLeft,
  Plus,
  Trash2,
  Settings2,
  Loader2,
  Type,
  AlignLeft,
  ChevronDown,
  CheckSquare,
  Circle,
  Calendar,
  Upload,
  Minus,
  Mail,
  Phone,
  User,
  Building2,
  Briefcase,
  MapPin,
  Accessibility,
  StickyNote,
  FileText,
  CreditCard,
  FilePlus,
  X,
  Check,
  Copy,
  Send,
  ExternalLink,
  Clock,
  Hash,
  BookOpen,
  CalendarDays,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import type { FormField, FormFieldType, MapsTo, EnrollmentFormTemplate } from '@/lib/types/enrollment-forms'
import { PRESET_FIELDS, CUSTOM_FIELD_TYPES } from '@/lib/types/enrollment-forms'
import { sendEnrollmentFormEmail } from '@/lib/actions/enrollment-form-actions'

// ── Icons for field types ───────────────────────────────────
const TYPE_ICONS: Record<FormFieldType, React.ElementType> = {
  text: Type,
  email: Mail,
  tel: Phone,
  textarea: AlignLeft,
  select: ChevronDown,
  radio: Circle,
  checkbox: CheckSquare,
  date: Calendar,
  file: Upload,
  separator: Minus,
}

const PRESET_ICONS: Record<string, React.ElementType> = {
  preset_first_name: User,
  preset_last_name: User,
  preset_email: Mail,
  preset_phone: Phone,
  preset_birth_date: Calendar,
  preset_company: Building2,
  preset_job_title: Briefcase,
  preset_address: MapPin,
  preset_accessibility: Accessibility,
  preset_notes: StickyNote,
  preset_cv: FileText,
  preset_id_card: CreditCard,
  preset_medical: FilePlus,
  preset_other_doc: Upload,
  preset_program: BookOpen,
  preset_session: CalendarDays,
  preset_funding: Wallet,
}

function generateId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ── Sortable field card ─────────────────────────────────────
function SortableFieldCard({
  field,
  onEdit,
  onDelete,
}: {
  field: FormField
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id })

  const Icon = TYPE_ICONS[field.type]

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (field.type === 'separator') {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-2 py-2">
        <div {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-xs uppercase tracking-wide">{field.label}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <button onClick={onEdit} className="text-gray-400 hover:text-gray-600">
          <Settings2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="text-gray-400 hover:text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors group shadow-sm"
    >
      <div {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 flex-shrink-0">
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-blue-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-900 text-sm font-medium truncate">{field.label}</span>
          {field.required && <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] px-1.5 py-0">requis</Badge>}
        </div>
        <span className="text-gray-400 text-xs">{field.type}</span>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="text-gray-400 hover:text-gray-700 p-1 rounded"
          title="Configurer"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-500 p-1 rounded"
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Field config drawer ─────────────────────────────────────
function FieldConfigDrawer({
  field,
  onUpdate,
  onClose,
}: {
  field: FormField | null
  onUpdate: (updated: FormField) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<FormField | null>(null)

  useEffect(() => {
    setLocal(field ? { ...field } : null)
  }, [field])

  if (!local) return null

  const update = (patch: Partial<FormField>) =>
    setLocal(prev => prev ? { ...prev, ...patch } : prev)

  const MAPS_TO_OPTIONS: Array<{ value: MapsTo; label: string }> = [
    { value: 'student.first_name', label: 'Prénom' },
    { value: 'student.last_name', label: 'Nom' },
    { value: 'student.email', label: 'Email' },
    { value: 'student.phone', label: 'Téléphone' },
    { value: 'student.birth_date', label: 'Date de naissance' },
    { value: 'student.address', label: 'Adresse' },
    { value: 'student.company', label: 'Entreprise' },
    { value: 'student.job_title', label: 'Poste' },
    { value: 'student.accessibility_needs', label: 'Besoins accessibilité' },
    { value: 'student.notes', label: 'Notes' },
    { value: 'document.cv', label: 'Document: CV' },
    { value: 'document.id_card', label: 'Document: Pièce d\'identité' },
    { value: 'document.medical_certificate', label: 'Document: Certificat médical' },
    { value: 'document.other', label: 'Document: Autre' },
    ...Array.from({ length: 5 }, (_, i) => ({
      value: `student.custom_field_${i + 1}` as MapsTo,
      label: `Champ personnalisé ${i + 1}`,
    })),
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-gray-900 font-semibold">Configurer le champ</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Label */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">Label *</label>
            <input
              value={local.label}
              onChange={e => update({ label: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Placeholder */}
          {local.type !== 'separator' && local.type !== 'file' && local.type !== 'radio' && local.type !== 'checkbox' && (
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">Placeholder</label>
              <input
                value={local.placeholder ?? ''}
                onChange={e => update({ placeholder: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Description */}
          {local.type !== 'separator' && (
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">Description / aide</label>
              <textarea
                value={local.description ?? ''}
                onChange={e => update({ description: e.target.value })}
                rows={2}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          )}

          {/* Required toggle */}
          {local.type !== 'separator' && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700 text-sm font-medium">Obligatoire</span>
              <button
                onClick={() => update({ required: !local.required })}
                className={`relative w-10 h-6 rounded-full transition-colors ${local.required ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${local.required ? 'left-5' : 'left-1'}`} />
              </button>
            </div>
          )}

          {/* Options for select/radio/checkbox */}
          {(local.type === 'select' || local.type === 'radio' || local.type === 'checkbox') && (
            <div>
              {local.dynamic_source ? (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-sm text-blue-700 flex items-center gap-2">
                  <Hash className="w-4 h-4 flex-shrink-0" />
                  Options chargées automatiquement depuis votre catalogue
                  {local.dynamic_source === 'programs' && ' (formations)'}
                  {local.dynamic_source === 'sessions' && ' (sessions)'}
                  {local.dynamic_source === 'funding_types' && ' (modes de financement)'}
                </div>
              ) : (
                <>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Options</label>
                  <div className="space-y-2">
                    {(local.options ?? []).map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          value={opt}
                          onChange={e => {
                            const next = [...(local.options ?? [])]
                            next[i] = e.target.value
                            update({ options: next })
                          }}
                          className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={() => {
                            const next = (local.options ?? []).filter((_, j) => j !== i)
                            update({ options: next })
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => update({ options: [...(local.options ?? []), ''] })}
                      className="text-blue-600 text-sm flex items-center gap-1 hover:text-blue-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter une option
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* File settings */}
          {local.type === 'file' && (
            <>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">Types acceptés</label>
                <input
                  value={local.accept ?? ''}
                  onChange={e => update({ accept: e.target.value })}
                  placeholder=".pdf,.doc,.docx,image/*"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">Taille max (Mo)</label>
                <input
                  type="number"
                  value={local.max_size_mb ?? 10}
                  onChange={e => update({ max_size_mb: Number(e.target.value) })}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {/* maps_to */}
          {local.type !== 'separator' && (
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">Mapper vers champ apprenant</label>
              <select
                value={local.maps_to ?? ''}
                onChange={e => update({ maps_to: e.target.value as MapsTo || undefined })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">— Aucun mapping —</option>
                {MAPS_TO_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <Button
            onClick={() => { onUpdate(local); onClose() }}
            className="w-full bg-brand-blue hover:bg-brand-blue-dark"
          >
            <Check className="w-4 h-4 mr-2" />
            Appliquer
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Link generator modal ────────────────────────────────────
function LinkGeneratorModal({
  templateId,
  onClose,
}: {
  templateId: string
  onClose: () => void
}) {
  const { addToast: toast } = useToast()
  const [sessionId, setSessionId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [label, setLabel] = useState('')
  const [generatedLink, setGeneratedLink] = useState<{ token: string; id: string; orgSlug?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailRecipient, setEmailRecipient] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  // Load sessions
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
      const orgSlug = (data.link.organizations as { slug?: string } | null)?.slug
      setGeneratedLink({ token: data.link.token, id: data.link.id, orgSlug })
    } catch {
      toast({ type: 'error', title: 'Erreur lors de la génération du lien' })
    } finally {
      setLoading(false)
    }
  }

  const formUrl = generatedLink
    ? generatedLink.orgSlug
      ? `${baseUrl}/s/${generatedLink.orgSlug}/${generatedLink.token}`
      : `${baseUrl}/s/${generatedLink.token}`
    : ''

  const copyLink = () => {
    navigator.clipboard.writeText(formUrl)
    toast({ type: 'success', title: 'Lien copié !' })
  }

  const handleSendEmail = async () => {
    if (!emailRecipient || !generatedLink) return
    setSendingEmail(true)
    try {
      const result = await sendEnrollmentFormEmail(emailRecipient, generatedLink.id, emailMessage)
      if (result.success) {
        toast({ type: 'success', title: `Email envoyé à ${emailRecipient}` })
        setEmailRecipient('')
        setEmailMessage('')
      } else {
        toast({ type: 'error', title: result.error ?? 'Erreur envoi email' })
      }
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-gray-900 font-semibold text-lg">Générer un lien de formulaire</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!generatedLink ? (
          <div className="p-5 space-y-4">
            {/* Session selection */}
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
                Si une session est sélectionnée, l'apprenant sera automatiquement ajouté aux candidats.
              </p>
            </div>

            {/* Expiry */}
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

            {/* Max uses */}
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

            {/* Label */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">Commentaire interne</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Ex: Session juin 2026"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Button
              onClick={generate}
              disabled={loading}
              className="w-full bg-brand-blue hover:bg-brand-blue-dark"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
              Générer le lien
            </Button>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Direct link */}
            <div>
              <h3 className="text-gray-600 text-sm font-medium mb-2">Lien direct</h3>
              <div className="flex gap-2">
                <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-700 text-sm truncate font-mono">
                  {formUrl}
                </div>
                <Button variant="outline" size="icon" onClick={copyLink} className="flex-shrink-0">
                  <Copy className="w-4 h-4" />
                </Button>
                <a href={formUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="icon">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>

            {/* Send by email */}
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

            <Button variant="outline" onClick={onClose} className="w-full">
              Fermer
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Preview modal ───────────────────────────────────────────
function PreviewModal({ fields, name, onClose }: { fields: FormField[]; name: string; onClose: () => void }) {
  const inputClass = 'w-full bg-white/[0.06] border border-white/[0.12] rounded-[10px] px-4 py-[13px] text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#34B9EE]'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="min-h-screen py-8 px-4 flex items-start justify-center">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Prévisualisation — {name}</h2>
            <button onClick={onClose} className="text-white/40 hover:text-white bg-white/10 rounded-lg p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="rounded-2xl p-8" style={{ background: '#15263f', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="space-y-5">
              {fields.map(field => (
                <div key={field.id}>
                  {field.type === 'separator' ? (
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-white/50 text-xs uppercase tracking-wide">{field.label}</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  ) : (
                    <>
                      <label className="block text-white/80 text-sm font-medium mb-1">
                        {field.label}{field.required && <span className="text-[#34B9EE] ml-1">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea placeholder={field.placeholder} rows={3} className={`${inputClass} resize-none`} />
                      ) : field.type === 'file' ? (
                        <div className="border-2 border-dashed border-white/20 rounded-[10px] p-6 text-center">
                          <Upload className="w-6 h-6 text-white/30 mx-auto mb-1" />
                          <p className="text-white/50 text-sm">Glisser ou <span className="text-[#34B9EE]">parcourir</span></p>
                        </div>
                      ) : field.type === 'select' ? (
                        <select className={`${inputClass} appearance-none`} style={{ background: '#15263f' }}>
                          <option>{field.placeholder ?? 'Sélectionner...'}</option>
                        </select>
                      ) : field.type === 'radio' ? (
                        <div className="space-y-2">
                          {(field.options ?? ['Option 1', 'Option 2']).map(opt => (
                            <label key={opt} className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
                              <div className="w-4 h-4 rounded-full border-2 border-white/20" />
                              {opt}
                            </label>
                          ))}
                        </div>
                      ) : field.type === 'checkbox' ? (
                        <div className="space-y-2">
                          {(field.options ?? ['Option 1', 'Option 2']).map(opt => (
                            <label key={opt} className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
                              <div className="w-4 h-4 rounded border border-white/20" />
                              {opt}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input type={field.type} placeholder={field.placeholder} className={inputClass} />
                      )}
                    </>
                  )}
                </div>
              ))}
              <div className="pt-2">
                <label className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded border border-white/20 mt-0.5" />
                  <span className="text-white/60 text-sm">J'accepte que mes données soient traitées... <span className="text-[#34B9EE]">*</span></span>
                </label>
              </div>
              <button
                className="w-full py-4 rounded-[10px] font-bold text-white text-base opacity-80"
                style={{ background: 'linear-gradient(135deg, #335ACF, #34B9EE)', fontFamily: 'Syne, sans-serif' }}
              >
                Envoyer mon inscription
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main builder page ───────────────────────────────────────
export default function FormBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const { addToast: toast } = useToast()
  const queryClient = useQueryClient()

  const [fields, setFields] = useState<FormField[]>([])
  const [formName, setFormName] = useState('Nouveau formulaire')
  const [formDescription, setFormDescription] = useState('')
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Load template
  const [initialized, setInitialized] = useState(false)
  const { data: templateData, isLoading } = useQuery({
    queryKey: ['enrollment-form-template', id],
    queryFn: async () => {
      const res = await fetch(`/api/enrollment-forms/templates/${id}`)
      if (!res.ok) throw new Error('Formulaire introuvable')
      const d = await res.json()
      return d.template as EnrollmentFormTemplate
    },
    enabled: !!id && id !== 'new',
  })

  useEffect(() => {
    if (templateData && !initialized) {
      setFormName(templateData.name)
      setFormDescription(templateData.description ?? '')
      setFields(templateData.fields ?? [])
      setInitialized(true)
    }
  }, [templateData, initialized])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fieldsWithOrder = fields.map((f, i) => ({ ...f, order: i + 1 }))
      const res = await fetch(`/api/enrollment-forms/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          fields: fieldsWithOrder,
        }),
      })
      if (!res.ok) throw new Error('Erreur sauvegarde')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-form-templates'] })
      toast({ type: 'success', title: 'Formulaire sauvegardé ✓' })
      setIsDirty(false)
    },
    onError: () => toast({ type: 'error', title: 'Erreur lors de la sauvegarde' }),
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setFields(items => {
      const oldIndex = items.findIndex(f => f.id === active.id)
      const newIndex = items.findIndex(f => f.id === over.id)
      return arrayMove(items, oldIndex, newIndex)
    })
    setIsDirty(true)
  }

  const addField = useCallback((preset?: typeof PRESET_FIELDS[0], customType?: FormFieldType) => {
    const newField: FormField = preset
      ? {
          id: generateId(),
          type: preset.type,
          label: preset.label,
          required: preset.required ?? false,
          order: fields.length + 1,
          maps_to: preset.maps_to,
          dynamic_source: preset.dynamic_source,
          accept: preset.accept,
          max_size_mb: preset.max_size_mb,
          placeholder: '',
        }
      : {
          id: generateId(),
          type: customType ?? 'text',
          label: 'Nouveau champ',
          required: false,
          order: fields.length + 1,
        }

    setFields(prev => [...prev, newField])
    setIsDirty(true)
    setTimeout(() => setEditingField(newField), 100)
  }, [fields.length])

  const removeField = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId))
    setIsDirty(true)
  }

  const updateField = (updated: FormField) => {
    setFields(prev => prev.map(f => f.id === updated.id ? updated : f))
    setIsDirty(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const sortedFields = [...fields].sort((a, b) => a.order - b.order)

  return (
    <div className="p-6 space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/settings/enrollment-forms')}
          className="text-gray-500 hover:text-gray-700 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>

        <div className="flex-1 min-w-0">
          <input
            value={formName}
            onChange={e => { setFormName(e.target.value); setIsDirty(true) }}
            className="bg-transparent text-gray-900 text-xl font-bold w-full focus:outline-none border-b border-transparent focus:border-gray-300 pb-0.5"
          />
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-amber-600 text-xs">● Modifications non sauvegardées</span>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} className="gap-2">
            <Eye className="w-4 h-4" />
            Prévisualiser
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowLinkModal(true)} className="gap-2">
            <Link2 className="w-4 h-4" />
            Générer un lien
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2 bg-brand-blue hover:bg-brand-blue-dark"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Description */}
      <input
        value={formDescription}
        onChange={e => { setFormDescription(e.target.value); setIsDirty(true) }}
        placeholder="Description du formulaire (optionnel)..."
        className="w-full bg-transparent text-gray-500 text-sm focus:outline-none border-b border-transparent focus:border-gray-200 pb-0.5 focus:text-gray-700"
      />

      {/* 2-col layout */}
      <div className="grid grid-cols-5 gap-6 pt-2">
        {/* Left: Field palette */}
        <div className="col-span-2 space-y-4">
          {/* Standard fields */}
          <div>
            <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
              Champs standards
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_FIELDS.slice(0, 10).map(preset => {
                const Icon = PRESET_ICONS[preset.id] ?? Type
                return (
                  <button
                    key={preset.id}
                    onClick={() => addField(preset)}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-left transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="text-gray-700 text-xs truncate">{preset.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
              Documents
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_FIELDS.slice(10).map(preset => {
                const Icon = PRESET_ICONS[preset.id] ?? Upload
                return (
                  <button
                    key={preset.id}
                    onClick={() => addField(preset)}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-left transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="text-gray-700 text-xs truncate">{preset.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom fields */}
          <div>
            <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
              Champs personnalisés
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {CUSTOM_FIELD_TYPES.map(ct => {
                const Icon = TYPE_ICONS[ct.type]
                return (
                  <button
                    key={ct.id}
                    onClick={() => addField(undefined, ct.type)}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-purple-50 hover:border-purple-300 text-left transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                    <span className="text-gray-700 text-xs truncate">{ct.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: DnD field list */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-700 text-sm font-medium">
              Champs du formulaire
              <span className="text-gray-400 ml-2">({fields.length})</span>
            </h3>
            {fields.length > 0 && (
              <span className="text-gray-400 text-xs">Glisser pour réordonner</span>
            )}
          </div>

          {fields.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
              <Plus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">
                Cliquez sur un champ à gauche pour l'ajouter au formulaire
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedFields.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {sortedFields.map(field => (
                    <SortableFieldCard
                      key={field.id}
                      field={field}
                      onEdit={() => setEditingField(field)}
                      onDelete={() => removeField(field.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Field config drawer */}
      {editingField && (
        <FieldConfigDrawer
          field={editingField}
          onUpdate={updateField}
          onClose={() => setEditingField(null)}
        />
      )}

      {/* Preview modal */}
      {showPreview && (
        <PreviewModal
          fields={sortedFields}
          name={formName}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Link generator modal */}
      {showLinkModal && (
        <LinkGeneratorModal
          templateId={id}
          onClose={() => setShowLinkModal(false)}
        />
      )}
    </div>
  )
}
