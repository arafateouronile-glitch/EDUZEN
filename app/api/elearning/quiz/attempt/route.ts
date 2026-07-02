import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// GET /api/elearning/quiz/attempt?lesson_id=xxx
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const lessonId = request.nextUrl.searchParams.get('lesson_id')
    if (!lessonId) return NextResponse.json({ error: 'lesson_id requis' }, { status: 400 })

    const { data, error } = await (supabase as any)
      .from('quiz_attempts')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('student_id', user.id)
      .order('attempt_number', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ attempts: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/elearning/quiz/attempt
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { lesson_id, organization_id, attempt_number, answers, score_percentage, passed, time_spent_seconds, completed_at } = body

    if (!lesson_id || !organization_id) {
      return NextResponse.json({ error: 'lesson_id et organization_id requis' }, { status: 400 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    const { data, error } = await (admin as any)
      .from('quiz_attempts')
      .upsert(
        {
          lesson_id,
          student_id: user.id,
          organization_id,
          attempt_number: attempt_number ?? 1,
          answers: answers ?? {},
          score_percentage,
          passed,
          time_spent_seconds,
          completed_at,
        },
        { onConflict: 'lesson_id,student_id,attempt_number' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Si réussi → tenter d'émettre un certificat
    if (passed) {
      await tryIssueCertificate({ admin, lessonId: lesson_id, studentId: user.id })
    }

    return NextResponse.json({ attempt: data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}

async function tryIssueCertificate({ admin, lessonId, studentId }: {
  admin: any
  lessonId: string
  studentId: string
}) {
  try {
    // Récupérer le cours lié à la leçon
    const { data: lesson } = await (admin as any)
      .from('lessons')
      .select('course_id, courses(id, title, organization_id)')
      .eq('id', lessonId)
      .single()

    if (!lesson?.course_id) return

    const course = lesson.courses
    const courseId = lesson.course_id
    const orgId = course?.organization_id

    // Vérifier que toutes les leçons du cours sont complétées
    const { data: allLessons } = await (admin as any)
      .from('lessons')
      .select('id, lesson_type')
      .eq('course_id', courseId)

    if (!allLessons?.length) return

    // Récupérer la progression de l'étudiant
    const { data: progress } = await (admin as any)
      .from('lesson_progress')
      .select('lesson_id, is_completed')
      .eq('student_id', studentId)
      .in('lesson_id', allLessons.map((l: any) => l.id))

    const completedIds = new Set((progress ?? []).filter((p: any) => p.is_completed).map((p: any) => p.lesson_id))

    // Vérifier les quiz : toutes les leçons quiz doivent avoir been passed
    const quizLessons = allLessons.filter((l: any) => l.lesson_type === 'quiz')
    if (quizLessons.length > 0) {
      const { data: attempts } = await (admin as any)
        .from('quiz_attempts')
        .select('lesson_id, passed')
        .eq('student_id', studentId)
        .in('lesson_id', quizLessons.map((l: any) => l.id))
        .eq('passed', true)

      const passedQuizIds = new Set((attempts ?? []).map((a: any) => a.lesson_id))
      const allQuizPassed = quizLessons.every((l: any) => passedQuizIds.has(l.id))
      if (!allQuizPassed) return
    }

    // Toutes les leçons non-quiz doivent être complétées
    const nonQuizLessons = allLessons.filter((l: any) => l.lesson_type !== 'quiz')
    const allNonQuizCompleted = nonQuizLessons.every((l: any) => completedIds.has(l.id))
    if (!allNonQuizCompleted) return

    // Score moyen des quiz
    const { data: allAttempts } = await (admin as any)
      .from('quiz_attempts')
      .select('lesson_id, score_percentage, passed')
      .eq('student_id', studentId)
      .in('lesson_id', quizLessons.map((l: any) => l.id))
      .eq('passed', true)

    let avgScore: number | null = null
    if (allAttempts?.length > 0) {
      const byLesson = new Map<string, number>()
      for (const a of allAttempts) {
        const existing = byLesson.get(a.lesson_id)
        if (!existing || a.score_percentage > existing) byLesson.set(a.lesson_id, a.score_percentage)
      }
      avgScore = Math.round([...byLesson.values()].reduce((s, v) => s + v, 0) / byLesson.size)
    }

    // Récupérer le nom de l'étudiant
    const { data: profile } = await (admin as any)
      .from('students')
      .select('first_name, last_name')
      .eq('id', studentId)
      .maybeSingle()

    const studentName = profile
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Apprenant'
      : 'Apprenant'

    // Émettre le certificat (upsert — un seul par cours)
    await (admin as any)
      .from('certificates')
      .upsert(
        {
          course_id: courseId,
          student_id: studentId,
          organization_id: orgId,
          student_name: studentName,
          course_title: course?.title ?? 'Formation',
          score_percentage: avgScore,
          issued_at: new Date().toISOString(),
        },
        { onConflict: 'course_id,student_id', ignoreDuplicates: false }
      )
  } catch {
    // Non bloquant
  }
}
