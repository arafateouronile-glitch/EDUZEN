'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { educationalResourcesService } from '@/lib/services/educational-resources.service.client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Library,
  FileText,
  Video,
  Image,
  Link as LinkIcon,
  Music,
  Download,
  Eye,
  Heart,
  Star,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

const RESOURCE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  video: Video,
  audio: Music,
  image: Image,
  link: LinkIcon,
  interactive: FileText,
  other: FileText,
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  document: 'Document',
  video: 'Vidéo',
  audio: 'Audio',
  image: 'Image',
  link: 'Lien',
  interactive: 'Interactif',
  other: 'Autre',
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ResourceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const slug = typeof params.slug === 'string' ? params.slug : ''

  const { data: resource, isLoading, isError } = useQuery({
    queryKey: ['educational-resource', slug, user?.organization_id],
    queryFn: () =>
      educationalResourcesService.getResourceBySlugForDashboard(
        slug,
        user?.organization_id || ''
      ),
    enabled: !!slug && !!user?.organization_id,
  })

  if (!slug || !user?.organization_id) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-muted-foreground">Paramètres manquants.</p>
        <Button variant="ghost" asChild className="mt-4">
          <Link href="/dashboard/resources">Retour aux ressources</Link>
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    )
  }

  if (isError || !resource) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-muted-foreground">Ressource introuvable.</p>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/dashboard/resources">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour aux ressources
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const Icon = RESOURCE_TYPE_ICONS[resource.resource_type] || FileText
  const typeLabel = RESOURCE_TYPE_LABELS[resource.resource_type] || resource.resource_type

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/resources">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{resource.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Icon className="h-4 w-4" />
              {typeLabel}
            </span>
            {resource.category && (
              <>
                <span>•</span>
                <span>{resource.category.name}</span>
              </>
            )}
            {resource.is_featured && (
              <>
                <span>•</span>
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span>En vedette</span>
              </>
            )}
          </div>
        </div>
      </div>

      <Card>
        {(resource.thumbnail_url || resource.file_url) && (
          <div className="relative aspect-video max-h-64 w-full overflow-hidden rounded-t-lg bg-muted">
            {resource.thumbnail_url ? (
              <img
                src={resource.thumbnail_url}
                alt={resource.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <Icon className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
            {resource.status === 'draft' && (
              <div className="absolute top-2 right-2 rounded bg-amber-100 text-amber-800 px-2 py-1 text-xs font-medium">
                Brouillon
              </div>
            )}
          </div>
        )}
        <CardHeader>
          <CardTitle className="sr-only">Détails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {resource.description && (
            <p className="text-gray-600 whitespace-pre-wrap">{resource.description}</p>
          )}

          {((r: any) => {
            const scope = r.visibility_scope ?? 'all'
            const label = scope === 'all' ? 'Visible : Tous les utilisateurs' : scope === 'program' ? 'Visible : Apprenants d\'un programme' : scope === 'formation' ? 'Visible : Apprenants d\'une formation' : scope === 'session' ? 'Visible : Apprenants d\'une session' : 'Visible : Tous'
            return (
              <p className="text-sm text-muted-foreground">
                {label}
              </p>
            )
          })(resource)}

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {resource.view_count ?? 0} vues
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              {resource.download_count ?? 0} téléchargements
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {resource.favorite_count ?? 0} favoris
            </span>
            {resource.file_size_bytes && (
              <span>{formatFileSize(resource.file_size_bytes)}</span>
            )}
            <span>Créé le {formatDate(resource.created_at)}</span>
          </div>

          {resource.tags && Array.isArray(resource.tags) && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(resource.tags as string[]).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4">
            {resource.file_url && (
              <Button asChild>
                <a
                  href={resource.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Télécharger
                </a>
              </Button>
            )}
            {resource.external_url && (
              <Button variant="outline" asChild>
                <a
                  href={resource.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir le lien
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
