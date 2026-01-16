import { NextRequest, NextResponse } from 'next/server'
import { electronicAttendanceService } from '@/lib/services/electronic-attendance.service'

/**
 * GET /api/electronic-attendance/public/[token]
 * Récupère une demande d'émargement par son token (endpoint public)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const attendanceRequest = await electronicAttendanceService.getAttendanceRequestByToken(params.token)

    return NextResponse.json(attendanceRequest)
  } catch (error) {
    console.error('Erreur lors de la récupération de la demande d\'émargement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
