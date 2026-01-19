import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ComplianceAlertsService } from '@/lib/services/compliance-alerts.service'

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

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const complianceAlertsService = new ComplianceAlertsService(supabase)
    const results = await complianceAlertsService.runAllChecks(userData.organization_id)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error: unknown) {
    console.error('Error checking compliance alerts:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
