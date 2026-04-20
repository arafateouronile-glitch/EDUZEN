/**
 * trackLearnerEvent — Insertion fire-and-forget d'un événement apprenant.
 *
 * À appeler dans les server actions, API routes et webhooks pour
 * alimenter automatiquement la timeline de conformité de l'apprenant.
 *
 * Usage :
 *   void trackLearnerEvent({ studentId, organizationId, eventType: 'convocation_envoyee', metadata: { emailLogId } })
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export type LearnerEventType =
  | 'enrollment_created'
  | 'convocation_envoyee'
  | 'convocation_ouverte'
  | 'contrat_genere'
  | 'contrat_signe'
  | 'reglement_signe'
  | 'presence_validee'
  | 'evaluation_faite'
  | 'diplome_emis'
  | 'document_genere'
  | 'paiement_recu'
  | 'note_admin'
  | 'email_bounced'

export interface TrackLearnerEventOptions {
  studentId: string
  organizationId: string
  sessionId?: string
  eventType: LearnerEventType
  metadata?: Record<string, unknown>
  /** UUID de l'utilisateur (admin/formateur). Laisser vide pour les événements automatiques. */
  createdBy?: string
}

export async function trackLearnerEvent(options: TrackLearnerEventOptions): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await (supabase as unknown as import('@supabase/supabase-js').SupabaseClient).from('learner_events').insert({
      student_id:      options.studentId,
      organization_id: options.organizationId,
      session_id:      options.sessionId ?? null,
      event_type:      options.eventType,
      metadata:        options.metadata ?? {},
      created_by:      options.createdBy ?? null,
    })

    if (error) {
      logger.error('trackLearnerEvent - Erreur insertion', error as Error, {
        studentId:   options.studentId,
        eventType:   options.eventType,
      })
    }
  } catch (err) {
    logger.error('trackLearnerEvent - Exception', err as Error)
  }
}
