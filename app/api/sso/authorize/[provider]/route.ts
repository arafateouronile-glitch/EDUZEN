import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  
  // NOTE: Fonctionnalité prévue - Implémenter l'autorisation SSO
  // Nécessite: Support de multiples providers (Google, Microsoft, etc.) avec OAuth2
  // (Google, Microsoft, Okta, etc.)
  
  return NextResponse.json(
    { error: `SSO provider '${provider}' not yet implemented` },
    { status: 501 }
  )
}
