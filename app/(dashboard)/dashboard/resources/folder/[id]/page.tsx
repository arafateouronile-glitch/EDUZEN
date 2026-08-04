'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { educationalResourcesService } from '@/lib/services/educational-resources.service.client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Folder,
  FileText,
  Video,
  Image,
  Link as LinkIcon,
  Music,
  BookOpen,
  Star,
  Eye,
  Download,
  Heart,
} from 'lucide-react'
import Link from 'next/link'

const RESOURCE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  video: Video,
  audio: Music,
  image: Image,
  link: LinkIcon,
  interactive: BookOpen,
  other: FileText,
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return 'N/A'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface CollectionResourceRow {
  resource: {
    id: string
    slug: string
    title: string
    description: string | null
    resource_type: string
    thumbnail_url: string | null
    is_featured: boolean | null
    view_count: number | null
    download_count: number | null
    favorite_count: number | null
    file_size_bytes: number | null
    category: { name: string } | null
  } | null
}

export default function ResourceFolderPage() {
  const params = useParams()
  const folderId = params.id as string

  const { data: collection, isLoading } = useQuery({
    queryKey: ['resource-collection', folderId],
    queryFn: () => educationalResourcesService.getCollectionById(folderId),
    enabled: !!folderId,
  })

  const files = ((collection as unknown as { resources?: CollectionResourceRow[] })?.resources ?? [])
    .map(r => r.resource)
    .filter((r): r is NonNullable<CollectionResourceRow['resource']> => !!r)

  return (
    <div className="w-full p-4">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/resources">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Folder className="h-8 w-8 text-brand-blue" />
              {isLoading ? 'Chargement…' : collection?.name}
            </h1>
            {collection?.description && (
              <p className="text-muted-foreground">{collection.description}</p>
            )}
            {!isLoading && (
              <p className="text-sm text-muted-foreground mt-1">
                {files.length} fichier{files.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement du dossier…</p>
      ) : !collection ? (
        <p className="text-muted-foreground">Dossier introuvable.</p>
      ) : files.length === 0 ? (
        <p className="text-muted-foreground">Ce dossier ne contient aucun fichier.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map((resource) => {
            const Icon = RESOURCE_TYPE_ICONS[resource.resource_type] || FileText
            return (
              <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                <Link href={`/dashboard/resources/${resource.slug}`}>
                  {resource.thumbnail_url && (
                    <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                      <img
                        src={resource.thumbnail_url}
                        alt={resource.title}
                        className="w-full h-full object-cover"
                      />
                      {resource.is_featured && (
                        <div className="absolute top-2 right-2">
                          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        </div>
                      )}
                    </div>
                  )}
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-start gap-2">
                      <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
                        {resource.category && (
                          <p className="text-xs text-muted-foreground mt-1">{resource.category.name}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {resource.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{resource.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{resource.view_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          <span>{resource.download_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          <span>{resource.favorite_count || 0}</span>
                        </div>
                      </div>
                      {resource.file_size_bytes && (
                        <span>{formatFileSize(resource.file_size_bytes)}</span>
                      )}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
