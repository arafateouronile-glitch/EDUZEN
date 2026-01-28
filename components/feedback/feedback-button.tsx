'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { feedbackService } from '@/lib/services/feedback.service'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select-shadcn'
import { MessageSquare, X, Upload, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { FeedbackType } from '@/lib/services/feedback.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

interface FeedbackButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function FeedbackButton({ variant = 'outline', size = 'default', className }: FeedbackButtonProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('improvement')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const supabase = createClient()

  const createFeedbackMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) {
        throw new Error('Organisation non trouvée')
      }

      let uploadedScreenshotUrl: string | null = null

      // Upload screenshot si présent
      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop()
        const fileName = `feedback-${Date.now()}.${fileExt}`
        const filePath = `feedback/${user.organization_id}/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, screenshot, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          logger.error('Erreur upload screenshot:', uploadError)
        } else {
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath)
          uploadedScreenshotUrl = urlData.publicUrl
        }
      }

      return feedbackService.create({
        organizationId: user.organization_id,
        userId: user.id,
        feedbackType,
        category: category || undefined,
        title,
        description,
        pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        screenshotUrl: uploadedScreenshotUrl || undefined,
      })
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Feedback envoyé',
        description: 'Merci pour votre retour ! Nous examinerons votre demande rapidement.',
      })
      setIsOpen(false)
      setTitle('')
      setDescription('')
      setCategory('')
      setScreenshot(null)
      setScreenshotUrl(null)
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de l\'envoi du feedback.',
      })
    },
  })

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast({
          type: 'warning',
          title: 'Fichier trop volumineux',
          description: 'La capture d\'écran ne doit pas dépasser 5 MB.',
        })
        return
      }

      setScreenshot(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setScreenshotUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveScreenshot = () => {
    setScreenshot(null)
    setScreenshotUrl(null)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <MessageSquare className="mr-2 h-4 w-4" />
        Feedback
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Envoyer un feedback</DialogTitle>
            <DialogDescription>
              Partagez vos idées, signalez un bug ou posez une question. Votre avis nous aide à améliorer l'application.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-type">Type de feedback</Label>
              <Select value={feedbackType} onValueChange={(value) => setFeedbackType(value as FeedbackType)}>
                <SelectTrigger id="feedback-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">🐛 Bug / Problème</SelectItem>
                  <SelectItem value="feature_request">✨ Demande de fonctionnalité</SelectItem>
                  <SelectItem value="improvement">💡 Amélioration</SelectItem>
                  <SelectItem value="question">❓ Question</SelectItem>
                  <SelectItem value="other">📝 Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie (optionnel)</Label>
              <Input
                id="category"
                placeholder="Ex: Messagerie, Paiements, Documents..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                placeholder="Résumé court de votre feedback"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Décrivez en détail votre feedback, bug ou demande..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="screenshot">Capture d'écran (optionnel)</Label>
              {screenshotUrl ? (
                <div className="relative">
                  <img
                    src={screenshotUrl}
                    alt="Screenshot preview"
                    className="w-full rounded-lg border border-gray-200 max-h-64 object-contain"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveScreenshot}
                    className="absolute top-2 right-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="hidden"
                  />
                  <Label
                    htmlFor="screenshot"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Ajouter une capture d'écran
                  </Label>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => createFeedbackMutation.mutate()}
              disabled={!title || !description || createFeedbackMutation.isPending}
            >
              {createFeedbackMutation.isPending ? 'Envoi...' : 'Envoyer le feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

