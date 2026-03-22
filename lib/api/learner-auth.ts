/**
 * Authentification des routes API espace apprenant.
 * Valide le token (RPC Supabase ou token de session signé) et retourne le student_id.
 */
import type { NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { createHmac, timingSafeEqual } from 'crypto'
import { logger, sanitizeError } from '@/lib/utils/logger'

function getSessionSecret(): string {
  const secret = process.env.SIGNATURE_EVIDENCE_SECRET
  if (!secret || secret.length < 16) {
    throw new Error(
      'SIGNATURE_EVIDENCE_SECRET must be set and at least 16 characters for learner session tokens. Do not use a public key.'
    )
  }
  return secret
}
const SESSION_TTL_SEC = 60 * 60 * 24 // 24h
const SESSION_PREFIX = 'eduzen_learner_'

export type LearnerAuthResult = { studentId: string } | null

/**
 * Récupère le token depuis la requête (Bearer ou header x-learner-access-token).
 */
function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }
  const headerToken = request.headers.get('x-learner-access-token')
  if (headerToken) return headerToken.trim()
  return null
}

/**
 * Valide le token via la RPC Supabase validate_learner_access_token.
 */
async function validateRpcToken(token: string): Promise<LearnerAuthResult> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null

  const supabase = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabase.rpc('validate_learner_access_token', { p_token: token })
  if (error) {
    logger.warn('[learner-auth] RPC validate token failed', { error: sanitizeError(error) })
    return null
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row?.is_valid || !row?.student_id) return null
  return { studentId: row.student_id }
}

/**
 * Vérifie un token de session signé (émis par POST /api/learner/session).
 * Format: eduzen_learner_<timestamp>_<studentId>_<hmac>
 */
function verifySessionToken(token: string): LearnerAuthResult {
  try {
    if (!token.startsWith(SESSION_PREFIX)) return null
    const rest = token.slice(SESSION_PREFIX.length)
    const parts = rest.split('_')
    if (parts.length < 3) return null
    const timestamp = parseInt(parts[0], 10)
    const studentId = parts[1]
    const expectedMac = parts.slice(2).join('_')
    if (!timestamp || !studentId || !expectedMac) return null
    const now = Math.floor(Date.now() / 1000)
    if (now - timestamp > SESSION_TTL_SEC) return null
    const payload = `${SESSION_PREFIX}${timestamp}_${studentId}`
    const hmac = createHmac('sha256', getSessionSecret())
    hmac.update(payload)
    const computed = hmac.digest('hex')
    if (computed.length !== expectedMac.length || !timingSafeEqual(Buffer.from(computed), Buffer.from(expectedMac))) return null
    return { studentId }
  } catch (e) {
    logger.warn('[learner-auth] Session token invalid', { error: sanitizeError(e) })
    return null
  }
}

/**
 * Génère un token de session pour l'apprenant (utilisé par POST /api/learner/session).
 */
export function createLearnerSessionToken(studentId: string): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const payload = `${SESSION_PREFIX}${timestamp}_${studentId}`
  const hmac = createHmac('sha256', getSessionSecret())
  hmac.update(payload)
  const mac = hmac.digest('hex')
  return `${payload}_${mac}`
}

/**
 * Retourne le student_id si la requête est authentifiée (token RPC ou JWT session).
 * Sinon retourne null.
 */
export async function getStudentIdFromLearnerRequest(request: NextRequest): Promise<LearnerAuthResult> {
  const token = getTokenFromRequest(request)
  if (!token) return null

  // 1) Tenter validation RPC (token Supabase learner_access_tokens)
  const rpcResult = await validateRpcToken(token)
  if (rpcResult) return rpcResult

  // 2) Tenter token de session signé (émis par /api/learner/session)
  const sessionResult = verifySessionToken(token)
  if (sessionResult) return sessionResult

  return null
}
