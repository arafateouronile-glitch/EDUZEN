import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ElectronicAttendanceService } from '@/lib/services/electronic-attendance.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * GET /api/electronic-attendance/public/[token]
 * Récupère une demande d'émargement par son token (endpoint public)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()
    const electronicAttendanceService = new ElectronicAttendanceService(supabase)
    const attendanceRequest = await electronicAttendanceService.getAttendanceRequestByToken(token)

    return NextResponse.json(attendanceRequest)
  } catch (error) {
    logger.error('Erreur lors de la récupération de la demande d\'émargement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
