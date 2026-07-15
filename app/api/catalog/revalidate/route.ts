import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * Force le rafraîchissement immédiat de la page catalogue public après une
 * sauvegarde des paramètres d'apparence — sans ça, la page (ISR, revalidate=60)
 * ne reflète les changements qu'après 60s.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    const { data: organization } = await supabase
      .from('organizations')
      .select('code')
      .eq('id', orgId)
      .maybeSingle()

    if (organization?.code) {
      revalidatePath(`/cataloguepublic/${organization.code}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    logger.error('Erreur revalidation catalogue public', error, { error: sanitizeError(error) })
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
