import { NextResponse } from 'next/server'

export async function GET() {
  // TODO: Récupérer la configuration SSO depuis la base de données
  return NextResponse.json({
    providers: [],
    enabled: false,
    message: 'SSO configuration not yet implemented'
  })
}

export async function PUT(request: Request) {
  // TODO: Mettre à jour la configuration SSO
  return NextResponse.json(
    { error: 'SSO configuration update not yet implemented' },
    { status: 501 }
  )
}
