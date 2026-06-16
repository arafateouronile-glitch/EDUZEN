import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSecureErrorResponse } from '@/lib/utils/api-error-response'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { NotificationService } from '@/lib/services/notification.service'
import type { Json } from '@/types/database.types'

const VALID_REQUEST_TYPES = ['formation', 'bilan_competences', 'vae', 'autre'] as const
const VALID_URGENCY = ['normal', 'urgent', 'very_urgent'] as const
const VALID_FORMATS = ['présentiel', 'distanciel', 'hybride'] as const
const VALID_FUNDING = ['opco', 'cpf', 'entreprise', 'autre'] as const
const VALID_STATUS = ['all', 'pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'] as const

function validatePostBody(raw: unknown): { ok: true; body: Record<string, unknown> } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Corps de requête invalide' }
  }
  const b = raw as Record<string, unknown>

  if (typeof b.title !== 'string' || b.title.trim().length === 0) {
    return { ok: false, error: 'Le titre est requis' }
  }
  if (b.title.length > 255) {
    return { ok: false, error: 'Titre trop long (max 255 caractères)' }
  }
  if (!VALID_REQUEST_TYPES.includes(b.request_type as typeof VALID_REQUEST_TYPES[number])) {
    return { ok: false, error: `Type invalide. Valeurs : ${VALID_REQUEST_TYPES.join(', ')}` }
  }
  if (b.description != null && (typeof b.description !== 'string' || b.description.length > 5000)) {
    return { ok: false, error: 'Description trop longue (max 5000 caractères)' }
  }
  if (b.employee_ids != null) {
    if (!Array.isArray(b.employee_ids)) return { ok: false, error: 'employee_ids doit être un tableau' }
    if (b.employee_ids.length > 500) return { ok: false, error: 'employee_ids : maximum 500 participants' }
    if (!b.employee_ids.every(id => typeof id === 'string' && /^[0-9a-f-]{1,36}$/i.test(id))) {
      return { ok: false, error: 'employee_ids : identifiants invalides' }
    }
  }
  if (b.attachments != null) {
    if (!Array.isArray(b.attachments)) return { ok: false, error: 'attachments doit être un tableau' }
    if (b.attachments.length > 20) return { ok: false, error: 'Maximum 20 pièces jointes' }
  }
  if (b.metadata != null) {
    if (typeof b.metadata !== 'object' || Array.isArray(b.metadata)) {
      return { ok: false, error: 'metadata doit être un objet' }
    }
    if (JSON.stringify(b.metadata).length > 5000) {
      return { ok: false, error: 'metadata trop volumineux (max 5 Ko)' }
    }
  }
  if (b.number_of_participants != null) {
    const n = Number(b.number_of_participants)
    if (!Number.isInteger(n) || n < 1 || n > 10000) {
      return { ok: false, error: 'Nombre de participants invalide (1–10 000)' }
    }
  }
  if (b.urgency != null && !VALID_URGENCY.includes(b.urgency as typeof VALID_URGENCY[number])) {
    return { ok: false, error: `Urgence invalide. Valeurs : ${VALID_URGENCY.join(', ')}` }
  }
  if (b.preferred_format != null && !VALID_FORMATS.includes(b.preferred_format as typeof VALID_FORMATS[number])) {
    return { ok: false, error: `Format invalide. Valeurs : ${VALID_FORMATS.join(', ')}` }
  }
  if (b.funding_type != null && !VALID_FUNDING.includes(b.funding_type as typeof VALID_FUNDING[number])) {
    return { ok: false, error: `Type de financement invalide. Valeurs : ${VALID_FUNDING.join(', ')}` }
  }

  return { ok: true, body: b }
}

/**
 * GET /api/enterprise/training-requests
 * Get training requests for the current user's company
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createSecureErrorResponse(new Error('Unauthorized'), { status: 401 })
    }

    // Get manager's company
    const { data: manager } = await supabase
      .from('company_managers')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!manager) {
      return createSecureErrorResponse(new Error('No company found for this user'), { status: 403 })
    }

    const url = new URL(request.url)
    const statusParam = url.searchParams.get('status') || 'all'
    const status = VALID_STATUS.includes(statusParam as typeof VALID_STATUS[number]) ? statusParam : 'all'
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '20')), 100)
    const offset = (page - 1) * limit

    let query = supabase
      .from('training_requests')
      .select(`
        *,
        requested_by_manager:company_managers!training_requests_requested_by_fkey (
          first_name,
          last_name,
          email
        ),
        formation:formations (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('company_id', manager.company_id)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logger.error('Error fetching training requests', { error })
      return createSecureErrorResponse(new Error('Failed to fetch training requests'), { status: 500 })
    }

    return NextResponse.json({
      requests: data || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    logger.error('Error in training requests GET', { error })
    return createSecureErrorResponse(new Error('Internal server error'), { status: 500 })
  }
}

/**
 * POST /api/enterprise/training-requests
 * Create a new training request
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createSecureErrorResponse(new Error('Unauthorized'), { status: 401 })
    }

    // Get manager info
    const { data: manager } = await supabase
      .from('company_managers')
      .select('id, company_id, can_request_training')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!manager) {
      return createSecureErrorResponse(new Error('No company found for this user'), { status: 403 })
    }

    if (!manager.can_request_training) {
      return createSecureErrorResponse(new Error('You do not have permission to create training requests'), { status: 403 })
    }

    const raw = await request.json()
    const validation = validatePostBody(raw)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const body = validation.body

    const { data, error } = await supabase
      .from('training_requests')
      .insert({
        company_id: manager.company_id,
        requested_by: manager.id,
        request_type: body.request_type as string,
        title: (body.title as string).trim(),
        description: (body.description as string | null | undefined) ?? null,
        formation_id: (body.formation_id as string | null | undefined) ?? null,
        employee_ids: (body.employee_ids as string[]) ?? [],
        number_of_participants: Number(body.number_of_participants) || 1,
        preferred_start_date: (body.preferred_start_date as string) ?? null,
        preferred_end_date: (body.preferred_end_date as string) ?? null,
        preferred_format: (body.preferred_format as string) ?? null,
        budget_range: (body.budget_range as string) ?? null,
        funding_type: (body.funding_type as string) ?? null,
        opco_pre_approved: Boolean(body.opco_pre_approved),
        urgency: (body.urgency as string) ?? 'normal',
        status: 'pending',
        attachments: ((body.attachments ?? []) as unknown) as Json,
        metadata: ((body.metadata ?? {}) as unknown) as Json,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating training request', { error })
      return createSecureErrorResponse(new Error('Failed to create training request'), { status: 500 })
    }

    // Send notification to organization admins
    try {
      // Get company info for notification
      const { data: company } = await supabase
        .from('companies')
        .select('organization_id, name')
        .eq('id', manager.company_id)
        .single()

      if (company?.organization_id) {
        // Get admin users for this organization
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('organization_id', company.organization_id)
          .in('role', ['admin', 'super_admin'])

        if (admins && admins.length > 0) {
          const notificationService = new NotificationService(supabase)
          await notificationService.createForUsers(
            admins.map(a => a.id),
            company.organization_id,
            'system',
            'Nouvelle demande de formation',
            `${company.name} a soumis une demande de formation: "${body.title}"`,
            { request_id: data.id, company_id: manager.company_id },
            `/dashboard/enterprise/requests/${data.id}`
          )
        }
      }
    } catch (notifError) {
      // Don't fail the request if notification fails
      logger.warn('Failed to send notification for training request', {
        error: sanitizeError(notifError),
        requestId: data.id,
      })
    }

    return NextResponse.json({ request: data }, { status: 201 })
  } catch (error) {
    logger.error('Error in training requests POST', { error })
    return createSecureErrorResponse(new Error('Internal server error'), { status: 500 })
  }
}
