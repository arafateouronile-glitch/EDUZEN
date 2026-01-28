import { NextResponse } from 'next/server'

export async function GET() {
  // NOTE: API v1 non implémentée - Fonctionnalité prévue pour une future version
  return NextResponse.json({
    templates: [],
    message: 'Document templates API v1 not yet implemented'
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // NOTE: API v1 non implémentée - Fonctionnalité prévue pour une future version
    
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
