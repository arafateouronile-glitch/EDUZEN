'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { knowledgeBaseService } from '@/lib/services/knowledge-base.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ThumbsUp, ThumbsDown, HelpCircle, Eye } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export default function FAQDetailPage() {
  const params = useParams()
  const router = useRouter()
  const faqId = params.id as string
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [feedbackComment, setFeedbackComment] = useState('')
  const [hasGivenFeedback, setHasGivenFeedback] = useState(false)

  // Récupérer la FAQ
  const { data: faq } = useQuery<{
    id: string;
    question: string;
    answer: string;
    view_count: number;
    helpful_count: number;
    category?: { id: string; name: string; [key: string]: any } | null;
    [key: string]: any;
  } | null>({
    queryKey: ['faq-item', faqId],
    queryFn: () => knowledgeBaseService.getFAQItemById(faqId),
    enabled: !!faqId,
  })

  // Créer un feedback
  const createFeedbackMutation = useMutation({
    mutationFn: async (isHelpful: boolean) => {
      if (!user?.id) throw new Error('Non authentifié')
      return knowledgeBaseService.createFAQFeedback(
        faqId,
        user.id,
        isHelpful,
        feedbackComment || undefined
      )
    },
    onSuccess: () => {
      setHasGivenFeedback(true)
      setFeedbackComment('')
      queryClient.invalidateQueries({ queryKey: ['faq-item'] })
    },
  })

  const handleFeedback = (isHelpful: boolean) => {
    if (!hasGivenFeedback) {
      createFeedbackMutation.mutate(isHelpful)
    }
  }

  if (!faq) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="text-center py-12">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/knowledge-base">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la base de connaissances
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl">{faq.question}</CardTitle>
              </div>
              {faq.category && (
                <p className="text-sm text-muted-foreground">{faq.category.name}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none mb-6">
            <ReactMarkdown>{faq.answer}</ReactMarkdown>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{faq.view_count} vues</span>
              </div>
              {faq.helpful_count > 0 && (
                <span className="text-green-600">
                  {faq.helpful_count} personne{faq.helpful_count > 1 ? 's' : ''} ont trouvé cela
                  utile
                </span>
              )}
            </div>

            {!hasGivenFeedback && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">
                  Cette réponse vous a-t-elle été utile ?
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFeedback(true)}
                  disabled={createFeedbackMutation.isPending}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Oui
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFeedback(false)}
                  disabled={createFeedbackMutation.isPending}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Non
                </Button>
              </div>
            )}

            {hasGivenFeedback && (
              <div className="text-sm text-green-600">Merci pour votre retour !</div>
            )}
          </div>

          {!hasGivenFeedback && (
            <div className="mt-4">
              <Label>Commentaire (optionnel)</Label>
              <Textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Partagez vos commentaires..."
                rows={3}
                className="mt-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAQ similaires */}
      {faq.category && (
        <Card>
          <CardHeader>
            <CardTitle>Questions similaires</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Découvrez d'autres questions dans la catégorie "{faq.category.name}"
            </p>
            <Link href={`/dashboard/knowledge-base/faq/category/${faq.category.slug}`}>
              <Button variant="outline" className="mt-4">
                Voir toutes les questions de cette catégorie
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
