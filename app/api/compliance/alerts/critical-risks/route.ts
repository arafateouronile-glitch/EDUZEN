import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ComplianceService } from '@/lib/services/compliance.service'
import { PushNotificationsService } from '@/lib/services/push-notifications.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * GET /api/compliance/alerts/critical-risks
 * Vérifie les risques critiques et envoie des alertes
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Créer des instances de services avec le client serveur
    const complianceService = new ComplianceService(supabase)
    const pushNotificationsService = new PushNotificationsService(supabase)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer l'organization_id
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Récupérer les risques critiques
    const criticalRisks = await complianceService.getCriticalRisks(userData.organization_id)

    // Envoyer des alertes pour chaque risque critique
    const alerts = []
    for (const risk of criticalRisks) {
      try {
        // Récupérer les utilisateurs qui doivent être alertés (admins, propriétaires du risque)
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('organization_id', userData.organization_id)
          .in('role', ['super_admin', 'admin'])

        const userIds = new Set<string>()
        if (risk.owner_id) userIds.add(risk.owner_id)
        if (admins) {
          admins.forEach((admin) => userIds.add(admin.id))
        }

        // Envoyer une notification push à chaque utilisateur
        for (const userId of userIds) {
          try {
            await pushNotificationsService.sendNotification(userId, {
              title: 'Risque critique détecté',
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
            alerts.push({ userId, riskId: risk.id, sent: true })
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
            alerts.push({ userId, riskId: risk.id, sent: false, error: errorMessage })
          }
        }
      } catch (error: unknown) {
        logger.error(`Error sending alert for risk ${risk.id}:`, error)
      }
    }

    return NextResponse.json({
      criticalRisks: criticalRisks.length,
      alertsSent: alerts.filter((a) => a.sent).length,
      alertsFailed: alerts.filter((a) => !a.sent).length,
      alerts,
    })
  } catch (error: unknown) {
    logger.error('Error checking critical risks:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
