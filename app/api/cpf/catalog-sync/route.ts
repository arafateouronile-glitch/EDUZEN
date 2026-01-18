import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseEDOFXML, validateTraining, type EDOFTraining } from '@/lib/utils/cpf/xml-parser'
import { createHash } from 'crypto'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes pour le traitement XML

/**
 * POST /api/cpf/catalog-sync
 * Synchronise le catalogue CPF depuis un fichier XML
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer l'organisation de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 403 }
      )
    }

    // Vérifier les permissions (admin uniquement)
    if (!['super_admin', 'admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Permission refusée' },
        { status: 403 }
      )
    }

    const organizationId = userData.organization_id

    // Vérifier la configuration CPF
    // Note: cpf_configurations n'existe pas dans les types Supabase générés
    const { data: config, error: configError } = await (supabase as any)
      .from('cpf_configurations')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (configError || !config || !(config as any).is_active) {
      return NextResponse.json(
        { error: 'Configuration CPF non active ou introuvable' },
        { status: 400 }
      )
    }

    // Récupérer le fichier depuis FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Vérifier le type de fichier
    if (!file.name.endsWith('.xml') && file.type !== 'text/xml' && file.type !== 'application/xml') {
      return NextResponse.json(
        { error: 'Le fichier doit être au format XML' },
        { status: 400 }
      )
    }

    // Lire le contenu du fichier
    const arrayBuffer = await file.arrayBuffer()
    const xmlContent = Buffer.from(arrayBuffer).toString('utf-8')

    // Calculer le hash du fichier
    const fileHash = createHash('sha256').update(xmlContent).digest('hex')

    // Vérifier si ce fichier a déjà été importé (optionnel, pour éviter les doublons)
    // On peut sauter cette vérification si on veut permettre les ré-imports

    // Parser le XML
    let parsedData
    try {
      parsedData = parseEDOFXML(xmlContent)
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Erreur lors du parsing XML',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 400 }
      )
    }

    // Créer un log de synchronisation
    const { data: syncLog, error: syncLogError } = await supabase
      .from('cpf_catalog_sync')
      .insert({
        organization_id: organizationId,
        sync_type: 'full',
        sync_method: 'xml',
        sync_status: 'in_progress',
        xml_file_hash: fileHash,
        records_total: parsedData.trainings.length,
        created_by: user.id,
      })
      .select()
      .single()

    if (syncLogError) {
      logger.error('CPF Catalog Sync - Error creating sync log', syncLogError, {
        organizationId: maskId(organizationId),
        error: sanitizeError(syncLogError),
      })
      return NextResponse.json(
        { error: 'Erreur lors de la création du log de synchronisation' },
        { status: 500 }
      )
    }

    const syncId = syncLog.id

    // Traiter chaque formation
    let recordsCreated = 0
    let recordsUpdated = 0
    let recordsFailed = 0
    const errors: string[] = []

    for (const training of parsedData.trainings) {
      try {
        // Valider la formation
        const validation = validateTraining(training)
        if (!validation.valid) {
          recordsFailed++
          errors.push(`${training.title || 'Formation inconnue'}: ${validation.errors.join(', ')}`)
          continue
        }

        // Préparer les données pour la base
        const trainingData = {
          organization_id: organizationId,
          cpf_training_code: training.actionCode,
          cpf_training_title: training.title,
          rncp_code: training.rncpCode,
          price: training.price || 0,
          currency: training.currency || 'EUR',
          duration_hours: training.durationHours,
          duration_days: training.durationDays,
          certification_level: training.certificationLevel,
          eligibility_status: 'eligible' as const,
          eligibility_date: training.eligibilityStartDate ? new Date(training.eligibilityStartDate).toISOString().split('T')[0] : null,
          eligibility_end_date: training.eligibilityEndDate ? new Date(training.eligibilityEndDate).toISOString().split('T')[0] : null,
          cpf_funding_rate: training.cpfFundingRate || 100,
          max_learners: training.maxLearners,
          description: training.description,
          prerequisites: training.prerequisites,
          learning_objectives: training.objectives,
          sync_source: 'xml' as const,
          sync_id: syncId,
          sync_date: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          external_id: training.actionCode,
        }

        // Vérifier si la formation existe déjà (par external_id ou cpf_training_code)
        let existingTraining = null
        if (training.actionCode) {
          const { data: existing } = await supabase
            .from('cpf_eligible_trainings')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('external_id', training.actionCode)
            .maybeSingle()

          existingTraining = existing
        }

        if (existingTraining) {
          // Mettre à jour la formation existante
          const { error: updateError } = await supabase
            .from('cpf_eligible_trainings')
            .update({
              ...trainingData,
              sync_id: syncId,
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', existingTraining.id)

          if (updateError) {
            throw updateError
          }
          recordsUpdated++
        } else {
          // Créer une nouvelle formation
          const { error: insertError } = await supabase
            .from('cpf_eligible_trainings')
            .insert(trainingData)

          if (insertError) {
            throw insertError
          }
          recordsCreated++
        }
      } catch (error) {
        recordsFailed++
        const errorMessage = error instanceof Error ? error.message : String(error)
        errors.push(`${training.title || 'Formation inconnue'}: ${errorMessage}`)
        logger.error('CPF Catalog Sync - Error processing training', error, {
          error: sanitizeError(error),
        })
      }
    }

    // Mettre à jour le log de synchronisation
    const syncStatus = recordsFailed === parsedData.trainings.length ? 'failed' : recordsFailed > 0 ? 'partial' : 'completed'
    
    await supabase
      .from('cpf_catalog_sync')
      .update({
        sync_status: syncStatus,
        completed_at: new Date().toISOString(),
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        records_failed: recordsFailed,
        error_message: errors.length > 0 ? errors.slice(0, 10).join('; ') : null, // Limiter à 10 erreurs
        error_details: errors.length > 0 ? { errors: errors.slice(0, 50) } : null, // Limiter à 50 erreurs dans les détails
        metadata: {
          file_name: file.name,
          file_size: file.size,
          metadata: parsedData.metadata,
        },
        stats: {
          total: parsedData.trainings.length,
          created: recordsCreated,
          updated: recordsUpdated,
          failed: recordsFailed,
        },
      })
      .eq('id', syncId)

    // Mettre à jour la date de dernière synchronisation dans la config
    await supabase
      .from('cpf_configurations')
      .update({
        last_sync_date: new Date().toISOString(),
      })
      .eq('id', config.id)

    return NextResponse.json({
      success: true,
      syncId,
      stats: {
        total: parsedData.trainings.length,
        created: recordsCreated,
        updated: recordsUpdated,
        failed: recordsFailed,
      },
      errors: errors.slice(0, 10), // Retourner les 10 premières erreurs
    })
  } catch (error) {
    logger.error('CPF Catalog Sync - Sync failed', error, {
      error: sanitizeError(error),
    })
    return NextResponse.json(
      {
        error: 'Erreur lors de la synchronisation',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}



