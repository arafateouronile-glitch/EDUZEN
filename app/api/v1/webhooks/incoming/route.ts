import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiMiddleware, hasScope } from '../../middleware'
import { createAPIService } from '@/lib/services/api.service'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/v1/webhooks/incoming
 * Reçoit un événement d'une application externe et le stocke dans Eduzen.
 *
 * Body:
 *   event: string          — type d'événement (ex: "student.updated", "payment.received")
 *   data: object           — payload de l'événement
 *   source?: string        — nom de l'application source (ex: "formflow", "typeform")
 *   idempotency_key?: string — clé d'idempotence pour éviter les doublons
 */
export async function POST(request: NextRequest) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) return middleware

    if (!hasScope(middleware.scopes, 'write:webhooks') && !hasScope(middleware.scopes, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to send webhook events' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { event, data, source, idempotency_key } = body

    if (!event || typeof event !== 'string') {
      return NextResponse.json({ error: 'event is required and must be a string' }, { status: 400 })
    }
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'data is required and must be an object' }, { status: 400 })
    }

    const startTime = Date.now()
    const adminClient = createAdminClient()
    const apiService = createAPIService(adminClient)

    // Stocker l'événement entrant dans la table webhook_deliveries
    const { data: stored, error } = await adminClient
      .from('webhook_deliveries')
      .insert({
        webhook_id: middleware.key.id, // utilise l'ID de la clé API comme référence
        event_type: event,
        payload: { event, data, source: source || 'external', idempotency_key },
        status: 'received',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)

    const responseTime = Date.now() - startTime

    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'POST',
      '/api/v1/webhooks/incoming',
      request.nextUrl.pathname,
      201,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      { event, source }
    )

    return NextResponse.json(
      { data: { id: stored?.id, event, status: 'received' } },
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
