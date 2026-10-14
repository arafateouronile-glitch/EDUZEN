/**
 * GET /api/evaluations/public-link/[token] — résout un lien public
 * d'évaluations (QR code) : renvoie la liste des apprenants du lot
 * (même session/sujet/type/date), avec leur grade_id, pour que la page
 * publique les affiche et redirige celui qui se reconnaît vers son
 * évaluation. Client service role (bypass RLS) — même pattern que
 * /api/electronic-attendance/public-link/[token].
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

// evaluation_public_links est une table récente non encore dans les types générés.
type AnyClient = any

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServiceRoleClient() as AnyClient

  const { data: link } = await supabase
    .from('evaluation_public_links')
    .select('id, session_id, subject, assessment_type, graded_at, sessions(name)')
    .eq('token', token)
    .maybeSingle()

  if (!link) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })

  const { data: grades, error } = await supabase
    .from('grades')
    .select('id, student_id, students(id, first_name, last_name)')
    .eq('session_id', link.session_id)
    .eq('subject', link.subject)
    .eq('assessment_type', link.assessment_type)
    .eq('graded_at', link.graded_at)
    .not('student_id', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const students = (grades ?? [])
    .filter((g: any) => g.students)
    .map((g: any) => ({
      grade_id: g.id,
      student_id: g.student_id,
      student_name: `${g.students.first_name} ${g.students.last_name}`.trim(),
    }))

  return NextResponse.json({
    subject: link.subject,
    session_name: link.sessions?.name ?? null,
    students,
  })
}
