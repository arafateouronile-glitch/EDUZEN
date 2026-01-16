'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentTemplateService } from '@/lib/services/document-template.service'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { 
  History, 
  RotateCcw, 
  Eye, 
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  GitCompare
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { VersionDiff } from './version-diff'

interface TemplateVersion {
  id: string
  template_id: string
  version_number: number
  name: string | null
  description: string | null
  created_at: string
  created_by: string | null
}

interface VersionHistoryProps {
  templateId: string
  onVersionRestore?: () => void
}

export function VersionHistory({ templateId, onVersionRestore }: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [diffVersion1, setDiffVersion1] = useState<string | null>(null)
  const [diffVersion2, setDiffVersion2] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Récupérer les versions
  const { data: versions, isLoading } = useQuery({
    queryKey: ['template-versions', templateId],
    queryFn: () => documentTemplateService.getTemplateVersions(templateId),
    enabled: !!templateId,
  })

  // Mutation pour restaurer une version
  const restoreMutation = useMutation({
    mutationFn: (versionNumber: number) =>
      documentTemplateService.restoreTemplateVersion(templateId, versionNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-template', templateId] })
      queryClient.invalidateQueries({ queryKey: ['template-versions', templateId] })
      onVersionRestore?.()
      setSelectedVersion(null)
    },
  })

  const handleRestore = (versionNumber: number) => {
    if (confirm(`Êtes-vous sûr de vouloir restaurer la version ${versionNumber} ? Cette action remplacera la version actuelle.`)) {
      restoreMutation.mutate(versionNumber)
    }
  }

  if (isLoading) {
    return (
      <GlassCard variant="premium" className="p-6">
        <div className="flex items-center gap-2 text-text-secondary">
          <History className="h-5 w-5 animate-pulse" />
          <span>Chargement de l'historique...</span>
        </div>
      </GlassCard>
    )
  }

  if (!versions || versions.length === 0) {
    return (
      <GlassCard variant="premium" className="p-6">
        <div className="text-center py-8">
          <History className="h-12 w-12 mx-auto mb-4 text-text-tertiary opacity-50" />
          <p className="text-text-secondary">Aucune version précédente</p>
          <p className="text-sm text-text-tertiary mt-2">
            Les versions seront créées automatiquement lors des modifications
          </p>
        </div>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      <GlassCard variant="premium" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-brand-blue" />
            <h3 className="font-semibold text-text-primary">Historique des versions</h3>
            <span className="text-sm text-text-tertiary">
              ({versions.length} version{versions.length > 1 ? 's' : ''})
            </span>
          </div>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          <AnimatePresence>
            {versions.map((version, index) => (
              <motion.div
                key={version.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'p-4 rounded-lg border transition-all cursor-pointer',
                  selectedVersion?.id === version.id
                    ? 'border-brand-blue bg-brand-blue-ghost'
                    : 'border-gray-200 hover:border-brand-blue hover:bg-gray-50'
                )}
                onClick={() => setSelectedVersion(version)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-text-primary">
                        Version {version.version_number}
                      </span>
                      {index === 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Dernière
                        </span>
                      )}
                    </div>
                    
                    {version.name && (
                      <p className="text-sm text-text-secondary mb-1">{version.name}</p>
                    )}
                    
                    {version.description && (
                      <p className="text-xs text-text-tertiary mb-2">{version.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-text-tertiary">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(version.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </div>
                      {version.created_by && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>Par utilisateur</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowPreview(true)
                        setSelectedVersion(version)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Aperçu
                    </Button>
                    {index > 0 && versions && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDiffVersion1(versions[index].id)
                          setDiffVersion2(versions[0].id)
                          setShowDiff(true)
                        }}
                      >
                        <GitCompare className="h-4 w-4 mr-1" />
                        Comparer
                      </Button>
                    )}
                    {index > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRestore(version.version_number)
                        }}
                        disabled={restoreMutation.isPending}
                        className="text-orange-600 hover:text-orange-700 hover:border-orange-300"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restaurer
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </GlassCard>

      {/* Modal de confirmation de restauration */}
      {restoreMutation.isPending && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <GlassCard variant="premium" className="p-6 max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <RotateCcw className="h-6 w-6 text-brand-blue animate-spin" />
              <h3 className="font-semibold text-text-primary">Restauration en cours...</h3>
            </div>
            <p className="text-text-secondary">
              Veuillez patienter pendant la restauration de la version.
            </p>
          </GlassCard>
        </div>
      )}

      {/* Message de succès */}
      {restoreMutation.isSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50"
        >
          <GlassCard variant="premium" className="p-4 border-green-200 bg-green-50">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Version restaurée avec succès</span>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Message d'erreur */}
      {restoreMutation.isError && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50"
        >
          <GlassCard variant="premium" className="p-4 border-red-200 bg-red-50">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">
                Erreur lors de la restauration : {restoreMutation.error?.message || 'Erreur inconnue'}
              </span>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Modal de comparaison */}
      {showDiff && diffVersion1 && diffVersion2 && (
        <VersionDiff
          templateId={templateId}
          version1Id={diffVersion1}
          version2Id={diffVersion2}
          onClose={() => {
            setShowDiff(false)
            setDiffVersion1(null)
            setDiffVersion2(null)
          }}
        />
      )}
    </div>
  )
}
