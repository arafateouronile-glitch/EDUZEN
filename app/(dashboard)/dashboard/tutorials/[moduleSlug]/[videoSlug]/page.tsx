'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { tutorialVideosService } from '@/lib/services/tutorial-videos.service.client'
import { getYouTubeEmbedUrl } from '@/lib/utils/youtube'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, CheckCircle2, ArrowLeft, Clock, Loader2 } from 'lucide-react'
import Link from 'next/link'

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
}

const difficultyLabels: Record<string, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
}

export default function TutorialVideoPage() {
  const params = useParams()
  const moduleSlug = params.moduleSlug as string
  const videoSlug = params.videoSlug as string
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: video, isLoading } = useQuery({
    queryKey: ['tutorial-video', moduleSlug, videoSlug],
    queryFn: () => tutorialVideosService.getVideoBySlug(moduleSlug, videoSlug),
    enabled: !!moduleSlug && !!videoSlug,
  })

  const v = video as { id: string; title: string; description?: string | null; difficulty_level?: string | null; duration_seconds?: number | null; video_url: string; module?: { name?: string | null } | null } | null | undefined

  const { data: isFavorite } = useQuery({
    queryKey: ['tutorial-favorite', user?.id, v?.id],
    queryFn: () => tutorialVideosService.isFavorite(user!.id, v!.id),
    enabled: !!user?.id && !!v?.id,
  })

  const { data: progress } = useQuery({
    queryKey: ['tutorial-progress', user?.id, v?.id],
    queryFn: () => tutorialVideosService.getProgress(user!.id, v!.id),
    enabled: !!user?.id && !!v?.id,
  })

  const p = progress as { is_completed?: boolean } | null | undefined

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !v?.id) return
      if (isFavorite) await tutorialVideosService.removeFromFavorites(user.id, v.id)
      else await tutorialVideosService.addToFavorites(user.id, v.id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tutorial-favorite'] }),
  })

  const markCompletedMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !v?.id) return
      return tutorialVideosService.updateProgress(user.id, v.id, v.duration_seconds || 0, 100)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tutorial-progress'] }),
  })

  if (isLoading) {
    return (
      <div className="w-full p-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!v) {
    return (
      <div className="w-full p-4">
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
            Vidéo introuvable.
            <div className="mt-4">
              <Link href="/dashboard/tutorials">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour aux tutoriels
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const embedUrl = getYouTubeEmbedUrl(v.video_url)

  return (
    <div className="w-full p-4 max-w-4xl mx-auto">
      <Link href="/dashboard/tutorials">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux tutoriels
        </Button>
      </Link>

      <Card className="overflow-hidden">
        {embedUrl ? (
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              title={v.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="aspect-video w-full flex items-center justify-center bg-muted text-muted-foreground">
            Format vidéo non pris en charge
          </div>
        )}
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl mb-2">{v.title}</CardTitle>
              {v.description && <CardDescription>{v.description}</CardDescription>}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => toggleFavoriteMutation.mutate()}
              disabled={!user || toggleFavoriteMutation.isPending}
              aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={isFavorite ? 'h-4 w-4 fill-red-500 text-red-500' : 'h-4 w-4'} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {v.difficulty_level && (
              <Badge className={difficultyColors[v.difficulty_level] || 'bg-gray-100 text-gray-800'}>
                {difficultyLabels[v.difficulty_level] ?? v.difficulty_level}
              </Badge>
            )}
            {v.module?.name && <Badge variant="outline">{v.module.name}</Badge>}
            {v.duration_seconds != null && v.duration_seconds > 0 && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(v.duration_seconds)}
              </span>
            )}
          </div>

          <Button
            onClick={() => markCompletedMutation.mutate()}
            disabled={!user || p?.is_completed || markCompletedMutation.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {p?.is_completed ? 'Terminé' : 'Marquer comme terminé'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
