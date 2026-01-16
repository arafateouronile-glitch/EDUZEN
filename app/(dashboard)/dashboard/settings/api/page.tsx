'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiService } from '@/lib/services/api.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  Webhook,
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

export default function APISettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const toast = (options: any) => {
    addToast({
      title: options.title,
      description: options.description,
      variant: options.variant || 'success',
    })
  }
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyDescription, setNewKeyDescription] = useState('')
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([])
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)

  // Récupérer les clés API
  const { data: apiKeys } = useQuery({
    queryKey: ['api-keys', user?.organization_id],
    queryFn: () => apiService.getAPIKeys(user?.organization_id || ''),
    enabled: !!user?.organization_id,
  })

  // Récupérer les webhooks
  const { data: webhooks } = useQuery({
    queryKey: ['webhooks', user?.organization_id],
    queryFn: () => apiService.getWebhooks(user?.organization_id || ''),
    enabled: !!user?.organization_id,
  })

  // Récupérer les quotas
  const { data: quota } = useQuery({
    queryKey: ['api-quota', user?.organization_id],
    queryFn: () => apiService.getQuota(user?.organization_id || ''),
    enabled: !!user?.organization_id,
  })

  // Créer une clé API
  const createKeyMutation = useMutation({
    mutationFn: () =>
      apiService.createAPIKey(user?.organization_id || '', user?.id || '', newKeyName, {
        description: newKeyDescription,
        scopes: newKeyScopes,
      }),
    onSuccess: (data: any) => {
      setCreatedKey(data.key)
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setNewKeyName('')
      setNewKeyDescription('')
      setNewKeyScopes([])
      toast({
        title: 'Clé API créée',
        description: 'Votre clé API a été créée avec succès. Copiez-la maintenant, elle ne sera plus affichée.',
      })
    },
  })

  // Révoquer une clé API
  const revokeKeyMutation = useMutation({
    mutationFn: (keyId: string) => apiService.revokeAPIKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast({
        title: 'Clé API révoquée',
        description: 'La clé API a été révoquée avec succès.',
      })
    },
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copié',
      description: 'La clé API a été copiée dans le presse-papiers.',
    })
  }

  const scopes = [
    { value: 'read:students', label: 'Lire les étudiants' },
    { value: 'write:students', label: 'Créer/modifier les étudiants' },
    { value: 'read:documents', label: 'Lire les documents' },
    { value: 'write:documents', label: 'Créer/modifier les documents' },
    { value: 'read:payments', label: 'Lire les paiements' },
    { value: 'write:payments', label: 'Créer/modifier les paiements' },
    { value: '*', label: 'Tous les accès' },
  ]

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Key className="h-8 w-8" />
          Gestion de l'API
        </h1>
        <p className="text-muted-foreground">
          Gérez vos clés API et webhooks pour intégrer EDUZEN avec vos applications
        </p>
      </div>

      <Tabs defaultValue="keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="keys">Clés API</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="quota">Quotas</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>

        {/* Onglet Clés API */}
        <TabsContent value="keys">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Clés API</h2>
                <p className="text-muted-foreground">
                  Créez et gérez vos clés API pour accéder à l'API publique
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle clé API
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer une nouvelle clé API</DialogTitle>
                    <DialogDescription>
                      Créez une clé API pour accéder à l'API publique. Vous pourrez copier la clé
                      une seule fois.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="key-name">Nom</Label>
                      <Input
                        id="key-name"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="Ex: Production API, Development"
                      />
                    </div>
                    <div>
                      <Label htmlFor="key-description">Description</Label>
                      <Textarea
                        id="key-description"
                        value={newKeyDescription}
                        onChange={(e) => setNewKeyDescription(e.target.value)}
                        placeholder="Description de l'utilisation de cette clé"
                      />
                    </div>
                    <div>
                      <Label>Permissions (Scopes)</Label>
                      <div className="space-y-2 mt-2">
                        {scopes.map((scope) => (
                          <label key={scope.value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={newKeyScopes.includes(scope.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewKeyScopes([...newKeyScopes, scope.value])
                                } else {
                                  setNewKeyScopes(newKeyScopes.filter((s) => s !== scope.value))
                                }
                              }}
                            />
                            <span className="text-sm">{scope.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={() => createKeyMutation.mutate()}
                      disabled={!newKeyName || createKeyMutation.isPending}
                      className="w-full"
                    >
                      Créer la clé API
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Dialog pour afficher la clé créée */}
              {createdKey && (
                <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Clé API créée</DialogTitle>
                      <DialogDescription>
                        Copiez cette clé maintenant. Elle ne sera plus affichée après la fermeture
                        de cette fenêtre.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Input
                          value={createdKey}
                          readOnly
                          type={showKey ? 'text' : 'password'}
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowKey(!showKey)}
                        >
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdKey)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-800">
                          <strong>Important :</strong> Cette clé ne sera affichée qu'une seule fois.
                          Assurez-vous de la copier et de la stocker en sécurité.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Liste des clés API */}
            {apiKeys && apiKeys.length > 0 ? (
              <div className="space-y-4">
                {apiKeys.map((key: any) => (
                  <Card key={key.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{key.name}</CardTitle>
                          {key.description && (
                            <CardDescription className="mt-1">{key.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {key.is_active ? (
                            <span className="flex items-center gap-1 text-sm text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="h-4 w-4" />
                              Révoquée
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-muted-foreground">
                            {key.key_prefix}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(key.key_prefix)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Créée le</span>
                            <p className="font-medium">{formatDate(key.created_at)}</p>
                          </div>
                          {key.last_used_at && (
                            <div>
                              <span className="text-muted-foreground">Dernière utilisation</span>
                              <p className="font-medium">{formatDate(key.last_used_at)}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Requêtes</span>
                            <p className="font-medium">{key.request_count || 0}</p>
                          </div>
                          {key.expires_at && (
                            <div>
                              <span className="text-muted-foreground">Expire le</span>
                              <p className="font-medium">{formatDate(key.expires_at)}</p>
                            </div>
                          )}
                        </div>
                        {key.scopes && key.scopes.length > 0 && (
                          <div>
                            <span className="text-sm text-muted-foreground">Permissions :</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {key.scopes.map((scope: string) => (
                                <span
                                  key={scope}
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded"
                                >
                                  {scopes.find((s) => s.value === scope)?.label || scope}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          {key.is_active && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => revokeKeyMutation.mutate(key.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Révoquer
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Aucune clé API. Créez-en une pour commencer à utiliser l'API.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Onglet Webhooks */}
        <TabsContent value="webhooks">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Webhooks</h2>
                <p className="text-muted-foreground">
                  Configurez des webhooks pour recevoir des notifications d'événements
                </p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau webhook
              </Button>
            </div>

            {webhooks && webhooks.length > 0 ? (
              <div className="space-y-4">
                {webhooks.map((webhook: any) => (
                  <Card key={webhook.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{webhook.name}</CardTitle>
                          <CardDescription className="mt-1 font-mono text-xs">
                            {webhook.url}
                          </CardDescription>
                        </div>
                        {webhook.is_active ? (
                          <span className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Actif
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            Inactif
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {webhook.events && webhook.events.length > 0 && (
                          <div>
                            <span className="text-sm text-muted-foreground">Événements :</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {webhook.events.map((event: string) => (
                                <span
                                  key={event}
                                  className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded"
                                >
                                  {event}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Succès</span>
                            <p className="font-medium">{webhook.success_count || 0}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Échecs</span>
                            <p className="font-medium">{webhook.failure_count || 0}</p>
                          </div>
                          {webhook.last_triggered_at && (
                            <div>
                              <span className="text-muted-foreground">Dernier déclenchement</span>
                              <p className="font-medium">{formatDate(webhook.last_triggered_at)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Aucun webhook configuré. Créez-en un pour recevoir des notifications.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Onglet Quotas */}
        <TabsContent value="quota">
          <Card>
            <CardHeader>
              <CardTitle>Quotas API</CardTitle>
              <CardDescription>
                Limites d'utilisation de l'API pour votre organisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quota ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Par minute</span>
                        <span className="text-sm text-muted-foreground">
                          {quota.requests_used_minute || 0} / {quota.requests_per_minute || 60}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              ((quota.requests_used_minute || 0) / (quota.requests_per_minute || 60)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Par heure</span>
                        <span className="text-sm text-muted-foreground">
                          {quota.requests_used_hour || 0} / {quota.requests_per_hour || 1000}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              ((quota.requests_used_hour || 0) / (quota.requests_per_hour || 1000)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Par jour</span>
                        <span className="text-sm text-muted-foreground">
                          {quota.requests_used_day || 0} / {quota.requests_per_day || 10000}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              ((quota.requests_used_day || 0) / (quota.requests_per_day || 10000)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Par mois</span>
                        <span className="text-sm text-muted-foreground">
                          {quota.requests_used_month || 0} / {quota.requests_per_month || 100000}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              ((quota.requests_used_month || 0) /
                                (quota.requests_per_month || 100000)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  Chargement des quotas...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Documentation */}
        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>Documentation API</CardTitle>
              <CardDescription>
                Accédez à la documentation complète de l'API publique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  La documentation OpenAPI/Swagger de l'API est disponible à l'adresse suivante :
                </p>
                <div className="flex items-center gap-2">
                  <code className="px-3 py-2 bg-gray-100 rounded text-sm">
                    {process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/v1/docs
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/v1/docs`, '_blank')
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ouvrir
                  </Button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Utilisation de l'API</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Créez une clé API dans l'onglet "Clés API"</li>
                    <li>Utilisez cette clé dans l'en-tête <code>X-API-Key</code> de vos requêtes</li>
                    <li>Consultez la documentation pour voir tous les endpoints disponibles</li>
                    <li>Respectez les limites de rate limiting configurées</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

