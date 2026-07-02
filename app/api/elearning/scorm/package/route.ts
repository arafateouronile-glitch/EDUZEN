import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// GET /api/elearning/scorm/package?lesson_id=xxx
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const lessonId = request.nextUrl.searchParams.get('lesson_id')
    if (!lessonId) return NextResponse.json({ error: 'lesson_id requis' }, { status: 400 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    const { data, error } = await admin
      .from('scorm_packages')
      .select('id, entry_point, scorm_version, storage_path, title')
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (error) {
      console.error('[scorm/package] DB error for lesson_id', lessonId, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    console.log('[scorm/package] lesson_id', lessonId, '→', data ? `found (${data.id})` : 'null')
    return NextResponse.json({ package: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
