'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { tutorialVideosService } from '@/lib/services/tutorial-videos.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PlayCircle, Clock, CheckCircle2, BookOpen, Search, Star } from 'lucide-react'
import Link from 'next/link'
// formatDuration helper
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

export default function TutorialsPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModule, setSelectedModule] = useState<string | null>(null)

  // Récupérer les modules
  const { data: modules } = useQuery({
    queryKey: ['tutorial-modules'],
    queryFn: () => tutorialVideosService.getModules(),
  })

  // Récupérer les vidéos
  const { data: videos } = useQuery({
    queryKey: ['tutorial-videos', selectedModule, searchQuery],
    queryFn: () =>
      tutorialVideosService.getVideos({
        moduleId: selectedModule || undefined,
        search: searchQuery || undefined,
      }),
  })

  // Récupérer les statistiques de progression
  const { data: stats } = useQuery({
    queryKey: ['tutorial-stats', user?.id],
    queryFn: () => tutorialVideosService.getCompletionStats(user?.id || ''),
    enabled: !!user?.id,
  })

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

  return (
    <div className="w-full p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <PlayCircle className="h-8 w-8" />
          Vidéos Tutoriels
        </h1>
        <p className="text-muted-foreground">
          Apprenez à utiliser EDUZEN avec nos tutoriels vidéo complets
        </p>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vidéos complétées</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En cours</p>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Progression</p>
                  <p className="text-2xl font-bold">{Math.round(stats.completionRate)}%</p>
                </div>
                <Star className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recherche */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher un tutoriel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Modules */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedModule(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedModule === null
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  Tous les modules
                </button>
                {modules?.map((module: any) => (
                  <button
                    key={module.id}
                    onClick={() => setSelectedModule(module.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedModule === module.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {module.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des vidéos */}
        <div className="lg:col-span-3">
          {videos && videos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video: any) => (
                <Card key={video.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{video.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {video.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={difficultyColors[video.difficulty_level] || 'bg-gray-100 text-gray-800'}
                        >
                          {difficultyLabels[video.difficulty_level] || video.difficulty_level}
                        </Badge>
                        {video.duration_seconds && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDuration(video.duration_seconds)}
                          </span>
                        )}
                        {video.module && (
                          <Badge variant="outline">{video.module.name}</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-sm text-muted-foreground">
                          {video.view_count || 0} vues
                        </div>
                        <Link
                          href={`/dashboard/tutorials/${video.module?.slug}/${video.slug}`}
                        >
                          <Button>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Regarder
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-4 pb-4 text-center text-muted-foreground">
                Aucune vidéo trouvée. {searchQuery && 'Essayez une autre recherche.'}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

