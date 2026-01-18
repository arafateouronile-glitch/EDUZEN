import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { generatePDF } from '@/lib/utils/document-generation/pdf-generator'
import { generateDOCX } from '@/lib/utils/document-generation/docx-generator'
import type { DocumentTemplate, DocumentVariables } from '@/lib/types/document-templates'
import { Database } from '@/types/database.types'
import JSZip from 'jszip'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'
import { withBodyValidation, type ValidationSchema } from '@/lib/utils/api-validation'
import { withRateLimit, mutationRateLimiter } from '@/lib/utils/rate-limiter'

// Schéma de validation pour génération batch
const batchGenerateSchema: ValidationSchema = {
  template_id: {
    type: 'uuid',
    required: true,
  },
  format: {
    type: 'string',
    required: true,
    allowedValues: ['PDF', 'DOCX'],
  },
  items: {
    type: 'json',
    required: true,
  },
  zip_filename: {
    type: 'string',
    required: false,
    maxLength: 200,
    pattern: /^[a-zA-Z0-9_\-\.]+$/,
  },
}

/**
 * POST /api/documents/generate-batch
 * Génère plusieurs documents en masse
 * ✅ Validation stricte + Rate limiting
 */
export async function POST(request: NextRequest) {
  return withRateLimit(request, mutationRateLimiter, async (req) => {
    // Convertir Request en NextRequest pour withBodyValidation
    const nextReq = req as unknown as NextRequest
    return withBodyValidation(nextReq, batchGenerateSchema, async (req, validatedData) => {
  try {
    const supabase = createSupabaseServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    // Authentification
    const {
      data: { session },
    } = await supabase.auth.getSession()

    let user
    if (session && session.user) {
      user = session.user
    } else {
      const {
        data: { user: userFromGetUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !userFromGetUser) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }

      user = userFromGetUser
    }

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'organisation
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    // Validation additionnelle des items
    const items = validatedData.items as Array<{
      related_entity_type?: string
      related_entity_id?: string
      variables: DocumentVariables
    }>

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Aucun élément à générer' }, { status: 400 })
    }

    if (items.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 documents par génération' }, { status: 400 })
    }

    // Récupérer le template
    const templateId = validatedData.template_id as string
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    if (template.organization_id !== userData.organization_id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    // Générer tous les documents
    logger.info('Starting batch document generation', {
      templateId: maskId(String(validatedData.template_id)),
      format: validatedData.format,
      count: items.length,
      organizationId: maskId(userData.organization_id),
    })

    const zip = new JSZip()
    const generatedDocuments: Array<{
      fileName: string
      success: boolean
      error?: string
    }> = []

    // Collect all documents to insert in batch
    const documentsToInsert: Array<{
      organization_id: string
      template_id: string
      type: string
      file_name: string
      file_url: string
      format: string
      page_count: number
      related_entity_type?: string
      related_entity_id?: string
      metadata: DocumentVariables
      generated_by: string
    }> = []

    let successCount = 0
    let errorCount = 0

    // Generate all documents and collect metadata
    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      try {
        let fileBlob: Blob
        let fileName: string

        if (validatedData.format === 'PDF') {
          const result = await generatePDF(template as unknown as DocumentTemplate, item.variables, undefined, userData.organization_id)
          fileBlob = result.blob
          fileName = `${template.type}_${item.related_entity_id || i + 1}_${Date.now()}.pdf`
        } else {
          const result = await generateDOCX(template as unknown as DocumentTemplate, item.variables, undefined, userData.organization_id)
          fileBlob = result.blob
          fileName = `${template.type}_${item.related_entity_id || i + 1}_${Date.now()}.docx`
        }

        // Ajouter au ZIP
        const arrayBuffer = await fileBlob.arrayBuffer()
        zip.file(fileName, arrayBuffer)

        // Créer l'enregistrement pour le batch insert
        const fileUrl = `data:application/${String(validatedData.format).toLowerCase()};base64,${Buffer.from(arrayBuffer).toString('base64')}`

        documentsToInsert.push({
          organization_id: userData.organization_id,
          template_id: template.id,
          type: template.type,
          file_name: fileName,
          file_url: fileUrl,
          format: String(validatedData.format),
          page_count: 1, // Approximatif
          related_entity_type: item.related_entity_type,
          related_entity_id: item.related_entity_id,
          metadata: item.variables,
          generated_by: user.id,
        })

        generatedDocuments.push({ fileName, success: true })
        successCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
        generatedDocuments.push({
          fileName: `document_${i + 1}`,
          success: false,
          error: errorMessage,
        })
        errorCount++
        logger.error('Document generation failed', error, {
          index: i + 1,
          error: sanitizeError(error),
        })
      }
    }

    // Batch insert all generated documents (N+1 FIX)
    if (documentsToInsert.length > 0) {
      try {
        const { error: insertError } = await supabase
          .from('generated_documents')
          .insert(documentsToInsert as any)

        if (insertError) {
          logger.error('Batch document insert failed', insertError, {
            count: documentsToInsert.length,
            error: sanitizeError(insertError),
          })
          throw insertError
        }

        logger.info('Batch document insert successful', {
          count: documentsToInsert.length,
          organizationId: maskId(userData.organization_id),
        })
      } catch (error) {
        logger.error('Failed to save generated documents to database', error, {
          count: documentsToInsert.length,
          error: sanitizeError(error),
        })
        // Continue with ZIP generation even if database insert fails
      }
    }

    // Générer le ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const zipArrayBuffer = await zipBlob.arrayBuffer()
    const zipBase64 = Buffer.from(zipArrayBuffer).toString('base64')
    const zipDataUrl = `data:application/zip;base64,${zipBase64}`

    logger.info('Batch document generation completed', {
      total: items.length,
      success: successCount,
      errors: errorCount,
      templateId: maskId(String(validatedData.template_id)),
      organizationId: maskId(userData.organization_id),
    })

    const zipFilename = validatedData.zip_filename
      ? String(validatedData.zip_filename)
      : `documents_${Date.now()}.zip`

    return NextResponse.json({
      success: true,
      zipUrl: zipDataUrl,
      zipFileName: zipFilename,
      generated: {
        total: items.length,
        success: successCount,
        errors: errorCount,
      },
      documents: generatedDocuments,
    })
  } catch (error) {
    logger.error('Batch document generation failed with exception', error, {
      error: sanitizeError(error),
    })
    const errorMessage = error instanceof Error
      ? error.message
      : 'Erreur serveur inconnue'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
    })
  })
}
