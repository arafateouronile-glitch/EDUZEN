import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createAPIService } from '@/lib/services/api.service'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canUseAPI } from '@/lib/services/plan-limits'

// Scopes disponibles sans plan Enterprise (connexion site web en lecture seule)
const PUBLIC_WEB_SCOPES = new Set(['read:programs', 'read:sessions', 'read:formations'])

// Interface pour les clés API
interface APIKeyData {
  id: string
  organization_id: string
  scopes: string[] | null
  expires_at: string | null
  allowed_ips: string[] | null
  is_active: boolean
}

export type APIMiddlewareResult = {
  key: APIKeyData
  organizationId: string
  scopes: string[]
  requestHeaders: Headers
  rateLimit: { allowed: boolean; remaining: number; resetAt: Date }
}

/**
 * Middleware pour l'authentification et le rate limiting de l'API
 */
export async function apiMiddleware(request: NextRequest): Promise<NextResponse | APIMiddlewareResult> {
  // Répondre aux preflight CORS sans exiger de clé API
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Eduzen-API-Key, X-API-Key, Authorization',
        'Access-Control-Max-Age':       '86400',
      },
    })
  }

  // Récupérer la clé API depuis les headers (supporte x-eduzen-api-key, x-api-key et Bearer)
  const apiKey =
    request.headers.get('x-eduzen-api-key') ||
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace('Bearer ', '')

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key required', message: 'Please provide an API key in the X-API-Key header or Authorization header' },
      { status: 401 }
    )
  }

  // Utiliser le client admin pour vérifier la clé API (bypass RLS — pas de session utilisateur ici)
  const adminClient = createAdminClient()
  const adminApiService = createAPIService(adminClient)

  // Vérifier la clé API
  const keyData = await adminApiService.verifyAPIKey(apiKey)
  if (!keyData) {
    return NextResponse.json(
      { error: 'Invalid API key', message: 'The provided API key is invalid or has been revoked' },
      { status: 401 }
    )
  }

  const key = keyData as unknown as APIKeyData

  // Les clés limitées aux scopes "site web" sont accessibles sans plan Enterprise
  const keyScopes: string[] = key.scopes ?? []
  const isPublicWebKey = keyScopes.length > 0 && keyScopes.every(s => PUBLIC_WEB_SCOPES.has(s))

  if (!isPublicWebKey) {
    const supabase = await createClient()
    const hasApiAccess = await canUseAPI(supabase, key.organization_id)
    if (!hasApiAccess) {
      return NextResponse.json(
        {
          error: 'Plan upgrade required',
          message: 'API access requires the Enterprise plan. Please upgrade your subscription to use the EDUZEN API.',
          upgrade_url: '/dashboard/settings?tab=billing',
        },
        { status: 403 }
      )
    }
  }

  // Vérifier l'expiration
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'API key expired', message: 'The provided API key has expired' },
      { status: 401 }
    )
  }

  // Vérifier les IPs autorisées
  if (key.allowed_ips && key.allowed_ips.length > 0) {
    // x-forwarded-for peut contenir "client, proxy1, proxy2" — on prend uniquement le premier
    const rawForwarded = request.headers.get('x-forwarded-for')
    const clientIP = (rawForwarded ? rawForwarded.split(',')[0] : null)?.trim()
      || request.headers.get('x-real-ip')?.trim()
      || 'unknown'
    if (!key.allowed_ips.includes(clientIP)) {
      return NextResponse.json(
        { error: 'IP not allowed', message: 'Your IP address is not authorized to use this API key' },
        { status: 403 }
      )
    }
  }

  // Vérifier le rate limiting
  const rateLimit = await adminApiService.checkRateLimit(keyData, key.organization_id)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'You have exceeded the rate limit for this API key',
        retryAfter: Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '1000',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
          'Retry-After': Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  // Ajouter les informations de la clé API à la requête
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-api-key-id', key.id)
  requestHeaders.set('x-organization-id', key.organization_id)
  requestHeaders.set('x-api-scopes', JSON.stringify(key.scopes || []))

  return {
    key,
    organizationId: key.organization_id,
    scopes: key.scopes ?? [],
    requestHeaders,
    rateLimit,
  }
}

/**
 * Vérifie si un scope est autorisé
 */
export function hasScope(scopes: string[], requiredScope: string): boolean {
  return scopes.includes(requiredScope) || scopes.includes('*')
}

