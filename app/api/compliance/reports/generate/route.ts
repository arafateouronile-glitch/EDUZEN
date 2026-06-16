import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { ComplianceService } from '@/lib/services/compliance.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

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

    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { report_type = 'annual', format = 'pdf' } = body

    const report = await complianceService.generateComplianceReport(
      orgId,
      report_type
    )

    return NextResponse.json(report)
  } catch (error: unknown) {
    logger.error('Error generating compliance report:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
