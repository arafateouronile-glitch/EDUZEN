import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiMiddleware, hasScope } from '../middleware'
import { createAPIService } from '@/lib/services/api.service'
import { SignatureRequestService } from '@/lib/services/signature-request.service'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URLS } from '@/lib/config/app-config'

/**
 * GET /api/v1/signature-requests
 * Liste les demandes de signature de l'organisation
 */
export async function GET(request: NextRequest) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) return middleware

    if (!hasScope(middleware.scopes, 'read:signatures') && !hasScope(middleware.scopes, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to read signature requests' },
        { status: 403 }
      )
    }

    const startTime = Date.now()
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as 'pending' | 'signed' | 'expired' | 'declined' | 'cancelled' | null
    const recipientType = searchParams.get('recipient_type') as 'student' | 'funder' | 'teacher' | 'other' | null

    const adminClient = createAdminClient()
    const signatureService = new SignatureRequestService(adminClient)
    const apiService = createAPIService(adminClient)

    const data = await signatureService.getSignatureRequestsByOrganization(middleware.organizationId, {
      status: status || undefined,
      recipientType: recipientType || undefined,
    })

    const responseTime = Date.now() - startTime

    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'GET',
      '/api/v1/signature-requests',
      request.nextUrl.pathname,
      200,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      Object.fromEntries(searchParams)
    )

    return NextResponse.json(
      { data, meta: { total: data.length } },
      {
        headers: {
          'X-RateLimit-Remaining': middleware.rateLimit.remaining.toString(),
          'X-RateLimit-Reset': middleware.rateLimit.resetAt.toISOString(),
        },
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: 'Internal server error', message: errorMessage }, { status: 500 })
  }
}

// Helper — génère un token de signature unique
function generateSignatureToken(): string {
  const ts = Date.now().toString(36)
  const r1 = Math.random().toString(36).substring(2, 15)
  const r2 = Math.random().toString(36).substring(2, 15)
  return `${ts}-${r1}-${r2}`
}

// Helper — crée une demande de signature sans session utilisateur (contexte API key)
async function createOne(params: {
  adminClient: ReturnType<typeof createAdminClient>
  organizationId: string
  documentId: string
  documentTitle: string
  recipientEmail: string
  recipientName: string
  recipientType: 'student' | 'funder' | 'teacher' | 'other'
  recipientId?: string
  subject?: string
  message?: string
  expiresAt?: string
  organizationName: string | null
}) {
  const token = generateSignatureToken()
  const expiresAt = params.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const baseUrl = APP_URLS.getBaseUrl()
  const signatureUrl = `${baseUrl}/sign/${token}`

  const { data, error } = await params.adminClient
    .from('signature_requests')
    .insert({
      document_id: params.documentId,
      organization_id: params.organizationId,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      recipient_type: params.recipientType,
      recipient_id: params.recipientId || null,
      subject: params.subject || `Demande de signature : ${params.documentTitle}`,
      message: params.message || null,
      status: 'pending',
      signature_token: token,
      expires_at: expiresAt,
      requires_notarization: false,
      reminder_frequency: 'none',
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  const expirationDate = new Date(expiresAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  await sendEmailViaResend({
    to: params.recipientEmail,
    subject: params.subject || `Demande de signature : ${params.documentTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#335ACF;color:white;padding:24px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="margin:0;font-size:22px">Demande de signature électronique</h1>
        </div>
        <div style="padding:24px;background:#f9fafb;border:1px solid #e5e7eb">
          <p>Bonjour ${params.recipientName},</p>
          <p>${params.organizationName || 'Une organisation'} vous demande de signer le document <strong>${params.documentTitle}</strong>.</p>
          ${params.message ? `<p style="background:white;padding:12px;border-left:4px solid #335ACF;border-radius:4px">${params.message}</p>` : ''}
          <p>Ce lien expire le <strong>${expirationDate}</strong>.</p>
          <div style="text-align:center;margin:24px 0">
            <a href="${signatureUrl}" style="background:#335ACF;color:white;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
              Signer le document
            </a>
          </div>
          <p style="color:#6b7280;font-size:12px">Ou copiez ce lien : ${signatureUrl}</p>
        </div>
      </div>`,
    text: `Bonjour ${params.recipientName},\n\n${params.organizationName || 'Une organisation'} vous demande de signer : ${params.documentTitle}\n\nLien de signature : ${signatureUrl}\n\nExpire le : ${expirationDate}`,
  })

  return data
}

/**
 * POST /api/v1/signature-requests
 * Crée une ou plusieurs demandes de signature et envoie les emails
 *
 * Body (envoi unique):
 *   document_id: string
 *   recipient_email: string
 *   recipient_name: string
 *   recipient_type: 'student' | 'funder' | 'teacher' | 'other'
 *   recipient_id?: string
 *   subject?: string
 *   message?: string
 *   expires_at?: string (ISO)
 *
 * Body (envoi multiple):
 *   document_id: string
 *   recipients: Array<{ email, name, type, id? }>
 *   subject?: string
 *   message?: string
 *   expires_at?: string
 */
export async function POST(request: NextRequest) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) return middleware

    if (!hasScope(middleware.scopes, 'write:signatures') && !hasScope(middleware.scopes, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to create signature requests' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { document_id, recipient_email, recipient_name, recipient_type, recipient_id, subject, message, expires_at, recipients } = body

    if (!document_id) return NextResponse.json({ error: 'document_id is required' }, { status: 400 })

    const adminClient = createAdminClient()
    const apiService = createAPIService(adminClient)

    // Vérifier que le document appartient à l'organisation
    const { data: doc } = await adminClient
      .from('documents')
      .select('id, title, organization_id')
      .eq('id', document_id)
      .single()

    if (!doc || doc.organization_id !== middleware.organizationId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Récupérer le nom de l'organisation pour l'email
    const { data: org } = await adminClient
      .from('organizations')
      .select('name')
      .eq('id', middleware.organizationId)
      .single()

    const startTime = Date.now()
    const documentTitle = doc.title || 'Document'
    const orgName = org?.name || null

    let result: unknown

    if (recipients && Array.isArray(recipients) && recipients.length > 0) {
      if (recipients.length > 20) {
        return NextResponse.json({ error: 'Maximum 20 recipients per request' }, { status: 400 })
      }
      const settled = await Promise.allSettled(
        recipients.map((r: { email: string; name: string; type: 'student' | 'funder' | 'teacher' | 'other'; id?: string }) =>
          createOne({
            adminClient,
            organizationId: middleware.organizationId,
            documentId: document_id,
            documentTitle,
            recipientEmail: r.email,
            recipientName: r.name,
            recipientType: r.type,
            recipientId: r.id,
            subject,
            message,
            expiresAt: expires_at,
            organizationName: orgName,
          })
        )
      )
      result = {
        successful: settled.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<unknown>).value),
        failed: settled.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason?.message),
        total: recipients.length,
      }
    } else {
      if (!recipient_email) return NextResponse.json({ error: 'recipient_email is required' }, { status: 400 })
      if (!recipient_name) return NextResponse.json({ error: 'recipient_name is required' }, { status: 400 })
      if (!recipient_type) return NextResponse.json({ error: 'recipient_type is required' }, { status: 400 })

      result = await createOne({
        adminClient,
        organizationId: middleware.organizationId,
        documentId: document_id,
        documentTitle,
        recipientEmail: recipient_email,
        recipientName: recipient_name,
        recipientType: recipient_type,
        recipientId: recipient_id,
        subject,
        message,
        expiresAt: expires_at,
        organizationName: orgName,
      })
    }

    const responseTime = Date.now() - startTime

    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'POST',
      '/api/v1/signature-requests',
      request.nextUrl.pathname,
      201,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      { document_id, recipient_type }
    )

    return NextResponse.json(
      { data: result },
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': middleware.rateLimit.remaining.toString(),
          'X-RateLimit-Reset': middleware.rateLimit.resetAt.toISOString(),
        },
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: 'Internal server error', message: errorMessage }, { status: 500 })
  }
}
