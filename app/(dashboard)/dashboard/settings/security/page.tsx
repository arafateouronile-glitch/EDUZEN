'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { twoFactorAuthService } from '@/lib/services/2fa.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import {
  Shield, CheckCircle, AlertCircle, Download, RefreshCw, Eye, EyeOff, Key, Save
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function SecuritySettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [activationCode, setActivationCode] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [showDisableDialog, setShowDisableDialog] = useState(false)

  // Récupérer la configuration 2FA
  const { data: config, isLoading } = useQuery({
    queryKey: ['2fa-config', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      return twoFactorAuthService.getConfig(user.id)
    },
    enabled: !!user?.id,
  })

  // Mutation pour générer le secret
  const generateSecretMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/2fa/generate-secret', {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la génération du secret')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['2fa-config'] })
      setShowBackupCodes(true)
      addToast({
        type: 'success',
        title: 'Secret généré',
        description: 'Scannez le QR code avec votre application d\'authentification.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue.',
      })
    },
  })

  // Mutation pour vérifier l'activation
  const verifyActivationMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch('/api/2fa/verify-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Code invalide')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['2fa-config'] })
      setActivationCode('')
      setShowBackupCodes(false)
      addToast({
        type: 'success',
        title: '2FA activée',
        description: 'L\'authentification à deux facteurs est maintenant activée.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Code invalide',
        description: error.message || 'Le code saisi est incorrect.',
      })
    },
  })

  // Mutation pour désactiver
  const disableMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await fetch('/api/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la désactivation')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['2fa-config'] })
      setDisablePassword('')
      setShowDisableDialog(false)
      addToast({
        type: 'success',
        title: '2FA désactivée',
        description: 'L\'authentification à deux facteurs a été désactivée.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue.',
      })
    },
  })

  // Mutation pour régénérer les codes de récupération
  const regenerateBackupCodesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/2fa/regenerate-backup-codes', {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la régénération')
      }
      return response.json()
    },
    onSuccess: (data) => {
      setShowBackupCodes(true)
      addToast({
        type: 'success',
        title: 'Codes régénérés',
        description: 'Nouveaux codes de récupération générés.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue.',
      })
    },
  })

  const handleActivate = () => {
    generateSecretMutation.mutate()
  }

  const handleVerifyActivation = () => {
    if (activationCode.length !== 6) {
      addToast({
        type: 'error',
        title: 'Code invalide',
        description: 'Le code doit contenir 6 chiffres.',
      })
      return
    }
    verifyActivationMutation.mutate(activationCode)
  }

  const handleDisable = () => {
    if (!disablePassword) {
      addToast({
        type: 'error',
        title: 'Mot de passe requis',
        description: 'Veuillez entrer votre mot de passe.',
      })
      return
    }
    disableMutation.mutate(disablePassword)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      </div>
    )
  }

  const isEnabled = config?.is_enabled || false
  const isVerified = config?.is_verified || false
  const hasSecret = !!generateSecretMutation.data

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Shield className="mr-3 h-8 w-8 text-primary" />
          Sécurité
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Gérez votre authentification à deux facteurs (2FA) pour renforcer la sécurité de votre compte
        </p>
      </div>

      {/* Statut 2FA */}
      <Card>
        <CardHeader>
          <CardTitle>Authentification à deux facteurs (2FA)</CardTitle>
          <CardDescription>
            Ajoutez une couche de sécurité supplémentaire à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statut actuel */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {isEnabled ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">2FA Activée</p>
                    {config?.last_used_at && (
                      <p className="text-sm text-green-600">
                        Dernière utilisation: {new Date(config.last_used_at).toLocaleString('fr-FR')}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-semibold text-gray-800">2FA Désactivée</p>
                    <p className="text-sm text-gray-600">
                      Votre compte n'est pas protégé par l'authentification à deux facteurs
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Activation */}
          {!isEnabled && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Activer la 2FA</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Scannez le QR code avec une application d'authentification comme Google Authenticator ou Authy.
                </p>
                <Button
                  onClick={handleActivate}
                  disabled={generateSecretMutation.isPending}
                >
                  <Key className="h-4 w-4 mr-2" />
                  {hasSecret ? 'Régénérer le QR code' : 'Générer le QR code'}
                </Button>
              </div>

              {/* QR Code */}
              {generateSecretMutation.data?.qrCodeUrl && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-center">
                    <img
                      src={generateSecretMutation.data.qrCodeUrl}
                      alt="QR Code 2FA"
                      className="w-64 h-64"
                    />
                  </div>
                  <div>
                    <Label>Code secret (manuel)</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Input
                        value={generateSecretMutation.data.secret}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(generateSecretMutation.data.secret)
                          addToast({
                            type: 'success',
                            title: 'Copié',
                            description: 'Le secret a été copié dans le presse-papiers.',
                          })
                        }}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Codes de récupération */}
                  {showBackupCodes && generateSecretMutation.data.backupCodes && (
                    <div className="space-y-2">
                      <Label>Codes de récupération</Label>
                      <p className="text-sm text-muted-foreground">
                        Conservez ces codes en lieu sûr. Vous en aurez besoin si vous perdez l'accès à votre application d'authentification.
                      </p>
                      <div className="grid grid-cols-2 gap-2 p-4 bg-white rounded border">
                        {generateSecretMutation.data.backupCodes.map((code: string, index: number) => (
                          <div key={index} className="font-mono text-sm text-center">
                            {code}
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const codesText = generateSecretMutation.data.backupCodes.join('\n')
                          const blob = new Blob([codesText], { type: 'text/plain' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = 'eduzen-backup-codes.txt'
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger les codes
                      </Button>
                    </div>
                  )}

                  {/* Vérification du code */}
                  <div className="space-y-2">
                    <Label>Vérifier l'activation</Label>
                    <p className="text-sm text-muted-foreground">
                      Entrez le code à 6 chiffres affiché dans votre application d'authentification pour confirmer l'activation.
                    </p>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={activationCode}
                        onChange={(e) => setActivationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="font-mono text-center text-2xl tracking-widest"
                      />
                      <Button
                        onClick={handleVerifyActivation}
                        disabled={verifyActivationMutation.isPending || activationCode.length !== 6}
                      >
                        {verifyActivationMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Vérifier
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Désactivation */}
          {isEnabled && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Désactiver la 2FA</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Vous devrez entrer votre mot de passe pour désactiver l'authentification à deux facteurs.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setShowDisableDialog(true)}
                >
                  Désactiver la 2FA
                </Button>
              </div>

              {/* Régénérer les codes de récupération */}
              <div>
                <h3 className="font-semibold mb-2">Codes de récupération</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Régénérez vos codes de récupération si vous les avez perdus ou utilisés.
                </p>
                <Button
                  variant="outline"
                  onClick={() => regenerateBackupCodesMutation.mutate()}
                  disabled={regenerateBackupCodesMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Régénérer les codes
                </Button>
              </div>

              {/* Afficher les nouveaux codes */}
              {showBackupCodes && regenerateBackupCodesMutation.data?.backupCodes && (
                <div className="space-y-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Label className="text-yellow-800">Nouveaux codes de récupération</Label>
                  <p className="text-sm text-yellow-700 mb-2">
                    Conservez ces codes en lieu sûr. Les anciens codes ne fonctionneront plus.
                  </p>
                  <div className="grid grid-cols-2 gap-2 p-4 bg-white rounded border">
                    {regenerateBackupCodesMutation.data.backupCodes.map((code: string, index: number) => (
                      <div key={index} className="font-mono text-sm text-center">
                        {code}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const codesText = regenerateBackupCodesMutation.data.backupCodes.join('\n')
                      const blob = new Blob([codesText], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'eduzen-backup-codes.txt'
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger les codes
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de désactivation */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Désactiver la 2FA</DialogTitle>
            <DialogDescription>
              Entrez votre mot de passe pour confirmer la désactivation de l'authentification à deux facteurs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="disable-password">Mot de passe</Label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Votre mot de passe"
                className="mt-2"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDisableDialog(false)
                  setDisablePassword('')
                }}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisable}
                disabled={disableMutation.isPending || !disablePassword}
              >
                {disableMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Désactiver
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gestion des sessions actives */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions actives</CardTitle>
          <CardDescription>
            Gérez vos sessions actives sur différents appareils
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActiveSessionsList />
        </CardContent>
      </Card>

      {/* Règles de timeout */}
      <Card>
        <CardHeader>
          <CardTitle>Règles de timeout</CardTitle>
          <CardDescription>
            Configurez les règles de timeout et de gestion des sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimeoutRulesSettings />
        </CardContent>
      </Card>
    </div>
  )
}

// Composant pour afficher les sessions actives
function ActiveSessionsList() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ['active-sessions', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/sessions/active')
      if (!response.ok) throw new Error('Erreur lors de la récupération des sessions')
      const data = await response.json()
      return data.sessions || []
    },
    enabled: !!user?.id,
  })

  const revokeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch('/api/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la révocation')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] })
      addToast({
        type: 'success',
        title: 'Session révoquée',
        description: 'La session a été révoquée avec succès.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue.',
      })
    },
  })

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revoke_all: true }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la révocation')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] })
      addToast({
        type: 'success',
        title: 'Toutes les sessions révoquées',
        description: 'Toutes les sessions ont été révoquées avec succès.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue.',
      })
    },
  })

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Chargement...</div>
  }

  if (!sessions || sessions.length === 0) {
    return <div className="text-center text-muted-foreground">Aucune session active</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => revokeAllMutation.mutate()}
          disabled={revokeAllMutation.isPending}
        >
          Révoquer toutes les sessions
        </Button>
      </div>
      <div className="space-y-2">
        {sessions.map((session: any) => (
          <div
            key={session.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <p className="font-semibold">{session.device_name}</p>
                {session.is_current && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Session actuelle
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {session.device_type} • {session.ip_address} • {session.country || 'Inconnu'}
              </p>
              <p className="text-xs text-muted-foreground">
                Dernière activité: {new Date(session.last_activity_at).toLocaleString('fr-FR')}
              </p>
            </div>
            {!session.is_current && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => revokeMutation.mutate(session.id)}
                disabled={revokeMutation.isPending}
              >
                Révoquer
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Composant pour les règles de timeout
function TimeoutRulesSettings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: rules, isLoading } = useQuery({
    queryKey: ['timeout-rules', user?.organization_id],
    queryFn: async () => {
      const response = await fetch('/api/sessions/timeout-rules')
      if (!response.ok) throw new Error('Erreur lors de la récupération des règles')
      const data = await response.json()
      return data.rules
    },
    enabled: !!user?.organization_id,
  })

  const [formData, setFormData] = useState({
    idle_timeout_minutes: rules?.idle_timeout_minutes || 30,
    absolute_timeout_minutes: rules?.absolute_timeout_minutes || 480,
    max_concurrent_sessions: rules?.max_concurrent_sessions || 5,
    allow_multiple_devices: rules?.allow_multiple_devices !== false,
    require_device_verification: rules?.require_device_verification || false,
    notify_on_new_device: rules?.notify_on_new_device !== false,
    notify_on_suspicious_activity: rules?.notify_on_suspicious_activity !== false,
  })

  useEffect(() => {
    if (rules) {
      setFormData({
        idle_timeout_minutes: rules.idle_timeout_minutes || 30,
        absolute_timeout_minutes: rules.absolute_timeout_minutes || 480,
        max_concurrent_sessions: rules.max_concurrent_sessions || 5,
        allow_multiple_devices: rules.allow_multiple_devices !== false,
        require_device_verification: rules.require_device_verification || false,
        notify_on_new_device: rules.notify_on_new_device !== false,
        notify_on_suspicious_activity: rules.notify_on_suspicious_activity !== false,
      })
    }
  }, [rules])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/sessions/timeout-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la sauvegarde')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeout-rules'] })
      addToast({
        type: 'success',
        title: 'Règles sauvegardées',
        description: 'Les règles de timeout ont été sauvegardées avec succès.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue.',
      })
    },
  })

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="idle-timeout">Timeout d'inactivité (minutes)</Label>
          <Input
            id="idle-timeout"
            type="number"
            value={formData.idle_timeout_minutes}
            onChange={(e) => setFormData({ ...formData, idle_timeout_minutes: parseInt(e.target.value) || 30 })}
            min={5}
            max={1440}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Temps d'inactivité avant déconnexion automatique
          </p>
        </div>
        <div>
          <Label htmlFor="absolute-timeout">Timeout absolu (minutes)</Label>
          <Input
            id="absolute-timeout"
            type="number"
            value={formData.absolute_timeout_minutes}
            onChange={(e) => setFormData({ ...formData, absolute_timeout_minutes: parseInt(e.target.value) || 480 })}
            min={60}
            max={10080}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Durée maximale d'une session (même avec activité)
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="max-sessions">Nombre maximum de sessions simultanées</Label>
        <Input
          id="max-sessions"
          type="number"
          value={formData.max_concurrent_sessions}
          onChange={(e) => setFormData({ ...formData, max_concurrent_sessions: parseInt(e.target.value) || 5 })}
          min={1}
          max={20}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <Label>Autoriser plusieurs appareils</Label>
            <p className="text-sm text-muted-foreground">
              Permettre aux utilisateurs d'être connectés sur plusieurs appareils simultanément
            </p>
          </div>
          <Switch
            checked={formData.allow_multiple_devices}
            onCheckedChange={(checked) => setFormData({ ...formData, allow_multiple_devices: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <Label>Vérification des appareils</Label>
            <p className="text-sm text-muted-foreground">
              Exiger une vérification pour les nouveaux appareils
            </p>
          </div>
          <Switch
            checked={formData.require_device_verification}
            onCheckedChange={(checked) => setFormData({ ...formData, require_device_verification: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <Label>Notifier nouveaux appareils</Label>
            <p className="text-sm text-muted-foreground">
              Envoyer une notification lors d'une connexion depuis un nouvel appareil
            </p>
          </div>
          <Switch
            checked={formData.notify_on_new_device}
            onCheckedChange={(checked) => setFormData({ ...formData, notify_on_new_device: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <Label>Notifier activité suspecte</Label>
            <p className="text-sm text-muted-foreground">
              Envoyer une notification en cas d'activité suspecte détectée
            </p>
          </div>
          <Switch
            checked={formData.notify_on_suspicious_activity}
            onCheckedChange={(checked) => setFormData({ ...formData, notify_on_suspicious_activity: checked })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          Sauvegarder les règles
        </Button>
      </div>
    </div>
  )
}















