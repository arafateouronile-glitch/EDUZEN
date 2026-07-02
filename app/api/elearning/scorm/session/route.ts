import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logger, sanitizeError } from '@/lib/utils/logger'
import type { ScormSessionPayload } from '@/lib/types/scorm.types'

// GET /api/elearning/scorm/session?lesson_id=...&student_id=...
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lesson_id = searchParams.get('lesson_id')
    const student_id = searchParams.get('student_id')

    if (!lesson_id || !student_id) {
      return NextResponse.json(
        { error: 'lesson_id et student_id sont requis' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('scorm_sessions')
      .select('*')
      .eq('lesson_id', lesson_id)
      .eq('student_id', student_id)
      .maybeSingle()

    if (error) {
      logger.error('scorm_sessions GET error', sanitizeError(error))
      return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
    }

    return NextResponse.json({ session: data })
  } catch (error) {
    logger.error('scorm session GET route', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST /api/elearning/scorm/session — upsert progression
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const payload = await request.json() as ScormSessionPayload

    if (!payload.lesson_id || !payload.student_id) {
      return NextResponse.json(
        { error: 'lesson_id et student_id sont requis' },
        { status: 400 }
      )
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    const isCompleted =
      payload.lesson_status === 'passed' ||
      payload.lesson_status === 'completed' ||
      payload.completion_status === 'completed' ||
      payload.success_status === 'passed'

    const { data, error } = await admin
      .from('scorm_sessions')
      .upsert(
        {
          ...payload,
          last_accessed_at: new Date().toISOString(),
          completed_at: isCompleted ? (payload.completed_at ?? new Date().toISOString()) : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'lesson_id,student_id' }
      )
      .select()
      .single()

    if (error) {
      logger.error('scorm_sessions upsert error', sanitizeError(error))
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 })
    }

    return NextResponse.json({ session: data })
  } catch (error) {
    logger.error('scorm session POST route', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
