/**
 * GET /api/learner/contacts
 * Liste les contacts messagerie pour l'apprenant : formateurs, admin, secrétaires de l'organisme.
 * Authentification : Authorization: Bearer <token> ou x-learner-access-token (token RPC ou token de session).
 */
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStudentIdFromLearnerRequest } from '@/lib/api/learner-auth'
import { logger, sanitizeError } from '@/lib/utils/logger'

const ALLOWED_ROLES = ['teacher', 'admin', 'secretary'] as const

export async function GET(request: NextRequest) {
  try {
    const auth = await getStudentIdFromLearnerRequest(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Token d\'accès requis (Authorization: Bearer ou x-learner-access-token)' },
        { status: 401 }
      )
    }
    const studentId = auth.studentId

    const supabase = createAdminClient()

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, organization_id')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      logger.warn('[learner/contacts] Student not found', { studentId: studentId.slice(0, 8), error: sanitizeError(studentError) })
      return NextResponse.json(
        { error: 'Apprenant non trouvé' },
        { status: 404 }
      )
    }

    const orgId = student.organization_id
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation apprenant introuvable' }, { status: 404 })
    }

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('organization_id', orgId!)
      .eq('is_active', true)
      .in('role', [...ALLOWED_ROLES])
      .order('full_name', { ascending: true })

    if (usersError) {
      logger.error('[learner/contacts] Error fetching users', sanitizeError(usersError))
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des contacts' },
        { status: 500 }
      )
    }

    const contacts = (users || []).map((u: { id: string; full_name: string | null; email: string | null; role: string }) => ({
      id: u.id,
      full_name: u.full_name || u.email || 'Sans nom',
      email: u.email ?? undefined,
      role: u.role,
      role_label: u.role === 'teacher' ? 'Formateur' : u.role === 'admin' ? 'Administrateur' : 'Secrétaire',
    }))

    return NextResponse.json({ contacts })
  } catch (err) {
    logger.error('[learner/contacts] Unexpected error', sanitizeError(err))
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
