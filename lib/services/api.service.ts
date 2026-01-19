// Note: Ne pas importer createClient ici car ce service peut être utilisé côté serveur
// Le client doit être passé en paramètre du constructeur
import type { SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

// Types locaux pour les tables API qui ne sont pas encore dans le schéma Supabase
type APIKey = any
type Webhook = any
type WebhookDelivery = any

export class APIService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient: SupabaseClient<Database>) {
    if (!supabaseClient) {
      throw new Error('APIService requires a Supabase client to be passed in constructor')
    }
    this.supabase = supabaseClient
  }

  // ========== API KEYS ==========

  /**
   * Génère une nouvelle clé API
   */
  generateAPIKey(): { key: string; hash: string; prefix: string } {
    const key = `eduz_${crypto.randomBytes(32).toString('hex')}`
    const hash = crypto.createHash('sha256').update(key).digest('hex')
    const prefix = key.substring(0, 12) + '...'
    return { key, hash, prefix }
  }

  /**
   * Vérifie une clé API
   */
  async verifyAPIKey(apiKey: string): Promise<APIKey | null> {
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex')
    const { data, error } = await (this.supabase as any)
      .from('api_keys')
      .select('*')
      .eq('key_hash', hash)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * Crée une nouvelle clé API
   */
  async createAPIKey(
    organizationId: string,
    userId: string,
    name: string,
    options?: {
      description?: string
      scopes?: string[]
      allowedIPs?: string[]
      allowedOrigins?: string[]
      rateLimitPerMinute?: number
      rateLimitPerHour?: number
      rateLimitPerDay?: number
      expiresAt?: Date
    }
  ) {
    const { key, hash, prefix } = this.generateAPIKey()

    // Créer le quota si nécessaire
    await this.ensureQuotaExists(organizationId)

    const { data, error } = await (this.supabase as any)
      .from('api_keys')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        name,
        key_hash: hash,
        key_prefix: prefix,
        description: options?.description,
        scopes: options?.scopes || [],
        allowed_ips: options?.allowedIPs || [],
        allowed_origins: options?.allowedOrigins || [],
        rate_limit_per_minute: options?.rateLimitPerMinute || 60,
        rate_limit_per_hour: options?.rateLimitPerHour || 1000,
        rate_limit_per_day: options?.rateLimitPerDay || 10000,
        expires_at: options?.expiresAt?.toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Retourner la clé (seulement à la création)
    return { ...data, key }
  }

  /**
   * Récupère les clés API d'une organisation
   */
  async getAPIKeys(organizationId: string) {
    const { data, error } = await (this.supabase as any)
      .from('api_keys')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Met à jour une clé API
   */
  async updateAPIKey(keyId: string, updates: any) {
    const { data, error } = await (this.supabase as any)
      .from('api_keys')
      .update(updates)
      .eq('id', keyId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Désactive une clé API
   */
  async revokeAPIKey(keyId: string) {
    return this.updateAPIKey(keyId, { is_active: false })
  }

  /**
   * Supprime une clé API
   */
  async deleteAPIKey(keyId: string) {
    const { error } = await (this.supabase as any)
      .from('api_keys')
      .delete()
      .eq('id', keyId)

    if (error) throw error
  }

  // ========== RATE LIMITING ==========

  /**
   * Vérifie si une requête respecte les limites de taux
   */
  async checkRateLimit(
    apiKey: APIKey,
    organizationId: string
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    // Vérifier les limites de la clé API
    const keyLimits = await this.checkKeyRateLimit(apiKey.id)
    if (!keyLimits.allowed) {
      return keyLimits
    }

    // Vérifier les quotas de l'organisation
    const quotaLimits = await this.checkQuotaRateLimit(organizationId)
    if (!quotaLimits.allowed) {
      return quotaLimits
    }

    return { allowed: true, remaining: Math.min(keyLimits.remaining, quotaLimits.remaining), resetAt: quotaLimits.resetAt }
  }

  private async checkKeyRateLimit(
    keyId: string
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const { data: key } = await (this.supabase as any)
      .from('api_keys')
      .select('rate_limit_per_minute, rate_limit_per_hour, rate_limit_per_day')
      .eq('id', keyId)
      .single()

    if (!key) {
      return { allowed: false, remaining: 0, resetAt: new Date() }
    }

    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Compter les requêtes récentes
    const { count: minuteCount } = await (this.supabase as any)
      .from('api_requests')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', keyId)
      .gte('created_at', oneMinuteAgo.toISOString())

    const { count: hourCount } = await (this.supabase as any)
      .from('api_requests')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', keyId)
      .gte('created_at', oneHourAgo.toISOString())

    const { count: dayCount } = await (this.supabase as any)
      .from('api_requests')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', keyId)
      .gte('created_at', oneDayAgo.toISOString())

    // Vérifier les limites
    if (minuteCount && minuteCount >= (key.rate_limit_per_minute || 60)) {
      return { allowed: false, remaining: 0, resetAt: new Date(now.getTime() + 60 * 1000) }
    }

    if (hourCount && hourCount >= (key.rate_limit_per_hour || 1000)) {
      return { allowed: false, remaining: 0, resetAt: new Date(now.getTime() + 60 * 60 * 1000) }
    }

    if (dayCount && dayCount >= (key.rate_limit_per_day || 10000)) {
      return { allowed: false, remaining: 0, resetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) }
    }

    const remaining = Math.min(
      (key.rate_limit_per_minute || 60) - (minuteCount || 0),
      (key.rate_limit_per_hour || 1000) - (hourCount || 0),
      (key.rate_limit_per_day || 10000) - (dayCount || 0)
    )

    return { allowed: true, remaining, resetAt: new Date(now.getTime() + 60 * 1000) }
  }

  private async checkQuotaRateLimit(
    organizationId: string
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const { data: quota } = await (this.supabase as any)
      .from('api_quotas')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (!quota) {
      // Créer un quota par défaut
      await this.ensureQuotaExists(organizationId)
      return { allowed: true, remaining: 10000, resetAt: new Date() }
    }

    // Vérifier les quotas
    if (quota.requests_used_minute >= (quota.requests_per_minute || 60)) {
      return { allowed: false, remaining: 0, resetAt: new Date() }
    }

    if (quota.requests_used_hour >= (quota.requests_per_hour || 1000)) {
      return { allowed: false, remaining: 0, resetAt: new Date() }
    }

    if (quota.requests_used_day >= (quota.requests_per_day || 10000)) {
      return { allowed: false, remaining: 0, resetAt: new Date() }
    }

    const remaining = Math.min(
      (quota.requests_per_minute || 60) - quota.requests_used_minute,
      (quota.requests_per_hour || 1000) - quota.requests_used_hour,
      (quota.requests_per_day || 10000) - quota.requests_used_day
    )

    return { allowed: true, remaining, resetAt: new Date() }
  }

  /**
   * Enregistre une requête API
   */
  async logAPIRequest(
    apiKeyId: string | null,
    organizationId: string | null,
    method: string,
    endpoint: string,
    path: string,
    statusCode: number,
    responseTimeMs: number,
    ipAddress?: string,
    userAgent?: string,
    queryParams?: Record<string, string | number | boolean>
  ) {
    const { data, error } = await (this.supabase as any)
      .from('api_requests')
      .insert({
        api_key_id: apiKeyId,
        organization_id: organizationId,
        method,
        endpoint,
        path,
        status_code: statusCode,
        response_time_ms: responseTimeMs,
        ip_address: ipAddress,
        user_agent: userAgent,
        query_params: queryParams,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupère les statistiques d'utilisation API
   */
  async getAPIUsageStats(organizationId: string, startDate?: Date, endDate?: Date) {
    let query = (this.supabase as any)
      .from('api_requests')
      .select('method, endpoint, status_code, response_time_ms')
      .eq('organization_id', organizationId)

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total_requests: data?.length || 0,
      by_method: {} as Record<string, number>,
      by_endpoint: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
      average_response_time: 0,
      error_rate: 0,
    }

    if (data && data.length > 0) {
      let totalResponseTime = 0
      let errorCount = 0

      data.forEach((req: { method: string; [key: string]: unknown }) => {
        // Par méthode
        stats.by_method[req.method] = (stats.by_method[req.method] || 0) + 1

        // Par endpoint
        const endpoint = req.endpoint as string
        stats.by_endpoint[endpoint] = (stats.by_endpoint[endpoint] || 0) + 1

        // Par statut
        const statusCode = (req.status_code as number) || 0
        const statusGroup = Math.floor(statusCode / 100) * 100
        stats.by_status[statusGroup] = (stats.by_status[statusGroup] || 0) + 1

        // Temps de réponse
        const responseTime = (req.response_time_ms as number) || 0
        if (responseTime) {
          totalResponseTime += responseTime
        }

        // Erreurs
        if (statusCode >= 400) {
          errorCount++
        }
      })

      stats.average_response_time = totalResponseTime / data.length
      stats.error_rate = (errorCount / data.length) * 100
    }

    return stats
  }

  // ========== QUOTAS ==========

  async ensureQuotaExists(organizationId: string) {
    const { data: existing } = await (this.supabase as any)
      .from('api_quotas')
      .select('id')
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (!existing) {
      const { error } = await (this.supabase as any)
        .from('api_quotas')
        .insert({
          organization_id: organizationId,
        })

      if (error) throw error
    }
  }

  async getQuota(organizationId: string) {
    const { data, error } = await (this.supabase as any)
      .from('api_quotas')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error) throw error
    return data
  }

  async updateQuota(organizationId: string, updates: any) {
    const { data, error } = await (this.supabase as any)
      .from('api_quotas')
      .update(updates)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== WEBHOOKS ==========

  async createWebhook(webhook: any) {
    // Générer un secret
    const secret = crypto.randomBytes(32).toString('hex')
    const { data, error } = await (this.supabase as any)
      .from('webhooks')
      .insert({
        ...webhook,
        secret,
      })
      .select()
      .single()

    if (error) throw error
    return { ...data, secret } // Retourner le secret seulement à la création
  }

  async getWebhooks(organizationId: string) {
    const { data, error } = await (this.supabase as any)
      .from('webhooks')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async updateWebhook(webhookId: string, updates: any) {
    const { data, error } = await (this.supabase as any)
      .from('webhooks')
      .update(updates)
      .eq('id', webhookId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteWebhook(webhookId: string) {
    const { error } = await (this.supabase as any)
      .from('webhooks')
      .delete()
      .eq('id', webhookId)

    if (error) throw error
  }

  /**
   * Déclenche un webhook
   */
  async triggerWebhook(webhookId: string, eventType: string, eventData: Record<string, unknown>) {
    const { data: webhook } = await (this.supabase as any)
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('is_active', true)
      .single()

    if (!webhook) throw new Error('Webhook non trouvé ou inactif')

    // Vérifier si l'événement est dans la liste
    if (!webhook.events.includes(eventType)) {
      return null
    }

    // Créer une livraison
    const { data: delivery, error: deliveryError } = await (this.supabase as any)
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhookId,
        event_type: eventType,
        event_data: eventData,
        status: 'pending',
      })
      .select()
      .single()

    if (deliveryError) throw deliveryError

    // Envoyer le webhook (sera fait par un worker/cron)
    // Pour l'instant, on retourne juste la livraison

    return delivery
  }

  /**
   * Envoie un webhook (appelé par un worker)
   */
  async sendWebhook(deliveryId: string) {
    const { data: delivery } = await (this.supabase as any)
      .from('webhook_deliveries')
      .select('*, webhook:webhooks(*)')
      .eq('id', deliveryId)
      .single()

    if (!delivery || !delivery.webhook) throw new Error('Livraison non trouvée')

    const webhook = delivery.webhook as { url: string; secret?: string; [key: string]: unknown }

    // Signer le payload
    const payload = JSON.stringify({
      event: delivery.event_type,
      data: delivery.event_data,
      timestamp: new Date().toISOString(),
    })

    const secret = (webhook.secret as string) || ''
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': delivery.event_type,
        },
        body: payload,
        signal: AbortSignal.timeout(((webhook.timeout_seconds as number) || 30) * 1000),
      })

      const responseBody = await response.text()

      // Mettre à jour la livraison
      await (this.supabase as any)
        .from('webhook_deliveries')
        .update({
          status: response.ok ? 'success' : 'failed',
          response_status_code: response.status,
          response_body: responseBody,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', deliveryId)

      // Mettre à jour les statistiques du webhook
      await (this.supabase as any)
        .from('webhooks')
        .update({
          success_count: response.ok ? ((webhook.success_count as number) || 0) + 1 : (webhook.success_count as number) || 0,
          failure_count: response.ok ? (webhook.failure_count as number) || 0 : ((webhook.failure_count as number) || 0) + 1,
          last_triggered_at: new Date().toISOString(),
        })
        .eq('id', webhook.id)

      return { success: response.ok, status: response.status }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      // Mettre à jour la livraison avec l'erreur
      await (this.supabase as any)
        .from('webhook_deliveries')
        .update({
          status: 'failed',
          error_message: errorMessage,
          attempt_number: delivery.attempt_number + 1,
          next_retry_at:
            delivery.attempt_number < delivery.max_attempts
              ? new Date(Date.now() + 5 * 60 * 1000).toISOString() // Retry dans 5 minutes
              : null,
        })
        .eq('id', deliveryId)

      throw error
    }
  }

  async getWebhookDeliveries(webhookId: string) {
    const { data, error } = await (this.supabase as any)
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data
  }
}

// Factory function pour créer une instance du service
export function createAPIService(supabaseClient: SupabaseClient<Database>) {
  return new APIService(supabaseClient)
}

// Pour la compatibilité avec le code existant
export let apiService: APIService
