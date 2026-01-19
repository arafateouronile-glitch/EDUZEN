'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { documentationService } from '@/lib/services/documentation.service.client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Star, Heart, ThumbsUp, ThumbsDown, Eye, BookOpen } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-shadcn'

export default function DocumentationArticlePage() {
  const params = useParams()
  const categorySlug = params.categorySlug as string
  const articleSlug = params.articleSlug as string
  const { user } = useAuth()

  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null)

  // Récupérer l'article
  const { data: article } = useQuery<{ id: string; [key: string]: any } | null>({
    queryKey: ['documentation-article', categorySlug, articleSlug],
    queryFn: async () => {
      const result = await documentationService.getArticleBySlug(articleSlug, categorySlug)
      return result as { id: string; [key: string]: any } | null
    },
    enabled: !!categorySlug && !!articleSlug,
  })

  // Vérifier si l'article est en favoris
  const { data: isFavorite } = useQuery({
    queryKey: ['documentation-favorite', user?.id, article?.id],
    queryFn: () => documentationService.isFavorite(user?.id || '', article?.id || ''),
    enabled: !!user?.id && !!article?.id,
  })

  // Récupérer les statistiques de feedback
  const { data: feedbackStats } = useQuery({
    queryKey: ['documentation-feedback-stats', article?.id],
    queryFn: () => documentationService.getArticleFeedbackStats(article?.id || ''),
    enabled: !!article?.id,
  })

  // Toggle favoris
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !article?.id) return

      if (isFavorite) {
        await documentationService.removeFavorite(user.id, article.id)
      } else {
        await documentationService.addFavorite(user.id, article.id)
      }
    },
    onSuccess: () => {
      // Invalider la requête pour rafraîchir
      window.location.reload()
    },
  })

  // Créer un feedback
  const createFeedbackMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !article?.id) return

      const response = await fetch('/api/documentation/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: article.id,
          rating,
          comment,
          is_helpful: isHelpful,
        }),
      })

      if (!response.ok) throw new Error('Erreur lors de l\'envoi du feedback')
      return response.json()
    },
    onSuccess: () => {
      setRating(null)
      setComment('')
      setIsHelpful(null)
      alert('Merci pour votre feedback !')
    },
  })

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating || comment || isHelpful !== null) {
      createFeedbackMutation.mutate()
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Link href={`/dashboard/documentation/category/${categorySlug}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la catégorie
          </Button>
        </Link>
      </div>

      {article && (
        <>
          {/* En-tête de l'article */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{article.title}</CardTitle>
                  {article.excerpt && (
                    <p className="text-muted-foreground mb-4">{article.excerpt}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>{article.view_count} vues</span>
                    </div>
                    {article.author && (
                      <span>Par {article.author.full_name || article.author.email}</span>
                    )}
                    {article.published_at && (
                      <span>
                        Publié le {new Date(article.published_at).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleFavoriteMutation.mutate()}
                  disabled={toggleFavoriteMutation.isPending}
                >
                  <Heart
                    className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
                  />
                  {isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Contenu de l'article */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{article.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Sections supplémentaires */}
          {article.sections && article.sections.length > 0 && (
            <div className="space-y-6 mb-6">
              {article.sections.map((section: any) => (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle>{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Feedback */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Votre avis</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div>
                  <Label>Note (optionnel)</Label>
                  <Select
                    value={rating?.toString() || ''}
                    onValueChange={(value) => setRating(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une note" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} étoile{num > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Commentaire (optionnel)</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Partagez votre avis..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Cet article vous a-t-il été utile ?</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant={isHelpful === true ? 'default' : 'outline'}
                      onClick={() => setIsHelpful(true)}
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Oui
                    </Button>
                    <Button
                      type="button"
                      variant={isHelpful === false ? 'default' : 'outline'}
                      onClick={() => setIsHelpful(false)}
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Non
                    </Button>
                  </div>
                </div>

                <Button type="submit" disabled={createFeedbackMutation.isPending}>
                  Envoyer le feedback
                </Button>
              </form>

              {/* Statistiques de feedback */}
              {feedbackStats && feedbackStats.total > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-2">Avis des utilisateurs</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold">
                      {feedbackStats.averageRating.toFixed(1)} / 5
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({feedbackStats.total} avis)
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {feedbackStats.helpfulCount} personne{feedbackStats.helpfulCount > 1 ? 's' : ''}{' '}
                    ont trouvé cet article utile
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
