import { NextResponse } from 'next/server'

export async function GET() {
  // NOTE: Fonctionnalité prévue - Récupération depuis la table sso_configurations
  return NextResponse.json({
    providers: [],
    enabled: false,
    message: 'SSO configuration not yet implemented'
  })
}

export async function PUT(request: Request) {
  // NOTE: Fonctionnalité prévue - Mise à jour dans la table sso_configurations
  return NextResponse.json(
    { error: 'SSO configuration update not yet implemented' },
    { status: 501 }
  )
}
