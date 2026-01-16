'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { knowledgeBaseService } from '@/lib/services/knowledge-base.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  HelpCircle,
  BookOpen,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export default function KnowledgeBasePage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('faq')

  // Récupérer les catégories FAQ
  const { data: faqCategories } = useQuery({
    queryKey: ['faq-categories', user?.organization_id],
    queryFn: () => knowledgeBaseService.getFAQCategories(user?.organization_id || ''),
    enabled: !!user?.organization_id,
  })

  // Récupérer les FAQ
  const { data: faqItems } = useQuery({
    queryKey: ['faq-items', user?.organization_id, searchQuery],
    queryFn: () =>
      knowledgeBaseService.getFAQItems(user?.organization_id || '', {
        search: searchQuery || undefined,
      }),
    enabled: !!user?.organization_id,
  })

  // Récupérer les guides
  const { data: guides } = useQuery({
    queryKey: ['guides', user?.organization_id, searchQuery],
    queryFn: () =>
      knowledgeBaseService.getGuides(user?.organization_id || '', {
        search: searchQuery || undefined,
      }),
    enabled: !!user?.organization_id,
  })

  // Récupérer les guides en vedette
  const { data: featuredGuides } = useQuery({
    queryKey: ['featured-guides', user?.organization_id],
    queryFn: () =>
      knowledgeBaseService.getGuides(user?.organization_id || '', {
        featured: true,
      }),
    enabled: !!user?.organization_id,
  })

  // Récupérer les FAQ en vedette
  const { data: featuredFAQs } = useQuery({
    queryKey: ['featured-faqs', user?.organization_id],
    queryFn: () =>
      knowledgeBaseService.getFAQItems(user?.organization_id || '', {
        featured: true,
      }),
    enabled: !!user?.organization_id,
  })

  const getDifficultyColor = (difficulty: string) => {
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

  const getDifficultyLabel = (difficulty: string) => {
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Base de connaissances</h1>
        <p className="text-muted-foreground">
          Trouvez des réponses rapides et des guides détaillés
        </p>
      </div>

      {/* Barre de recherche */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher dans la base de connaissances..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="faq">
            <HelpCircle className="h-4 w-4 mr-2" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="guides">
            <BookOpen className="h-4 w-4 mr-2" />
            Guides
          </TabsTrigger>
        </TabsList>

        {/* Onglet FAQ */}
        <TabsContent value="faq">
          {/* FAQ en vedette */}
          {featuredFAQs && featuredFAQs.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-500" />
                Questions fréquentes en vedette
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuredFAQs.map((faq: any) => (
                  <Card key={faq.id} className="hover:shadow-lg transition-shadow">
                    <Link href={`/dashboard/knowledge-base/faq/${faq.id}`}>
                      <CardHeader>
                        <CardTitle className="text-lg">{faq.question}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          <ReactMarkdown>{faq.answer}</ReactMarkdown>
                        </div>
                        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                          <span>{faq.category?.name}</span>
                          <div className="flex items-center gap-2">
                            <span>{faq.view_count} vues</span>
                            {faq.helpful_count > 0 && (
                              <span className="text-green-600">
                                {faq.helpful_count} utile{faq.helpful_count > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Catégories FAQ */}
          {faqCategories && faqCategories.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Par catégorie</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {faqCategories.map((category: any) => {
                  const categoryFAQs = faqItems?.filter((faq: any) => faq.category_id === category.id) || []
                  return (
                    <Card key={category.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                      <Link href={`/dashboard/knowledge-base/faq/category/${category.slug}`}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            {category.icon && <span className="text-2xl">{category.icon}</span>}
                            {category.name}
                          </CardTitle>
                          {category.description && (
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                          )}
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {categoryFAQs.length} question{categoryFAQs.length > 1 ? 's' : ''}
                          </p>
                        </CardContent>
                      </Link>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Toutes les FAQ */}
          {faqItems && faqItems.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Toutes les questions</h2>
              <div className="space-y-4">
                {faqItems.map((faq: any) => (
                  <Card key={faq.id} className="hover:shadow-lg transition-shadow">
                    <Link href={`/dashboard/knowledge-base/faq/${faq.id}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              <ReactMarkdown>{faq.answer}</ReactMarkdown>
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              <span>{faq.category?.name}</span>
                              <span>{faq.view_count} vues</span>
                              {faq.helpful_count > 0 && (
                                <span className="text-green-600">
                                  {faq.helpful_count} utile{faq.helpful_count > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Onglet Guides */}
        <TabsContent value="guides">
          {/* Guides en vedette */}
          {featuredGuides && featuredGuides.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-500" />
                Guides en vedette
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredGuides.map((guide: any) => (
                  <Card key={guide.id} className="hover:shadow-lg transition-shadow">
                    <Link href={`/dashboard/knowledge-base/guides/${guide.slug}`}>
                      <CardHeader>
                        <CardTitle className="text-lg">{guide.title}</CardTitle>
                        {guide.description && (
                          <p className="text-sm text-muted-foreground">{guide.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span
                            className={`px-2 py-1 rounded ${getDifficultyColor(guide.difficulty)}`}
                          >
                            {getDifficultyLabel(guide.difficulty)}
                          </span>
                          {guide.estimated_time_minutes && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{guide.estimated_time_minutes} min</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Tous les guides */}
          {guides && guides.length > 0 ? (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Tous les guides</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guides.map((guide: any) => (
                  <Card key={guide.id} className="hover:shadow-lg transition-shadow">
                    <Link href={`/dashboard/knowledge-base/guides/${guide.slug}`}>
                      <CardHeader>
                        <CardTitle>{guide.title}</CardTitle>
                        {guide.description && (
                          <p className="text-sm text-muted-foreground">{guide.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded ${getDifficultyColor(guide.difficulty)}`}
                            >
                              {getDifficultyLabel(guide.difficulty)}
                            </span>
                            {guide.category && <span>{guide.category}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {guide.estimated_time_minutes && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{guide.estimated_time_minutes} min</span>
                              </div>
                            )}
                            <span>{guide.view_count} vues</span>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucun guide disponible
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
