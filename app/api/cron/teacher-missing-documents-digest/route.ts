import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TeacherMissingDocumentsDigestService } from '@/lib/services/teacher-missing-documents-digest.service'
import { withCronSecurity } from '@/lib/utils/cron-security'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/teacher-missing-documents-digest
 *
 * Récapitulatif hebdomadaire (un email par admin, groupé par organisation) des
 * documents de conformité formateurs jamais déposés — complète le cron quotidien
 * teacher-document-expiry-alerts qui ne couvre que les documents existants
 * arrivant à expiration.
 *
 * Planifié chaque lundi à 8h (vercel.json crons). Protégé par CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 })
  }

  return withCronSecurity(
    request,
    async () => {
      try {
        const supabase = createAdminClient()
        const service = new TeacherMissingDocumentsDigestService(supabase)
        const stats = await service.runWeeklyDigest()

        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          ...stats,
        })
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Erreur inconnue'
        return NextResponse.json({ error: msg }, { status: 500 })
      }
    },
    {
      secret: CRON_SECRET,
      requireSecret: true,
      logExecution: true,
    }
  )
}
