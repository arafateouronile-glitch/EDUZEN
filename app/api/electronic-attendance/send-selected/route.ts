import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ElectronicAttendanceService } from '@/lib/services/electronic-attendance.service'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/electronic-attendance/send-selected
 * Envoie les emails d'émargement aux apprenants sélectionnés (avec message optionnel).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { attendanceSessionId, learnerIds, customMessage } = body as {
      attendanceSessionId: string
      learnerIds: string[]
      customMessage?: string
    }

    if (!attendanceSessionId || !Array.isArray(learnerIds) || learnerIds.length === 0) {
      return NextResponse.json(
        { error: 'attendanceSessionId et learnerIds sont requis' },
        { status: 400 }
      )
    }

    const service = new ElectronicAttendanceService(supabase)
    const result = await service.sendSelectedEmails(attendanceSessionId, learnerIds, customMessage)

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Erreur send-selected:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
