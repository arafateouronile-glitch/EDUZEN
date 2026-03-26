/**
 * Helper pour enregistrer des événements d'audit sur les opérations sensibles.
 * Utilise le client admin (service_role) pour bypasser RLS sur audit_logs.
 * Les erreurs sont silencieuses pour ne jamais bloquer l'opération principale.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'read_sensitive'
  | 'export'
  | 'login'
  | 'logout'

interface AuditEventParams {
  actorId:        string
  organizationId: string
  action:         AuditAction
  tableName:      string
  recordId?:      string
  ipAddress?:     string
  userAgent?:     string
  metadata?:      Record<string, unknown>
  success?:       boolean
  errorMessage?:  string
}

/**
 * Enregistre un événement d'audit de manière non-bloquante.
 * À appeler après l'opération (fire-and-forget).
 */
export function auditLog(params: AuditEventParams): void {
  const {
    actorId, organizationId, action, tableName, recordId,
    ipAddress, userAgent, metadata = {}, success = true, errorMessage,
  } = params

  const admin = createAdminClient()

  Promise.resolve((admin as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> }).rpc('log_audit_event', {
    p_actor_id:        actorId,
    p_organization_id: organizationId,
    p_action:          action,
    p_table_name:      tableName,
    p_record_id:       recordId ?? null,
    p_ip_address:      ipAddress ?? null,
    p_user_agent:      userAgent ?? null,
    p_metadata:        metadata,
    p_success:         success,
    p_error_message:   errorMessage ?? null,
  })).then((result: unknown) => {
    const { error } = result as { error: { message: string } | null }
    if (error) logger.warn('audit_log insert failed', { error: error.message, action, tableName })
  }).catch((err: unknown) => {
    logger.warn('audit_log unexpected error', { err, action, tableName })
  })
}

/**
 * Extrait l'IP d'une requête Next.js de façon sécurisée.
 */
export function getClientIp(request: { headers: { get(name: string): string | null } }): string | undefined {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? request.headers.get('x-real-ip')
      ?? undefined
}
