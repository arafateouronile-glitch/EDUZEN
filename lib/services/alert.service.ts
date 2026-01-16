/**
 * Service pour gérer les alertes système (email, Slack, etc.)
 * Utilisé pour notifier les administrateurs en cas d'erreurs critiques ou d'événements importants
 */

import { logger } from '@/lib/utils/logger'
import { emailService } from './email.service'

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical'
export type AlertChannel = 'email' | 'slack' | 'both'

export interface AlertOptions {
  level: AlertLevel
  title: string
  message: string
  details?: Record<string, any>
  channel?: AlertChannel
  recipients?: string[]
  organizationId?: string
}

export class AlertService {
  /**
   * Envoie une alerte via les canaux configurés
   */
  async sendAlert(options: AlertOptions): Promise<void> {
    const {
      level,
      title,
      message,
      details = {},
      channel = 'email',
      recipients,
      organizationId,
    } = options

    try {
      // Logger l'alerte
      logger[level === 'critical' || level === 'error' ? 'error' : 'warn'](
        `[ALERT ${level.toUpperCase()}] ${title}: ${message}`,
        details
      )

      // Envoyer via les canaux configurés
      const promises: Promise<void>[] = []

      if (channel === 'email' || channel === 'both') {
        promises.push(this.sendEmailAlert(options))
      }

      if (channel === 'slack' || channel === 'both') {
        promises.push(this.sendSlackAlert(options))
      }

      await Promise.allSettled(promises)
    } catch (error) {
      // Ne pas faire échouer l'application si l'alerte échoue
      logger.error('Failed to send alert:', error)
    }
  }

  /**
   * Envoie une alerte par email
   */
  private async sendEmailAlert(options: AlertOptions): Promise<void> {
    const { level, title, message, details, recipients, organizationId } = options

    // Déterminer les destinataires
    let emailRecipients: string[] = []

    if (recipients && recipients.length > 0) {
      emailRecipients = recipients
    } else {
      // Récupérer les admins de l'organisation ou les super admins
      emailRecipients = await this.getAdminEmails(organizationId)
    }

    if (emailRecipients.length === 0) {
      logger.warn('No email recipients found for alert')
      return
    }

    // Construire le contenu de l'email
    const subject = `[${level.toUpperCase()}] ${title}`
    const htmlContent = this.buildEmailContent(level, title, message, details)

    // Envoyer l'email
    for (const recipient of emailRecipients) {
      try {
        await emailService.sendEmail({
          to: recipient,
          subject,
          html: htmlContent,
        })
      } catch (error) {
        logger.error(`Failed to send alert email to ${recipient}:`, error)
      }
    }
  }

  /**
   * Envoie une alerte via Slack
   */
  private async sendSlackAlert(options: AlertOptions): Promise<void> {
    const { level, title, message, details, organizationId } = options

    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      logger.warn('SLACK_WEBHOOK_URL not configured, skipping Slack alert')
      return
    }

    try {
      // Déterminer la couleur selon le niveau
      const colorMap: Record<AlertLevel, string> = {
        info: '#36a64f', // Vert
        warning: '#ffa500', // Orange
        error: '#ff0000', // Rouge
        critical: '#8b0000', // Rouge foncé
      }

      const payload = {
        text: `*[${level.toUpperCase()}] ${title}*`,
        attachments: [
          {
            color: colorMap[level],
            fields: [
              {
                title: 'Message',
                value: message,
                short: false,
              },
              ...(organizationId
                ? [
                    {
                      title: 'Organization ID',
                      value: organizationId,
                      short: true,
                    },
                  ]
                : []),
              ...(details && Object.keys(details).length > 0
                ? [
                    {
                      title: 'Details',
                      value: '```' + JSON.stringify(details, null, 2) + '```',
                      short: false,
                    },
                  ]
                : []),
              {
                title: 'Timestamp',
                value: new Date().toISOString(),
                short: true,
              },
            ],
          },
        ],
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Slack API returned ${response.status}`)
      }
    } catch (error) {
      logger.error('Failed to send Slack alert:', error)
      throw error
    }
  }

  /**
   * Récupère les emails des administrateurs
   */
  private async getAdminEmails(organizationId?: string): Promise<string[]> {
    // Cette fonction devrait être implémentée pour récupérer les emails des admins
    // Pour l'instant, on retourne les emails depuis les variables d'environnement
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []

    if (adminEmails.length > 0) {
      return adminEmails.filter((email) => email.trim().length > 0)
    }

    // Fallback : utiliser l'email de support
    const supportEmail = process.env.SUPPORT_EMAIL
    if (supportEmail) {
      return [supportEmail]
    }

    return []
  }

  /**
   * Construit le contenu HTML de l'email
   */
  private buildEmailContent(
    level: AlertLevel,
    title: string,
    message: string,
    details?: Record<string, any>
  ): string {
    const colorMap: Record<AlertLevel, string> = {
      info: '#36a64f',
      warning: '#ffa500',
      error: '#ff0000',
      critical: '#8b0000',
    }

    const color = colorMap[level]
    const timestamp = new Date().toLocaleString('fr-FR', {
      dateStyle: 'full',
      timeStyle: 'long',
    })

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${color}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .details { background-color: white; padding: 15px; margin-top: 15px; border-radius: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            pre { background-color: #f4f4f4; padding: 10px; border-radius: 3px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>[${level.toUpperCase()}] ${title}</h2>
            </div>
            <div class="content">
              <p><strong>Message:</strong></p>
              <p>${message}</p>
              ${details && Object.keys(details).length > 0 ? `
                <div class="details">
                  <p><strong>Détails:</strong></p>
                  <pre>${JSON.stringify(details, null, 2)}</pre>
                </div>
              ` : ''}
            </div>
            <div class="footer">
              <p>Alert générée le ${timestamp}</p>
              <p>EDUZEN - Système de gestion scolaire</p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Alerte pour erreur critique
   */
  async sendCriticalError(
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.sendAlert({
      level: 'critical',
      title: 'Erreur Critique',
      message: error.message,
      details: {
        error: error.name,
        stack: error.stack,
        ...context,
      },
      channel: 'both',
    })
  }

  /**
   * Alerte pour erreur système
   */
  async sendSystemError(
    message: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.sendAlert({
      level: 'error',
      title: 'Erreur Système',
      message,
      details,
      channel: 'email',
    })
  }

  /**
   * Alerte pour avertissement
   */
  async sendWarning(
    message: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.sendAlert({
      level: 'warning',
      title: 'Avertissement',
      message,
      details,
      channel: 'email',
    })
  }

  /**
   * Alerte pour information
   */
  async sendInfo(
    message: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.sendAlert({
      level: 'info',
      title: 'Information',
      message,
      details,
      channel: 'email',
    })
  }
}

export const alertService = new AlertService()



