import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { electronicAttendanceService } from '@/lib/services/electronic-attendance.service'

/**
 * GET /api/electronic-attendance/sessions/[id]
 * Récupère une session d'émargement par son ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const session = await electronicAttendanceService.getAttendanceSessionById(params.id)

    return NextResponse.json(session)
  } catch (error) {
    console.error('Erreur lors de la récupération de la session d\'émargement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/electronic-attendance/sessions/[id]
 * Met à jour une session d'émargement (lancer, fermer, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, sendEmails } = body

    if (action === 'launch') {
      const result = await electronicAttendanceService.launchAttendanceSession(
        params.id,
        sendEmails !== false
      )
      return NextResponse.json(result)
    }

    if (action === 'close') {
      const result = await electronicAttendanceService.closeAttendanceSession(params.id)
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'Action non reconnue' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la session d\'émargement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
