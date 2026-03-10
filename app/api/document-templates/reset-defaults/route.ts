import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentTemplateService } from '@/lib/services/document-template.service'
import type { DocumentType } from '@/lib/types/document-templates'
import { getDefaultTemplateContent } from '@/lib/utils/document-template-defaults'
import { logger } from '@/lib/utils/logger'

// POST /api/document-templates/reset-defaults - Réinitialise les templates existants avec le contenu par défaut
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'organisation de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    const organizationId = userData.organization_id
    const documentTemplateService = new DocumentTemplateService(supabase)

    // Récupérer le body de la requête
    let body: { types?: DocumentType[] } = {}
    try {
      body = await request.json()
    } catch {
      // Body vide = réinitialiser tous les templates
    }

    // Si des types spécifiques sont fournis, ne réinitialiser que ceux-ci
    const typesToReset = body.types || ['facture', 'devis'] as DocumentType[]

    const updatedTemplates: { type: DocumentType; name: string; id: string }[] = []
    const errors: { type: DocumentType; error: string }[] = []

    for (const type of typesToReset) {
      try {
        const defaultContent = getDefaultTemplateContent(type)

        if (!defaultContent) {
          logger.warn(`No default content found for type: ${type}`)
          errors.push({ type, error: 'Pas de contenu par défaut trouvé' })
          continue
        }

        // Récupérer les templates existants pour ce type
        const existingTemplates = await documentTemplateService.getTemplatesByType(type, organizationId)

        if (existingTemplates.length === 0) {
          // Créer un nouveau template si aucun n'existe
          const newTemplate = await documentTemplateService.createTemplate({
            organization_id: organizationId,
            type,
            name: defaultContent.name,
            header: {
              enabled: true,
              height: 50,
              elements: [],
              repeatOnAllPages: false,
              content: defaultContent.headerContent,
            },
            content: {
              pageSize: 'A4',
              margins: { top: 10, right: 15, bottom: 10, left: 15 },
              elements: [],
              html: defaultContent.bodyContent,
            },
            margins: { top: 10, right: 15, bottom: 10, left: 15 },
            font_size: 10,
            footer: {
              enabled: true,
              height: 30,
              elements: [],
              repeatOnAllPages: true,
              pagination: {
                enabled: true,
                format: 'Page {numero_page} / {total_pages}',
                position: 'center',
              },
              content: defaultContent.footerContent,
            },
            header_enabled: true,
            header_height: 50,
            footer_enabled: true,
            footer_height: 30,
            is_default: true,
          })

          updatedTemplates.push({
            type,
            name: newTemplate.name,
            id: newTemplate.id,
          })

          logger.info(`Created default template for type: ${type}`, { templateId: newTemplate.id })
        } else {
          // Mettre à jour le premier template (le plus récent ou le par défaut)
          const templateToUpdate = existingTemplates.find((t) => t != null && t.is_default) ?? existingTemplates[0]
          if (!templateToUpdate) continue

          logger.info(`Updating template ${templateToUpdate.id} for type ${type}`, {
            currentHeaderHeight: (templateToUpdate.header as { height?: number } | null)?.height ?? templateToUpdate.header_height,
            currentFooterHeight: (templateToUpdate.footer as { height?: number } | null)?.height ?? templateToUpdate.footer_height,
            newHeaderHeight: 22,
            newFooterHeight: 12,
          })

          const updateResult = await documentTemplateService.updateTemplate({
            id: templateToUpdate.id,
            name: defaultContent.name,
            header: {
              enabled: true,
              height: 50,
              elements: [],
              repeatOnAllPages: false,
              content: defaultContent.headerContent,
            },
            content: {
              pageSize: 'A4',
              margins: { top: 10, right: 15, bottom: 10, left: 15 },
              elements: [],
              html: defaultContent.bodyContent,
            },
            margins: { top: 10, right: 15, bottom: 10, left: 15 },
            footer: {
              enabled: true,
              height: 30,
              elements: [],
              repeatOnAllPages: true,
              pagination: {
                enabled: true,
                format: 'Page {numero_page} / {total_pages}',
                position: 'center',
              },
              content: defaultContent.footerContent,
            },
            header_enabled: true,
            header_height: 50,
            footer_enabled: true,
            footer_height: 30,
            is_default: true,
          })

          // S'assurer que ce template est bien le modèle par défaut (session + page génération + liste modèles)
          await documentTemplateService.setAsDefault(templateToUpdate.id, organizationId)

          logger.info(`Update result for ${type}:`, {
            updateResult: updateResult ? 'success' : 'no result',
            templateId: templateToUpdate.id
          })

          updatedTemplates.push({
            type,
            name: defaultContent.name,
            id: templateToUpdate.id,
          })

          logger.info(`Updated template for type: ${type}`, { templateId: templateToUpdate.id })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
        logger.error(`Error resetting template for type: ${type}`, error)
        errors.push({ type, error: errorMessage })
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedTemplates,
      errors,
      summary: {
        updated: updatedTemplates.length,
        errors: errors.length,
        total: typesToReset.length,
      },
    })
  } catch (error) {
    logger.error('Erreur lors de la réinitialisation des templates:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
