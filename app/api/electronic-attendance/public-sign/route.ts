import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { ElectronicAttendanceService } from '@/lib/services/electronic-attendance.service'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/electronic-attendance/public-sign
 * Soumet une signature depuis la page publique /p/[token].
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, learnerId, signatureData } = body as {
      token: string
      learnerId: string
      signatureData: string
    }

    if (!token || !learnerId || !signatureData) {
      return NextResponse.json(
        { error: 'token, learnerId et signatureData sont requis' },
        { status: 400 }
      )
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null

    const supabase = createServiceRoleClient()
    const service = new ElectronicAttendanceService(supabase)

    const result = await service.submitPublicEmargement(token, learnerId, signatureData, ipAddress)
    return NextResponse.json(result)
  } catch (error) {
    logger.error('Erreur public-sign:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
