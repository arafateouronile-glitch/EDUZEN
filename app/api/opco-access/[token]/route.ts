import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSecureErrorResponse } from '@/lib/utils/api-error-response'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/opco-access/[token]
 * Public endpoint for OPCO to access shared documents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Get the share link
    const { data: shareLink, error: linkError } = await supabase
      .from('opco_share_links')
      .select(`
        *,
        company:companies (
          id,
          name,
          siren,
          opco_name
        )
      `)
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (linkError || !shareLink) {
      return createSecureErrorResponse(new Error('Share link not found or expired'), { status: 404 })
    }

    // Check if expired
    if (new Date(shareLink.expires_at) < new Date()) {
      return createSecureErrorResponse(new Error('This share link has expired'), { status: 410 })
    }

    // Check max access count
    if (shareLink.max_access_count && shareLink.access_count >= shareLink.max_access_count) {
      return createSecureErrorResponse(new Error('Maximum access count reached'), { status: 429 })
    }

    // Update access count and last accessed
    await supabase
      .from('opco_share_links')
      .update({
        access_count: (shareLink.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString(),
        last_accessed_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      })
      .eq('id', shareLink.id)

    // Get company employees
    type EmployeeWithStudent = { id: string; student_id: string; employee_number?: string; department?: string; job_title?: string; student?: { first_name?: string; last_name?: string } }
    const { data: employees } = await supabase
      .from('company_employees')
      .select(`
        id,
        student_id,
        employee_number,
        department,
        job_title,
        student:students (
          id,
          first_name,
          last_name
        )
      `)
      .eq('company_id', shareLink.company_id)
      .eq('is_active', true)

    if (!employees || employees.length === 0) {
      return NextResponse.json({
        shareLink: {
          title: shareLink.title,
          description: shareLink.description,
          company: shareLink.company,
          expires_at: shareLink.expires_at,
        },
        documents: [],
        employees: [],
      })
    }

    const studentIds = (employees as Array<{ student_id: string }>).map((e) => e.student_id)

    // Get documents based on allowed types
    let documentsQuery = supabase
      .from('learner_documents')
      .select(`
        id,
        document_type,
        file_url,
        file_name,
        status,
        created_at,
        student:students (
          id,
          first_name,
          last_name
        )
      `)
      .in('student_id', studentIds)
      .eq('status', 'sent')

    // Filter by document types if specified
    if (shareLink.document_types && shareLink.document_types.length > 0) {
      documentsQuery = documentsQuery.in('document_type', shareLink.document_types)
    }

    const { data: documents } = await documentsQuery.order('created_at', { ascending: false })

    // Get invoices if accessible
    let invoices: unknown[] = []
    if (!shareLink.document_types || shareLink.document_types.length === 0 || shareLink.document_types.includes('invoice')) {
      let invoicesQuery = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          currency,
          status,
          issue_date,
          pdf_url,
          student:students (
            id,
            first_name,
            last_name
          )
        `)
        .in('student_id', studentIds)
        .eq('status', 'paid')

      // Filter by specific invoice IDs if specified
      if (shareLink.invoice_ids && shareLink.invoice_ids.length > 0) {
        invoicesQuery = invoicesQuery.in('id', shareLink.invoice_ids)
      }

      const { data: invoicesData } = await invoicesQuery.order('issue_date', { ascending: false })
      invoices = invoicesData || []
    }

    return NextResponse.json({
      shareLink: {
        title: shareLink.title,
        description: shareLink.description,
        company: shareLink.company,
        expires_at: shareLink.expires_at,
      },
      documents: documents || [],
      invoices,
      employees: (employees as Array<{ id: string; employee_number: string | null; department: string | null; job_title: string | null; student: { first_name: string; last_name: string } }>).map((e) => ({
        id: e.id,
        employee_number: e.employee_number ?? undefined,
        department: e.department ?? undefined,
        job_title: e.job_title ?? undefined,
        name: e.student ? `${e.student.first_name ?? ''} ${e.student.last_name ?? ''}`.trim() || 'N/A' : 'N/A',
      })),
    })
  } catch (error) {
    logger.error('Error in OPCO access GET', { error })
    return createSecureErrorResponse(new Error('Internal server error'), { status: 500 })
  }
}
