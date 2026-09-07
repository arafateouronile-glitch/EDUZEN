'use client'

import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { Send, Loader2, Plus, X } from 'lucide-react'
import { emailService } from '@/lib/services/email.service'
import { APP_URLS } from '@/lib/config/app-config'

interface SendPortalLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  entityName: string
  /** Prénom + nom du contact principal, pour la formule d'appel de l'email. */
  contactName?: string
  /** Emails renseignés sur la fiche entité (contact_email, email…). Pré-remplis à l'ouverture. */
  initialEmails: string[]
}

function dedupeEmails(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list) {
    const email = raw.trim()
    if (!email) continue
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(email)
  }
  return out
}

export function SendPortalLinkDialog({
  open,
  onOpenChange,
  entityId,
  entityName,
  contactName,
  initialEmails,
}: SendPortalLinkDialogProps) {
  const { addToast } = useToast()
  const [emails, setEmails] = useState<string[]>([''])

  // (Ré)initialise la liste à partir des emails de la fiche à l'ouverture ou au
  // changement d'entité. On ne met pas `initialEmails` en dépendance : c'est un
  // nouveau tableau à chaque rendu du parent et il écraserait les modifications
  // en cours de saisie.
  useEffect(() => {
    if (!open) return
    const seed = dedupeEmails(initialEmails)
    setEmails(seed.length > 0 ? seed : [''])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entityId])

  const portalUrl = `${APP_URLS.getBaseUrl()}/enterprise?entity=${entityId}`

  const sendMutation = useMutation({
    mutationFn: async (recipients: string[]) => {
      const greeting = contactName ? `Bonjour ${contactName},` : 'Bonjour,'
      const html = `
          <p>${greeting}</p>
          <p>Vous pouvez désormais suivre en ligne les formations de vos collaborateurs :
          sessions, apprenants inscrits, devis et factures.</p>
          <p style="margin:24px 0;">
            <a href="${portalUrl}" style="background:#274472;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
              Accéder à mon espace entreprise
            </a>
          </p>
          <p style="font-size:13px;color:#666;">Ou copiez ce lien dans votre navigateur :<br />${portalUrl}</p>
        `
      const text = `${greeting}\n\nAccédez à votre espace entreprise (sessions, apprenants, devis et factures) : ${portalUrl}`
      // L'API /api/email/send n'accepte qu'un destinataire par appel : un envoi
      // séparé par adresse (chaque contact reçoit son propre email).
      for (const recipient of recipients) {
        await emailService.sendEmail({
          to: recipient,
          subject: `Votre espace entreprise — ${entityName}`,
          html,
          text,
        })
      }
      return recipients
    },
    onSuccess: (recipients) => {
      onOpenChange(false)
      addToast({
        type: 'success',
        title: 'Lien envoyé',
        description:
          recipients.length > 1
            ? `L'accès à l'espace entreprise a été envoyé à ${recipients.length} adresses`
            : `L'accès à l'espace entreprise a été envoyé à ${recipients[0]}`,
      })
    },
    onError: (error: unknown) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : "L'envoi de l'email a échoué",
      })
    },
  })

  const cleaned = dedupeEmails(emails)
  const canSend = cleaned.length > 0 && !sendMutation.isPending

  const updateEmail = (index: number, value: string) => {
    setEmails((prev) => prev.map((e, i) => (i === index ? value : e)))
  }
  const addEmail = () => setEmails((prev) => [...prev, ''])
  const removeEmail = (index: number) => {
    setEmails((prev) => (prev.length <= 1 ? [''] : prev.filter((_, i) => i !== index)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Envoyer le lien de l&apos;espace entreprise</DialogTitle>
          <DialogDescription>
            {entityName} recevra un email avec un lien d&apos;accès direct à son espace entreprise
            (sessions, apprenants, devis et factures).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Destinataires</Label>
            {emails.map((email, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  placeholder="contact@entreprise.fr"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 text-gray-400 hover:text-red-600"
                  onClick={() => removeEmail(index)}
                  aria-label="Retirer cette adresse"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addEmail}>
              <Plus className="h-4 w-4" />
              Ajouter une adresse
            </Button>
            {cleaned.length === 0 && (
              <p className="text-xs text-amber-600">
                Aucun email renseigné sur la fiche entité — saisissez au moins une adresse.
              </p>
            )}
          </div>

          <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-600 break-all">
            <span className="font-medium text-gray-700">Lien envoyé :</span>
            <br />
            {portalUrl}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => sendMutation.mutate(cleaned)} disabled={!canSend}>
            {sendMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer{cleaned.length > 1 ? ` (${cleaned.length})` : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
