import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { NotificationService } from '@/lib/services/notification.service'
import { EMAIL_CONFIG, APP_URLS } from '@/lib/config/app-config'
import { logger, maskEmail, sanitizeError } from '@/lib/utils/logger'
import { getPublicErrorMessage } from '@/lib/utils/api-error-response'

const ADMIN_ROLES = ['super_admin', 'admin', 'secretary']

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

    const body = await request.json()
    const teacherUserId = body.teacher_user_id as string | undefined
    const requiredDocumentTypeIds = (body.required_document_type_ids ?? []) as string[]

    if (!teacherUserId || requiredDocumentTypeIds.length === 0) {
      return NextResponse.json({ error: 'Formateur et documents requis manquants' }, { status: 400 })
    }

    const { data: teacherUser } = await supabase
      .from('users')
      .select('id, email, full_name, organization_id')
      .eq('id', teacherUserId)
      .eq('organization_id', userData.organization_id!)
      .single()

    if (!teacherUser?.email) {
      return NextResponse.json({ error: 'Formateur introuvable dans cette organisation' }, { status: 404 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', userData.organization_id!)
      .single()

    const { data: requiredTypes } = await supabase
      .from('teacher_required_document_types' as any)
      .select('id, label')
      .in('id', requiredDocumentTypeIds)
      .eq('organization_id', userData.organization_id!)

    const labels = ((requiredTypes ?? []) as unknown as { id: string; label: string }[]).map(t => t.label)
    if (labels.length === 0) {
      return NextResponse.json({ error: 'Aucun document requis valide' }, { status: 400 })
    }

    const docsUrl = `${APP_URLS.getBaseUrl()}/dashboard/teacher/documents`

    // Email au formateur
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      const resend = new Resend(resendApiKey)
      const { error: sendError } = await resend.emails.send({
        from: EMAIL_CONFIG.getFromEmail(),
        to: teacherUser.email,
        subject: 'Documents à mettre à jour sur votre espace formateur',
        html: `
          <p>Bonjour ${teacherUser.full_name ?? ''},</p>
          <p>${org?.name ?? 'Votre organisme de formation'} vous informe que les documents suivants doivent être déposés ou renouvelés sur votre espace formateur :</p>
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

    // Notification in-app
    const notificationService = new NotificationService(supabase)
    await notificationService.create({
      user_id: teacherUser.id,
      organization_id: userData.organization_id!,
      type: 'document',
      title: 'Documents à mettre à jour',
      message: `${labels.length} document${labels.length > 1 ? 's' : ''} de conformité à déposer ou renouveler : ${labels.join(', ')}`,
      link: '/dashboard/teacher/documents',
    })

    // Journal des relances (anti-doublon pour le cron, historique pour l'UI)
    const logRows = requiredDocumentTypeIds.map(id => ({
      organization_id: userData.organization_id!,
      teacher_id: teacherUser.id,
      required_document_type_id: id,
      alert_type: 'missing_manual',
      recipient: teacherUser.email,
      sent_by: userData.id,
    }))
    await supabase.from('teacher_document_alert_log' as any).insert(logRows as any)

    return NextResponse.json({ success: true, sentTo: teacherUser.email, documentsCount: labels.length })
  } catch (error: unknown) {
    logger.error('Erreur relance documents formateur', sanitizeError(error))
    return NextResponse.json({ error: getPublicErrorMessage(error) }, { status: 500 })
  }
}
