import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'
import { logger, sanitizeError } from '@/lib/utils/logger'

/** Client Supabase dont .from() accepte un nom de table (ex. vue session_enrollments). */
type FlexibleSupabase = Omit<SupabaseClient<Database>, 'from'> & { from(tableName: string): ReturnType<SupabaseClient<Database>['from']> }

// API route pour récupérer les données de l'espace apprenant
// Supporte à la fois l'authentification normale et l'accès par token
function getAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim()
  const headerToken = request.headers.get('x-learner-access-token')
  if (headerToken) return headerToken.trim()
  const searchParams = new URL(request.url).searchParams
  const fromQuery = searchParams.get('access_token')
  if (fromQuery) return fromQuery.trim()
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dataType = searchParams.get('type') // 'student', 'enrollments', 'courses', etc.
    const accessToken = getAccessToken(request)
    
    logger.info('[API Learner Data] Request:', { dataType, hasToken: !!accessToken })
    
    // Si on a un token d'accès direct, l'utiliser pour valider et récupérer les données
    if (accessToken) {
      // Valider le token d'accès
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!serviceKey) {
        logger.error('[API Learner Data] Missing SUPABASE_SERVICE_ROLE_KEY')
        return NextResponse.json(
          { error: 'Configuration serveur manquante' },
          { status: 500 }
        )
      }
      
      const supabaseAdmin = createAdminClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
      
      logger.info('[API Learner Data] Validating token...')
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .rpc('validate_learner_access_token', {
          p_token: accessToken
        })
      
      if (tokenError) {
        logger.error('[API Learner Data] Token validation error:', tokenError)
        return NextResponse.json(
          { error: 'Erreur de validation du token', details: tokenError.message },
          { status: 401 }
        )
      }
      
      if (!tokenData || !tokenData[0]?.is_valid) {
        logger.error('[API Learner Data] Token invalid:', tokenData)
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        )
      }
      
      const tokenInfo = tokenData[0]
      const studentId = tokenInfo.student_id
      const sessionId = tokenInfo.session_id
      const organizationId = tokenInfo.organization_id
      logger.info('[API Learner Data] Token valid', { studentId, sessionId })

      const ALLOWED_TYPES = ['student', 'enrollments', 'courses', 'documents', 'certificates'] as const
      if (!dataType || !ALLOWED_TYPES.includes(dataType as typeof ALLOWED_TYPES[number])) {
        return NextResponse.json({ error: 'Type de données non supporté' }, { status: 400 })
      }

      // Récupérer les données selon le type demandé
      switch (dataType) {
        case 'student': {
          const { data, error } = await supabaseAdmin
            .from('students')
            .select('id, first_name, last_name, email, phone, photo_url, student_number, status')
            .eq('id', studentId)
            .single()
          
          if (error) {
            logger.error('Error fetching student:', error)
            return NextResponse.json(
              { error: 'Erreur lors de la récupération des données' },
              { status: 500 }
            )
          }
          
          return NextResponse.json({ data })
        }
        
        case 'enrollments': {
          logger.info('[API Learner Data] Fetching enrollments for studentId', { studentId })
          const { data, error } = await (supabaseAdmin as FlexibleSupabase)
            .from('session_enrollments')
            .select(`
              *,
              sessions(
                id,
                name,
                start_date,
                end_date,
                start_time,
                end_time,
                status,
                location,
                capacity_max,
                is_remote,
                formations(
                  id,
                  name,
                  description,
                  duration_hours,
                  price,
                  programs(id, name)
                )
              )
            `)
            .eq('student_id', studentId)
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
          
          if (error) {
            logger.error('[API Learner Data] Error fetching enrollments:', error)
            return NextResponse.json(
              { error: 'Erreur lors de la récupération des inscriptions', details: error.message },
              { status: 500 }
            )
          }
          
          logger.info('[API Learner Data] Enrollments fetched', { count: data?.length || 0 })
          return NextResponse.json({ data: data || [] })
        }
        
        case 'courses': {
          const { data, error } = await supabaseAdmin
            .from('course_enrollments')
            .select(`
              *,
              courses(
                id,
                title,
                slug,
                description,
                thumbnail_url,
                duration_hours,
                lessons_count
              )
            `)
            .eq('student_id', studentId)
            .order('enrolled_at', { ascending: false })
          
          if (error) {
            logger.error('Error fetching courses:', error)
            return NextResponse.json(
              { error: 'Erreur lors de la récupération des cours' },
              { status: 500 }
            )
          }
          
          return NextResponse.json({ data: data || [] })
        }
        
        case 'documents': {
          const { data, error } = await supabaseAdmin
            .from('documents')
            .select(`
              id, title, type, status, file_url, signed_file_url, created_at, expires_at,
              sessions(name, formations(name))
            `)
            .eq('student_id', studentId)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
          
          if (error) {
            logger.error('Error fetching documents:', error)
            return NextResponse.json(
              { error: 'Erreur lors de la récupération des documents' },
              { status: 500 }
            )
          }
          
          return NextResponse.json({ data: data || [] })
        }
        
        case 'certificates': {
          const { data, error } = await supabaseAdmin
            .from('course_certificates')
            .select(`
              *,
              courses(title)
            `)
            .eq('student_id', studentId)
            .order('issued_at', { ascending: false })
          
          if (error) {
            logger.error('Error fetching certificates:', error)
            return NextResponse.json(
              { error: 'Erreur lors de la récupération des certificats' },
              { status: 500 }
            )
          }
          
          return NextResponse.json({ data: data || [] })
        }
        
        default:
          return NextResponse.json(
            { error: 'Type de données non supporté' },
            { status: 400 }
          )
      }
    }
    
    // Sinon, utiliser l'authentification normale
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map(c => ({ name: c.name, value: c.value }))
          },
          setAll(cookiesToSet) {
            // Pas nécessaire
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }
    
    // Récupérer les données selon le type demandé (même logique que ci-dessus)
    // ... (code similaire mais avec l'utilisateur authentifié)
    
    return NextResponse.json(
      { error: 'Non implémenté pour l\'authentification normale' },
      { status: 501 }
    )
    
  } catch (error) {
    logger.error('Error in learner data API:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}


