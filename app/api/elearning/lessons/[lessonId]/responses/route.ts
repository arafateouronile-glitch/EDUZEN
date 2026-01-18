import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/app/api/_middleware/rate-limit'
import { mutationRateLimiter } from '@/lib/utils/rate-limiter'

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
      // Pour les quiz, on stocke dans lesson_progress avec un champ JSON pour les réponses
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('id, quiz_responses')
        .eq('lesson_id', lesson_id)
        .eq('student_id', user.id)
        .maybeSingle()

      const quizResponses = ((progress as any)?.quiz_responses as Record<string, unknown>) || {}
      quizResponses[block_id] = {
        answer,
        answered_at: new Date().toISOString(),
      }

      if (progress) {
        const { error } = await supabase
          .from('lesson_progress')
          .update({ quiz_responses: quizResponses } as any)
          .eq('id', (progress as any).id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('lesson_progress')
          .insert({
            lesson_id,
            student_id: user.id,
            quiz_responses: quizResponses as any,
            started_at: new Date().toISOString(),
            last_accessed_at: new Date().toISOString(),
          })

        if (error) throw error
      }

      return NextResponse.json({ success: true })
    } else if (type === 'poll') {
      // Pour les sondages, on stocke dans une table dédiée (ou dans lesson_progress)
      // Pour l'instant, on utilise lesson_progress avec un champ poll_votes
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('id, poll_votes')
        .eq('lesson_id', lesson_id)
        .eq('student_id', user.id)
        .maybeSingle()

      const pollVotes = (progress?.poll_votes as Record<string, unknown>) || {}
      pollVotes[block_id] = {
        option_id: answer,
        voted_at: new Date().toISOString(),
      }

      if (progress) {
        const { error } = await supabase
          .from('lesson_progress')
          .update({ poll_votes: pollVotes } as any)
          .eq('id', (progress as any).id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('lesson_progress')
          .insert({
            lesson_id,
            student_id: user.id,
            poll_votes: pollVotes as any,
            started_at: new Date().toISOString(),
            last_accessed_at: new Date().toISOString(),
          })

        if (error) throw error
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  } catch (error: unknown) {
    console.error('Erreur lors de la sauvegarde de la réponse:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
    }
  })
}

