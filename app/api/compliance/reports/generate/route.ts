import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ComplianceService } from '@/lib/services/compliance.service'

/**
 * GET /api/compliance/reports/generate
 * Génère un rapport de conformité
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Créer une instance de ComplianceService avec le client serveur
    const complianceService = new ComplianceService(supabase)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { report_type = 'annual', format = 'pdf' } = body

    const report = await complianceService.generateComplianceReport(
      userData.organization_id,
      report_type,
      format
    )

    return NextResponse.json(report)
  } catch (error: unknown) {
    console.error('Error generating compliance report:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
