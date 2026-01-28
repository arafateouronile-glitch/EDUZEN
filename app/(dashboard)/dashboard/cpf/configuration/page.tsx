'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { 
  ArrowLeft, 
  Save, 
  GraduationCap, 
  Building2, 
  Key, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface CPFConfiguration {
  id?: string
  organization_id: string
  cpf_provider_number?: string
  provider_name: string
  siret_number: string
  api_key?: string
  api_secret?: string
  api_endpoint: string
  is_active: boolean
  last_sync_date?: string
  sync_frequency: 'hourly' | 'daily' | 'weekly' | 'manual'
}

export default function CPFConfigurationPage() {
  const { user } = useAuth()
  const supabase = createClient() as any // Cast pour tables non typées
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [formData, setFormData] = useState<CPFConfiguration>({
    organization_id: user?.organization_id || '',
    provider_name: '',
    siret_number: '',
    api_endpoint: 'https://api.moncompteformation.gouv.fr',
    is_active: false,
    sync_frequency: 'daily',
  })

  const [isSaving, setIsSaving] = useState(false)

  // Récupérer la configuration existante
  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['cpf-configuration', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null

      const { data, error } = await supabase
        .from('cpf_configurations')
        .select('*')
        .eq('organization_id', user.organization_id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Table n'existe pas encore
          return null
        }
        throw error
      }

      return data as CPFConfiguration
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Pré-remplir le formulaire avec les données existantes
  useEffect(() => {
    if (existingConfig) {
      setFormData({
        ...existingConfig,
        organization_id: user?.organization_id || '',
      })
    }
  }, [existingConfig, user?.organization_id])

  // Mutation pour sauvegarder
  const saveMutation = useMutation({
    mutationFn: async (config: CPFConfiguration) => {
      if (!user?.organization_id) throw new Error('Organisation non trouvée')

      const configToSave = {
        ...config,
        organization_id: user.organization_id,
        updated_at: new Date().toISOString(),
      }

      if (existingConfig?.id) {
        // Mise à jour
        const { data, error } = await supabase
          .from('cpf_configurations')
          .update(configToSave)
          .eq('id', existingConfig.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Création
        const { data, error } = await supabase
          .from('cpf_configurations')
          .insert({
            ...configToSave,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) {
          // Si la table n'existe pas, on affiche un message
          if (error.code === 'PGRST116' || error.code === '42P01') {
            throw new Error('La table cpf_configurations n\'existe pas encore. Veuillez exécuter les migrations Supabase.')
          }
          throw error
        }
        return data
      }
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Configuration sauvegardée',
        description: 'La configuration CPF a été enregistrée avec succès.',
      })
      queryClient.invalidateQueries({ queryKey: ['cpf-configuration', user?.organization_id] })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur lors de la sauvegarde',
        description: error?.message || 'Une erreur est survenue lors de la sauvegarde de la configuration.',
      })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await saveMutation.mutateAsync(formData)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSync = async () => {
    // NOTE: Fonctionnalité prévue - Synchronisation avec Mon Compte Formation
    // Utiliser CPFService.syncCatalog() une fois l'intégration API complète
    addToast({
      type: 'info',
      title: 'Synchronisation',
      description: 'La synchronisation avec Mon Compte Formation sera disponible prochainement.',
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/cpf">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-brand-blue" />
          Configuration CPF
        </h1>
        <p className="text-muted-foreground">
          Configurez l'intégration avec Mon Compte Formation pour votre organisation
        </p>
      </div>

      {/* Avertissement si table n'existe pas */}
      {saveMutation.error?.message?.includes('n\'existe pas') && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900 mb-1">
                  Table manquante
                </p>
                <p className="text-sm text-yellow-800">
                  La table cpf_configurations n'existe pas encore dans votre base de données. 
                  Veuillez exécuter les migrations Supabase nécessaires.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Informations de l'organisme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informations de l'organisme
              </CardTitle>
              <CardDescription>
                Informations requises pour l'intégration avec Mon Compte Formation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="provider_name">Nom de l'organisme *</Label>
                <Input
                  id="provider_name"
                  value={formData.provider_name}
                  onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                  placeholder="Nom de votre organisme de formation"
                  required
                />
              </div>

              <div>
                <Label htmlFor="siret_number">Numéro SIRET *</Label>
                <Input
                  id="siret_number"
                  value={formData.siret_number}
                  onChange={(e) => setFormData({ ...formData, siret_number: e.target.value })}
                  placeholder="12345678901234"
                  required
                  maxLength={14}
                />
              </div>

              <div>
                <Label htmlFor="cpf_provider_number">Numéro d'organisme CPF (optionnel)</Label>
                <Input
                  id="cpf_provider_number"
                  value={formData.cpf_provider_number || ''}
                  onChange={(e) => setFormData({ ...formData, cpf_provider_number: e.target.value })}
                  placeholder="Numéro attribué par Mon Compte Formation"
                />
              </div>
            </CardContent>
          </Card>

          {/* Configuration API */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Configuration API
              </CardTitle>
              <CardDescription>
                Paramètres de connexion à l'API Mon Compte Formation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="api_endpoint">Endpoint API *</Label>
                <Input
                  id="api_endpoint"
                  value={formData.api_endpoint}
                  onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                  placeholder="https://api.moncompteformation.gouv.fr"
                  required
                />
              </div>

              <div>
                <Label htmlFor="api_key">Clé API (optionnel)</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={formData.api_key || ''}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="Votre clé API"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  La clé API sera stockée de manière sécurisée
                </p>
              </div>

              <div>
                <Label htmlFor="api_secret">Secret API (optionnel)</Label>
                <Input
                  id="api_secret"
                  type="password"
                  value={formData.api_secret || ''}
                  onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                  placeholder="Votre secret API"
                />
              </div>
            </CardContent>
          </Card>

          {/* Paramètres de synchronisation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Paramètres de synchronisation
              </CardTitle>
              <CardDescription>
                Configurez la fréquence de synchronisation avec Mon Compte Formation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sync_frequency">Fréquence de synchronisation *</Label>
                <Select
                  value={formData.sync_frequency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, sync_frequency: value as CPFConfiguration['sync_frequency'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manuelle</SelectItem>
                    <SelectItem value="hourly">Toutes les heures</SelectItem>
                    <SelectItem value="daily">Quotidienne</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Activer la synchronisation</Label>
                  <p className="text-sm text-muted-foreground">
                    Activez la synchronisation automatique avec Mon Compte Formation
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              {existingConfig?.last_sync_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>
                    Dernière synchronisation :{' '}
                    {new Date(existingConfig.last_sync_date).toLocaleString('fr-FR')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleSync}
              disabled={!formData.is_active || !existingConfig}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Synchroniser maintenant
            </Button>

            <div className="flex gap-2">
              <Link href="/dashboard/cpf">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={isSaving || saveMutation.isPending}>
                {isSaving || saveMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}


