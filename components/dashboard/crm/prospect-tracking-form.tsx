'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateProspectTracking } from '@/lib/actions/learner-crm-actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function daysSinceContact(contactedAt: string | null): number | null {
  if (!contactedAt) return null
  const diff = Date.now() - new Date(contactedAt).getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

interface ProspectTrackingFormProps {
  studentId: string
  initial: {
    contacted: boolean
    contacted_at: string | null
    next_follow_up_date: string | null
    notes: string | null
  }
  invalidateKeys: unknown[][]
  onSaved?: () => void
}

export function ProspectTrackingForm({ studentId, initial, invalidateKeys, onSaved }: ProspectTrackingFormProps) {
  const queryClient = useQueryClient()
  const [contacted, setContacted]     = useState(initial.contacted)
  const [contactedAt, setContactedAt] = useState(initial.contacted_at ?? '')
  const [nextFollowUp, setNextFollowUp] = useState(initial.next_follow_up_date ?? '')
  const [notes, setNotes]             = useState(initial.notes ?? '')

  const mutation = useMutation({
    mutationFn: () => updateProspectTracking(studentId, {
      contacted,
      contacted_at: contacted ? (contactedAt || new Date().toISOString().slice(0, 10)) : null,
      next_follow_up_date: nextFollowUp || null,
      notes: notes.trim() || null,
    }),
    onSuccess: () => {
      invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }))
      onSaved?.()
    },
  })

  const days = contacted ? daysSinceContact(contactedAt || null) : null

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={contacted}
          onChange={e => {
            setContacted(e.target.checked)
            if (e.target.checked && !contactedAt) setContactedAt(new Date().toISOString().slice(0, 10))
          }}
          className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
        />
        Contacté
      </label>

      {contacted && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date de contact</label>
          <input
            type="date" value={contactedAt} onChange={e => setContactedAt(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
          />
          {days !== null && (
            <p className="mt-1 text-xs text-gray-400">
              {days === 0 ? "Contacté aujourd'hui" : `Contacté depuis ${days} jour${days > 1 ? 's' : ''}`}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs text-gray-500 mb-1">Prochaine relance</label>
        <input
          type="date" value={nextFollowUp} onChange={e => setNextFollowUp(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Note particulière</label>
        <Textarea
          value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="resize-none"
          placeholder="Observation, contexte, prochaine étape…"
        />
      </div>

      <Button size="sm" className="w-full" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? 'Enregistrement…' : 'Enregistrer le suivi'}
      </Button>
    </div>
  )
}
