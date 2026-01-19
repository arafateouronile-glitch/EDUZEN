import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ElectronicAttendanceService } from '@/lib/services/electronic-attendance.service'

/**
 * POST /api/electronic-attendance/sign
 * Signe une demande d'émargement électronique (endpoint public)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      token,
      signatureData,
      location,
    } = body

    if (!token || !signatureData) {
      return NextResponse.json(
        { error: 'Token et signature requis' },
        { status: 400 }
      )
    }

    // Récupérer les informations du device
    const deviceInfo = {
      ipAddress: request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    }

    const supabase = await createClient()
    const electronicAttendanceService = new ElectronicAttendanceService(supabase)
    const result = await electronicAttendanceService.signAttendanceRequest(
      token,
      signatureData,
      location,
      deviceInfo
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erreur lors de la signature de l\'émargement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
