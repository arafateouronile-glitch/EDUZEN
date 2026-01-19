import { NextRequest, NextResponse } from 'next/server'
import { createAPIService } from '@/lib/services/api.service'
import { createClient } from '@/lib/supabase/server'

/**
 * Middleware pour l'authentification et le rate limiting de l'API
 */
export async function apiMiddleware(request: NextRequest) {
  // Récupérer la clé API depuis les headers
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key required', message: 'Please provide an API key in the X-API-Key header or Authorization header' },
      { status: 401 }
    )
  }

  // Créer le service API avec le client serveur
  const supabase = await createClient()
  const apiService = createAPIService(supabase)

  // Vérifier la clé API
  const key = await apiService.verifyAPIKey(apiKey)
  if (!key) {
    return NextResponse.json(
      { error: 'Invalid API key', message: 'The provided API key is invalid or has been revoked' },
      { status: 401 }
    )
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
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!key.allowed_ips.includes(clientIP)) {
      return NextResponse.json(
        { error: 'IP not allowed', message: 'Your IP address is not authorized to use this API key' },
        { status: 403 }
      )
    }
  }

  // Vérifier le rate limiting
  const rateLimit = await apiService.checkRateLimit(key, key.organization_id)
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
    scopes: key.scopes || [],
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

