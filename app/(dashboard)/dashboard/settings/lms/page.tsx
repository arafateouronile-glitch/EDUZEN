'use client'

import { motion } from '@/components/ui/motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Save, GraduationCap, Settings, Info } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function LMSSettingsPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const supabase = createClient()

  const [lmsForm, setLmsForm] = useState({
    provider: 'moodle',
    api_url: '',
    api_key: '',
    is_active: false,
    auto_sync: false,
    sync_frequency: 'daily',
  })

  // Fetch existing LMS configuration
  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['lms-config', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      try {
        // Note: Cette table n'existe peut-être pas encore
        // Vous devrez créer la table lms_configurations si nécessaire
        const { data, error } = await supabase
          .from('lms_configurations')
          .select('*')
          .eq('organization_id', user.organization_id)
          .single()

        // Gérer les cas où la table n'existe pas ou aucune configuration trouvée
        if (error) {
          // PGRST116 = no rows found, 406 = no rows returned, PGRST200 = table does not exist, 404 = not found
          if (error.code === 'PGRST116' || error.code === '406' || error.code === 'PGRST200' || error.status === 404 || error.message?.includes('does not exist')) {
            return null
          }
          throw error
        }
        return data
      } catch (error: any) {
        // Si la table n'existe pas, retourner null silencieusement
        if (error?.code === 'PGRST200' || error?.status === 404 || error?.message?.includes('does not exist') || error?.message?.includes('schema cache')) {
          return null
        }
        console.error('Error fetching LMS configuration:', error.message)
        return null
      }
    },
    enabled: !!user?.organization_id,
    onSuccess: (data) => {
      if (data) {
        setLmsForm({
          provider: data.provider || 'moodle',
          api_url: data.api_url || '',
          api_key: data.api_key || '',
          is_active: data.is_active || false,
          auto_sync: data.auto_sync || false,
          sync_frequency: data.sync_frequency || 'daily',
        })
      }
    },
  })

  // Mutation to save/update configuration
  const saveConfigMutation = useMutation({
    mutationFn: async (data: typeof lmsForm) => {
      if (!user?.organization_id) throw new Error('Organization ID is missing.')

      if (existingConfig?.id) {
        // Update existing
        const { data: updatedData, error } = await supabase
          .from('lms_configurations')
          .update(data)
          .eq('id', existingConfig.id)
          .select()
          .single()
        if (error) throw error
        return updatedData
      } else {
        // Insert new
        const { data: newData, error } = await supabase
          .from('lms_configurations')
          .insert({ ...data, organization_id: user.organization_id })
          .select()
          .single()
        if (error) throw error
        return newData
      }
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Configuration LMS enregistrée',
        description: 'Les paramètres LMS ont été mis à jour avec succès.',
      })
      queryClient.invalidateQueries({ queryKey: ['lms-config'] })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur lors de l\'enregistrement',
        description: error?.message || 'Veuillez vérifier les informations saisies.',
      })
    },
  })

  const handleSave = () => {
    saveConfigMutation.mutate(lmsForm)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-500">Chargement de la configuration LMS...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-brand-blue" />
              Configuration LMS
            </h1>
            <p className="text-muted-foreground">
              Paramétrez l'intégration avec votre plateforme d'apprentissage en ligne
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saveConfigMutation.isPending}>
          {saveConfigMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paramètres de connexion</CardTitle>
          <CardDescription>
            Configurez la connexion à votre plateforme LMS (Moodle, Canvas, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="provider">Plateforme LMS</Label>
              <select
                id="provider"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue"
                value={lmsForm.provider}
                onChange={(e) => setLmsForm({ ...lmsForm, provider: e.target.value })}
              >
                <option value="moodle">Moodle</option>
                <option value="canvas">Canvas</option>
                <option value="blackboard">Blackboard</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_url">URL de l'API</Label>
              <Input
                id="api_url"
                value={lmsForm.api_url}
                onChange={(e) => setLmsForm({ ...lmsForm, api_url: e.target.value })}
                placeholder="Ex: https://lms.example.com/api"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="api_key">Clé API</Label>
            <Input
              id="api_key"
              type="password"
              value={lmsForm.api_key}
              onChange={(e) => setLmsForm({ ...lmsForm, api_key: e.target.value })}
              placeholder="Votre clé API sécurisée"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Paramètres de synchronisation</CardTitle>
          <CardDescription>
            Gérez la synchronisation automatique des données avec votre LMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              checked={lmsForm.is_active}
              onCheckedChange={(checked) => setLmsForm({ ...lmsForm, is_active: checked })}
            />
            <Label htmlFor="is_active">Activer l'intégration LMS</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={lmsForm.auto_sync}
              onCheckedChange={(checked) => setLmsForm({ ...lmsForm, auto_sync: checked })}
              disabled={!lmsForm.is_active}
            />
            <Label htmlFor="auto_sync">Synchronisation automatique</Label>
          </div>
          {lmsForm.auto_sync && (
            <div className="space-y-2">
              <Label htmlFor="sync_frequency">Fréquence de synchronisation</Label>
              <select
                id="sync_frequency"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue"
                value={lmsForm.sync_frequency}
                onChange={(e) => setLmsForm({ ...lmsForm, sync_frequency: e.target.value })}
              >
                <option value="hourly">Horaire</option>
                <option value="daily">Quotidienne</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="manual">Manuelle</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-brand-blue" />
            Informations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            La configuration LMS permet de synchroniser automatiquement les données entre votre plateforme
            d'apprentissage en ligne et EDUZEN. Les cours, les inscriptions et les notes peuvent être
            synchronisés selon la fréquence configurée.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
