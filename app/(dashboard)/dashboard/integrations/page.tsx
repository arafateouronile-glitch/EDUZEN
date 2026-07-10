'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Clock,
  Webhook,
  Code,
  Zap,
  ExternalLink,
  Shield,
  Activity,
  Terminal,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { APIPaywall } from '@/components/integrations/api-paywall'
import type { PlanTier } from '@/lib/services/plan-limits'

const WEBHOOK_EVENTS = [
  { value: 'learner.created', label: 'Apprenant créé', category: 'Apprenants' },
  { value: 'learner.updated', label: 'Apprenant modifié', category: 'Apprenants' },
  { value: 'learner.deleted', label: 'Apprenant supprimé', category: 'Apprenants' },
  { value: 'document.signed', label: 'Document signé', category: 'Documents' },
  { value: 'document.generated', label: 'Document généré', category: 'Documents' },
  { value: 'diploma.expired', label: 'Diplôme expiré', category: 'Documents' },
  { value: 'diploma.expiring_soon', label: 'Diplôme expirant bientôt', category: 'Documents' },
  { value: 'payment.received', label: 'Paiement reçu', category: 'Paiements' },
  { value: 'payment.overdue', label: 'Paiement en retard', category: 'Paiements' },
  { value: 'invoice.created', label: 'Facture créée', category: 'Paiements' },
  { value: 'session.started', label: 'Session démarrée', category: 'Sessions' },
  { value: 'session.completed', label: 'Session terminée', category: 'Sessions' },
  { value: 'attendance.marked', label: 'Présence enregistrée', category: 'Sessions' },
]

const API_SCOPES = [
  { value: 'read:students', label: 'Lire les apprenants' },
  { value: 'write:students', label: 'Créer/modifier les apprenants' },
  { value: 'read:programs', label: 'Lire les programmes (WordPress)' },
  { value: 'read:formations', label: 'Lire les formations (WordPress)' },
  { value: 'read:sessions', label: 'Lire les sessions' },
  { value: 'write:sessions', label: 'Créer/modifier les sessions' },
  { value: 'read:documents', label: 'Lire les documents' },
  { value: 'write:documents', label: 'Créer/modifier les documents' },
  { value: 'read:payments', label: 'Lire les paiements' },
  { value: 'write:payments', label: 'Créer/modifier les paiements' },
  { value: '*', label: 'Tous les accès (admin)' },
]

export default function IntegrationsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  // State for API key creation
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyDescription, setNewKeyDescription] = useState('')
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([])
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [createKeyOpen, setCreateKeyOpen] = useState(false)


  // State for webhook creation
  const [newWebhookName, setNewWebhookName] = useState('')
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([])
  const [createWebhookOpen, setCreateWebhookOpen] = useState(false)

  // Check plan access
  const { data: planData, isLoading: planLoading } = useQuery({
    queryKey: ['plan-features'],
    queryFn: async () => {
      const res = await fetch('/api/integrations/plan')
      if (!res.ok) throw new Error('Failed to fetch plan')
      const json = await res.json()
      return json.data as { plan: PlanTier; features: { apiAccess: boolean; webhooksAccess: boolean } }
    },
    enabled: !!user?.organization_id,
  })

  const hasApiAccess = planData?.features?.apiAccess ?? false

  // Fetch API keys
  const { data: apiKeysData, isLoading: keysLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const res = await fetch('/api/integrations/api-keys')
      if (!res.ok) throw new Error('Failed to fetch API keys')
      const json = await res.json()
      return json.data as any[]
    },
    enabled: hasApiAccess,
  })

  // Fetch webhooks
  const { data: webhooksData, isLoading: webhooksLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const res = await fetch('/api/integrations/webhooks')
      if (!res.ok) throw new Error('Failed to fetch webhooks')
      const json = await res.json()
      return json.data as any[]
    },
    enabled: hasApiAccess,
  })

  // Create API key
  const createKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/integrations/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName, description: newKeyDescription, scopes: newKeyScopes }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to create API key')
      }
      return res.json()
    },
    onSuccess: (data) => {
      setCreatedKey(data.data.key)
      setCreateKeyOpen(false)
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setNewKeyName('')
      setNewKeyDescription('')
      setNewKeyScopes([])
    },
    onError: (error: Error) => {
      addToast({ title: 'Erreur', description: error.message, type: 'error' })
    },
  })

  // Revoke API key
  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const res = await fetch(`/api/integrations/api-keys?id=${keyId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to revoke key')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      addToast({ title: 'Clé révoquée', description: 'La clé API a été révoquée avec succès.', type: 'success' })
    },
  })

  // Create webhook
  const createWebhookMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/integrations/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWebhookName, url: newWebhookUrl, events: newWebhookEvents }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to create webhook')
      }
      return res.json()
    },
    onSuccess: () => {
      setCreateWebhookOpen(false)
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setNewWebhookName('')
      setNewWebhookUrl('')
      setNewWebhookEvents([])
      addToast({ title: 'Webhook créé', description: 'Le webhook a été configuré avec succès.', type: 'success' })
    },
    onError: (error: Error) => {
      addToast({ title: 'Erreur', description: error.message, type: 'error' })
    },
  })

  // Delete webhook
  const deleteWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const res = await fetch(`/api/integrations/webhooks?id=${webhookId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete webhook')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      addToast({ title: 'Webhook supprimé', description: 'Le webhook a été supprimé.', type: 'success' })
    },
  })

  // Toggle webhook active state
  const toggleWebhookMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await fetch('/api/integrations/webhooks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active }),
      })
      if (!res.ok) throw new Error('Failed to update webhook')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    addToast({ title: 'Copié', description: 'Copié dans le presse-papiers.', type: 'success' })
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://eduzen.io'

  if (planLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
      </div>
    )
  }

  if (!hasApiAccess) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <PageHeader />
        <APIPaywall />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <PageHeader />

      <Tabs defaultValue="keys" className="space-y-6">
        <TabsList className="bg-gray-100/80 p-1 rounded-xl">
          <TabsTrigger value="keys" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Key className="h-4 w-4" />
            Clés API
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="docs" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Code className="h-4 w-4" />
            Documentation
          </TabsTrigger>
        </TabsList>

        {/* ==================== API KEYS TAB ==================== */}
        <TabsContent value="keys">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Clés API</h2>
                <p className="text-sm text-gray-500">Gérez vos clés d'accès à l'API REST EDUZEN</p>
              </div>
              <Dialog open={createKeyOpen} onOpenChange={setCreateKeyOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-blue shadow-lg shadow-brand-blue/20">
                    <Plus className="h-4 w-4 mr-2" />
                    Générer une clé
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nouvelle clé API</DialogTitle>
                    <DialogDescription>
                      Créez une clé pour authentifier vos requêtes vers l'API EDUZEN.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="key-name">Nom de la clé</Label>
                      <Input
                        id="key-name"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="Ex: Production, Développement, Zapier"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="key-desc">Description (optionnel)</Label>
                      <Input
                        id="key-desc"
                        value={newKeyDescription}
                        onChange={(e) => setNewKeyDescription(e.target.value)}
                        placeholder="Usage de cette clé..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Permissions</Label>
                      <div className="grid gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-lg border">
                        {API_SCOPES.map((scope) => (
                          <label key={scope.value} className="flex items-center gap-2 cursor-pointer">
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
                              className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                            />
                            <span className="text-sm text-gray-700">{scope.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={() => createKeyMutation.mutate()}
                      disabled={!newKeyName || createKeyMutation.isPending}
                      className="w-full"
                    >
                      {createKeyMutation.isPending ? 'Création...' : 'Générer la clé'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Created key reveal modal */}
            <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    Clé API générée
                  </DialogTitle>
                  <DialogDescription>
                    Copiez cette clé maintenant. Elle ne sera plus jamais affichée.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Input
                        value={createdKey || ''}
                        readOnly
                        type={showKey ? 'text' : 'password'}
                        className="font-mono text-sm pr-20 bg-gray-900 text-emerald-400 border-gray-700"
                      />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)} className="shrink-0">
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => createdKey && copyToClipboard(createdKey)} className="shrink-0">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Cette clé ne sera affichée qu'une seule fois</p>
                      <p className="text-xs text-amber-700 mt-1">Stockez-la dans un gestionnaire de secrets (ex: .env, Vault).</p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* API Keys list */}
            {keysLoading ? (
              <div className="text-center py-12 text-gray-500">Chargement...</div>
            ) : apiKeysData && apiKeysData.length > 0 ? (
              <div className="space-y-3">
                {apiKeysData.map((key: any) => (
                  <motion.div
                    key={key.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="border border-gray-200 hover:border-gray-300 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-gray-900">{key.name}</h3>
                              {key.is_active ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  Révoquée
                                </span>
                              )}
                            </div>
                            {key.description && (
                              <p className="text-sm text-gray-500">{key.description}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {key.key_prefix}
                              </code>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(key.key_prefix)}>
                                <Copy className="h-3 w-3 text-gray-400" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <span>Créée le {formatDate(key.created_at)}</span>
                              {key.last_used_at && <span>Utilisée le {formatDate(key.last_used_at)}</span>}
                              <span>{key.request_count || 0} requêtes</span>
                            </div>
                            {key.scopes && key.scopes.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {key.scopes.map((scope: string) => (
                                  <span key={scope} className="text-[10px] font-mono px-1.5 py-0.5 bg-brand-blue/5 text-brand-blue rounded">
                                    {scope}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {key.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => revokeKeyMutation.mutate(key.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-12 text-center">
                  <Key className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Aucune clé API</p>
                  <p className="text-sm text-gray-400 mt-1">Générez votre première clé pour commencer à intégrer EDUZEN.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ==================== WEBHOOKS TAB ==================== */}
        <TabsContent value="webhooks">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Webhooks</h2>
                <p className="text-sm text-gray-500">Recevez des notifications en temps réel quand des événements se produisent</p>
              </div>
              <Dialog open={createWebhookOpen} onOpenChange={setCreateWebhookOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 shadow-lg shadow-purple-500/20">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un webhook
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Nouveau webhook</DialogTitle>
                    <DialogDescription>
                      Configurez une URL de destination et les événements à écouter.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Nom</Label>
                      <Input
                        value={newWebhookName}
                        onChange={(e) => setNewWebhookName(e.target.value)}
                        placeholder="Ex: Zapier, HubSpot, Mon CRM"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL de destination</Label>
                      <Input
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        placeholder="https://hooks.zapier.com/..."
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Événements</Label>
                      <div className="max-h-56 overflow-y-auto p-3 bg-gray-50 rounded-lg border space-y-3">
                        {Object.entries(
                          WEBHOOK_EVENTS.reduce((acc, evt) => {
                            if (!acc[evt.category]) acc[evt.category] = []
                            acc[evt.category].push(evt)
                            return acc
                          }, {} as Record<string, typeof WEBHOOK_EVENTS>)
                        ).map(([category, events]) => (
                          <div key={category}>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{category}</p>
                            <div className="space-y-1.5">
                              {events.map((evt) => (
                                <label key={evt.value} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={newWebhookEvents.includes(evt.value)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setNewWebhookEvents([...newWebhookEvents, evt.value])
                                      } else {
                                        setNewWebhookEvents(newWebhookEvents.filter((v) => v !== evt.value))
                                      }
                                    }}
                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  />
                                  <span className="text-sm text-gray-700">{evt.label}</span>
                                  <code className="text-[10px] font-mono text-gray-400 ml-auto">{evt.value}</code>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={() => createWebhookMutation.mutate()}
                      disabled={!newWebhookName || !newWebhookUrl || newWebhookEvents.length === 0 || createWebhookMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {createWebhookMutation.isPending ? 'Création...' : 'Créer le webhook'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Webhooks list */}
            {webhooksLoading ? (
              <div className="text-center py-12 text-gray-500">Chargement...</div>
            ) : webhooksData && webhooksData.length > 0 ? (
              <div className="space-y-3">
                {webhooksData.map((webhook: any) => (
                  <motion.div
                    key={webhook.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="border border-gray-200 hover:border-gray-300 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-gray-900">{webhook.name || webhook.description}</h3>
                              <Switch
                                checked={webhook.is_active}
                                onCheckedChange={(checked) =>
                                  toggleWebhookMutation.mutate({ id: webhook.id, is_active: checked })
                                }
                              />
                            </div>
                            <code className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded block truncate">
                              {webhook.url}
                            </code>
                            {webhook.events?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {webhook.events.map((evt: string) => (
                                  <span key={evt} className="text-[10px] font-mono px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">
                                    {evt}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-emerald-400" />
                                {webhook.success_count || 0} succès
                              </span>
                              <span className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 text-red-400" />
                                {webhook.failure_count || 0} échecs
                              </span>
                              {webhook.last_triggered_at && (
                                <span>Dernier : {formatDate(webhook.last_triggered_at)}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-12 text-center">
                  <Webhook className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Aucun webhook configuré</p>
                  <p className="text-sm text-gray-400 mt-1">Ajoutez un webhook pour recevoir des notifications en temps réel.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ==================== DOCUMENTATION TAB ==================== */}
        <TabsContent value="docs">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Documentation rapide</h2>
              <p className="text-sm text-gray-500">Tout ce qu'il faut pour commencer à utiliser l'API EDUZEN</p>
            </div>

            {/* Quick start */}
            <Card className="border-0 bg-gray-950 text-gray-100 overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-sm font-mono text-emerald-400">Authentification</CardTitle>
                </div>
                <CardDescription className="text-gray-400 text-xs">
                  Ajoutez votre clé API dans le header <code className="text-emerald-300">x-eduzen-api-key</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="text-sm font-mono overflow-x-auto p-4 bg-gray-900 rounded-lg border border-gray-800">
                    <code>{`curl -X GET "${baseUrl}/api/v1/students" \\
  -H "x-eduzen-api-key: eduz_votre_cle_ici" \\
  -H "Content-Type: application/json"`}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-gray-400 hover:text-white hover:bg-gray-800"
                    onClick={() =>
                      copyToClipboard(
                        `curl -X GET "${baseUrl}/api/v1/students" \\\n  -H "x-eduzen-api-key: eduz_votre_cle_ici" \\\n  -H "Content-Type: application/json"`
                      )
                    }
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Endpoints */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-brand-blue" />
                  Endpoints disponibles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {[
                    { method: 'GET', path: '/api/v1/students', desc: 'Liste des apprenants', color: 'text-emerald-600 bg-emerald-50' },
                    { method: 'GET', path: '/api/v1/documents/generate', desc: 'Générer un document', color: 'text-emerald-600 bg-emerald-50' },
                    { method: 'GET', path: '/api/v1/document-templates', desc: 'Liste des modèles', color: 'text-emerald-600 bg-emerald-50' },
                    { method: 'GET', path: '/api/v1/document-templates/:id', desc: 'Détails d\'un modèle', color: 'text-emerald-600 bg-emerald-50' },
                    { method: 'GET', path: '/api/v1/docs', desc: 'Documentation OpenAPI', color: 'text-emerald-600 bg-emerald-50' },
                  ].map((endpoint) => (
                    <div key={endpoint.path} className="flex items-center gap-3 py-3">
                      <span className={cn('text-[10px] font-bold font-mono px-2 py-0.5 rounded', endpoint.color)}>
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-mono text-gray-700 flex-1">{endpoint.path}</code>
                      <span className="text-xs text-gray-400">{endpoint.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Webhook signature verification */}
            <Card className="border-0 bg-gray-950 text-gray-100 overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-400" />
                  <CardTitle className="text-sm font-mono text-purple-400">Vérification signature Webhook</CardTitle>
                </div>
                <CardDescription className="text-gray-400 text-xs">
                  Vérifiez l'en-tête <code className="text-purple-300">X-Webhook-Signature</code> pour sécuriser la réception
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-sm font-mono overflow-x-auto p-4 bg-gray-900 rounded-lg border border-gray-800">
                  <code>{`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</code>
                </pre>
              </CardContent>
            </Card>

            {/* Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="hover:border-brand-blue/30 transition-colors cursor-pointer group"
                onClick={() => window.open(`${baseUrl}/api/v1/docs`, '_blank')}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-brand-blue/10 rounded-xl group-hover:bg-brand-blue/20 transition-colors">
                    <ExternalLink className="h-5 w-5 text-brand-blue" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Documentation complète</h3>
                    <p className="text-sm text-gray-500">OpenAPI / Swagger</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:border-purple-300 transition-colors cursor-pointer group"
                onClick={() => window.open('https://zapier.com', '_blank')}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Intégration Zapier</h3>
                    <p className="text-sm text-gray-500">Connectez à 5 000+ applications</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PageHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl shadow-xl shadow-brand-blue/20">
          <Zap className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight">
            Intégrations & API
          </h1>
          <p className="text-gray-500 text-sm">
            Connectez EDUZEN à vos outils : Zapier, Make, HubSpot, et plus encore
          </p>
        </div>
      </div>
    </motion.div>
  )
}
