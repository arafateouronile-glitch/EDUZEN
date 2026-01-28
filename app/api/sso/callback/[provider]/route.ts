import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  // NOTE: Fonctionnalité prévue - Implémenter le callback SSO
  // Nécessite: OAuth2 flow avec échange code/token, création de session utilisateur
  
  return NextResponse.json(
    { error: `SSO callback for '${provider}' not yet implemented` },
    { status: 501 }
  )
}
