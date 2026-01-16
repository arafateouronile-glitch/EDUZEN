'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { CreditCard, Building2, CheckCircle2, AlertCircle, Save } from 'lucide-react'
import Link from 'next/link'

export default function PaymentSettingsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  // Configuration Stripe
  const [stripeConfig, setStripeConfig] = useState({
    enabled: false,
    publishableKey: '',
    secretKey: '',
    webhookSecret: '',
  })

  // Configuration SEPA
  const [sepaConfig, setSepaConfig] = useState({
    enabled: false,
    creditorName: '',
    creditorIban: '',
    creditorBic: '',
    creditorId: '',
  })

  // Charger les configurations existantes
  const { data: existingConfigs } = useQuery({
    queryKey: ['payment-configs', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null

      // TODO: Récupérer depuis une table de configuration
      // Pour l'instant, on retourne null
      return null
    },
    enabled: !!user?.organization_id,
  })

  // Sauvegarder la configuration Stripe
  const saveStripeConfig = useMutation({
    mutationFn: async () => {
      // TODO: Sauvegarder dans la base de données
      // Pour l'instant, on simule
      await new Promise((resolve) => setTimeout(resolve, 500))
      return { success: true }
    },
    onSuccess: () => {
      addToast({
        title: 'Configuration sauvegardée',
        description: 'La configuration Stripe a été enregistrée avec succès.',
        type: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['payment-configs'] })
    },
  })

  // Sauvegarder la configuration SEPA
  const saveSepaConfig = useMutation({
    mutationFn: async () => {
      // TODO: Sauvegarder dans la base de données
      await new Promise((resolve) => setTimeout(resolve, 500))
      return { success: true }
    },
    onSuccess: () => {
      addToast({
        title: 'Configuration sauvegardée',
        description: 'La configuration SEPA a été enregistrée avec succès.',
        type: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['payment-configs'] })
    },
  })

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Configuration des Paiements
        </h1>
        <p className="text-muted-foreground">
          Configurez les méthodes de paiement pour votre organisation
        </p>
      </div>

      <Tabs defaultValue="stripe" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stripe">Stripe (Cartes bancaires)</TabsTrigger>
          <TabsTrigger value="sepa">SEPA (Virements)</TabsTrigger>
        </TabsList>

        {/* Configuration Stripe */}
        <TabsContent value="stripe">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Configuration Stripe
              </CardTitle>
              <CardDescription>
                Configurez les paiements par carte bancaire via Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="stripe-enabled">Activer Stripe</Label>
                  <p className="text-sm text-muted-foreground">
                    Permettre les paiements par carte bancaire
                  </p>
                </div>
                <Switch
                  id="stripe-enabled"
                  checked={stripeConfig.enabled}
                  onCheckedChange={(checked) =>
                    setStripeConfig({ ...stripeConfig, enabled: checked })
                  }
                />
              </div>

              {stripeConfig.enabled && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="stripe-publishable-key">Clé publique (Publishable Key)</Label>
                    <Input
                      id="stripe-publishable-key"
                      type="password"
                      value={stripeConfig.publishableKey}
                      onChange={(e) =>
                        setStripeConfig({ ...stripeConfig, publishableKey: e.target.value })
                      }
                      placeholder="pk_test_..."
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Clé publique Stripe (commence par pk_)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="stripe-secret-key">Clé secrète (Secret Key)</Label>
                    <Input
                      id="stripe-secret-key"
                      type="password"
                      value={stripeConfig.secretKey}
                      onChange={(e) =>
                        setStripeConfig({ ...stripeConfig, secretKey: e.target.value })
                      }
                      placeholder="sk_test_..."
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Clé secrète Stripe (commence par sk_). Ne partagez jamais cette clé.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="stripe-webhook-secret">Secret Webhook (optionnel)</Label>
                    <Input
                      id="stripe-webhook-secret"
                      type="password"
                      value={stripeConfig.webhookSecret}
                      onChange={(e) =>
                        setStripeConfig({ ...stripeConfig, webhookSecret: e.target.value })
                      }
                      placeholder="whsec_..."
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Secret pour valider les webhooks Stripe
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <Button
                      onClick={() => saveStripeConfig.mutate()}
                      disabled={!stripeConfig.publishableKey || !stripeConfig.secretKey}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </Button>
                    <Button variant="outline" asChild>
                      <a
                        href="https://dashboard.stripe.com/apikeys"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Obtenir les clés Stripe
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration SEPA */}
        <TabsContent value="sepa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Configuration SEPA
              </CardTitle>
              <CardDescription>
                Configurez les virements bancaires SEPA et prélèvements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sepa-enabled">Activer SEPA</Label>
                  <p className="text-sm text-muted-foreground">
                    Permettre les virements et prélèvements SEPA
                  </p>
                </div>
                <Switch
                  id="sepa-enabled"
                  checked={sepaConfig.enabled}
                  onCheckedChange={(checked) =>
                    setSepaConfig({ ...sepaConfig, enabled: checked })
                  }
                />
              </div>

              {sepaConfig.enabled && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="sepa-creditor-name">Nom du créancier</Label>
                    <Input
                      id="sepa-creditor-name"
                      value={sepaConfig.creditorName}
                      onChange={(e) =>
                        setSepaConfig({ ...sepaConfig, creditorName: e.target.value })
                      }
                      placeholder="Nom de votre organisation"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sepa-creditor-iban">IBAN du créancier</Label>
                    <Input
                      id="sepa-creditor-iban"
                      value={sepaConfig.creditorIban}
                      onChange={(e) =>
                        setSepaConfig({ ...sepaConfig, creditorIban: e.target.value.toUpperCase() })
                      }
                      placeholder="FR76 1234 5678 9012 3456 7890 123"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      IBAN de votre compte bancaire (format européen)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="sepa-creditor-bic">BIC du créancier (optionnel)</Label>
                    <Input
                      id="sepa-creditor-bic"
                      value={sepaConfig.creditorBic}
                      onChange={(e) =>
                        setSepaConfig({ ...sepaConfig, creditorBic: e.target.value.toUpperCase() })
                      }
                      placeholder="ABCDFRPP"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Code BIC/SWIFT de votre banque
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="sepa-creditor-id">Identifiant créancier (pour prélèvements)</Label>
                    <Input
                      id="sepa-creditor-id"
                      value={sepaConfig.creditorId}
                      onChange={(e) =>
                        setSepaConfig({ ...sepaConfig, creditorId: e.target.value })
                      }
                      placeholder="FR98Z123456789"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Identifiant unique pour les prélèvements SEPA (obtenu auprès de votre banque)
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <Button
                      onClick={() => saveSepaConfig.mutate()}
                      disabled={
                        !sepaConfig.creditorName ||
                        !sepaConfig.creditorIban
                      }
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
