import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { ComplianceAlertsService } from '@/lib/services/compliance-alerts.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * POST /api/compliance/alerts/check
 * Exécute toutes les vérifications d'alertes de conformité
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
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

    const complianceAlertsService = new ComplianceAlertsService(supabase)
    const results = await complianceAlertsService.runAllChecks(orgId)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error: unknown) {
    logger.error('Error checking compliance alerts:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
