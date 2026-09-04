/**
 * Paramètre `state` signé pour les flux OAuth2 des connecteurs (Fulll, …).
 *
 * Même construction que `lib/utils/csrf.ts` : `base64url(payload).signature` où
 * `signature = HMAC-SHA256(payload, secret)`, comparaison à temps constant, TTL.
 * Le secret réutilise `CSRF_SECRET` / `NEXTAUTH_SECRET` (déjà obligatoires en prod)
 * — aucune nouvelle variable d'environnement.
 */

import crypto from 'crypto'

const DEFAULT_TTL_MS = 10 * 60 * 1000 // 10 minutes

function getSecret(): string {
  const secret = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.length < 16) {
      throw new Error('CSRF_SECRET or NEXTAUTH_SECRET must be set in production (min 16 characters)')
    }
  }
  return secret || 'default-oauth-state-secret-change-me'
}

export interface OAuthStatePayload {
  organizationId: string
  provider: string
  /** epoch ms d'émission — rempli par `signState` */
  ts?: number
  /** anti-rejeu */
  nonce?: string
  /** URL de retour applicative optionnelle */
  returnTo?: string
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url')
}

/** Signe un `state` OAuth. Le résultat est URL-safe. */
export function signState(payload: OAuthStatePayload): string {
  const body: Required<Pick<OAuthStatePayload, 'organizationId' | 'provider' | 'ts' | 'nonce'>> &
    OAuthStatePayload = {
    ...payload,
    ts: payload.ts ?? Date.now(),
    nonce: payload.nonce ?? crypto.randomUUID(),
  }
  const data = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url')
  return `${data}.${sign(data)}`
}

/**
 * Vérifie un `state` OAuth. Renvoie le payload si la signature est valide et le
 * token non expiré, sinon `null`.
 */
export function verifyState(
  token: string | null | undefined,
  maxAgeMs: number = DEFAULT_TTL_MS
): OAuthStatePayload | null {
  if (!token || typeof token !== 'string') return null
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null

  const data = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  const expected = sign(data)

  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null
  }

  let payload: OAuthStatePayload
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (!payload.organizationId || !payload.provider) return null
  if (!payload.ts || Date.now() - payload.ts > maxAgeMs) return null

  return payload
}
