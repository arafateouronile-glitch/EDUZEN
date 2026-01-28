import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ElectronicAttendanceService } from '@/lib/services/electronic-attendance.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * PATCH /api/electronic-attendance/requests/[id]
 * Met à jour une demande d'émargement (rappel, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    const electronicAttendanceService = new ElectronicAttendanceService(supabase)
    if (action === 'remind') {
      const result = await electronicAttendanceService.sendAttendanceReminder(id)
      return NextResponse.json({ success: result })
    }

    return NextResponse.json(
      { error: 'Action non reconnue' },
      { status: 400 }
    )
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la demande d\'émargement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
