'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Send, Loader2, Mail } from 'lucide-react'

interface Recipient {
  id: string
  email: string
  name: string
  type: 'student' | 'funder' | 'teacher' | 'other'
}

interface SendSignatureRequestDialogProps {
  documentId: string
  documentTitle: string
  availableRecipients?: Recipient[]
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function SendSignatureRequestDialog({
  documentId,
  documentTitle,
  availableRecipients = [],
  onSuccess,
  trigger,
}: SendSignatureRequestDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mode: single (un seul destinataire) ou multiple (plusieurs)
  const [mode, setMode] = useState<'single' | 'multiple'>('single')

  // Formulaire single
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientType, setRecipientType] = useState<'student' | 'funder' | 'teacher' | 'other'>('student')

  // Formulaire multiple
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])

  // Champs communs
  const [subject, setSubject] = useState(`Demande de signature : ${documentTitle}`)
  const [message, setMessage] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(30)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      // Calculer la date d'expiration
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)

      let response

      if (mode === 'single') {
        // Envoi à un seul destinataire
        if (!recipientEmail || !recipientName) {
          setError('Veuillez remplir tous les champs requis')
          return
        }

        response = await fetch('/api/signature-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId,
            recipientEmail,
            recipientName,
            recipientType,
            subject,
            message: message || null,
            expiresAt: expiresAt.toISOString(),
          }),
        })
      } else {
        // Envoi à plusieurs destinataires
        if (selectedRecipients.length === 0) {
          setError('Veuillez sélectionner au moins un destinataire')
          return
        }

        const recipients = availableRecipients
          .filter((r) => selectedRecipients.includes(r.id))
          .map((r) => ({
            id: r.id,
            email: r.email,
            name: r.name,
            type: r.type,
          }))

        response = await fetch('/api/signature-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId,
            recipients,
            subject,
            message: message || null,
            expiresAt: expiresAt.toISOString(),
          }),
        })
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }

      // Réinitialiser le formulaire
      setRecipientEmail('')
      setRecipientName('')
      setRecipientType('student')
      setSelectedRecipients([])
      setMessage('')
      setOpen(false)

      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const toggleRecipient = (recipientId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(recipientId)
        ? prev.filter((id) => id !== recipientId)
        : [...prev, recipientId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Send className="h-4 w-4 mr-2" />
            Envoyer en signature
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Envoyer une demande de signature</DialogTitle>
          <DialogDescription>
            Envoyez ce document pour signature électronique par email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Document</p>
            <p className="font-medium">{documentTitle}</p>
          </div>

          {/* Mode de sélection */}
          {availableRecipients.length > 0 && (
            <div>
              <Label>Mode d'envoi</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as 'single' | 'multiple')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Un seul destinataire</SelectItem>
                  <SelectItem value="multiple">Plusieurs destinataires</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Formulaire single */}
          {mode === 'single' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipientEmail">Email du destinataire *</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="recipientName">Nom du destinataire *</Label>
                  <Input
                    id="recipientName"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Jean Dupont"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="recipientType">Type de destinataire</Label>
                <Select value={recipientType} onValueChange={(v) => setRecipientType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Apprenant</SelectItem>
                    <SelectItem value="funder">Financeur</SelectItem>
                    <SelectItem value="teacher">Formateur</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Formulaire multiple */}
          {mode === 'multiple' && availableRecipients.length > 0 && (
            <div>
              <Label>Destinataires ({selectedRecipients.length} sélectionné{selectedRecipients.length > 1 ? 's' : ''})</Label>
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {availableRecipients.map((recipient) => (
                  <label
                    key={recipient.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedRecipients.includes(recipient.id)}
                      onCheckedChange={() => toggleRecipient(recipient.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{recipient.name}</p>
                      <p className="text-sm text-gray-500">{recipient.email}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {recipient.type === 'student' && 'Apprenant'}
                      {recipient.type === 'funder' && 'Financeur'}
                      {recipient.type === 'teacher' && 'Formateur'}
                      {recipient.type === 'other' && 'Autre'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sujet */}
          <div>
            <Label htmlFor="subject">Sujet de l'email</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message">Message personnalisé (optionnel)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ajoutez un message personnalisé pour le destinataire..."
              rows={4}
            />
          </div>

          {/* Expiration */}
          <div>
            <Label htmlFor="expiresInDays">Expiration (jours)</Label>
            <Input
              id="expiresInDays"
              type="number"
              min="1"
              max="365"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 30)}
            />
            <p className="text-sm text-gray-500 mt-1">
              La demande expirera dans {expiresInDays} jour{expiresInDays > 1 ? 's' : ''}
            </p>
          </div>

          {/* Erreur */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info */}
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              {mode === 'single'
                ? 'Un email sera envoyé au destinataire avec un lien sécurisé pour signer le document.'
                : `${selectedRecipients.length} email${selectedRecipients.length > 1 ? 's' : ''} ${selectedRecipients.length > 1 ? 'seront envoyés' : 'sera envoyé'} avec un lien sécurisé pour chaque destinataire.`}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
