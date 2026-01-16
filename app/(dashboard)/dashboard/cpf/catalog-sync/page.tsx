'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { cpfService } from '@/lib/services/cpf.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import {
  Upload,
  RefreshCw,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Database,
  FileCode,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export default function CPFCatalogSyncPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Récupérer la configuration CPF
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['cpf-config', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      return cpfService.getConfiguration(user.organization_id)
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer l'historique des synchronisations
  const { data: syncHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['cpf-catalog-sync-history', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return cpfService.getCatalogSyncHistory(user.organization_id, { limit: 20 })
    },
    enabled: !!user?.organization_id,
  })

  // Mutation pour synchroniser depuis XML
  const syncFromXMLMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.organization_id) throw new Error('Organisation non trouvée')
      return cpfService.syncCatalogFromXML(user.organization_id, file, {
        createdBy: user.id,
      })
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Synchronisation démarrée',
        description: 'Le catalogue est en cours de synchronisation depuis le fichier XML.',
      })
      queryClient.invalidateQueries({ queryKey: ['cpf-catalog-sync-history'] })
      setSelectedFile(null)
      setUploadProgress(0)
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur de synchronisation',
        description: error.message || 'Une erreur est survenue lors de la synchronisation.',
      })
    },
  })

  // Mutation pour synchroniser depuis l'API
  const syncFromAPIMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) throw new Error('Organisation non trouvée')
      return cpfService.syncCatalogFromAPI(user.organization_id, {
        createdBy: user.id,
      })
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Synchronisation démarrée',
        description: 'Le catalogue est en cours de synchronisation depuis l\'API.',
      })
      queryClient.invalidateQueries({ queryKey: ['cpf-catalog-sync-history'] })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur de synchronisation',
        description: error.message || 'Une erreur est survenue lors de la synchronisation.',
      })
    },
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'text/xml' && !file.name.endsWith('.xml')) {
        addToast({
          type: 'error',
          title: 'Fichier invalide',
          description: 'Veuillez sélectionner un fichier XML.',
        })
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (!selectedFile) {
      addToast({
        type: 'error',
        title: 'Aucun fichier sélectionné',
        description: 'Veuillez sélectionner un fichier XML à synchroniser.',
      })
      return
    }
    syncFromXMLMutation.mutate(selectedFile)
  }

  const handleSyncFromAPI = () => {
    if (!config?.is_active) {
      addToast({
        type: 'error',
        title: 'Configuration CPF non active',
        description: 'Veuillez activer la configuration CPF avant de synchroniser.',
      })
      return
    }
    if (!config.api_key || !config.api_secret) {
      addToast({
        type: 'error',
        title: 'Clés API manquantes',
        description: 'Veuillez configurer les clés API CPF dans les paramètres.',
      })
      return
    }
    syncFromAPIMutation.mutate()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Terminé
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Échoué
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            En cours
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        )
    }
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'xml':
        return <FileCode className="h-4 w-4" />
      case 'api':
        return <Database className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  if (configLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Synchronisation du Catalogue CPF
        </h1>
        <p className="text-gray-600">
          Synchronisez votre catalogue de formations avec Mon Compte Formation (CPF)
        </p>
      </div>

      {/* Alerte si configuration non active */}
      {config && !config.is_active && (
        <GlassCard className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">
                Configuration CPF non active
              </h3>
              <p className="text-sm text-amber-700 mb-3">
                Veuillez activer la configuration CPF avant de synchroniser le catalogue.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/dashboard/cpf/configuration'}
              >
                Configurer CPF
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      <Tabs defaultValue="sync" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sync">Synchroniser</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="space-y-6">
          {/* Synchronisation depuis fichier XML */}
          <GlassCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Synchronisation depuis fichier XML
              </CardTitle>
              <CardDescription>
                Importez votre catalogue depuis un fichier XML généré depuis le portail EDOF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="xml-file">Fichier XML</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="xml-file"
                    type="file"
                    accept=".xml,text/xml"
                    onChange={handleFileSelect}
                    disabled={syncFromXMLMutation.isPending}
                  />
                  {selectedFile && (
                    <div className="text-sm text-gray-600">
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} Ko)
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || syncFromXMLMutation.isPending}
                className="w-full"
              >
                {syncFromXMLMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Synchronisation en cours...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Synchroniser depuis XML
                  </>
                )}
              </Button>

              <div className="text-sm text-gray-500 space-y-1">
                <p>• Le fichier XML doit être au format CPF/EDOF</p>
                <p>• Téléchargez votre catalogue depuis le portail EDOF</p>
                <p>• La synchronisation peut prendre plusieurs minutes</p>
              </div>
            </CardContent>
          </GlassCard>

          {/* Synchronisation depuis l'API */}
          <GlassCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Synchronisation depuis l'API
              </CardTitle>
              <CardDescription>
                Synchronisez directement depuis l'API Caisse des Dépôts (si disponible)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!config?.api_key || !config?.api_secret ? (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-3">
                    Les clés API CPF ne sont pas configurées.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/dashboard/cpf/configuration'}
                  >
                    Configurer les clés API
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    onClick={handleSyncFromAPI}
                    disabled={syncFromAPIMutation.isPending || !config?.is_active}
                    className="w-full"
                  >
                    {syncFromAPIMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Synchronisation en cours...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Synchroniser depuis l'API
                      </>
                    )}
                  </Button>

                  <div className="text-sm text-gray-500 space-y-1">
                    <p>• La synchronisation depuis l'API nécessite une configuration active</p>
                    <p>• Vérifiez que les clés API sont correctement configurées</p>
                    <p>• La synchronisation peut prendre plusieurs minutes</p>
                  </div>
                </>
              )}
            </CardContent>
          </GlassCard>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {historyLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          ) : syncHistory && syncHistory.length > 0 ? (
            <div className="space-y-4">
              {syncHistory.map((sync: any) => (
                <GlassCard key={sync.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        {getMethodIcon(sync.sync_method)}
                        <div>
                          <h3 className="font-semibold">
                            Synchronisation {sync.sync_type === 'full' ? 'complète' : 'incrémentale'} ({sync.sync_method.toUpperCase()})
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatDate(sync.started_at)}
                          </p>
                        </div>
                        {getStatusBadge(sync.sync_status)}
                      </div>

                      {sync.completed_at && (
                        <div className="text-sm text-gray-600">
                          <p>
                            Durée: {Math.round(
                              (new Date(sync.completed_at).getTime() -
                                new Date(sync.started_at).getTime()) /
                                1000 / 60
                            )}{' '}
                            minutes
                          </p>
                        </div>
                      )}

                      {(sync.records_total > 0 || sync.records_created > 0 || sync.records_updated > 0) && (
                        <div className="flex gap-4 text-sm text-gray-600">
                          {sync.records_total > 0 && (
                            <span>Total: {sync.records_total}</span>
                          )}
                          {sync.records_created > 0 && (
                            <span className="text-green-600">
                              Créés: {sync.records_created}
                            </span>
                          )}
                          {sync.records_updated > 0 && (
                            <span className="text-blue-600">
                              Mis à jour: {sync.records_updated}
                            </span>
                          )}
                          {sync.records_failed > 0 && (
                            <span className="text-red-600">
                              Échoués: {sync.records_failed}
                            </span>
                          )}
                        </div>
                      )}

                      {sync.error_message && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-sm text-red-800 font-medium">
                            Erreur: {sync.error_message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <GlassCard className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune synchronisation
              </h3>
              <p className="text-gray-500">
                Aucune synchronisation n'a été effectuée pour le moment.
              </p>
            </GlassCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}



