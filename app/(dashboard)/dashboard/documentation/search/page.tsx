'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, FileText, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export default function DocumentationSearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')

  // Recherche
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['documentation-search', searchQuery, user?.organization_id],
    queryFn: async () => {
      if (!searchQuery.trim()) return { results: [], count: 0 }

      const response = await fetch(
        `/api/documentation/search?q=${encodeURIComponent(searchQuery)}&organization_id=${user?.organization_id || ''}`
      )
      if (!response.ok) throw new Error('Erreur lors de la recherche')
      return response.json()
    },
    enabled: !!searchQuery.trim() && !!user?.organization_id,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dashboard/documentation/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard/documentation">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la documentation
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Recherche</h1>
      </div>

      {/* Barre de recherche */}
      <Card className="mb-6">
        <CardContent className="pt-6">
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Recherche...' : 'Rechercher'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Résultats */}
      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Recherche en cours...</div>
      )}

      {!isLoading && searchResults && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {searchResults.count} résultat{searchResults.count !== 1 ? 's' : ''} trouvé
            {searchResults.count !== 1 ? 's' : ''}
          </p>

          {searchResults.results && searchResults.results.length > 0 ? (
            <div className="space-y-4">
              {searchResults.results.map((article: any) => (
                <Card key={article.id} className="hover:shadow-lg transition-shadow">
                  <Link href={`/dashboard/documentation/${article.category.slug}/${article.slug}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                          {article.excerpt && (
                            <p className="text-sm text-muted-foreground mb-2">{article.excerpt}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{article.category.name}</span>
                            <span>{article.view_count} vues</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucun résultat trouvé pour "{searchQuery}"
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
