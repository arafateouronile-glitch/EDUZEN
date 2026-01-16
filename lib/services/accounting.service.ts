import { createClient } from '@/lib/supabase/client'
import { XeroAdapter } from './accounting/xero.adapter'
import { QuickBooksAdapter } from './accounting/quickbooks.adapter'
import { SageAdapter } from './accounting/sage.adapter'
import type {
  AccountingProvider,
  AccountingConfig,
  AccountingAdapter,
  InvoiceData,
  PaymentData,
  ExpenseData,
  SyncResult,
} from './accounting/accounting.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'
import { invoiceService } from './invoice.service'
import { paymentService } from './payment.service'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

type AccountingIntegration = TableRow<'accounting_integrations'>
type EntityMapping = TableRow<'accounting_entity_mappings'>
type SyncLog = TableRow<'accounting_sync_logs'>
type AccountingIntegrationInsert = TableInsert<'accounting_integrations'>
type AccountingIntegrationUpdate = TableUpdate<'accounting_integrations'>

export class AccountingService {
  private supabase = createClient()
  private adapters: Record<AccountingProvider, AccountingAdapter> = {
    xero: new XeroAdapter(),
    quickbooks: new QuickBooksAdapter(),
    sage: new SageAdapter(),
  }

  /**
   * Récupère la configuration d'intégration
   */
  async getConfig(
    organizationId: string,
    provider: AccountingProvider
  ): Promise<AccountingIntegration | null> {
    const { data, error } = await this.supabase
      .from('accounting_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('provider', provider)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  /**
   * Crée ou met à jour la configuration
   */
  async upsertConfig(
    organizationId: string,
    provider: AccountingProvider,
    config: Partial<Omit<AccountingIntegrationInsert, 'organization_id' | 'provider' | 'created_at' | 'updated_at'>>
  ): Promise<AccountingIntegration> {
    const existing = await this.getConfig(organizationId, provider)

    if (existing) {
      const { data, error } = await this.supabase
        .from('accounting_integrations')
        .update(config)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      const { data, error } = await this.supabase
        .from('accounting_integrations')
        .insert({
          organization_id: organizationId,
          provider,
          ...config,
        })
        .select()
        .single()

      if (error) throw error
      return data
    }
  }

  /**
   * Authentifie avec un système comptable
   */
  async authenticate(
    organizationId: string,
    provider: AccountingProvider,
    authCode: string
  ): Promise<AccountingIntegration> {
    const config = await this.getConfig(organizationId, provider)
    if (!config) {
      throw new Error(`Configuration ${provider} non trouvée`)
    }

    const adapter = this.adapters[provider]
    const accountingConfig: AccountingConfig = this.convertToAccountingConfig(config)

    const tokens = await adapter.authenticate(accountingConfig, authCode)

    // Récupérer les informations de l'entreprise
    const companyInfo = await adapter.getCompanyInfo({
      ...accountingConfig,
      access_token: tokens.access_token,
    })

    // Mettre à jour la configuration avec les tokens
    const updates: AccountingIntegrationUpdate = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : undefined,
      company_id: companyInfo.company_id,
      company_name: companyInfo.company_name,
      is_active: true,
      metadata: {
        ...(config.metadata as Record<string, unknown> || {}),
        company_info: companyInfo.data,
      },
    }

    return this.upsertConfig(organizationId, provider, updates)
  }

  /**
   * Rafraîchit le token d'accès
   */
  async refreshToken(integrationId: string): Promise<AccountingIntegration> {
    const { data: config, error } = await this.supabase
      .from('accounting_integrations')
      .select('*')
      .eq('id', integrationId)
      .single()

    if (error) throw error

    const adapter = this.adapters[config.provider as AccountingProvider]
    const accountingConfig: AccountingConfig = this.convertToAccountingConfig(config)

    const tokens = await adapter.refreshToken(accountingConfig)

    const { data, error: updateError } = await this.supabase
      .from('accounting_integrations')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : undefined,
      })
      .eq('id', integrationId)
      .select()
      .single()

    if (updateError) throw updateError
    return data
  }

  /**
   * Synchronise une facture vers le système comptable
   */
  async syncInvoice(
    organizationId: string,
    provider: AccountingProvider,
    invoiceId: string
  ): Promise<{ mapping: EntityMapping; result: unknown }> {
    // Récupérer la configuration
    const config = await this.getConfig(organizationId, provider)
    if (!config || !config.is_active) {
      throw new Error(`Configuration ${provider} non active ou introuvable`)
    }

    // Vérifier si la facture est déjà mappée
    const { data: existingMapping } = await this.supabase
      .from('accounting_entity_mappings')
      .select('*')
      .eq('integration_id', config.id)
      .eq('entity_type', 'invoice')
      .eq('local_entity_id', invoiceId)
      .single()

    // Récupérer la facture
    const invoice = await invoiceService.getById(invoiceId)
    if (!invoice) {
      throw new Error('Facture non trouvée')
    }

    // Convertir en format comptable
    const invoiceData: InvoiceData = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      amount: Number(invoice.amount),
      tax_amount: Number(invoice.tax_amount || 0),
      total_amount: Number(invoice.total_amount),
      currency: invoice.currency,
      status: invoice.status,
      student_id: invoice.student_id,
      student_name: invoice.students
        ? `${invoice.students.first_name} ${invoice.students.last_name}`
        : undefined,
      items: invoice.items as Array<{ description: string; quantity: number; unit_price: number; total: number }>,
    }

    // Synchroniser avec le système comptable
    const adapter = this.adapters[provider]
    const accountingConfig: AccountingConfig = this.convertToAccountingConfig(config)

    // Vérifier et rafraîchir le token si nécessaire
    await this.ensureValidToken(config)

    const result = await adapter.syncInvoice(accountingConfig, invoiceData)

    // Créer ou mettre à jour le mapping
    if (existingMapping) {
      const { data, error } = await this.supabase
        .from('accounting_entity_mappings')
        .update({
          external_entity_id: result.external_id,
          external_entity_data: result.data,
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
        })
        .eq('id', existingMapping.id)
        .select()
        .single()

      if (error) throw error
      return { mapping: data, result }
    } else {
      const { data, error } = await this.supabase
        .from('accounting_entity_mappings')
        .insert({
          integration_id: config.id,
          entity_type: 'invoice',
          local_entity_id: invoiceId,
          external_entity_id: result.external_id,
          external_entity_data: result.data,
          sync_status: 'synced',
        })
        .select()
        .single()

      if (error) throw error
      return { mapping: data, result }
    }
  }

  /**
   * Synchronise un paiement vers le système comptable
   */
  async syncPayment(
    organizationId: string,
    provider: AccountingProvider,
    paymentId: string
  ): Promise<{ mapping: EntityMapping; result: unknown }> {
    const config = await this.getConfig(organizationId, provider)
    if (!config || !config.is_active) {
      throw new Error(`Configuration ${provider} non active ou introuvable`)
    }

    // Récupérer le paiement
    const { data: payment, error: paymentError } = await this.supabase
      .from('payments')
      .select('*, invoices(*)')
      .eq('id', paymentId)
      .single()

    if (paymentError) throw paymentError

    // Récupérer le mapping de la facture pour obtenir l'ID externe
    const { data: invoiceMapping } = await this.supabase
      .from('accounting_entity_mappings')
      .select('external_entity_id')
      .eq('integration_id', config.id)
      .eq('entity_type', 'invoice')
      .eq('local_entity_id', payment.invoice_id)
      .single()

    const paymentData: PaymentData = {
      id: payment.id,
      invoice_id: invoiceMapping?.external_entity_id || payment.invoice_id,
      amount: Number(payment.amount),
      currency: payment.currency,
      payment_date: payment.paid_at || payment.created_at,
      payment_method: payment.payment_method,
      status: payment.status,
      transaction_id: payment.transaction_id || undefined,
    }

    const adapter = this.adapters[provider]
    const accountingConfig: AccountingConfig = this.convertToAccountingConfig(config)

    await this.ensureValidToken(config)

    const result = await adapter.syncPayment(accountingConfig, paymentData)

    // Créer ou mettre à jour le mapping
    const { data: existingMapping } = await this.supabase
      .from('accounting_entity_mappings')
      .select('*')
      .eq('integration_id', config.id)
      .eq('entity_type', 'payment')
      .eq('local_entity_id', paymentId)
      .single()

    if (existingMapping) {
      const { data, error } = await this.supabase
        .from('accounting_entity_mappings')
        .update({
          external_entity_id: result.external_id,
          external_entity_data: result.data,
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
        })
        .eq('id', existingMapping.id)
        .select()
        .single()

      if (error) throw error
      return { mapping: data, result }
    } else {
      const { data, error } = await this.supabase
        .from('accounting_entity_mappings')
        .insert({
          integration_id: config.id,
          entity_type: 'payment',
          local_entity_id: paymentId,
          external_entity_id: result.external_id,
          external_entity_data: result.data,
          sync_status: 'synced',
        })
        .select()
        .single()

      if (error) throw error
      return { mapping: data, result }
    }
  }

  /**
   * Synchronise toutes les factures non synchronisées
   * OPTIMIZED: Uses parallel processing and batch operations to avoid N+1 pattern
   */
  async syncAllInvoices(
    organizationId: string,
    provider: AccountingProvider
  ): Promise<SyncResult> {
    logger.info('Starting batch invoice sync', {
      organizationId: maskId(organizationId),
      provider,
    })

    const config = await this.getConfig(organizationId, provider)
    if (!config || !config.is_active || !config.sync_invoices) {
      throw new Error(`Synchronisation des factures non activée pour ${provider}`)
    }

    await this.ensureValidToken(config)

    // Récupérer toutes les factures de l'organisation
    const invoices = await invoiceService.getAll(organizationId, {
      documentType: 'invoice', // Exclure les devis
    })

    // Récupérer tous les mappings existants en une seule requête
    const { data: existingMappings } = await this.supabase
      .from('accounting_entity_mappings')
      .select('*')
      .eq('integration_id', config.id)
      .eq('entity_type', 'invoice')

    const mappingsByInvoiceId = new Map(
      existingMappings?.map((m) => [m.local_entity_id, m]) || []
    )
    const invoicesToSync = invoices.filter((inv) => !mappingsByInvoiceId.has(inv.id))

    logger.info('Invoice sync analysis', {
      totalInvoices: invoices.length,
      alreadySynced: mappingsByInvoiceId.size,
      toSync: invoicesToSync.length,
    })

    const result: SyncResult = {
      success: true,
      records_synced: 0,
      records_created: 0,
      records_updated: 0,
      records_failed: 0,
      records_skipped: 0,
      errors: [],
    }

    if (invoicesToSync.length === 0) {
      logger.info('No invoices to sync')
      await this.logSync(config.id, 'incremental', 'invoice', result)
      return result
    }

    // OPTIMIZED: Sync in parallel with Promise.allSettled instead of sequential loop
    const adapter = this.adapters[provider]
    const accountingConfig: AccountingConfig = this.convertToAccountingConfig(config)

    const syncPromises = invoicesToSync.map(async (invoice) => {
      try {
        // Convertir en format comptable
        const invoiceData: InvoiceData = {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          amount: Number(invoice.amount),
          tax_amount: Number(invoice.tax_amount || 0),
          total_amount: Number(invoice.total_amount),
          currency: invoice.currency,
          status: invoice.status,
          student_id: invoice.student_id,
          student_name: invoice.students
            ? `${invoice.students.first_name} ${invoice.students.last_name}`
            : undefined,
          items: invoice.items as Array<{
            description: string
            quantity: number
            unit_price: number
            total: number
          }>,
        }

        // Synchroniser avec le système comptable
        const syncResult = await adapter.syncInvoice(accountingConfig, invoiceData)

        return {
          success: true,
          invoiceId: invoice.id,
          externalId: syncResult.external_id,
          data: syncResult.data,
        }
      } catch (error) {
        logger.error('Invoice sync failed', error, {
          invoiceId: maskId(invoice.id),
          error: sanitizeError(error),
        })
        return {
          success: false,
          invoiceId: invoice.id,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        }
      }
    })

    const syncResults = await Promise.allSettled(syncPromises)

    // Collect successful syncs for batch mapping insert
    const mappingsToInsert: Array<{
      integration_id: string
      entity_type: string
      local_entity_id: string
      external_entity_id: string
      external_entity_data: unknown
      sync_status: string
    }> = []

    syncResults.forEach((promiseResult, index) => {
      if (promiseResult.status === 'fulfilled') {
        const syncResult = promiseResult.value
        if (syncResult.success) {
          result.records_synced++
          result.records_created++
          mappingsToInsert.push({
            integration_id: config.id,
            entity_type: 'invoice',
            local_entity_id: syncResult.invoiceId,
            external_entity_id: syncResult.externalId,
            external_entity_data: syncResult.data,
            sync_status: 'synced',
          })
        } else {
          result.records_failed++
          result.errors?.push({
            entity_id: syncResult.invoiceId,
            error: syncResult.error || 'Erreur inconnue',
          })
        }
      } else {
        result.records_failed++
        result.errors?.push({
          entity_id: invoicesToSync[index]?.id || `unknown_${index}`,
          error: promiseResult.reason?.message || 'Promise rejected',
        })
      }
    })

    // OPTIMIZED: Batch insert mappings instead of individual inserts
    if (mappingsToInsert.length > 0) {
      try {
        const { error: batchError } = await this.supabase
          .from('accounting_entity_mappings')
          .insert(mappingsToInsert)

        if (batchError) {
          logger.error('Batch mapping insert failed', batchError, {
            count: mappingsToInsert.length,
            error: sanitizeError(batchError),
          })
        } else {
          logger.info('Batch mapping insert successful', {
            count: mappingsToInsert.length,
          })
        }
      } catch (error) {
        logger.error('Failed to save invoice mappings', error, {
          count: mappingsToInsert.length,
          error: sanitizeError(error),
        })
      }
    }

    logger.info('Batch invoice sync completed', {
      synced: result.records_synced,
      failed: result.records_failed,
      provider,
    })

    // Enregistrer le log de synchronisation
    await this.logSync(config.id, 'incremental', 'invoice', result)

    return result
  }

  /**
   * Vérifie et rafraîchit le token si nécessaire
   */
  private async ensureValidToken(config: AccountingIntegration): Promise<void> {
    if (!config.token_expires_at) return

    const expiresAt = new Date(config.token_expires_at)
    const now = new Date()
    const bufferTime = 5 * 60 * 1000 // 5 minutes de buffer

    if (expiresAt.getTime() - now.getTime() < bufferTime) {
      await this.refreshToken(config.id)
    }
  }

  /**
   * Convertit une configuration de base de données en AccountingConfig
   */
  private convertToAccountingConfig(config: AccountingIntegration): AccountingConfig {
    return {
      id: config.id,
      organization_id: config.organization_id,
      provider: config.provider as AccountingProvider,
      access_token: config.access_token || undefined,
      refresh_token: config.refresh_token || undefined,
      token_expires_at: config.token_expires_at || undefined,
      api_key: config.api_key || undefined,
      api_secret: config.api_secret || undefined,
      company_id: config.company_id || undefined,
      company_name: config.company_name || undefined,
      api_url: config.api_url || undefined,
      is_active: config.is_active,
      is_test_mode: config.is_test_mode,
      sync_invoices: config.sync_invoices,
      sync_payments: config.sync_payments,
      sync_expenses: config.sync_expenses,
      auto_sync: config.auto_sync,
      sync_frequency: config.sync_frequency as 'hourly' | 'daily' | 'weekly' | 'manual',
      metadata: config.metadata as Record<string, unknown> | undefined,
    }
  }

  /**
   * Enregistre un log de synchronisation
   */
  private async logSync(
    integrationId: string,
    syncType: 'full' | 'incremental' | 'manual',
    entityType: string,
    result: SyncResult
  ): Promise<void> {
    const startTime = Date.now()
    const duration = Date.now() - startTime

    await this.supabase.from('accounting_sync_logs').insert({
      integration_id: integrationId,
      sync_type: syncType,
      entity_type: entityType,
      status: result.success && result.records_failed === 0 ? 'success' : result.records_failed > 0 ? 'partial' : 'failed',
      records_synced: result.records_synced,
      records_failed: result.records_failed,
      records_created: result.records_created,
      records_updated: result.records_updated,
      records_skipped: result.records_skipped,
      error_message: result.errors?.map((e) => e.error).join('; ') || undefined,
      sync_data: result as SyncResult,
      completed_at: new Date().toISOString(),
      duration_ms: duration,
    })

    // Mettre à jour le statut de la dernière synchronisation
    await this.supabase
      .from('accounting_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: result.success && result.records_failed === 0 ? 'success' : result.records_failed > 0 ? 'partial' : 'failed',
        last_sync_error: result.errors?.map((e) => e.error).join('; ') || undefined,
      })
      .eq('id', integrationId)
  }

  /**
   * Récupère l'historique des synchronisations
   */
  async getSyncLogs(
    organizationId: string,
    provider?: AccountingProvider
  ): Promise<SyncLog[]> {
    let query = this.supabase
      .from('accounting_sync_logs')
      .select('*, accounting_integrations(*)')
      .eq('accounting_integrations.organization_id', organizationId)
      .order('started_at', { ascending: false })
      .limit(50)

    if (provider) {
      query = query.eq('accounting_integrations.provider', provider)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }
}

export const accountingService = new AccountingService()
