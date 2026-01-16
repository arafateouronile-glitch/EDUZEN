import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  
  // TODO: Implémenter l'autorisation SSO pour différents providers
  // (Google, Microsoft, Okta, etc.)
  
  return NextResponse.json(
    { error: `SSO provider '${provider}' not yet implemented` },
    { status: 501 }
  )
}
