/**
 * GET  /api/sessions/[id]/questionnaires — stats d'envoi et de réponse
 * POST /api/sessions/[id]/questionnaires — envoie le questionnaire aux apprenants inscrits
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { emailService } from '@/lib/services/email.service'

// questionnaire_links est une table récente non encore dans les types générés.
type AnyClient = any

// ── GET — statistiques ────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const orgId = await getUserOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })

  const { data: links } = await (supabase as AnyClient)
    .from('questionnaire_links')
    .select('id, student_name, student_email, assessment_type, submitted_at, viewed_at, created_at, expires_at')
    .eq('session_id', sessionId)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  const rows = links ?? []
  const byType: Record<string, { sent: number; viewed: number; submitted: number }> = {}
  for (const r of rows) {
    const t = r.assessment_type as string
    if (!byType[t]) byType[t] = { sent: 0, viewed: 0, submitted: 0 }
    byType[t].sent++
    if (r.viewed_at) byType[t].viewed++
    if (r.submitted_at) byType[t].submitted++
  }

  return NextResponse.json({ links: rows, byType })
}

// ── POST — envoi ──────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const supabase = await createClient()
  const admin = createAdminClient() as AnyClient

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const orgId = await getUserOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })

  const body = await req.json() as { template_id: string; assessment_type: string }
  const { template_id, assessment_type } = body

  if (!template_id || !assessment_type) {
    return NextResponse.json({ error: 'template_id et assessment_type requis' }, { status: 400 })
  }

  // Vérifier la session appartient à l'org
  const { data: session } = await supabase
    .from('sessions')
    .select('id, name, start_date, end_date, organization_id')
    .eq('id', sessionId)
    .eq('organization_id', orgId)
    .single()
  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })

  // Vérifier le template appartient à l'org ou est un template global (organization_id null)
  const { data: template } = await supabase
    .from('evaluation_templates')
    .select('id, name, assessment_type')
    .eq('id', template_id)
    .or(`organization_id.eq.${orgId},organization_id.is.null`)
    .single()
  if (!template) return NextResponse.json({ error: 'Template introuvable' }, { status: 404 })

  // Apprenants inscrits (non annulés) avec email
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, student_id, students(id, first_name, last_name, email)')
    .eq('session_id', sessionId)
    .neq('status', 'cancelled')
    .not('student_id', 'is', null)

  const students = (enrollments ?? [])
    .map((e: { students: { id: string; first_name: string; last_name: string; email: string | null } | { id: string; first_name: string; last_name: string; email: string | null }[] | null }) => {
      const s = Array.isArray(e.students) ? e.students[0] : e.students
      return s
    })
    .filter(Boolean) as Array<{ id: string; first_name: string; last_name: string; email: string | null }>

  if (!students.length) {
    return NextResponse.json({ error: 'Aucun apprenant inscrit avec email' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3001}`
  const results: { student_name: string; sent: boolean; reason?: string }[] = []
  let created = 0
  let skipped = 0

  for (const student of students) {
    const studentName = `${student.first_name} ${student.last_name}`

    // Vérifier si un lien non-soumis existe déjà pour ce student+session+type
    const { data: existing } = await admin
      .from('questionnaire_links')
      .select('id, submitted_at')
      .eq('session_id', sessionId)
      .eq('student_id', student.id)
      .eq('assessment_type', assessment_type)
      .maybeSingle()

    if (existing?.submitted_at) {
      // Déjà répondu → on skip
      results.push({ student_name: studentName, sent: false, reason: 'déjà soumis' })
      skipped++
      continue
    }

    let token: string

    if (existing) {
      // Lien existe mais pas encore soumis → réutiliser
      const { data: linkRow } = await admin
        .from('questionnaire_links')
        .select('token')
        .eq('id', existing.id)
        .single()
      token = linkRow!.token as string
    } else {
      // Créer grade
      const { data: gradeRow } = await admin
        .from('grades')
        .insert({
          organization_id: orgId,
          session_id: sessionId,
          student_id: student.id,
          assessment_type,
          subject: template.name,
          graded_at: new Date().toISOString(),
          max_score: 5,
        })
        .select('id')
        .single()

      // Créer instance
      const { data: instanceRow } = await admin
        .from('evaluation_template_instances')
        .insert({
          grade_id: gradeRow!.id,
          template_id,
        })
        .select('id')
        .single()

      // Créer lien token
      const { data: newLink } = await admin
        .from('questionnaire_links')
        .insert({
          organization_id: orgId,
          session_id: sessionId,
          student_id: student.id,
          template_id,
          grade_id: gradeRow!.id,
          instance_id: instanceRow!.id,
          student_name: studentName,
          student_email: student.email,
          session_name: session.name,
          assessment_type,
        })
        .select('token')
        .single()

      token = newLink!.token as string
      created++
    }

    // Envoi email si email disponible
    if (student.email) {
      const typeLabel = assessment_type === 'hot' ? 'à chaud' : assessment_type === 'cold' ? 'à froid' : assessment_type
      const questionnaireUrl = `${appUrl}/q/${token}`
      try {
        await emailService.sendEmail({
          to: student.email,
          subject: `Questionnaire de satisfaction ${typeLabel} — ${session.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #1e40af; margin-bottom: 8px;">Questionnaire de satisfaction</h2>
              <p style="color: #374151; margin-bottom: 4px;">Bonjour ${student.first_name},</p>
              <p style="color: #374151; margin-bottom: 20px;">
                Merci de participer à <strong>${session.name}</strong>.<br>
                Nous souhaiterions recueillir votre avis via ce questionnaire de satisfaction ${typeLabel}.
              </p>
              <a href="${questionnaireUrl}"
                 style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px;
                        border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 20px;">
                Répondre au questionnaire
              </a>
              <p style="color: #6b7280; font-size: 13px;">
                Ce lien est valable 30 jours. Si le bouton ne fonctionne pas, copiez cette URL :<br>
                <a href="${questionnaireUrl}" style="color: #2563eb;">${questionnaireUrl}</a>
              </p>
            </div>
          `,
        })
        results.push({ student_name: studentName, sent: true })
      } catch {
        results.push({ student_name: studentName, sent: false, reason: 'erreur envoi email' })
      }
    } else {
      results.push({ student_name: studentName, sent: false, reason: 'pas d\'email' })
    }
  }

  return NextResponse.json({
    success: true,
    created,
    skipped,
    total: students.length,
    results,
  })
}
