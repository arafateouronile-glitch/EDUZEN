import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { documentationService } from '@/lib/services/documentation.service'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'
import { withBodyValidation, type ValidationSchema } from '@/lib/utils/api-validation'
import { withRateLimit, mutationRateLimiter } from '@/lib/utils/rate-limiter'

// Schéma de validation pour le feedback
const feedbackSchema: ValidationSchema = {
  article_id: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  rating: {
    type: 'integer',
    required: false,
    min: 1,
    max: 5,
  },
  comment: {
    type: 'string',
    required: false,
    maxLength: 5000,
  },
  is_helpful: {
    type: 'boolean',
    required: false,
  },
}

/**
 * API Route pour créer un feedback sur un article
 * ✅ Validation stricte + Rate limiting
 */
export async function POST(request: NextRequest) {
  return withRateLimit(request, mutationRateLimiter, async (req) => {
    // Convertir Request en NextRequest pour withBodyValidation
    const nextReq = req as unknown as NextRequest
    return withBodyValidation(nextReq, feedbackSchema, async (req, validatedData) => {
      try {
        const supabase = await createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
        }

        // ✅ validatedData est typé et validé/sanitizé
        const feedback = await documentationService.createFeedback({
          article_id: validatedData.article_id,
          user_id: user.id,
          rating: validatedData.rating,
          comment: validatedData.comment,
          is_helpful: validatedData.is_helpful,
        })

        return NextResponse.json({
          success: true,
          feedback,
        })
      } catch (error: unknown) {
        logger.error('Documentation Feedback - Error creating feedback', error, {
          error: sanitizeError(error),
        })
        return NextResponse.json(
          {
            success: false,
            error: (error as Error).message || 'Erreur lors de la création du feedback',
          },
          { status: 500 }
        )
      }
    })
  })
}

/**
 * API Route pour récupérer les feedbacks d'un article
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const articleId = searchParams.get('article_id')

    if (!articleId) {
      return NextResponse.json({ error: 'article_id requis' }, { status: 400 })
    }

    const feedbacks = await documentationService.getArticleFeedback(articleId)
    const stats = await documentationService.getArticleFeedbackStats(articleId)

    return NextResponse.json({
      success: true,
      feedbacks,
      stats,
    })
  } catch (error: unknown) {
    logger.error('Documentation Feedback - Error fetching feedback', error, {
      error: sanitizeError(error),
    })
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || 'Erreur lors de la récupération des feedbacks',
      },
      { status: 500 }
    )
  }
}
