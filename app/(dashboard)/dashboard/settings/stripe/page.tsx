'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { 
  CreditCard, Save, TestTube, CheckCircle, AlertCircle,
  Eye, EyeOff, Info, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

export default function StripeSettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { addToast } = useToast()

  const [showSecret, setShowSecret] = useState(false)
  const [config, setConfig] = useState({
    publishable_key: '',
    secret_key: '',
    webhook_secret: '',
    is_active: false,
    is_test_mode: true,
  })

  // Récupérer la configuration existante
  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['stripe-config', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null

      // TODO: Créer une table payment_providers pour stocker les configurations
      // Pour l'instant, on utilise les variables d'environnement
      return {
        publishable_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
        secret_key: '', // Ne jamais exposer la clé secrète côté client
        webhook_secret: '',
        is_active: false,
        is_test_mode: true,
      }
    },
    enabled: !!user?.organization_id,
  })

  // Sauvegarder la configuration
  const saveMutation = useMutation({
    mutationFn: async (configData: typeof config) => {
      // TODO: Sauvegarder dans une table payment_providers
      // Pour l'instant, on simule la sauvegarde
      await new Promise((resolve) => setTimeout(resolve, 500))
      return configData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripe-config'] })
      addToast({
        title: 'Configuration sauvegardée',
        description: 'Les paramètres Stripe ont été enregistrés avec succès.',
        variant: 'success',
      })
    },
    onError: (error: any) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la sauvegarde',
        variant: 'error',
      })
    },
  })

  // Tester la connexion
  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/payments/stripe/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishable_key: config.publishable_key,
          secret_key: config.secret_key,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erreur de connexion')
      }

      return response.json()
    },
    onSuccess: () => {
      addToast({
        title: 'Connexion réussie',
        description: 'La connexion à Stripe fonctionne correctement.',
        variant: 'success',
      })
    },
    onError: (error: any) => {
      addToast({
        title: 'Erreur de connexion',
        description: error.message || 'Impossible de se connecter à Stripe',
        variant: 'error',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Configuration Stripe
        </h1>
        <p className="text-muted-foreground">
          Configurez les paiements par carte bancaire via Stripe
        </p>
      </div>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Documentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Stripe permet d'accepter les paiements par carte bancaire (Visa, Mastercard, etc.)
            de manière sécurisée. Vous devez créer un compte Stripe et récupérer vos clés API.
          </p>
          <Link href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Obtenir les clés API Stripe
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres de connexion</CardTitle>
          <CardDescription>
            Entrez vos clés API Stripe. Les clés de test commencent par "pk_test_" et "sk_test_"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="publishable_key">Clé publique (Publishable Key)</Label>
            <Input
              id="publishable_key"
              type="text"
              placeholder="pk_test_..."
              value={config.publishable_key}
              onChange={(e) => setConfig({ ...config, publishable_key: e.target.value })}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cette clé peut être exposée publiquement (utilisée côté client)
            </p>
          </div>

          <div>
            <Label htmlFor="secret_key">Clé secrète (Secret Key)</Label>
            <div className="relative mt-1">
              <Input
                id="secret_key"
                type={showSecret ? 'text' : 'password'}
                placeholder="sk_test_..."
                value={config.secret_key}
                onChange={(e) => setConfig({ ...config, secret_key: e.target.value })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ⚠️ Cette clé doit rester secrète (utilisée uniquement côté serveur)
            </p>
          </div>

          <div>
            <Label htmlFor="webhook_secret">Secret Webhook (optionnel)</Label>
            <Input
              id="webhook_secret"
              type="password"
              placeholder="whsec_..."
              value={config.webhook_secret}
              onChange={(e) => setConfig({ ...config, webhook_secret: e.target.value })}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Utilisé pour valider les événements webhook de Stripe
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-1">
              <Label htmlFor="is_test_mode">Mode test</Label>
              <p className="text-xs text-muted-foreground">
                Utilisez les clés de test pour les paiements de développement
              </p>
            </div>
            <Switch
              id="is_test_mode"
              checked={config.is_test_mode}
              onCheckedChange={(checked) => setConfig({ ...config, is_test_mode: checked })}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-1">
              <Label htmlFor="is_active">Activer Stripe</Label>
              <p className="text-xs text-muted-foreground">
                Activez les paiements Stripe pour votre organisation
              </p>
            </div>
            <Switch
              id="is_active"
              checked={config.is_active}
              onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={() => testMutation.mutate()}
          variant="outline"
          disabled={testMutation.isPending || !config.publishable_key || !config.secret_key}
        >
          <TestTube className="h-4 w-4 mr-2" />
          {testMutation.isPending ? 'Test en cours...' : 'Tester la connexion'}
        </Button>
        <Button
          onClick={() => saveMutation.mutate(config)}
          disabled={saveMutation.isPending || !config.publishable_key || !config.secret_key}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>

      {/* Statut */}
      {testMutation.isSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Connexion réussie</span>
            </div>
          </CardContent>
        </Card>
      )}

      {testMutation.isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold">Erreur de connexion</span>
            </div>
            <p className="text-sm text-red-700 mt-2">
              {testMutation.error instanceof Error ? testMutation.error.message : 'Erreur inconnue'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

