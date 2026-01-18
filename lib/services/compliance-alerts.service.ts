import { complianceService } from './compliance.service'
import { pushNotificationsService } from './push-notifications.service'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export class ComplianceAlertsService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Vérifie les risques critiques et envoie des alertes
   * OPTIMIZED: Uses parallel processing to send notifications
   */
  async checkCriticalRisks(organizationId: string) {
    logger.info('Starting critical risks check', {
      organizationId: maskId(organizationId),
    })

    const criticalRisks = await complianceService.getCriticalRisks(organizationId)

    if (criticalRisks.length === 0) {
      logger.info('No critical risks found')
      return { alertsSent: 0 }
    }

    // Récupérer les admins de l'organisation
    const { data: admins } = await this.supabase
      .from('users')
      .select('id, full_name, email')
      .eq('organization_id', organizationId)
      .in('role', ['super_admin', 'admin'])

    logger.info('Critical risks analysis', {
      risksCount: criticalRisks.length,
      adminsCount: admins?.length || 0,
    })

    // Collect all notifications to send in parallel
    const notificationPromises: Promise<void>[] = []

    for (const risk of criticalRisks) {
      // Send to admins
      if (admins) {
        for (const admin of admins) {
          const promise = pushNotificationsService
            .sendNotification(admin.id, {
              title: '🚨 Risque critique détecté',
              body: `Le risque "${risk.title}" nécessite une attention immédiate.`,
              notificationType: 'compliance',
              priority: 'high',
              data: {
                type: 'critical_risk',
                riskId: risk.id,
                riskTitle: risk.title,
                url: `/dashboard/compliance/risks/${risk.id}`,
              },
            })
            .catch((error) => {
              logger.error('Failed to send risk alert to admin', error, {
                adminId: maskId(admin.id),
                riskId: maskId(risk.id),
                error: sanitizeError(error),
              })
            })

          notificationPromises.push(promise)
        }
      }

      // Send to risk owner if different from admins
      if (risk.owner_id && !admins?.some((a) => a.id === risk.owner_id)) {
        const promise = pushNotificationsService
          .sendNotification(risk.owner_id, {
            title: '🚨 Risque critique - Action requise',
            body: `Le risque "${risk.title}" qui vous est assigné nécessite une attention immédiate.`,
            notificationType: 'compliance',
            priority: 'high',
            data: {
              type: 'critical_risk',
              riskId: risk.id,
              riskTitle: risk.title,
              url: `/dashboard/compliance/risks/${risk.id}`,
            },
          })
          .catch((error) => {
            logger.error('Failed to send risk alert to owner', error, {
              ownerId: maskId(risk.owner_id!),
              riskId: maskId(risk.id),
              error: sanitizeError(error),
            })
          })

        notificationPromises.push(promise)
      }
    }

    // ✅ OPTIMIZED: Send all notifications in parallel
    const results = await Promise.allSettled(notificationPromises)

    const successCount = results.filter((r) => r.status === 'fulfilled').length
    const failureCount = results.filter((r) => r.status === 'rejected').length

    logger.info('Critical risks check completed', {
      risksCount: criticalRisks.length,
      alertsSent: successCount,
      alertsFailed: failureCount,
    })

    return {
      alertsSent: successCount,
      criticalRisks: criticalRisks.length,
    }
  }

  /**
   * Vérifie les incidents critiques et envoie des alertes
   * OPTIMIZED: Uses parallel processing to send notifications
   */
  async checkCriticalIncidents(organizationId: string) {
    logger.info('Starting critical incidents check', {
      organizationId: maskId(organizationId),
    })

    const { data: incidents } = await this.supabase
      .from('security_incidents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('severity', 'critical')
      .in('status', ['open', 'investigating'])

    if (!incidents || incidents.length === 0) {
      logger.info('No critical incidents found')
      return { alertsSent: 0 }
    }

    // Récupérer les admins
    const { data: admins } = await this.supabase
      .from('users')
      .select('id')
      .eq('organization_id', organizationId)
      .in('role', ['super_admin', 'admin'])

    logger.info('Critical incidents analysis', {
      incidentsCount: incidents.length,
      adminsCount: admins?.length || 0,
    })

    // Collect all notifications to send in parallel
    const notificationPromises: Promise<void>[] = []

    for (const incident of incidents) {
      if (admins) {
        for (const admin of admins) {
          const promise = pushNotificationsService
            .sendNotification(admin.id, {
              title: '🚨 Incident critique de sécurité',
              body: `L'incident "${incident.title}" nécessite une intervention immédiate.`,
              notificationType: 'compliance',
              priority: 'high',
              data: {
                type: 'critical_incident',
                incidentId: incident.id,
                incidentTitle: incident.title,
                url: `/dashboard/compliance/incidents/${incident.id}`,
              },
            })
            .catch((error) => {
              logger.error('Failed to send incident alert to admin', error, {
                adminId: maskId(admin.id),
                incidentId: maskId(incident.id),
                error: sanitizeError(error),
              })
            })

          notificationPromises.push(promise)
        }
      }
    }

    // ✅ OPTIMIZED: Send all notifications in parallel
    const results = await Promise.allSettled(notificationPromises)

    const successCount = results.filter((r) => r.status === 'fulfilled').length
    const failureCount = results.filter((r) => r.status === 'rejected').length

    logger.info('Critical incidents check completed', {
      incidentsCount: incidents.length,
      alertsSent: successCount,
      alertsFailed: failureCount,
    })

    return {
      alertsSent: successCount,
      criticalIncidents: incidents.length,
    }
  }

  /**
   * Vérifie les contrôles non conformes et envoie des alertes
   * OPTIMIZED: Uses parallel processing to send notifications
   */
  async checkNonCompliantControls(organizationId: string) {
    logger.info('Starting non-compliant controls check', {
      organizationId: maskId(organizationId),
    })

    const { data: controls } = await this.supabase
      .from('security_controls')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('compliance_status', 'non_compliant')
      .eq('risk_level', 'high')

    if (!controls || controls.length === 0) {
      logger.info('No non-compliant controls found')
      return { alertsSent: 0 }
    }

    // Récupérer les admins
    const { data: admins } = await this.supabase
      .from('users')
      .select('id')
      .eq('organization_id', organizationId)
      .in('role', ['super_admin', 'admin'])

    logger.info('Non-compliant controls analysis', {
      controlsCount: controls.length,
      adminsCount: admins?.length || 0,
    })

    if (!admins || admins.length === 0) {
      logger.warn('No admins found to notify')
      return { alertsSent: 0, nonCompliantControls: controls.length }
    }

    // ✅ OPTIMIZED: Send all notifications in parallel
    const notificationPromises = admins.map((admin) =>
      pushNotificationsService
        .sendNotification(admin.id, {
          title: '⚠️ Contrôles non conformes',
          body: `${controls.length} contrôle(s) à haut risque sont non conformes.`,
          notificationType: 'compliance',
          priority: 'normal',
          data: {
            type: 'non_compliant_controls',
            count: controls.length,
            url: '/dashboard/compliance/controls?status=non_compliant',
          },
        })
        .catch((error) => {
          logger.error('Failed to send controls alert to admin', error, {
            adminId: maskId(admin.id),
            error: sanitizeError(error),
          })
        })
    )

    const results = await Promise.allSettled(notificationPromises)

    const successCount = results.filter((r) => r.status === 'fulfilled').length
    const failureCount = results.filter((r) => r.status === 'rejected').length

    logger.info('Non-compliant controls check completed', {
      controlsCount: controls.length,
      alertsSent: successCount,
      alertsFailed: failureCount,
    })

    return {
      alertsSent: successCount,
      nonCompliantControls: controls.length,
    }
  }

  /**
   * Exécute toutes les vérifications d'alertes
   */
  async runAllChecks(organizationId: string) {
    logger.info('Running all compliance checks', {
      organizationId: maskId(organizationId),
    })

    const results = {
      criticalRisks: await this.checkCriticalRisks(organizationId),
      criticalIncidents: await this.checkCriticalIncidents(organizationId),
      nonCompliantControls: await this.checkNonCompliantControls(organizationId),
    }

    logger.info('All compliance checks completed', {
      totalAlertsSent:
        results.criticalRisks.alertsSent +
        results.criticalIncidents.alertsSent +
        results.nonCompliantControls.alertsSent,
    })

    return results
  }
}

export const complianceAlertsService = new ComplianceAlertsService()
