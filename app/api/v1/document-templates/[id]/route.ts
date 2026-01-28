import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  // NOTE: API v1 non implémentée - Fonctionnalité prévue pour une future version
  // Utiliser DocumentTemplateService.getById() une fois l'API v1 complètement implémentée
  
  return NextResponse.json(
    { error: `Document template '${id}' not found or API v1 not implemented` },
    { status: 501 }
  )
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  // NOTE: API v1 non implémentée - Fonctionnalité prévue pour une future version
  
  return NextResponse.json(
    { error: 'Document template update via API v1 not yet implemented' },
    { status: 501 }
  )
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  // NOTE: API v1 non implémentée - Fonctionnalité prévue pour une future version
  
  return NextResponse.json(
    { error: 'Document template deletion via API v1 not yet implemented' },
    { status: 501 }
  )
}
