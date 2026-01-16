'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { emailService } from '@/lib/services/email.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { GlassCard } from '@/components/ui/glass-card'
import { useToast } from '@/components/ui/toast'
import { Mail, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { motion } from '@/components/ui/motion'

export default function EmailTestPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [formData, setFormData] = useState({
    to: '',
    subject: 'Test d\'envoi d\'email - EDUZEN',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #335ACF;">Test d'envoi d'email</h1>
        <p>Bonjour,</p>
        <p>Ceci est un email de test depuis l'application EDUZEN.</p>
        <p>Si vous recevez cet email, cela signifie que la configuration d'envoi d'emails fonctionne correctement.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Cet email a été envoyé depuis le système de test d'emails.
        </p>
      </div>
    `,
    text: 'Test d\'envoi d\'email - EDUZEN\n\nBonjour,\n\nCeci est un email de test depuis l\'application EDUZEN.\n\nSi vous recevez cet email, cela signifie que la configuration d\'envoi d\'emails fonctionne correctement.',
  })

  const sendTestEmailMutation = useMutation({
    mutationFn: async () => {
      return emailService.sendEmail({
        to: formData.to,
        subject: formData.subject,
        html: formData.html,
        text: formData.text,
      })
    },
    onSuccess: (result) => {
      addToast({
        type: 'success',
        title: 'Email envoyé',
        description: result.message || 'L\'email de test a été envoyé avec succès.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de l\'envoi de l\'email.',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.to) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Veuillez saisir une adresse email de destination.',
      })
      return
    }
    sendTestEmailMutation.mutate()
  }

  const isResendConfigured = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_RESEND_CONFIGURED === 'true'

  return (
    <div className="space-y-6 pb-8 max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-blue-ghost rounded-xl">
          <Mail className="h-8 w-8 text-brand-blue" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            Test d'envoi d'emails
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Tester la configuration d'envoi d'emails
          </p>
        </div>
      </div>

      {/* Statut de la configuration */}
      <GlassCard variant="premium" className="p-6">
        <div className="flex items-start gap-4">
          {isResendConfigured ? (
            <>
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Resend configuré</h3>
                <p className="text-sm text-gray-600">
                  La clé API Resend est configurée. Les emails seront envoyés en production.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Mode test activé</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Aucune clé API Resend trouvée. Les emails sont simulés (aucun email réel ne sera envoyé).
                </p>
                <p className="text-xs text-gray-500">
                  Pour activer l'envoi réel : ajoutez <code className="bg-gray-100 px-1 rounded">RESEND_API_KEY</code> dans votre fichier <code className="bg-gray-100 px-1 rounded">.env.local</code>
                </p>
              </div>
            </>
          )}
        </div>
      </GlassCard>

      {/* Formulaire de test */}
      <GlassCard variant="default" className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="to" className="text-base font-semibold">
              Destinataire *
            </Label>
            <Input
              id="to"
              type="email"
              placeholder="votre-email@exemple.com"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              required
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Entrez votre adresse email pour recevoir l'email de test
            </p>
          </div>

          <div>
            <Label htmlFor="subject" className="text-base font-semibold">
              Sujet
            </Label>
            <Input
              id="subject"
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="html" className="text-base font-semibold">
              Contenu HTML
            </Label>
            <Textarea
              id="html"
              rows={10}
              value={formData.html}
              onChange={(e) => setFormData({ ...formData, html: e.target.value })}
              className="mt-2 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Contenu HTML de l'email
            </p>
          </div>

          <div>
            <Label htmlFor="text" className="text-base font-semibold">
              Contenu texte (alternative)
            </Label>
            <Textarea
              id="text"
              rows={5}
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Version texte de l'email (pour les clients email qui ne supportent pas HTML)
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={sendTestEmailMutation.isPending || !formData.to}
              className="min-w-[150px]"
            >
              {sendTestEmailMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer l'email de test
                </>
              )}
            </Button>
          </div>
        </form>
      </GlassCard>

      {/* Instructions */}
      <GlassCard variant="default" className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-brand-blue" />
          Instructions
        </h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div>
            <p className="font-medium text-gray-900 mb-1">1. Configuration Resend</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Créez un compte sur <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">resend.com</a></li>
              <li>Obtenez votre clé API dans le dashboard</li>
              <li>Ajoutez <code className="bg-gray-100 px-1 rounded">RESEND_API_KEY=re_votre_cle</code> dans <code className="bg-gray-100 px-1 rounded">.env.local</code></li>
              <li>Redémarrez le serveur Next.js</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">2. Test</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Entrez votre adresse email dans le champ "Destinataire"</li>
              <li>Personnalisez le sujet et le contenu si nécessaire</li>
              <li>Cliquez sur "Envoyer l'email de test"</li>
              <li>Vérifiez votre boîte de réception (et les spams)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">3. Mode test</p>
            <p className="ml-2">
              Si Resend n'est pas configuré, les emails sont simulés. Vous verrez les logs dans la console serveur mais aucun email réel ne sera envoyé.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}





