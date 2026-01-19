import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ElectronicAttendanceService } from '@/lib/services/electronic-attendance.service'

/**
 * GET /api/electronic-attendance/sessions
 * Récupère les sessions d'émargement pour une organisation
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer l'organization_id de l'utilisateur
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier les permissions
    if (!['admin', 'secretary', 'teacher'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as 'draft' | 'active' | 'closed' | 'cancelled' | null
    const date = searchParams.get('date')
    const sessionId = searchParams.get('sessionId')

    // Requête directe avec le client serveur
    let query = supabase
      .from('electronic_attendance_sessions')
      .select(`
        *,
        session:sessions(id, title),
        requests:electronic_attendance_requests(
          id,
          student_name,
          student_email,
          status,
          signed_at,
          location_verified
        )
      `)
      .eq('organization_id', userData.organization_id)
      .order('date', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (date) {
      query = query.eq('date', date)
    }

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data: sessions, error: sessionsError } = await query

    if (sessionsError) {
      // Gérer le cas où la table n'existe pas encore
      if (sessionsError.code === '42P01' || sessionsError.message?.includes('does not exist')) {
        console.warn('Table electronic_attendance_sessions does not exist yet')
        return NextResponse.json([])
      }
      // Gérer le cas où la relation n'existe pas ou échoue
      if (sessionsError.code === 'PGRST200' || sessionsError.code === 'PGRST116' || sessionsError.message?.includes('relationship') || sessionsError.message?.includes('column')) {
        console.warn('Relationship error in electronic_attendance_sessions query:', sessionsError.message)
        // Essayer une requête sans les relations
        try {
          const { data: basicSessions, error: basicError } = await supabase
            .from('electronic_attendance_sessions')
            .select('*')
            .eq('organization_id', userData.organization_id)
            .order('date', { ascending: false })
          
          if (basicError) {
            // Si même la requête basique échoue, retourner un tableau vide
            console.warn('Basic query also failed:', basicError.message)
            return NextResponse.json([])
          }
          return NextResponse.json(basicSessions || [])
        } catch (fallbackError) {
          console.warn('Fallback query failed:', fallbackError)
          return NextResponse.json([])
        }
      }
      // Pour toute autre erreur, logger et retourner un tableau vide
      console.warn('Error fetching electronic attendance sessions:', sessionsError.message)
      return NextResponse.json([])
    }

    return NextResponse.json(sessions || [])
  } catch (error) {
    console.error('Erreur lors de la récupération des sessions d\'émargement:', error)
    
    // Toujours retourner un tableau vide pour éviter les erreurs 500
    // qui bloquent le rendu de la page
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.warn('Returning empty array due to error:', errorMessage)
    return NextResponse.json([])
  }
}

/**
 * POST /api/electronic-attendance/sessions
 * Crée une session d'émargement
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer l'organization_id de l'utilisateur
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier les permissions
    if (!['admin', 'secretary', 'teacher'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Créer une instance du service avec le client serveur
    const electronicAttendanceService = new ElectronicAttendanceService(supabase)

    const attendanceSession = await electronicAttendanceService.createAttendanceSession({
      sessionId: body.sessionId,
      organizationId: userData.organization_id,
      title: body.title,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      mode: body.mode,
      requireSignature: body.requireSignature,
      requireGeolocation: body.requireGeolocation,
      allowedRadiusMeters: body.allowedRadiusMeters,
      qrCodeEnabled: body.qrCodeEnabled,
      latitude: body.latitude,
      longitude: body.longitude,
      locationName: body.locationName,
      opensAt: body.opensAt,
      closesAt: body.closesAt,
    })

    return NextResponse.json(attendanceSession, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de la session d\'émargement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
