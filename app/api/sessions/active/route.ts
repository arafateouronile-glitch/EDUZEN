import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withQueryValidation, paginationSchema } from '@/lib/utils/api-validation'
import { errorHandler, AppError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  return withQueryValidation(request, paginationSchema, async (req, data) => {
    try {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }

      const { data: userRow } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      const userOrgId = userRow?.organization_id
      if (!userOrgId) {
        return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
      }

      const { limit = 10 } = data
      const adminSupabase = createAdminClient()

      // Récupérer les sessions actives de l'organisation de l'utilisateur uniquement
      const { data: sessions, error } = await adminSupabase
        .from('sessions')
        .select('*')
        .eq('status', 'ongoing')
        .eq('organization_id', userOrgId)
        .limit(Number(limit))

      if (error) {
        throw errorHandler.handleError(error, {
          operation: 'getActiveSessions',
        })
      }

      return NextResponse.json({ sessions: sessions || [] })
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getActiveSessions',
      })
    }
  })
}
