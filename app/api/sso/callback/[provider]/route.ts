import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  // TODO: Implémenter le callback SSO pour échanger le code contre un token
  
  return NextResponse.json(
    { error: `SSO callback for '${provider}' not yet implemented` },
    { status: 501 }
  )
}
