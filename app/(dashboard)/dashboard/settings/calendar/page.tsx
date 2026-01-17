'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { calendarService } from '@/lib/services/calendar.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import {
  Calendar, Save, TestTube, CheckCircle, AlertCircle,
  Eye, EyeOff, Info, RefreshCw, ExternalLink
} from 'lucide-react'
import type { CalendarProvider } from '@/lib/services/calendar/calendar.types'

const PROVIDERS: Array<{ value: CalendarProvider; label: string; color: string; docs: string }> = [
  { value: 'google', label: 'Google Calendar', color: 'bg-blue-500', docs: 'https://developers.google.com/calendar/api' },
  { value: 'outlook', label: 'Microsoft Outlook', color: 'bg-orange-500', docs: 'https://learn.microsoft.com/en-us/graph/api/resources/calendar' },
]

export default function CalendarSettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider>('google')
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // États pour chaque provider
  const [configs, setConfigs] = useState<Record<CalendarProvider, any>>({
    google: {
      api_key: '',
      api_secret: '',
      sync_sessions: true,
      sync_attendance: false,
      auto_sync: false,
      sync_frequency: 'realtime',
      create_events_for_sessions: true,
      include_students_in_events: false,
      include_location: true,
      send_reminders: false,
      reminder_minutes: 15,
      is_test_mode: true,
    },
    outlook: {
      api_key: '',
      api_secret: '',
      sync_sessions: true,
      sync_attendance: false,
      auto_sync: false,
      sync_frequency: 'realtime',
      create_events_for_sessions: true,
      include_students_in_events: false,
      include_location: true,
      send_reminders: false,
      reminder_minutes: 15,
      is_test_mode: true,
    },
  })

  // Récupérer les configurations existantes
  const { data: existingConfigs, isLoading } = useQuery({
    queryKey: ['calendar-configs', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return {}

      const results: Record<string, any> = {}
      for (const provider of ['google', 'outlook'] as CalendarProvider[]) {
        const config = await calendarService.getConfig(user.organization_id, provider)
        if (config) {
          results[provider] = config
          setConfigs((prev) => ({
            ...prev,
            [provider]: {
              api_key: config.api_key || '',
              api_secret: config.api_secret || '',
              sync_sessions: config.sync_sessions,
              sync_attendance: config.sync_attendance,
              auto_sync: config.auto_sync,
              sync_frequency: config.sync_frequency,
              create_events_for_sessions: config.create_events_for_sessions,
              include_students_in_events: config.include_students_in_events,
              include_location: config.include_location,
              send_reminders: config.send_reminders,
              reminder_minutes: config.reminder_minutes || 15,
              is_test_mode: config.is_test_mode,
            },
          }))
        }
      }
      return results
    },
    enabled: !!user?.organization_id,
  })

  // Mutation pour sauvegarder
  const saveMutation = useMutation({
    mutationFn: async (provider: CalendarProvider) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      return calendarService.upsertConfig(user.organization_id, provider, configs[provider])
    },
    onSuccess: (data, provider) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-configs'] })
      addToast({
        type: 'success',
        title: 'Configuration sauvegardée',
        description: `La configuration ${PROVIDERS.find((p) => p.value === provider)?.label} a été sauvegardée.`,
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la sauvegarde.',
      })
    },
  })

  // Mutation pour authentifier
  const authenticateMutation = useMutation({
    mutationFn: async (provider: CalendarProvider) => {
      const response = await fetch(`/api/calendar/authenticate/${provider}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de l\'authentification')
      }
      const data = await response.json()
      if (data.auth_url) {
        window.location.href = data.auth_url
      }
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de l\'authentification.',
      })
      setIsAuthenticating(false)
    },
  })

  const handleSave = (provider: CalendarProvider) => {
    saveMutation.mutate(provider)
  }

  const handleAuthenticate = (provider: CalendarProvider) => {
    setIsAuthenticating(true)
    authenticateMutation.mutate(provider)
  }

  const updateConfig = (provider: CalendarProvider, field: string, value: any) => {
    setConfigs((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value,
      },
    }))
  }

  const toggleSecret = (provider: string) => {
    setShowSecrets((prev) => ({
      ...prev,
      [provider]: !prev[provider],
    }))
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

  const currentConfig = existingConfigs?.[selectedProvider]

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="mr-3 h-8 w-8 text-primary" />
          Intégrations Calendrier
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Synchronisez vos sessions avec Google Calendar ou Microsoft Outlook
        </p>
      </div>

      {/* Sélecteur de provider */}
      <div className="flex space-x-4">
        {PROVIDERS.map((provider) => {
          const config = existingConfigs?.[provider.value]
          const isActive = config?.is_active || false

          return (
            <button
              key={provider.value}
              onClick={() => setSelectedProvider(provider.value)}
              className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                selectedProvider === provider.value
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${provider.color}`} />
                  <span className="font-semibold">{provider.label}</span>
                </div>
                {isActive && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Formulaire de configuration */}
      {selectedProvider && (
        <Card>
          <CardHeader>
            <CardTitle>
              Configuration {PROVIDERS.find((p) => p.value === selectedProvider)?.label}
            </CardTitle>
            <CardDescription>
              Configurez les paramètres d'API pour {PROVIDERS.find((p) => p.value === selectedProvider)?.label}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mode test/production */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor={`test-mode-${selectedProvider}`}>Mode test</Label>
                <p className="text-sm text-muted-foreground">
                  Activez le mode test pour tester les intégrations sans impact sur vos calendriers réels
                </p>
              </div>
              <Switch
                checked={configs[selectedProvider].is_test_mode}
                onCheckedChange={(checked) => updateConfig(selectedProvider, 'is_test_mode', checked)}
              />
            </div>

            {/* Informations API */}
            <div className="space-y-4">
              <div>
                <Label htmlFor={`api-key-${selectedProvider}`}>Clé API (Client ID)</Label>
                <div className="relative">
                  <Input
                    id={`api-key-${selectedProvider}`}
                    type={showSecrets[`${selectedProvider}-api-key`] ? 'text' : 'password'}
                    value={configs[selectedProvider].api_key}
                    onChange={(e) => updateConfig(selectedProvider, 'api_key', e.target.value)}
                    placeholder="Votre clé API"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret(`${selectedProvider}-api-key`)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showSecrets[`${selectedProvider}-api-key`] ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor={`api-secret-${selectedProvider}`}>Secret API (Client Secret)</Label>
                <div className="relative">
                  <Input
                    id={`api-secret-${selectedProvider}`}
                    type={showSecrets[`${selectedProvider}-api-secret`] ? 'text' : 'password'}
                    value={configs[selectedProvider].api_secret}
                    onChange={(e) => updateConfig(selectedProvider, 'api_secret', e.target.value)}
                    placeholder="Votre secret API"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret(`${selectedProvider}-api-secret`)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showSecrets[`${selectedProvider}-api-secret`] ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Options de synchronisation */}
            <div className="space-y-4">
              <h3 className="font-semibold">Options de synchronisation</h3>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor={`sync-sessions-${selectedProvider}`}>Synchroniser les sessions</Label>
                  <p className="text-sm text-muted-foreground">
                    Créer automatiquement des événements calendrier pour chaque session
                  </p>
                </div>
                <Switch
                  id={`sync-sessions-${selectedProvider}`}
                  checked={configs[selectedProvider].sync_sessions}
                  onCheckedChange={(checked) => updateConfig(selectedProvider, 'sync_sessions', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor={`create-events-${selectedProvider}`}>Créer des événements pour les sessions</Label>
                  <p className="text-sm text-muted-foreground">
                    Créer automatiquement un événement lors de la création d'une session
                  </p>
                </div>
                <Switch
                  id={`create-events-${selectedProvider}`}
                  checked={configs[selectedProvider].create_events_for_sessions}
                  onCheckedChange={(checked) => updateConfig(selectedProvider, 'create_events_for_sessions', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor={`include-students-${selectedProvider}`}>Inclure les étudiants dans les événements</Label>
                  <p className="text-sm text-muted-foreground">
                    Ajouter les étudiants comme participants aux événements calendrier
                  </p>
                </div>
                <Switch
                  id={`include-students-${selectedProvider}`}
                  checked={configs[selectedProvider].include_students_in_events}
                  onCheckedChange={(checked) => updateConfig(selectedProvider, 'include_students_in_events', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor={`include-location-${selectedProvider}`}>Inclure le lieu</Label>
                  <p className="text-sm text-muted-foreground">
                    Ajouter le lieu de la session dans l'événement calendrier
                  </p>
                </div>
                <Switch
                  id={`include-location-${selectedProvider}`}
                  checked={configs[selectedProvider].include_location}
                  onCheckedChange={(checked) => updateConfig(selectedProvider, 'include_location', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor={`send-reminders-${selectedProvider}`}>Envoyer des rappels</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer les rappels pour les événements calendrier
                  </p>
                </div>
                <Switch
                  id={`send-reminders-${selectedProvider}`}
                  checked={configs[selectedProvider].send_reminders}
                  onCheckedChange={(checked) => updateConfig(selectedProvider, 'send_reminders', checked)}
                />
              </div>

              {configs[selectedProvider].send_reminders && (
                <div>
                  <Label htmlFor={`reminder-minutes-${selectedProvider}`}>Minutes avant l'événement</Label>
                  <Input
                    id={`reminder-minutes-${selectedProvider}`}
                    type="number"
                    min="0"
                    max="20160"
                    value={configs[selectedProvider].reminder_minutes}
                    onChange={(e) => updateConfig(selectedProvider, 'reminder_minutes', parseInt(e.target.value) || 15)}
                    className="mt-2"
                  />
                </div>
              )}
            </div>

            {/* Statut de connexion */}
            {currentConfig?.is_active && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-800">Connecté</p>
                    {currentConfig.default_calendar_name && (
                      <p className="text-sm text-green-600">Calendrier: {currentConfig.default_calendar_name}</p>
                    )}
                    {currentConfig.last_sync_at && (
                      <p className="text-xs text-green-600 mt-1">
                        Dernière synchronisation: {new Date(currentConfig.last_sync_at).toLocaleString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {currentConfig.last_sync_status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {currentConfig.last_sync_status === 'failed' && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Informations */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Comment obtenir vos identifiants API ?</p>
                  <p className="mb-2">
                    Consultez la documentation de {PROVIDERS.find((p) => p.value === selectedProvider)?.label} pour créer une application et obtenir vos identifiants.
                  </p>
                  <a
                    href={PROVIDERS.find((p) => p.value === selectedProvider)?.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center space-x-1"
                  >
                    <span>Documentation</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => handleSave(selectedProvider)}
                disabled={saveMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>

              {currentConfig?.api_key && currentConfig?.api_secret && (
                <>
                  {!currentConfig.is_active ? (
                    <Button
                      onClick={() => handleAuthenticate(selectedProvider)}
                      disabled={isAuthenticating || authenticateMutation.isPending}
                    >
                      {isAuthenticating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Authentification...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Connecter
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        addToast({
                          type: 'info',
                          title: 'Synchronisation',
                          description: 'La synchronisation se fait automatiquement lors de la création/modification de sessions.',
                        })
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Info Sync
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}












