import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // TODO: Implémenter la génération de documents via l'API v1
    
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
