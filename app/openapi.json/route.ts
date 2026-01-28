import { NextResponse } from 'next/server'
import { APP_URLS } from '@/lib/config/app-config'

/**
 * GET /openapi.json
 * Redirige vers la spécification OpenAPI complète
 */
export async function GET() {
  // Rediriger vers la route API v1/docs qui contient la spécification complète
  const baseUrl = APP_URLS.getBaseUrl()
  const response = await fetch(`${baseUrl}/api/v1/docs`)
  const openApiSpec = await response.json()
  
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
