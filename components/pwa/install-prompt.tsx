'use client'

import { useState, useEffect } from 'react'
import { usePWA } from '@/lib/hooks/use-pwa'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download, X, Smartphone } from 'lucide-react'

export function InstallPrompt() {
  const { isInstallable, isInstalled, install } = usePWA()
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Ne pas afficher si déjà installée ou si déjà rejetée
    if (isInstalled || dismissed) {
      return
    }

    // Vérifier si l'utilisateur a déjà rejeté
    const dismissedAt = localStorage.getItem('pwa-install-dismissed')
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      
      // Réafficher après 7 jours
      if (daysSinceDismissed < 7) {
        return
      }
    }

    // Afficher le prompt après un délai
    if (isInstallable) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // Afficher après 3 secondes

      return () => clearTimeout(timer)
    }
  }, [isInstallable, isInstalled, dismissed])

  const handleInstall = async () => {
    const success = await install()
    if (success) {
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
  }

  if (!showPrompt || isInstalled) {
    return null
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Installer EDUZEN
          </DialogTitle>
          <DialogDescription>
            Installez EDUZEN sur votre appareil pour un accès rapide et une meilleure expérience.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✓ Accès rapide depuis l'écran d'accueil</p>
            <p>✓ Fonctionne hors ligne</p>
            <p>✓ Notifications push</p>
            <p>✓ Expérience optimisée</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleInstall} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Installer
            </Button>
            <Button onClick={handleDismiss} variant="outline">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
