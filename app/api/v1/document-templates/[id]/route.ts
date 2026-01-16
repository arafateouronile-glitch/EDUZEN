import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  
  // TODO: Récupérer un template de document spécifique via l'API v1
  
  return NextResponse.json(
    { error: `Document template '${id}' not found or API v1 not implemented` },
    { status: 501 }
  )
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  
  // TODO: Mettre à jour un template de document via l'API v1
  
  return NextResponse.json(
    { error: 'Document template update via API v1 not yet implemented' },
    { status: 501 }
  )
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  
  // TODO: Supprimer un template de document via l'API v1
  
  return NextResponse.json(
    { error: 'Document template deletion via API v1 not yet implemented' },
    { status: 501 }
  )
}
