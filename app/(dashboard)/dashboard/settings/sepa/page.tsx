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
  Info, Building2
} from 'lucide-react'
import { SEPAAdapter } from '@/lib/services/payment/sepa.adapter'

export default function SEPASettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { addToast } = useToast()

  const [config, setConfig] = useState({
    creditor_name: '',
    creditor_iban: '',
    creditor_bic: '',
    creditor_id: '', // Identifiant créancier pour prélèvements
    is_active: false,
  })

  const [ibanValid, setIbanValid] = useState<boolean | null>(null)
  const [bicValid, setBicValid] = useState<boolean | null>(null)

  // Récupérer la configuration existante
  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['sepa-config', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null

      // TODO: Créer une table payment_providers pour stocker les configurations
      // Pour l'instant, on retourne une config vide
      return {
        creditor_name: '',
        creditor_iban: '',
        creditor_bic: '',
        creditor_id: '',
        is_active: false,
      }
    },
    enabled: !!user?.organization_id,
  })

  // Valider l'IBAN
  const validateIBAN = (iban: string) => {
    const adapter = new SEPAAdapter({
      creditorName: config.creditor_name,
      creditorIban: iban,
      creditorBic: config.creditor_bic,
    })
    const isValid = adapter.validateIBAN(iban)
    setIbanValid(isValid)
    return isValid
  }

  // Valider le BIC
  const validateBIC = (bic: string) => {
    const adapter = new SEPAAdapter({
      creditorName: config.creditor_name,
      creditorIban: config.creditor_iban,
      creditorBic: bic,
    })
    const isValid = adapter.validateBIC(bic)
    setBicValid(isValid)
    return isValid
  }

  // Sauvegarder la configuration
  const saveMutation = useMutation({
    mutationFn: async (configData: typeof config) => {
      // Validation
      if (!configData.creditor_name) {
        throw new Error('Le nom du créancier est requis')
      }
      if (!configData.creditor_iban) {
        throw new Error('L\'IBAN créancier est requis')
      }
      if (!validateIBAN(configData.creditor_iban)) {
        throw new Error('IBAN invalide')
      }
      if (configData.creditor_bic && !validateBIC(configData.creditor_bic)) {
        throw new Error('BIC invalide')
      }

      // TODO: Sauvegarder dans une table payment_providers
      await new Promise((resolve) => setTimeout(resolve, 500))
      return configData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sepa-config'] })
      addToast({
        title: 'Configuration sauvegardée',
        description: 'Les paramètres SEPA ont été enregistrés avec succès.',
        type: 'success',
      })
    },
    onError: (error: any) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la sauvegarde',
        type: 'error',
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
          Configuration SEPA
        </h1>
        <p className="text-muted-foreground">
          Configurez les paiements par virement bancaire SEPA et prélèvements automatiques
        </p>
      </div>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            À propos de SEPA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            SEPA (Single Euro Payments Area) permet d'effectuer des virements bancaires et des prélèvements
            automatiques dans toute la zone euro. Vous devez fournir les informations bancaires de votre organisation.
          </p>
          <div className="space-y-2 text-sm">
            <p><strong>Virements SEPA :</strong> Les clients effectuent des virements manuels vers votre compte</p>
            <p><strong>Prélèvements SEPA :</strong> Vous pouvez prélever automatiquement les montants dus (nécessite un mandat)</p>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Informations bancaires</CardTitle>
          <CardDescription>
            Entrez les informations bancaires de votre organisation (créancier)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="creditor_name">Nom du créancier</Label>
            <Input
              id="creditor_name"
              type="text"
              placeholder="Nom de votre organisation"
              value={config.creditor_name}
              onChange={(e) => setConfig({ ...config, creditor_name: e.target.value })}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Nom qui apparaîtra sur les relevés bancaires des clients
            </p>
          </div>

          <div>
            <Label htmlFor="creditor_iban">IBAN créancier</Label>
            <Input
              id="creditor_iban"
              type="text"
              placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
              value={config.creditor_iban}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/\s/g, '')
                setConfig({ ...config, creditor_iban: value })
                if (value.length > 4) {
                  validateIBAN(value)
                } else {
                  setIbanValid(null)
                }
              }}
              className="mt-1"
            />
            {ibanValid === false && (
              <p className="text-xs text-red-600 mt-1">IBAN invalide</p>
            )}
            {ibanValid === true && (
              <p className="text-xs text-green-600 mt-1">IBAN valide</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              IBAN de votre compte bancaire (format: FR76 XXXX XXXX...)
            </p>
          </div>

          <div>
            <Label htmlFor="creditor_bic">BIC créancier (optionnel mais recommandé)</Label>
            <Input
              id="creditor_bic"
              type="text"
              placeholder="ABCDEFGH"
              value={config.creditor_bic}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/\s/g, '')
                setConfig({ ...config, creditor_bic: value })
                if (value.length > 0) {
                  validateBIC(value)
                } else {
                  setBicValid(null)
                }
              }}
              className="mt-1"
            />
            {bicValid === false && (
              <p className="text-xs text-red-600 mt-1">BIC invalide</p>
            )}
            {bicValid === true && (
              <p className="text-xs text-green-600 mt-1">BIC valide</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Code BIC/SWIFT de votre banque (8 ou 11 caractères)
            </p>
          </div>

          <div>
            <Label htmlFor="creditor_id">Identifiant créancier (pour prélèvements)</Label>
            <Input
              id="creditor_id"
              type="text"
              placeholder="FR98Z123456789"
              value={config.creditor_id}
              onChange={(e) => setConfig({ ...config, creditor_id: e.target.value.toUpperCase() })}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Identifiant unique délivré par votre banque pour les prélèvements SEPA
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-1">
              <Label htmlFor="is_active">Activer SEPA</Label>
              <p className="text-xs text-muted-foreground">
                Activez les paiements SEPA pour votre organisation
              </p>
            </div>
            <Switch
              checked={config.is_active}
              onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={() => saveMutation.mutate(config)}
          disabled={saveMutation.isPending || !config.creditor_name || !config.creditor_iban}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>

      {/* Statut */}
      {saveMutation.isSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Configuration sauvegardée</span>
            </div>
          </CardContent>
        </Card>
      )}

      {saveMutation.isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold">Erreur</span>
            </div>
            <p className="text-sm text-red-700 mt-2">
              {saveMutation.error instanceof Error ? saveMutation.error.message : 'Erreur inconnue'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

