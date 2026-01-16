import { NextResponse } from 'next/server'

export async function GET() {
  // TODO: Récupérer les templates de documents via l'API v1
  return NextResponse.json({
    templates: [],
    message: 'Document templates API v1 not yet implemented'
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // TODO: Créer un template de document via l'API v1
    
    return NextResponse.json(
      { error: 'Document template creation via API v1 not yet implemented' },
      { status: 501 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
