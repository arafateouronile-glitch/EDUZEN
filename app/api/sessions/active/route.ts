import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withQueryValidation, paginationSchema } from '@/lib/utils/api-validation'
import { errorHandler, AppError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  return withQueryValidation(request, paginationSchema, async (req, data) => {
    try {
      const { limit = 10 } = data
      const supabase = createAdminClient()

      // Récupérer les sessions actives (exemple basique)
      // NOTE: Logique basique implémentée - Peut être étendue selon les besoins spécifiques
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'ongoing')
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
