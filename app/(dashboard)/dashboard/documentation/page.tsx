'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { documentationService } from '@/lib/services/documentation.service.client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, BookOpen, Star, TrendingUp, Clock, HelpCircle, FileText, Settings } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DocumentationPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  // Récupérer les catégories
  const { data: categories } = useQuery({
    queryKey: ['documentation-categories', user?.organization_id],
    queryFn: () => documentationService.getCategories(user?.organization_id || ''),
    enabled: !!user?.organization_id,
  })

  // Récupérer les articles populaires
  const { data: popularArticles } = useQuery({
    queryKey: ['documentation-popular', user?.organization_id],
    queryFn: () => documentationService.getPopularArticles(10, user?.organization_id || ''),
    enabled: !!user?.organization_id,
  })

  // Récupérer les articles récents
  const { data: recentArticles } = useQuery({
    queryKey: ['documentation-recent', user?.organization_id],
    queryFn: () => documentationService.getRecentArticles(10, user?.organization_id || ''),
    enabled: !!user?.organization_id,
  })

  // Récupérer les articles en vedette
  const { data: featuredArticles } = useQuery({
    queryKey: ['documentation-featured', user?.organization_id],
    queryFn: () => documentationService.getFeaturedArticles(5, user?.organization_id || ''),
    enabled: !!user?.organization_id,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dashboard/documentation/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <div className="w-full p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Documentation</h1>
            <p className="text-muted-foreground">
              Trouvez des réponses à vos questions et apprenez à utiliser toutes les fonctionnalités
            </p>
          </div>
          {user?.role === 'admin' || user?.role === 'super_admin' ? (
            <Link href="/dashboard/documentation/admin">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Administration
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {/* Barre de recherche */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher dans la documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Rechercher</Button>
          </form>
        </CardContent>
      </Card>

      {/* Articles en vedette */}
      {featuredArticles && featuredArticles.length > 0 && (
        <div className="mb-4">
          <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            Articles en vedette
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuredArticles.map((article: any) => (
              <Card key={article.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href={`/dashboard/documentation/${article.category.slug}/${article.slug}`}>
                  <CardHeader>
                    <CardTitle className="text-lg">{article.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{article.excerpt}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{article.category.name}</span>
                      <span>{article.view_count} vues</span>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Catégories */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Catégories
          </h2>
          {categories && categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map((category: any) => (
                <Card key={category.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <Link href={`/dashboard/documentation/category/${category.slug}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {category.icon && <span className="text-2xl">{category.icon}</span>}
                        {category.name}
                      </CardTitle>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      )}
                    </CardHeader>
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucune catégorie disponible
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Articles populaires */}
          {popularArticles && popularArticles.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Articles populaires
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="space-y-3">
                  {popularArticles.slice(0, 5).map((article: any) => (
                    <Link
                      key={article.id}
                      href={`/dashboard/documentation/${article.category.slug}/${article.slug}`}
                      className="block p-2 rounded hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-medium text-sm">{article.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {article.view_count} vues
                      </p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Articles récents */}
          {recentArticles && recentArticles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Articles récents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentArticles.slice(0, 5).map((article: any) => (
                    <Link
                      key={article.id}
                      href={`/dashboard/documentation/${article.category.slug}/${article.slug}`}
                      className="block p-2 rounded hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-medium text-sm">{article.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {article.category.name}
                      </p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liens rapides */}
          <Card>
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Aide rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="space-y-2">
                <Link
                  href="/dashboard/documentation/search?q=débuter"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  Guide de démarrage
                </Link>
                <Link
                  href="/dashboard/documentation/search?q=FAQ"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <HelpCircle className="h-4 w-4" />
                  Questions fréquentes
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

