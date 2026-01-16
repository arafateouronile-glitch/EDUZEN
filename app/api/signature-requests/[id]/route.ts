import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { signatureRequestService } from '@/lib/services/signature-request.service'

/**
 * PATCH /api/signature-requests/[id]
 * Met à jour une demande de signature (annuler, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action === 'cancel') {
      const result = await signatureRequestService.cancelSignatureRequest(id)
      return NextResponse.json(result)
    }

    if (action === 'remind') {
      const result = await signatureRequestService.sendReminder(id)
      return NextResponse.json({ success: result })
    }

    return NextResponse.json(
      { error: 'Action non reconnue' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la demande de signature:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
