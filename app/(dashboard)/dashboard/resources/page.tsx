'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { educationalResourcesService } from '@/lib/services/educational-resources.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  BookOpen,
  Video,
  FileText,
  Image,
  Link as LinkIcon,
  Music,
  Star,
  Download,
  Eye,
  Heart,
  Filter,
  Library,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

const RESOURCE_TYPE_ICONS: Record<string, any> = {
  document: FileText,
  video: Video,
  audio: Music,
  image: Image,
  link: LinkIcon,
  interactive: BookOpen,
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

export default function ResourcesPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [selectedType, setSelectedType] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState('all')

  // Récupérer les catégories
  const { data: categories } = useQuery({
    queryKey: ['resource-categories', user?.organization_id],
    queryFn: () => educationalResourcesService.getCategories(user?.organization_id || ''),
    enabled: !!user?.organization_id,
  })

  // Récupérer les ressources
  const { data: resources } = useQuery({
    queryKey: [
      'educational-resources',
      user?.organization_id,
      searchQuery,
      selectedCategory,
      selectedType,
    ],
    queryFn: () =>
      educationalResourcesService.getResources(user?.organization_id || '', {
        categoryId: selectedCategory,
        resourceType: selectedType,
        search: searchQuery || undefined,
      }),
    enabled: !!user?.organization_id,
  })

  // Récupérer les ressources en vedette
  const { data: featuredResources } = useQuery({
    queryKey: ['featured-resources', user?.organization_id],
    queryFn: () =>
      educationalResourcesService.getResources(user?.organization_id || '', {
        featured: true,
      }),
    enabled: !!user?.organization_id,
  })

  // Récupérer les favoris
  const { data: favorites } = useQuery({
    queryKey: ['user-favorites', user?.id],
    queryFn: () => educationalResourcesService.getUserFavorites(user?.id || ''),
    enabled: !!user?.id,
  })

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Library className="h-8 w-8" />
            Bibliothèque de ressources
          </h1>
          <p className="text-muted-foreground">
            Accédez à une vaste collection de ressources pédagogiques
          </p>
        </div>
        <Link href="/dashboard/resources/new">
          <Button className="bg-brand-blue hover:bg-brand-blue/90 text-white shadow-lg shadow-brand-blue/20">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle ressource
          </Button>
        </Link>
      </div>

      {/* Barre de recherche et filtres */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher une ressource..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || undefined)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="">Toutes les catégories</option>
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedType || ''}
                onChange={(e) => setSelectedType(e.target.value || undefined)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="">Tous les types</option>
                {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">Toutes les ressources</TabsTrigger>
          <TabsTrigger value="featured">En vedette</TabsTrigger>
          <TabsTrigger value="favorites">Mes favoris</TabsTrigger>
        </TabsList>

        {/* Onglet Toutes les ressources */}
        <TabsContent value="all">
          {resources && resources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource: any) => {
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
                      <CardHeader>
                        <div className="flex items-start gap-2">
                          <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
                            {resource.category && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {resource.category.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {resource.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {resource.description}
                          </p>
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
                        {resource.duration_minutes && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Durée: {resource.duration_minutes} min
                          </p>
                        )}
                      </CardContent>
                    </Link>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucune ressource disponible
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Onglet En vedette */}
        <TabsContent value="featured">
          {featuredResources && featuredResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredResources.map((resource: any) => {
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
                          <div className="absolute top-2 right-2">
                            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                          </div>
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-start gap-2">
                          <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {resource.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {resource.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>{resource.view_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            <span>{resource.download_count || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucune ressource en vedette
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Onglet Mes favoris */}
        <TabsContent value="favorites">
          {favorites && favorites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((favorite: any) => {
                const resource = favorite.resource
                if (!resource) return null
                const Icon = RESOURCE_TYPE_ICONS[resource.resource_type] || FileText
                return (
                  <Card key={favorite.id} className="hover:shadow-lg transition-shadow">
                    <Link href={`/dashboard/resources/${resource.slug}`}>
                      {resource.thumbnail_url && (
                        <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                          <img
                            src={resource.thumbnail_url}
                            alt={resource.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-start gap-2">
                          <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {resource.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {resource.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>{resource.view_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            <span>{resource.download_count || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucun favori pour le moment
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
