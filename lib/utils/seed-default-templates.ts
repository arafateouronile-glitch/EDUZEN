import type { SupabaseClient } from '@supabase/supabase-js'
import { DocumentTemplateService } from '@/lib/services/document-template.service'
import type { DocumentType } from '@/lib/types/document-templates'
import { getDefaultTemplateContent } from '@/lib/utils/document-template-defaults'
import { logger } from '@/lib/utils/logger'

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
  'convention_formateur',
]

export async function seedDefaultTemplatesForOrg(
  supabase: SupabaseClient<any>,
  organizationId: string
): Promise<{ created: number; skipped: number; errors: number }> {
  const service = new DocumentTemplateService(supabase)
  const existing = await service.getAllTemplates(organizationId)
  const existingTypes = new Set(
    existing.map(t => t?.type).filter((x): x is NonNullable<typeof x> => x != null)
  )

  let created = 0
  let errors = 0

  for (const type of ALL_DOCUMENT_TYPES) {
    if (existingTypes.has(type)) continue

    try {
      const defaultContent = getDefaultTemplateContent(type)
      if (!defaultContent) {
        errors++
        continue
      }

      await service.createTemplate({
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

      created++
      logger.info(`[seed-templates] Created default template: ${type}`, { organizationId })
    } catch (error) {
      errors++
      logger.error(`[seed-templates] Error creating template: ${type}`, error)
    }
  }

  logger.info('[seed-templates] Done', { organizationId, created, skipped: existingTypes.size, errors })
  return { created, skipped: existingTypes.size, errors }
}
