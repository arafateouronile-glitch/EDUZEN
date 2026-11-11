'use client'

/**
 * Choix des destinataires d'un questionnaire formateur, manager ou financeur :
 * liste pré-cochée (intervenants, contacts des entreprises, entités facturées)
 * et ajout d'emails à la main.
 */

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isValidEmail, type QuestionnaireRecipient } from '@/lib/services/questionnaire-link.service'

type Audience = QuestionnaireRecipient['type']

const AUDIENCE_TEXT: Record<Audience, { title: string; empty: string }> = {
  instructor: {
    title: 'Envoyer aux intervenants',
    empty: 'Aucun intervenant sur cette session.',
  },
  manager: {
    title: 'Envoyer aux entreprises',
    empty: "Aucune entreprise liée aux apprenants ou inscrite à cette session.",
  },
  funder: {
    title: 'Envoyer aux financeurs',
    empty: 'Aucune entité facturée sur cette session.',
  },
}

export interface SelectedRecipient {
  name: string
  email: string
}

interface QuestionnaireRecipientsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  audience: Audience
  templateName: string
  sending: boolean
  /** Erreur du dernier envoi, affichée dans la fenêtre */
  error?: string | null
  onSend: (recipients: SelectedRecipient[]) => void
}

export function QuestionnaireRecipientsDialog({
  open,
  onOpenChange,
  sessionId,
  audience,
  templateName,
  sending,
  error: sendError,
  onSend,
}: QuestionnaireRecipientsDialogProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['questionnaire-recipients', sessionId, audience],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/questionnaires/recipients?audience=${audience}`)
      const json = (await res.json()) as { recipients?: QuestionnaireRecipient[]; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Chargement impossible')
      return json.recipients ?? []
    },
    enabled: open,
  })
  const candidates = data ?? []

  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [manual, setManual] = useState<SelectedRecipient[]>([])
  const [manualName, setManualName] = useState('')
  const [manualEmail, setManualEmail] = useState('')

  // Tout cocher à chaque ouverture / changement de liste
  useEffect(() => {
    if (!open) return
    setChecked(new Set(candidates.filter((c) => c.email).map((c) => c.email!)))
    setManual([])
    setManualName('')
    setManualEmail('')
  }, [open, data]) // eslint-disable-line react-hooks/exhaustive-deps

  const known = new Set([...candidates.map((c) => c.email), ...manual.map((m) => m.email)])
  const manualEmailTrimmed = manualEmail.trim().toLowerCase()
  const canAddManual = isValidEmail(manualEmailTrimmed) && !known.has(manualEmailTrimmed)

  const addManual = () => {
    if (!canAddManual) return
    setManual([...manual, { name: manualName.trim(), email: manualEmailTrimmed }])
    setManualName('')
    setManualEmail('')
  }

  const selected: SelectedRecipient[] = [
    ...candidates
      .filter((c) => c.email && checked.has(c.email))
      .map((c) => ({ name: c.name, email: c.email! })),
    ...manual,
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => !sending && onOpenChange(v)}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{AUDIENCE_TEXT[audience].title}</DialogTitle>
          <DialogDescription>{templateName}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement des destinataires…
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Erreur'}</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">{AUDIENCE_TEXT[audience].empty}</p>
          ) : (
            candidates.map((c) => {
              const noEmail = !c.email
              return (
                <label
                  key={c.email ?? `${c.name}-${c.entityId ?? c.userId ?? ''}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${noEmail ? 'opacity-50 bg-gray-50' : 'bg-white hover:bg-gray-50 cursor-pointer'}`}
                >
                  <Checkbox
                    checked={!noEmail && checked.has(c.email!)}
                    disabled={noEmail}
                    onCheckedChange={(value) => {
                      const next = new Set(checked)
                      if (value) next.add(c.email!)
                      else next.delete(c.email!)
                      setChecked(next)
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {c.name}
                      {c.detail && <span className="text-gray-500 font-normal"> · {c.detail}</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{c.email || 'Aucun email renseigné'}</p>
                  </div>
                </label>
              )
            })
          )}

          {manual.map((m) => (
            <div key={m.email} className="flex items-center gap-3 p-3 rounded-lg border bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name || m.email}</p>
                {m.name && <p className="text-xs text-gray-500 truncate">{m.email}</p>}
              </div>
              <button
                type="button"
                onClick={() => setManual(manual.filter((x) => x.email !== m.email))}
                className="text-gray-400 hover:text-gray-600"
                aria-label={`Retirer ${m.email}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="pt-2 space-y-2">
            <p className="text-xs font-medium text-gray-600">Ajouter un destinataire</p>
            <div className="flex gap-2">
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Nom (facultatif)"
                className="h-9 text-sm"
              />
              <Input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addManual()
                  }
                }}
                placeholder="email@exemple.fr"
                className="h-9 text-sm"
              />
              <Button type="button" size="sm" variant="outline" onClick={addManual} disabled={!canAddManual}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {sendError && <p className="text-sm text-red-600">{sendError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={() => onSend(selected)} disabled={selected.length === 0 || sending}>
            {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Envoyer à {selected.length} destinataire{selected.length > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
