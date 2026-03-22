/**
 * POST /api/learner/session
 * Échange un studentId (ex: depuis /learner/access/[id]) contre un token de session signé.
 * Exige un cookie "preuve d'accès" posé par POST /api/learner/access-proof après visite de /learner/access/[id].
 * Rate limit: 10 requêtes / heure / IP.
 */
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createLearnerSessionToken } from '@/lib/api/learner-auth'
import { verifyAccessProofCookie } from '@/app/api/learner/access-proof/route'
import { logger, sanitizeError } from '@/lib/utils/logger'

const RATE_LIMIT_PER_HOUR = 10

// Rate limit simple en mémoire (en production préférer Redis/Upstash)
const ipCount = new Map<string, { count: number; resetAt: number }>()

/** Réinitialise le rate limit (uniquement pour les tests). */
export function resetLearnerSessionRateLimitForTests(): void {
  ipCount.clear()
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const hour = 60 * 60 * 1000
  const entry = ipCount.get(ip)
  if (!entry) {
    ipCount.set(ip, { count: 1, resetAt: now + hour })
    return true
  }
  if (now > entry.resetAt) {
    entry.count = 1
    entry.resetAt = now + hour
    return true
  }
  if (entry.count >= RATE_LIMIT_PER_HOUR) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez plus tard.' },
        { status: 429 }
      )
    }

    let body: { studentId?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
    }

    const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : undefined
    if (!studentId) {
      return NextResponse.json({ error: 'studentId requis' }, { status: 400 })
    }

    const proofCookie = request.cookies.get('learner_access_proof')?.value
    if (!verifyAccessProofCookie(proofCookie, studentId)) {
      logger.warn('[learner/session] Missing or invalid access proof cookie', { studentId: studentId.slice(0, 8) })
      return NextResponse.json(
        { error: 'Accès non autorisé. Passez par le lien d\'accès apprenant.' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()
    const { data: student, error } = await supabase
      .from('students')
      .select('id, status')
      .eq('id', studentId)
      .single()

    if (error || !student) {
      logger.warn('[learner/session] Student not found', { studentId: studentId.slice(0, 8), error: sanitizeError(error) })
      return NextResponse.json({ error: 'Apprenant non trouvé' }, { status: 404 })
    }

    if (student.status !== 'active') {
      return NextResponse.json({ error: 'Compte non actif' }, { status: 403 })
    }

    const token = createLearnerSessionToken(student.id)
    return NextResponse.json({ token, expiresIn: 24 * 60 * 60 })
  } catch (err) {
    logger.error('[learner/session] Unexpected error', sanitizeError(err))
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
