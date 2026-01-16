import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncAllComplianceControls } from '@/lib/integrations/compliance-integrations'

/**
 * POST /api/compliance/sync-controls
 * Synchronise les contrôles de conformité avec les systèmes existants (2FA, SSO, etc.)
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

    const results = await syncAllComplianceControls(userData.organization_id)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error: unknown) {
    console.error('Error syncing compliance controls:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
