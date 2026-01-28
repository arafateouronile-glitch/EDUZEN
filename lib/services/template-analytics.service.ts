/**
 * Service pour gérer les analytics des templates de documents
 * Service d'analytics pour templates de documents
 * 
 * NOTE: Service non implémenté - Fonctionnalité prévue pour une future version
 * Ce service permettra de tracker l'utilisation des templates (vues, générations, etc.)
 */

import { logger } from '@/lib/utils/logger'

export const templateAnalyticsService = {
  /**
   * Enregistre un événement d'analytics pour un template
   */
  async logEvent(templateId: string, eventType: string, metadata?: any) {
    // NOTE: Fonctionnalité prévue - Logger les événements dans une table template_analytics
    logger.warn('TemplateAnalyticsService - logEvent not implemented')
    return null
  },
}
