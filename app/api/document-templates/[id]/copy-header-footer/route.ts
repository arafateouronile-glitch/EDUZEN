import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { documentTemplateService } from '@/lib/services/document-template.service'
import type { CopyHeaderFooterInput } from '@/lib/types/document-templates'

// POST /api/document-templates/[id]/copy-header-footer - Copie header/footer d'un template vers un autre
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur a accès au template cible
    const targetTemplate = await documentTemplateService.getTemplateById(id)
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userData?.organization_id !== targetTemplate.organization_id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body: CopyHeaderFooterInput = await request.json()

    // Vérifier que l'utilisateur a accès au template source
    if (!userData) {
      return NextResponse.json({ error: 'Données utilisateur non trouvées' }, { status: 404 })
    }
    const sourceTemplate = await documentTemplateService.getTemplateById(body.sourceTemplateId)
    if (userData.organization_id !== sourceTemplate.organization_id) {
      return NextResponse.json({ error: 'Accès non autorisé au template source' }, { status: 403 })
    }

    const updatedTemplate = await documentTemplateService.copyHeaderFooter(id, body)

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error('Erreur lors de la copie header/footer:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

