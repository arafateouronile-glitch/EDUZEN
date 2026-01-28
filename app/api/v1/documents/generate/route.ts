import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // NOTE: API v1 non implémentée - Fonctionnalité prévue pour une future version
    // Utiliser DocumentGenerationService.generate() une fois l'API v1 complètement implémentée
    
    return NextResponse.json(
      { error: 'Document generation via API v1 not yet implemented' },
      { status: 501 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
