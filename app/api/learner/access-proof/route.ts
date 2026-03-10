/**
 * POST /api/learner/access-proof
 * Appelé après validation du student sur la page /learner/access/[id].
 * Pose un cookie signé (court TTL) pour prouver que l'appelant a légitimement accédé à cet apprenant.
 * Requis avant d'appeler POST /api/learner/session.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHmac, timingSafeEqual } from 'crypto'
import { logger, sanitizeError } from '@/lib/utils/logger'

const COOKIE_NAME = 'learner_access_proof'
const PROOF_TTL_SEC = 5 * 60 // 5 minutes
const COOKIE_MAX_AGE = PROOF_TTL_SEC

function getSecret(): string {
  const secret = process.env.SIGNATURE_EVIDENCE_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('SIGNATURE_EVIDENCE_SECRET must be set (min 16 chars) for learner access proof')
  }
  return secret
}

function signProof(expiry: number, studentId: string): string {
  const payload = `${expiry}.${studentId}`
  const hmac = createHmac('sha256', getSecret())
  hmac.update(payload)
  return `${payload}.${hmac.digest('hex')}`
}

export function verifyAccessProofCookie(cookieValue: string | undefined, expectedStudentId: string): boolean {
  if (!cookieValue || typeof cookieValue !== 'string') return false
  try {
    const parts = cookieValue.split('.')
    if (parts.length !== 3) return false
    const [expiryStr, studentId, signature] = parts
    const expiry = parseInt(expiryStr, 10)
    if (!expiry || studentId !== expectedStudentId) return false
    if (Date.now() / 1000 > expiry) return false
    const expected = signProof(expiry, studentId)
    if (expected.length !== cookieValue.length) return false
    return timingSafeEqual(Buffer.from(cookieValue, 'utf8'), Buffer.from(expected, 'utf8'))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const supabase = createAdminClient()
    const { data: student, error } = await supabase
      .from('students')
      .select('id, status')
      .eq('id', studentId)
      .single()

    if (error || !student) {
      logger.warn('[learner/access-proof] Student not found', { studentId: studentId.slice(0, 8), error: sanitizeError(error) })
      return NextResponse.json({ error: 'Apprenant non trouvé' }, { status: 404 })
    }

    if (student.status !== 'active') {
      return NextResponse.json({ error: 'Compte non actif' }, { status: 403 })
    }

    const expiry = Math.floor(Date.now() / 1000) + PROOF_TTL_SEC
    const proof = signProof(expiry, student.id)

    const response = NextResponse.json({ ok: true })
    response.cookies.set(COOKIE_NAME, proof, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })
    return response
  } catch (err) {
    logger.error('[learner/access-proof] Unexpected error', sanitizeError(err))
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
