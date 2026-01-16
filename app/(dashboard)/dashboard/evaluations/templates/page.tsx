'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { evaluationTemplateService } from '@/lib/services/evaluation-template.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import {
  FileText, Plus, Search, Edit, Trash2, Copy, 
  MoreVertical, CheckCircle2, ArrowLeft, Eye, FileQuestion
} from 'lucide-react'
import Link from 'next/link'
import { motion } from '@/components/ui/motion'
import { formatDate } from '@/lib/utils'

export default function EvaluationTemplatesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')

  // Récupérer les modèles
  const { data: templates, isLoading } = useQuery<Array<{
    id: string;
    name: string;
    organization_id?: string | null;
    description?: string | null;
    [key: string]: any;
  }>>({
    queryKey: ['evaluation-templates', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const result = await evaluationTemplateService.getTemplates(user.organization_id)
      return (result as unknown) as Array<{
        id: string;
        name: string;
        organization_id?: string | null;
        description?: string | null;
        [key: string]: any;
      }>
    },
    enabled: !!user?.organization_id,
  })

  // Mutation pour supprimer (uniquement pour les modèles de l'organisation)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Vérifier que le modèle appartient à l'organisation avant de supprimer
      const template = templates?.find(t => t.id === id)
      if (template && !template.organization_id) {
        throw new Error('Les modèles système ne peuvent pas être supprimés')
      }
      await evaluationTemplateService.deleteTemplate(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-templates'] })
      addToast({
        type: 'success',
        title: 'Modèle supprimé',
        description: 'Le modèle a été supprimé avec succès.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la suppression.',
      })
    },
  })

  // Filtrer les modèles selon la recherche
  const filteredTemplates = templates?.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Modèles d'évaluations</h1>
          <p className="text-muted-foreground mt-1">
            Créez et gérez vos modèles d'évaluations avec questions/réponses
          </p>
        </div>
        <Link href="/dashboard/evaluations/templates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau modèle
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un modèle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun modèle trouvé</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery
                ? 'Aucun modèle ne correspond à votre recherche.'
                : 'Créez votre premier modèle d\'évaluation pour commencer.'}
            </p>
            {!searchQuery && (
              <Link href="/dashboard/evaluations/templates/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un modèle
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {!template.organization_id && (
                          <Badge variant="outline" className="text-xs">
                            Système
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        {template.description || 'Aucune description'}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {template.questions?.length || 0} questions
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {template.subject && (
                      <div className="text-sm">
                        <span className="font-medium">Sujet :</span>{' '}
                        <span className="text-muted-foreground">{template.subject}</span>
                      </div>
                    )}
                    {template.assessment_type && (
                      <div className="text-sm">
                        <span className="font-medium">Type :</span>{' '}
                        <span className="text-muted-foreground">{template.assessment_type}</span>
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="font-medium">Note max :</span>{' '}
                      <span className="text-muted-foreground">{template.max_score} points</span>
                    </div>
                    {template.time_limit_minutes && (
                      <div className="text-sm">
                        <span className="font-medium">Durée :</span>{' '}
                        <span className="text-muted-foreground">{template.time_limit_minutes} min</span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Créé le {formatDate(template.created_at)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Link href={`/dashboard/evaluations/templates/${template.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                    </Link>
                    {template.organization_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
                            deleteMutation.mutate(template.id)
                          }
                        }}
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
      )}
    </div>
  )
}

