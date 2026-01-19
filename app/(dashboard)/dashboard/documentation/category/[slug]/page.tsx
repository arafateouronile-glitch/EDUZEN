'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { documentationService } from '@/lib/services/documentation.service.client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, Eye } from 'lucide-react'
import Link from 'next/link'

export default function DocumentationCategoryPage() {
  const params = useParams()
  const slug = params.slug as string
  const { user } = useAuth()

  // Récupérer la catégorie
  const { data: category } = useQuery<{ id: string; [key: string]: any } | null>({
    queryKey: ['documentation-category', slug, user?.organization_id],
    queryFn: async () => {
      const result = await documentationService.getCategoryBySlug(slug, user?.organization_id || '')
      return result as { id: string; [key: string]: any } | null
    },
    enabled: !!slug && !!user?.organization_id,
  })

  // Récupérer les articles de la catégorie
  const { data: articles } = useQuery({
    queryKey: ['documentation-articles', slug, user?.organization_id],
    queryFn: () => documentationService.getArticlesByCategory(category?.id || '', 'published'),
    enabled: !!category?.id,
  })

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard/documentation">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la documentation
          </Button>
        </Link>
        {category && (
          <>
            <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
            {category.description && (
              <p className="text-muted-foreground">{category.description}</p>
            )}
          </>
        )}
      </div>

      {articles && articles.length > 0 ? (
        <div className="space-y-4">
          {articles.map((article: any) => (
            <Card key={article.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href={`/dashboard/documentation/${slug}/${article.slug}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {article.title}
                  </CardTitle>
                  {article.excerpt && (
                    <p className="text-sm text-muted-foreground mt-2">{article.excerpt}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>{article.view_count} vues</span>
                    </div>
                    {article.author && (
                      <span>Par {article.author.full_name || article.author.email}</span>
                    )}
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Aucun article disponible dans cette catégorie
          </CardContent>
        </Card>
      )}
    </div>
  )
}
