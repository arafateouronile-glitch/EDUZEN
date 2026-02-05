import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentTemplateService } from '@/lib/services/document-template.service'
import type { DocumentType } from '@/lib/types/document-templates'
import { getDefaultTemplateContent } from '@/lib/utils/document-template-defaults'
import { logger, sanitizeError } from '@/lib/utils/logger'

// Tous les types de documents disponibles
const ALL_DOCUMENT_TYPES: DocumentType[] = [
  'convention',
  'facture',
  'devis',
  'convocation',
  'contrat',
  'attestation_reussite',
  'certificat_scolarite',
  'releve_notes',
  'attestation_entree',
  'reglement_interieur',
  'cgv',
  'programme',
  'certificat_realisation',
  'livret_accueil',
  'emargement',
  'attestation_assiduite',
  'attestation',
]

// POST /api/document-templates/seed-defaults - Crée tous les templates par défaut
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

    // Récupérer tous les templates existants pour cette organisation
    const existingTemplates = await documentTemplateService.getAllTemplates(organizationId)
    const existingTypes = new Set(existingTemplates.map(t => t.type))

    // Créer les templates pour les types manquants
    const createdTemplates: { type: DocumentType; name: string; id: string }[] = []
    const errors: { type: DocumentType; error: string }[] = []

    for (const type of ALL_DOCUMENT_TYPES) {
      // Ne pas créer si un template existe déjà pour ce type
      if (existingTypes.has(type)) {
        logger.info(`Template already exists for type: ${type}, skipping`)
        continue
      }

      try {
        const defaultContent = getDefaultTemplateContent(type)

        if (!defaultContent) {
          logger.warn(`No default content found for type: ${type}`)
          errors.push({ type, error: 'Pas de contenu par défaut trouvé' })
          continue
        }

        const newTemplate = await documentTemplateService.createTemplate({
          organization_id: organizationId,
          type,
          name: defaultContent.name,
          header: {
            enabled: true,
            height: 100,
            elements: [],
            repeatOnAllPages: true,
            content: defaultContent.headerContent,
          },
          content: {
            pageSize: 'A4',
            margins: { top: 20, right: 20, bottom: 20, left: 20 },
            elements: [],
            html: defaultContent.bodyContent,
          },
          font_size: 10,
          footer: {
            enabled: true,
            height: 60,
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
          header_height: 100,
          footer_enabled: true,
          footer_height: 60,
          is_default: true,
        })

        createdTemplates.push({
          type,
          name: newTemplate.name,
          id: newTemplate.id,
        })

        logger.info(`Created default template for type: ${type}`, { templateId: newTemplate.id })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
        logger.error(`Error creating template for type: ${type}`, error)
        errors.push({ type, error: errorMessage })
      }
    }

    return NextResponse.json({
      success: true,
      created: createdTemplates,
      skipped: Array.from(existingTypes),
      errors,
      summary: {
        created: createdTemplates.length,
        skipped: existingTypes.size,
        errors: errors.length,
        total: ALL_DOCUMENT_TYPES.length,
      },
    })
  } catch (error) {
    logger.error('Erreur lors de la création des templates par défaut:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
