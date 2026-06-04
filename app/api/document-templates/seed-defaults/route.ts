import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { seedDefaultTemplatesForOrg } from '@/lib/utils/seed-default-templates'
import { logger } from '@/lib/utils/logger'

// POST /api/document-templates/seed-defaults - Crée tous les templates par défaut
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    const result = await seedDefaultTemplatesForOrg(supabase, userData.organization_id)

    return NextResponse.json({
      success: true,
      summary: {
        created: result.created,
        skipped: result.skipped,
        errors: result.errors,
      },
    })
  } catch (error) {
    logger.error('Erreur lors de la création des templates par défaut:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
