import type { NextRequest} from 'next/server';
import type { Json } from '@/types/database.types'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/app/api/_middleware/rate-limit'
import { mutationRateLimiter } from '@/lib/utils/rate-limiter'
import { logger } from '@/lib/utils/logger'

function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as Record<string, unknown>
  // PostgreSQL "undefined_column" or PostgREST column error
  return e.code === '42703' || String(e.message ?? '').includes('does not exist')
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  return withRateLimit(req, mutationRateLimiter, async (request) => {
    if (request.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    }

    try {
      const resolvedParams = await params
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      }

      const body = await request.json()
      const { block_id, answer, type } = body
      const lesson_id = resolvedParams.lessonId

      if (!lesson_id || !block_id || !type) {
        return NextResponse.json(
          { error: 'block_id et type sont requis' },
          { status: 400 }
        )
      }

      if (type === 'quiz') {
        const { data: progress, error: selectError } = await supabase
          .from('lesson_progress')
          .select('id, quiz_responses')
          .eq('lesson_id', lesson_id)
          .eq('student_id', user.id)
          .maybeSingle() as { data: { id: string; quiz_responses: Record<string, unknown> } | null; error: unknown }

        if (isMissingColumnError(selectError)) {
          logger.warn('quiz_responses column missing — run migration 20260615000001_lesson_progress_add_responses.sql')
          return NextResponse.json({ success: true, persisted: false })
        }

        const quizResponses = ((progress?.quiz_responses as Record<string, unknown>) || {}) as Record<string, unknown>
        quizResponses[block_id] = { answer, answered_at: new Date().toISOString() }

        if (progress) {
          const { error } = await supabase
            .from('lesson_progress')
            .update({ quiz_responses: quizResponses as Json })
            .eq('id', progress.id)

          if (isMissingColumnError(error)) {
            logger.warn('quiz_responses column missing — run migration 20260615000001_lesson_progress_add_responses.sql')
            return NextResponse.json({ success: true, persisted: false })
          }
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('lesson_progress')
            .insert({
              lesson_id,
              student_id: user.id,
              quiz_responses: quizResponses as Json,
              started_at: new Date().toISOString(),
              last_accessed_at: new Date().toISOString(),
            })

          if (isMissingColumnError(error)) {
            logger.warn('quiz_responses column missing — run migration 20260615000001_lesson_progress_add_responses.sql')
            return NextResponse.json({ success: true, persisted: false })
          }
          if (error) throw error
        }

        return NextResponse.json({ success: true })

      } else if (type === 'poll') {
        const { data: progress, error: selectError } = await supabase
          .from('lesson_progress')
          .select('id, poll_votes')
          .eq('lesson_id', lesson_id)
          .eq('student_id', user.id)
          .maybeSingle() as { data: { id: string; poll_votes: Record<string, unknown> } | null; error: unknown }

        if (isMissingColumnError(selectError)) {
          logger.warn('poll_votes column missing — run migration 20260615000001_lesson_progress_add_responses.sql')
          return NextResponse.json({ success: true, persisted: false })
        }

        const pollVotes = ((progress?.poll_votes as Record<string, unknown>) || {}) as Record<string, unknown>
        pollVotes[block_id] = { option_id: answer, voted_at: new Date().toISOString() }

        if (progress) {
          const { error } = await supabase
            .from('lesson_progress')
            .update({ poll_votes: pollVotes as Json })
            .eq('id', progress.id)

          if (isMissingColumnError(error)) {
            logger.warn('poll_votes column missing — run migration 20260615000001_lesson_progress_add_responses.sql')
            return NextResponse.json({ success: true, persisted: false })
          }
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('lesson_progress')
            .insert({
              lesson_id,
              student_id: user.id,
              poll_votes: pollVotes as Json,
              started_at: new Date().toISOString(),
              last_accessed_at: new Date().toISOString(),
            })

          if (isMissingColumnError(error)) {
            logger.warn('poll_votes column missing — run migration 20260615000001_lesson_progress_add_responses.sql')
            return NextResponse.json({ success: true, persisted: false })
          }
          if (error) throw error
        }

        return NextResponse.json({ success: true })
      }

      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    } catch (error: unknown) {
      logger.error('Erreur lors de la sauvegarde de la réponse:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
  })
}
