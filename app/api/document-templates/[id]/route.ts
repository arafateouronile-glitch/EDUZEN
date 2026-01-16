import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { documentTemplateService } from '@/lib/services/document-template.service'

// GET /api/document-templates/[id] - Récupère un template par son ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const template = await documentTemplateService.getTemplateById(params.id)

    // Vérifier que l'utilisateur a accès à ce template
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userData?.organization_id !== template.organization_id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Erreur lors de la récupération du template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PUT /api/document-templates/[id] - Met à jour un template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur a accès à ce template
    const template = await documentTemplateService.getTemplateById(params.id)
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userData?.organization_id !== template.organization_id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const updatedTemplate = await documentTemplateService.updateTemplate({
      id: params.id,
      ...body,
    })

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE /api/document-templates/[id] - Supprime un template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur a accès à ce template
    const template = await documentTemplateService.getTemplateById(params.id)
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userData?.organization_id !== template.organization_id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    await documentTemplateService.deleteTemplate(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression du template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

