import { timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Vérifie le Bearer token pour les routes MCP.
 * Utilise timingSafeEqual pour éviter les timing attacks.
 * Retourne null si valide, ou une NextResponse d'erreur.
 */
export function validateMcpToken(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authorization header manquant' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const secret = process.env.MCP_API_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'MCP non configuré côté serveur' }, { status: 503 })
  }

  const tokenBuf = Buffer.from(token)
  const secretBuf = Buffer.from(secret)

  if (
    tokenBuf.length !== secretBuf.length ||
    !timingSafeEqual(tokenBuf, secretBuf)
  ) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 403 })
  }

  return null
}
