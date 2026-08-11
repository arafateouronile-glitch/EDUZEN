import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NotificationService } from '@/lib/services/notification.service'
import { EMAIL_CONFIG, APP_URLS } from '@/lib/config/app-config'
import { logger, maskEmail, sanitizeError } from '@/lib/utils/logger'
import { getPublicErrorMessage } from '@/lib/utils/api-error-response'

const ADMIN_ROLES = ['super_admin', 'admin', 'secretary']

interface RelanceRequest {
  teacher_user_id: string
  required_document_type_ids: string[]
}

interface RelanceOutcome {
  teacher_user_id: string
  success: boolean
  error?: string
  sentTo?: string
  documentsCount?: number
}

async function sendOneRelance(
  supabase: SupabaseClient<any>,
  organizationId: string,
  organizationName: string,
  adminId: string,
  relance: RelanceRequest
): Promise<RelanceOutcome> {
  const { teacher_user_id: teacherUserId, required_document_type_ids: requiredDocumentTypeIds } = relance

  if (!teacherUserId || !requiredDocumentTypeIds?.length) {
    return { teacher_user_id: teacherUserId, success: false, error: 'Formateur et documents requis manquants' }
  }

  const { data: teacherUser } = await supabase
    .from('users')
    .select('id, email, full_name, organization_id')
    .eq('id', teacherUserId)
    .eq('organization_id', organizationId)
    .single()

  if (!teacherUser?.email) {
    return { teacher_user_id: teacherUserId, success: false, error: 'Formateur introuvable dans cette organisation' }
  }

  const { data: requiredTypes } = await supabase
    .from('teacher_required_document_types' as any)
    .select('id, label')
    .in('id', requiredDocumentTypeIds)
    .eq('organization_id', organizationId)

  const labels = ((requiredTypes ?? []) as unknown as { id: string; label: string }[]).map(t => t.label)
  if (labels.length === 0) {
    return { teacher_user_id: teacherUserId, success: false, error: 'Aucun document requis valide' }
  }

  const docsUrl = `${APP_URLS.getBaseUrl()}/dashboard/teacher/documents`

  const resendApiKey = process.env.RESEND_API_KEY
  if (resendApiKey) {
    const resend = new Resend(resendApiKey)
    const { error: sendError } = await resend.emails.send({
      from: EMAIL_CONFIG.getFromEmail(),
      to: teacherUser.email,
      subject: 'Documents à mettre à jour sur votre espace formateur',
      html: `
        <p>Bonjour ${teacherUser.full_name ?? ''},</p>
        <p>${organizationName} vous informe que les documents suivants doivent être déposés ou renouvelés sur votre espace formateur :</p>
        <ul>${labels.map(l => `<li>${l}</li>`).join('')}</ul>
        <p><a href="${docsUrl}">Accéder à mon espace formateur</a></p>
        <p>Merci de votre réactivité.</p>
      `,
    })
    if (sendError) {
      logger.error('teacher-documents/relance: erreur envoi email', sendError, { recipient: maskEmail(teacherUser.email) })
    }
  } else {
    logger.info('teacher-documents/relance: mode test (RESEND_API_KEY absente)', { recipient: maskEmail(teacherUser.email) })
  }

  const notificationService = new NotificationService(supabase)
  await notificationService.create({
    user_id: teacherUser.id,
    organization_id: organizationId,
    type: 'document',
    title: 'Documents à mettre à jour',
    message: `${labels.length} document${labels.length > 1 ? 's' : ''} de conformité à déposer ou renouveler : ${labels.join(', ')}`,
    link: '/dashboard/teacher/documents',
  })

  const logRows = requiredDocumentTypeIds.map(id => ({
    organization_id: organizationId,
    teacher_id: teacherUser.id,
    required_document_type_id: id,
    alert_type: 'missing_manual',
    recipient: teacherUser.email,
    sent_by: adminId,
  }))
  await supabase.from('teacher_document_alert_log' as any).insert(logRows as any)

  return { teacher_user_id: teacherUserId, success: true, sentTo: teacherUser.email, documentsCount: labels.length }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, organization_id, full_name')
      .eq('id', user.id)
      .single()

    if (!userData || !ADMIN_ROLES.includes(userData.role ?? '')) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }
    if (!userData.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 400 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', userData.organization_id)
      .single()
    const organizationName = org?.name ?? 'Votre organisme de formation'

    const body = await request.json()

    // Relance groupée : { relances: [{ teacher_user_id, required_document_type_ids }, ...] }
    if (Array.isArray(body.relances)) {
      const relances = body.relances as RelanceRequest[]
      if (relances.length === 0) {
        return NextResponse.json({ error: 'Aucune relance à envoyer' }, { status: 400 })
      }

      const outcomes: RelanceOutcome[] = []
      for (const relance of relances) {
        try {
          outcomes.push(await sendOneRelance(supabase, userData.organization_id, organizationName, userData.id, relance))
        } catch (err) {
          logger.error('Erreur relance groupée (un formateur)', sanitizeError(err), { teacherUserId: relance.teacher_user_id })
          outcomes.push({ teacher_user_id: relance.teacher_user_id, success: false, error: 'Erreur serveur' })
        }
      }

      const sent = outcomes.filter(o => o.success).length
      const errors = outcomes.filter(o => !o.success).length
      return NextResponse.json({ success: true, sent, errors, outcomes })
    }

    // Relance simple (formulaire existant) : { teacher_user_id, required_document_type_ids }
    const outcome = await sendOneRelance(supabase, userData.organization_id, organizationName, userData.id, {
      teacher_user_id: body.teacher_user_id,
      required_document_type_ids: body.required_document_type_ids ?? [],
    })

    if (!outcome.success) {
      return NextResponse.json({ error: outcome.error }, { status: 400 })
    }
    return NextResponse.json({ success: true, sentTo: outcome.sentTo, documentsCount: outcome.documentsCount })
  } catch (error: unknown) {
    logger.error('Erreur relance documents formateur', sanitizeError(error))
    return NextResponse.json({ error: getPublicErrorMessage(error) }, { status: 500 })
  }
}
