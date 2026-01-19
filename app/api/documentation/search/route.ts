import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentationService } from '@/lib/services/documentation.service'
import { logger, sanitizeError } from '@/lib/utils/logger'
import {
  withQueryValidation,
  type ValidationSchema,
} from '@/lib/utils/api-validation'
import { createSecureErrorResponse, createUnauthorizedResponse } from '@/lib/utils/api-error-response'

/**
 * Schéma de validation pour la recherche documentation
 */
const searchDocumentationSchema: ValidationSchema = {
  q: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 200,
  },
  organization_id: {
    type: 'uuid',
    required: false,
  },
}

/**
 * API Route pour rechercher dans la documentation
 */
export async function GET(request: NextRequest) {
  return withQueryValidation(request, searchDocumentationSchema, async (req, data) => {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return createUnauthorizedResponse()
      }

      const query = data.q as string
      const organizationId = data.organization_id as string | undefined

      const documentationService = new DocumentationService(supabase)
      const results = await documentationService.searchArticles(query, organizationId)

      // Enregistrer la recherche dans l'historique
      await documentationService.recordSearch(user.id, query, results.length)

      return NextResponse.json({
        success: true,
        results,
        count: results.length,
      })
    } catch (error: unknown) {
      logger.error('Documentation Search - Error searching', error, {
        error: sanitizeError(error),
      })
      return createSecureErrorResponse(error)
    }
  })
}
