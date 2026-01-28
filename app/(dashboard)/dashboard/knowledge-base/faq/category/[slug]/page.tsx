'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { knowledgeBaseService } from '@/lib/services/knowledge-base.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, HelpCircle, Eye, ThumbsUp } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export default function FAQCategoryPage() {
  const params = useParams()
  const slug = params.slug as string
  const { user } = useAuth()

  // Récupérer la catégorie
  const { data: category } = useQuery({
    queryKey: ['faq-category', slug, user?.organization_id],
    queryFn: async () => {
      const categories = await knowledgeBaseService.getCategories()
      return categories.find((cat: any) => cat.slug === slug)
    },
    enabled: !!slug && !!user?.organization_id,
  })

  // Récupérer les FAQ de la catégorie
  const { data: faqItems } = useQuery({
    queryKey: ['faq-items-category', slug, user?.organization_id],
    queryFn: () =>
      knowledgeBaseService.getFAQItems(user?.organization_id || '', {
        categoryId: (category as any)?.id,
      }),
    enabled: !!(category as any)?.id && !!user?.organization_id,
  })

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard/knowledge-base">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la base de connaissances
          </Button>
        </Link>
        {category && (
          <>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <HelpCircle className="h-8 w-8" />
              {(category as any).name}
            </h1>
            {(category as any).description && (
              <p className="text-muted-foreground">{(category as any).description}</p>
            )}
          </>
        )}
      </div>

      {faqItems && faqItems.length > 0 ? (
        <div className="space-y-4">
          {faqItems.map((faq: any) => (
            <Card key={faq.id} className="hover:shadow-lg transition-shadow">
              <Link href={`/dashboard/knowledge-base/faq/${faq.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    <ReactMarkdown>{faq.answer}</ReactMarkdown>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{faq.view_count} vues</span>
                    </div>
                    {faq.helpful_count > 0 && (
                      <div className="flex items-center gap-1 text-green-600">
                        <ThumbsUp className="h-3 w-3" />
                        <span>
                          {faq.helpful_count} utile{faq.helpful_count > 1 ? 's' : ''}
                        </span>
                      </div>
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
            Aucune question disponible dans cette catégorie
          </CardContent>
        </Card>
      )}
    </div>
  )
}
