import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiMiddleware, hasScope } from '../../middleware'
import { createAPIService } from '@/lib/services/api.service'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/v1/email/send
 * Envoie un email au nom de l'organisation via Resend
 *
 * Body:
 *   to: string | string[]
 *   subject: string
 *   html?: string
 *   text?: string
 *   cc?: string | string[]
 *   bcc?: string | string[]
 *   reply_to?: string
 */
export async function POST(request: NextRequest) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) return middleware

    if (!hasScope(middleware.scopes, 'send:email') && !hasScope(middleware.scopes, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to send emails' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { to, subject, html, text, cc, bcc, reply_to } = body

    if (!to) return NextResponse.json({ error: 'to is required' }, { status: 400 })
    if (!subject) return NextResponse.json({ error: 'subject is required' }, { status: 400 })
    if (!html && !text) return NextResponse.json({ error: 'html or text is required' }, { status: 400 })

    const startTime = Date.now()
    const adminClient = createAdminClient()
    const apiService = createAPIService(adminClient)

    // Récupérer l'email de l'organisation pour le reply-to
    const { data: org } = await adminClient
      .from('organizations')
      .select('email')
      .eq('id', middleware.organizationId)
      .single()

    const fromAddress = process.env.EMAIL_FROM || 'noreply@eduzen.io'
    const replyTo = reply_to || org?.email || fromAddress
    const recipients = Array.isArray(to) ? to : [String(to)]

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json(
        { error: 'Email service not configured', message: 'RESEND_API_KEY is not set' },
        { status: 503 }
      )
    }

    const { Resend } = await import('resend')
    const resend = new Resend(resendApiKey)

    const { data: emailData, error: resendError } = await resend.emails.send({
      from: fromAddress,
      to: recipients,
      subject: String(subject),
      html: html ? String(html) : undefined,
      text: text ? String(text) : undefined,
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      replyTo: replyTo as string,
    } as any)

    if (resendError) {
      const msg = typeof resendError === 'object' && 'message' in resendError
        ? String((resendError as any).message)
        : 'Erreur envoi email'
      return NextResponse.json({ error: 'Email send failed', message: msg }, { status: 502 })
    }

    const responseTime = Date.now() - startTime

    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'POST',
      '/api/v1/email/send',
      request.nextUrl.pathname,
      200,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      { to: recipients.length, subject }
    )

    return NextResponse.json(
      { data: { id: (emailData as any)?.id, to: recipients } },
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
