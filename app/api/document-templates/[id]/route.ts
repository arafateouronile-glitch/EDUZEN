import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { DocumentTemplateService } from '@/lib/services/document-template.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

// GET /api/document-templates/[id] - Récupère un template par son ID
export async function GET(
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

    const documentTemplateService = new DocumentTemplateService(supabase)
    const template = await documentTemplateService.getTemplateById(id)

    // Vérifier que l'utilisateur a accès à ce template
    const orgId = await getUserOrgId(supabase, user.id)

    if (!template || orgId !== template.organization_id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    return NextResponse.json(template)
  } catch (error) {
    logger.error('Erreur lors de la récupération du template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PUT /api/document-templates/[id] - Met à jour un template
export async function PUT(
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

    // Vérifier que l'utilisateur a accès à ce template
    const documentTemplateService = new DocumentTemplateService(supabase)
    const template = await documentTemplateService.getTemplateById(id)
    const orgId = await getUserOrgId(supabase, user.id)

    if (!template || orgId !== template.organization_id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const updatedTemplate = await documentTemplateService.updateTemplate({
      id,
      ...body,
    })

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE /api/document-templates/[id] - Supprime un template
export async function DELETE(
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

    // Vérifier que l'utilisateur a accès à ce template
    const documentTemplateService = new DocumentTemplateService(supabase)
    const template = await documentTemplateService.getTemplateById(id)
    const orgId = await getUserOrgId(supabase, user.id)

    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }
    if (orgId !== template.organization_id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    await documentTemplateService.deleteTemplate(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Erreur lors de la suppression du template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

