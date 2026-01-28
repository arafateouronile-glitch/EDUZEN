import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSecureErrorResponse } from '@/lib/utils/api-error-response'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { NotificationService } from '@/lib/services/notification.service'

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
    const { data: manager } = await (supabase
      .from('company_managers' as any)
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single() as any)

    if (!manager) {
      return createSecureErrorResponse(new Error('No company found for this user'), { status: 403 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'all'
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query: any = supabase
      .from('training_requests' as any)
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

    const { data, count, error } = await (query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1) as any)

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
    const { data: manager } = await (supabase
      .from('company_managers' as any)
      .select('id, company_id, can_request_training')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single() as any)

    if (!manager) {
      return createSecureErrorResponse(new Error('No company found for this user'), { status: 403 })
    }

    if (!manager.can_request_training) {
      return createSecureErrorResponse(new Error('You do not have permission to create training requests'), { status: 403 })
    }

    const body = await request.json()

    const { data, error } = await (supabase
      .from('training_requests' as any)
      .insert({
        company_id: manager.company_id,
        requested_by: manager.id,
        request_type: body.request_type,
        title: body.title,
        description: body.description,
        formation_id: body.formation_id,
        employee_ids: body.employee_ids || [],
        number_of_participants: body.number_of_participants || 1,
        preferred_start_date: body.preferred_start_date,
        preferred_end_date: body.preferred_end_date,
        preferred_format: body.preferred_format,
        budget_range: body.budget_range,
        funding_type: body.funding_type,
        opco_pre_approved: body.opco_pre_approved || false,
        urgency: body.urgency || 'normal',
        status: 'pending',
        attachments: body.attachments || [],
        metadata: body.metadata || {},
      })
      .select()
      .single() as any)

    if (error) {
      logger.error('Error creating training request', { error })
      return createSecureErrorResponse(new Error('Failed to create training request'), { status: 500 })
    }

    // Send notification to organization admins
    try {
      // Get company info for notification
      const { data: company } = await (supabase
        .from('companies' as any)
        .select('organization_id, name')
        .eq('id', manager.company_id)
        .single() as any)

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
