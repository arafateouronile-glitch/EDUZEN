'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { knowledgeBaseService } from '@/lib/services/knowledge-base.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, Circle, Heart, Clock, BookOpen, Star, Eye } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { formatDate } from '@/lib/utils'

export default function GuideDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(1)

  // Récupérer le guide
  const { data: guide } = useQuery<{
    id: string;
    title: string;
    description?: string;
    difficulty?: string;
    estimated_time_minutes?: number;
    view_count?: number;
    published_at?: string;
    content?: string;
    author?: { full_name?: string; email?: string; [key: string]: any } | null;
    steps?: Array<{ id: string; step_number: number; [key: string]: any }> | null;
    [key: string]: any;
  } | null>({
    queryKey: ['guide', slug, user?.organization_id],
    queryFn: () => knowledgeBaseService.getGuideBySlug(slug, user?.organization_id || ''),
    enabled: !!slug && !!user?.organization_id,
  })

  // Récupérer la progression
  const { data: progress } = useQuery<{
    id: string;
    current_step: number;
    completed_steps: number[];
    is_completed: boolean;
    [key: string]: any;
  } | null>({
    queryKey: ['guide-progress', user?.id, (guide as any)?.id],
    queryFn: () => knowledgeBaseService.getGuideProgress(user?.id || '', (guide as any)?.id || ''),
    enabled: !!user?.id && !!(guide as any)?.id,
  })

  // Vérifier si le guide est en favoris
  const { data: isFavorite } = useQuery({
    queryKey: ['guide-favorite', user?.id, guide?.id],
    queryFn: () => knowledgeBaseService.isGuideFavorite(user?.id || '', guide?.id || ''),
    enabled: !!user?.id && !!guide?.id,
  })

  // Marquer une étape comme complétée
  const markStepCompletedMutation = useMutation({
    mutationFn: async (stepNumber: number) => {
      if (!user?.id || !guide?.id) return
      return knowledgeBaseService.markStepAsCompleted(user.id, guide.id, stepNumber)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guide-progress'] })
    },
  })

  // Toggle favoris
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !guide?.id) return

      if (isFavorite) {
        await knowledgeBaseService.removeGuideFromFavorites(user.id, guide.id)
      } else {
        await knowledgeBaseService.addGuideToFavorites(user.id, guide.id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guide-favorite'] })
    },
  })

  // Initialiser le step actuel depuis la progression
  useEffect(() => {
    if (progress && progress.current_step) {
      setCurrentStep(progress.current_step)
    } else if (guide?.steps && guide.steps.length > 0) {
      setCurrentStep(1)
    }
  }, [progress, guide])

  const handleStepComplete = (stepNumber: number) => {
    markStepCompletedMutation.mutate(stepNumber)
    
    // Passer à l'étape suivante
    if (guide?.steps && stepNumber < guide.steps.length) {
      setCurrentStep(stepNumber + 1)
    }
  }

  const getDifficultyColor = (difficulty: string | undefined) => {
    if (!difficulty) return 'bg-gray-100 text-gray-800'
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyLabel = (difficulty: string | undefined) => {
    if (!difficulty) return 'Non spécifié'
    switch (difficulty) {
      case 'beginner':
        return 'Débutant'
      case 'intermediate':
        return 'Intermédiaire'
      case 'advanced':
        return 'Avancé'
      default:
        return difficulty
    }
  }

  if (!guide) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="text-center py-12">Chargement...</div>
      </div>
    )
  }

  const completedSteps = progress?.completed_steps || []
  const isStepCompleted = (stepNumber: number) => completedSteps.includes(stepNumber)

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard/knowledge-base">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la base de connaissances
          </Button>
        </Link>
      </div>

      {/* En-tête du guide */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <CardTitle className="text-3xl">{guide.title}</CardTitle>
              </div>
              {guide.description && (
                <p className="text-muted-foreground mb-4">{guide.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span
                  className={`px-2 py-1 rounded ${getDifficultyColor(guide.difficulty)}`}
                >
                  {getDifficultyLabel(guide.difficulty)}
                </span>
                {guide.estimated_time_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{guide.estimated_time_minutes} minutes</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{guide.view_count} vues</span>
                </div>
                {guide.author && (
                  <span>Par {guide.author.full_name || guide.author.email}</span>
                )}
                {guide.published_at && (
                  <span>Publié le {formatDate(guide.published_at)}</span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleFavoriteMutation.mutate()}
              disabled={toggleFavoriteMutation.isPending}
            >
              <Heart
                className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
              />
              {isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Contenu principal */}
        <div className="lg:col-span-3">
          {/* Introduction */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{guide.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Étapes */}
          {guide.steps && guide.steps.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-4">Étapes</h2>
              {guide.steps.map((step: any, index: number) => {
                const stepNumber = step.step_number
                const isCompleted = isStepCompleted(stepNumber)
                const isCurrent = stepNumber === currentStep

                return (
                  <Card
                    key={step.id}
                    className={isCurrent ? 'border-primary border-2' : ''}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {isCompleted ? (
                              <CheckCircle className="h-6 w-6 text-green-600" />
                            ) : (
                              <Circle className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <CardTitle className="text-xl">
                            Étape {stepNumber}: {step.title}
                          </CardTitle>
                        </div>
                        {!isCompleted && (
                          <Button
                            size="sm"
                            onClick={() => handleStepComplete(stepNumber)}
                            disabled={markStepCompletedMutation.isPending}
                          >
                            Marquer comme complété
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {step.image_url && (
                        <img
                          src={step.image_url}
                          alt={step.title}
                          className="mb-4 rounded-lg w-full"
                        />
                      )}
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{step.content}</ReactMarkdown>
                      </div>
                      {step.video_url && (
                        <div className="mt-4">
                          <a
                            href={step.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Voir la vidéo →
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Progression */}
          {progress && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Votre progression</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Étapes complétées</span>
                    <span className="font-semibold">
                      {completedSteps.length} / {guide.steps?.length || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${
                          guide.steps
                            ? (completedSteps.length / guide.steps.length) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  {progress.is_completed && (
                    <div className="flex items-center gap-2 text-green-600 mt-2">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Guide complété !</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Navigation des étapes */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              {guide.steps && guide.steps.length > 0 && (
                <div className="space-y-2">
                  {guide.steps.map((step: any) => {
                    const stepNumber = step.step_number
                    const isCompleted = isStepCompleted(stepNumber)
                    const isCurrent = stepNumber === currentStep

                    return (
                      <button
                        key={step.id}
                        onClick={() => setCurrentStep(stepNumber)}
                        className={`w-full text-left p-2 rounded-lg transition-colors ${
                          isCurrent
                            ? 'bg-primary text-white'
                            : isCompleted
                            ? 'bg-green-50 text-green-800 hover:bg-green-100'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium">
                            Étape {stepNumber}
                          </span>
                        </div>
                        <p className="text-xs mt-1 line-clamp-2">{step.title}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
