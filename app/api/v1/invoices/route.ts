import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiMiddleware, hasScope } from '../middleware'
import { createAPIService } from '@/lib/services/api.service'
import { InvoiceService } from '@/lib/services/invoice.service'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/v1/invoices
 * Liste les factures/devis de l'organisation
 * Filtrables par enrollment_id, student_id, document_type, status
 */
export async function GET(request: NextRequest) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) return middleware

    if (!hasScope(middleware.scopes, 'read:invoices') && !hasScope(middleware.scopes, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to read invoices' },
        { status: 403 }
      )
    }

    const startTime = Date.now()
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50') || 50), 100)
    const offset = (page - 1) * limit
    const enrollmentId = searchParams.get('enrollment_id') || undefined
    const studentId = searchParams.get('student_id') || undefined
    const documentType = searchParams.get('document_type') || undefined
    const status = searchParams.get('status') || undefined

    const adminClient = createAdminClient()
    const apiService = createAPIService(adminClient)

    let query = adminClient
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('organization_id', middleware.organizationId)

    if (enrollmentId) query = query.eq('enrollment_id', enrollmentId)
    if (studentId) query = query.eq('student_id', studentId)
    if (documentType) query = query.eq('document_type', documentType)
    if (status) query = query.eq('status', status)

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw new Error(error.message)

    const responseTime = Date.now() - startTime

    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'GET',
      '/api/v1/invoices',
      request.nextUrl.pathname,
      200,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      Object.fromEntries(searchParams)
    )

    return NextResponse.json(
      { data: data ?? [], meta: { page, limit, total: count ?? 0 } },
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

/**
 * POST /api/v1/invoices
 * Crée une facture ou un devis lié à une inscription (enrollment_id)
 * Le numéro (FAC-YYYY-NNN / DEV-YYYY-NNN) est généré automatiquement.
 *
 * Body:
 *   enrollment_id: string          — lie le document à une inscription (session + apprenant)
 *   document_type: 'invoice' | 'quote'   (défaut: 'invoice')
 *   amount: number                 — montant HT
 *   total_amount?: number          — montant TTC (défaut: amount)
 *   tax_amount?: number            (défaut: 0)
 *   currency?: string              (défaut: 'EUR')
 *   status?: string                (défaut: 'draft')
 *   due_date?: string              ISO — date d'échéance (défaut: +30 jours)
 *   issue_date?: string            ISO (défaut: aujourd'hui)
 *   notes?: string
 *   items?: object[]               — lignes de détail
 *   pdf_url?: string               — URL du PDF généré (depuis documents/generate)
 *   document_id?: string           — ID du document généré (pour traçabilité)
 */
export async function POST(request: NextRequest) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) return middleware

    if (!hasScope(middleware.scopes, 'write:invoices') && !hasScope(middleware.scopes, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to create invoices' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      enrollment_id,
      document_type = 'invoice',
      amount,
      total_amount,
      tax_amount,
      currency = 'EUR',
      status = 'draft',
      due_date,
      issue_date,
      notes,
      items,
      pdf_url,
      document_id,
    } = body

    if (!enrollment_id) return NextResponse.json({ error: 'enrollment_id is required' }, { status: 400 })
    if (amount === undefined || amount === null) return NextResponse.json({ error: 'amount is required' }, { status: 400 })
    if (!['invoice', 'quote'].includes(document_type)) {
      return NextResponse.json({ error: 'document_type must be "invoice" or "quote"' }, { status: 400 })
    }

    const startTime = Date.now()
    const adminClient = createAdminClient()
    const invoiceService = new InvoiceService(adminClient)
    const apiService = createAPIService(adminClient)

    // Vérifier que l'enrollment appartient à l'organisation
    const { data: enrollment } = await adminClient
      .from('enrollments')
      .select('id, student_id, sessions!inner(organization_id)')
      .eq('id', enrollment_id)
      .single()

    const enrollmentSession = enrollment?.sessions as { organization_id: string } | null
    if (!enrollment || enrollmentSession?.organization_id !== middleware.organizationId) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    const effectiveDueDate = due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const effectiveAmount = Number(amount)
    const effectiveTotalAmount = total_amount !== undefined ? Number(total_amount) : effectiveAmount

    const invoice = await invoiceService.create({
      organization_id: middleware.organizationId,
      enrollment_id,
      student_id: enrollment.student_id,
      document_type,
      invoice_number: '',
      type: document_type === 'quote' ? 'devis' : 'facture',
      amount: effectiveAmount,
      total_amount: effectiveTotalAmount,
      tax_amount: tax_amount !== undefined ? Number(tax_amount) : 0,
      currency,
      status,
      due_date: effectiveDueDate,
      issue_date: issue_date || new Date().toISOString(),
      notes: notes || null,
      items: items || null,
      pdf_url: pdf_url || null,
    })

    const responseTime = Date.now() - startTime

    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'POST',
      '/api/v1/invoices',
      request.nextUrl.pathname,
      201,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      { enrollment_id, document_type }
    )

    return NextResponse.json(
      { data: invoice },
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
