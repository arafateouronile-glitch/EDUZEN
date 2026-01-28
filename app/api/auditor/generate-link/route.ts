/**
 * API Route: POST /api/auditor/generate-link
 * Génère un lien d'accès temporaire sécurisé pour un auditeur externe
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuditorPortalService } from '@/lib/services/auditor-portal.service'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { z } from 'zod'

const generateLinkSchema = z.object({
  auditorName: z.string().min(2, 'Le nom de l\'auditeur est requis'),
  auditorEmail: z.string().email('Email invalide').optional(),
  auditorOrganization: z.string().optional(),
  auditId: z.string().uuid().optional(),
  validityHours: z.number().min(1).max(168).default(48), // Max 7 jours
  permissions: z.object({
    view_indicators: z.boolean().default(true),
    view_evidence: z.boolean().default(true),
    view_corrective_actions: z.boolean().default(true),
    export_pdf: z.boolean().default(true),
    sampling_mode: z.boolean().default(false),
  }).optional(),
  notes: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer l'utilisateur et son organisation
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json(
        { error: 'Utilisateur ou organisation non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur a les droits (admin uniquement)
    if (!['admin', 'super_admin'].includes(userData.role || '')) {
      return NextResponse.json(
        { error: 'Droits insuffisants. Seuls les administrateurs peuvent générer des liens auditeur.' },
        { status: 403 }
      )
    }

    // Valider les données d'entrée
    const body = await request.json()
    const validationResult = generateLinkSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Générer le lien
    const service = new AuditorPortalService(supabase)
    const result = await service.generateAccessLink(
      userData.organization_id,
      userData.id,
      {
        auditorName: data.auditorName,
        auditorEmail: data.auditorEmail,
        auditorOrganization: data.auditorOrganization,
        auditId: data.auditId,
        validityHours: data.validityHours,
        permissions: data.permissions,
        notes: data.notes,
      }
    )

    logger.info('Auditor access link generated', {
      organizationId: userData.organization_id,
      auditorName: data.auditorName,
      expiresAt: result.link.expires_at,
    })

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        expiresAt: result.link.expires_at,
        auditorName: result.link.auditor_name,
        linkId: result.link.id,
      },
    })
  } catch (error) {
    logger.error('Error generating auditor link:', sanitizeError(error))
    return NextResponse.json(
      { error: 'Erreur lors de la génération du lien' },
      { status: 500 }
    )
  }
}
