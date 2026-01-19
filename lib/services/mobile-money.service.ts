import type { SupabaseClient } from '@supabase/supabase-js'
import { MTNAdapter } from './mobile-money/mtn.adapter'
import { OrangeAdapter } from './mobile-money/orange.adapter'
import { AirtelAdapter } from './mobile-money/airtel.adapter'
import type {
  MobileMoneyProvider,
  MobileMoneyConfig,
  MobileMoneyAdapter,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  PaymentStatusResponse,
  WebhookPayload,
} from './mobile-money/mobile-money.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'
import { PaymentService } from './payment.service'

type MobileMoneyTransaction = TableRow<'mobile_money_transactions'>
type MobileMoneyConfigRow = TableRow<'mobile_money_configs'>
type MobileMoneyTransactionInsert = TableInsert<'mobile_money_transactions'>
type MobileMoneyTransactionUpdate = TableUpdate<'mobile_money_transactions'>

export class MobileMoneyService {
  private supabase: SupabaseClient<any>
  private paymentService: PaymentService

  constructor(supabaseClient: SupabaseClient<any>) {
    this.supabase = supabaseClient
    this.paymentService = new PaymentService(supabaseClient)
  }
  private adapters: Partial<Record<MobileMoneyProvider, MobileMoneyAdapter>> & Record<string, MobileMoneyAdapter> = {
    mtn_mobile_money: new MTNAdapter(),
    orange_money: new OrangeAdapter(),
    moov_money: new AirtelAdapter(),
  } as any

  /**
   * Récupère la configuration pour un opérateur
   */
  async getConfig(
    organizationId: string,
    provider: MobileMoneyProvider
  ): Promise<MobileMoneyConfigRow | null> {
    const { data, error } = await this.supabase
      .from('mobile_money_configs')
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
   * Met à jour ou crée la configuration
   */
  async upsertConfig(
    organizationId: string,
    provider: MobileMoneyProvider,
    config: Partial<Omit<MobileMoneyConfigRow, 'id' | 'organization_id' | 'provider' | 'created_at' | 'updated_at'>>
  ): Promise<MobileMoneyConfigRow> {
    const existing = await this.getConfig(organizationId, provider)

    if (existing) {
      const { data, error } = await this.supabase
        .from('mobile_money_configs')
        .update(config)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      const { data, error } = await this.supabase
        .from('mobile_money_configs')
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
   * Initialise un paiement Mobile Money
   */
  async initiatePayment(
    organizationId: string,
    invoiceId: string,
    provider: MobileMoneyProvider,
    phoneNumber: string,
    amount: number,
    currency: string = 'XOF'
  ): Promise<{ transaction: MobileMoneyTransaction; response: InitiatePaymentResponse }> {
    // Récupérer la configuration
    const configRow = await this.getConfig(organizationId, provider)
    if (!configRow || !configRow.is_active) {
      throw new Error(`Configuration Mobile Money ${provider} non active ou introuvable`)
    }

    // Récupérer les informations de la facture
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoices')
      .select('invoice_number, total_amount, currency')
      .eq('id', invoiceId)
      .single()

    if (invoiceError) throw invoiceError

    // Convertir la config en format attendu par l'adapter
    const config: MobileMoneyConfig = {
      id: configRow.id,
      organization_id: configRow.organization_id,
      provider: configRow.provider as MobileMoneyProvider,
      api_key: configRow.api_key || undefined,
      api_secret: configRow.api_secret || undefined,
      merchant_id: configRow.merchant_id || undefined,
      merchant_code: configRow.merchant_code || undefined,
      api_url: configRow.api_url || undefined,
      callback_url: configRow.callback_url || `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/mobile-money/webhook/${provider}`,
      is_active: configRow.is_active ?? false,
      is_test_mode: configRow.is_test_mode ?? false,
      metadata: (configRow.metadata as Record<string, unknown>) || undefined,
    }

    // Préparer la requête
    const request: InitiatePaymentRequest = {
      amount,
      currency: currency || invoice.currency,
      phone_number: phoneNumber,
      invoice_id: invoiceId,
      invoice_number: invoice.invoice_number,
      description: `Paiement facture ${invoice.invoice_number}`,
      callback_url: config.callback_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/mobile-money/webhook`,
    }

    // Obtenir l'adapter approprié
    const adapter = this.adapters[provider]
    if (!adapter) {
      throw new Error(`Adapter pour ${provider} non disponible`)
    }

    // Initialiser le paiement
    const response = await adapter.initiatePayment(config, request)

    if (!response.success) {
      throw new Error(response.error || 'Erreur lors de l\'initiation du paiement')
    }

    // Créer l'enregistrement de transaction
    const transaction = await this.createTransaction({
      organization_id: organizationId,
      invoice_id: invoiceId,
      provider,
      transaction_id: response.transaction_id,
      external_transaction_id: response.external_transaction_id,
      amount,
      currency: currency || invoice.currency,
      phone_number: phoneNumber,
      status: 'initiated',
      request_data: request as any,
      response_data: response.data as any,
      initiated_at: new Date().toISOString(),
    })

    return { transaction, response }
  }

  /**
   * Vérifie le statut d'un paiement
   */
  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    // Récupérer la transaction
    const { data: transaction, error } = await this.supabase
      .from('mobile_money_transactions')
      .select('*, mobile_money_configs(*)')
      .eq('id', transactionId)
      .single()

    if (error) throw error

    const configRow = transaction.mobile_money_configs as MobileMoneyConfigRow
    const config: MobileMoneyConfig = {
      id: configRow.id,
      organization_id: configRow.organization_id,
      provider: configRow.provider as MobileMoneyProvider,
      api_key: configRow.api_key || undefined,
      api_secret: configRow.api_secret || undefined,
      merchant_id: configRow.merchant_id || undefined,
      merchant_code: configRow.merchant_code || undefined,
      api_url: configRow.api_url || undefined,
      callback_url: configRow.callback_url || undefined,
      is_active: configRow.is_active ?? false,
      is_test_mode: configRow.is_test_mode ?? false,
      metadata: configRow.metadata as Record<string, unknown> | undefined,
    }

    const adapter = this.adapters[transaction.provider as MobileMoneyProvider]
    if (!adapter) {
      throw new Error(`Adapter pour ${transaction.provider} non disponible`)
    }
    const statusResponse = await adapter.checkPaymentStatus(config, transaction.transaction_id || '')

    // Mettre à jour la transaction
    await this.updateTransaction(transaction.id, {
      status: statusResponse.status,
      response_data: statusResponse.data as any,
      ...(statusResponse.status === 'completed' && { completed_at: new Date().toISOString() }),
      ...(statusResponse.status === 'failed' && {
        failed_at: new Date().toISOString(),
        error_message: statusResponse.error,
      }),
    })

    // Si le paiement est complété, créer l'enregistrement de paiement
    if (statusResponse.status === 'completed' && transaction.invoice_id) {
      await this.createPaymentRecord(transaction)
    }

    return statusResponse
  }

  /**
   * Traite un webhook
   */
  async processWebhook(
    provider: MobileMoneyProvider,
    payload: WebhookPayload
  ): Promise<void> {
    // Trouver la transaction
    const { data: transaction, error } = await this.supabase
      .from('mobile_money_transactions')
      .select('*, mobile_money_configs(*)')
      .eq('transaction_id', payload.transaction_id)
      .eq('provider', provider)
      .single()

    if (error || !transaction) {
      throw new Error('Transaction non trouvée')
    }

    const configRow = transaction.mobile_money_configs as MobileMoneyConfigRow
    const config: MobileMoneyConfig = {
      id: configRow.id,
      organization_id: configRow.organization_id,
      provider: configRow.provider as MobileMoneyProvider,
      api_key: configRow.api_key || undefined,
      api_secret: configRow.api_secret || undefined,
      merchant_id: configRow.merchant_id || undefined,
      merchant_code: configRow.merchant_code || undefined,
      api_url: configRow.api_url || undefined,
      callback_url: configRow.callback_url || undefined,
      is_active: configRow.is_active ?? false,
      is_test_mode: configRow.is_test_mode ?? false,
      metadata: configRow.metadata as Record<string, unknown> | undefined,
    }

    const adapter = this.adapters[provider]
    if (!adapter) {
      throw new Error(`Adapter pour ${provider} non disponible`)
    }

    // Valider le webhook
    const isValid = await adapter.validateWebhook(config, payload)
    if (!isValid) {
      throw new Error('Webhook invalide')
    }

    // Traiter le webhook
    const statusResponse = await adapter.processWebhook(config, payload)

    // Mettre à jour la transaction
    await this.updateTransaction(transaction.id, {
      status: statusResponse.status,
      webhook_received: true,
      webhook_data: payload as any,
      response_data: statusResponse.data as any,
      ...(statusResponse.status === 'completed' && { completed_at: new Date().toISOString() }),
      ...(statusResponse.status === 'failed' && {
        failed_at: new Date().toISOString(),
        error_message: statusResponse.error,
      }),
    })

    // Si le paiement est complété, créer l'enregistrement de paiement
    if (statusResponse.status === 'completed' && transaction.invoice_id) {
      await this.createPaymentRecord(transaction)
    }
  }

  /**
   * Crée un enregistrement de transaction
   */
  private async createTransaction(
    data: MobileMoneyTransactionInsert
  ): Promise<MobileMoneyTransaction> {
    const { data: transaction, error } = await this.supabase
      .from('mobile_money_transactions')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return transaction
  }

  /**
   * Met à jour une transaction
   */
  private async updateTransaction(
    id: string,
    updates: MobileMoneyTransactionUpdate
  ): Promise<MobileMoneyTransaction> {
    const { data, error } = await this.supabase
      .from('mobile_money_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Crée un enregistrement de paiement à partir d'une transaction Mobile Money
   */
  private async createPaymentRecord(transaction: MobileMoneyTransaction): Promise<void> {
    // Vérifier si un paiement existe déjà
    if (transaction.payment_id) {
      return
    }

    // Récupérer la facture
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoices')
      .select('organization_id, student_id, currency')
      .eq('id', transaction.invoice_id)
      .single()

    if (invoiceError) throw invoiceError

    // Créer le paiement
    const { data: payment, error: paymentError } = await this.supabase
      .from('payments')
      .insert({
        organization_id: transaction.organization_id,
        invoice_id: transaction.invoice_id,
        student_id: invoice.student_id,
        amount: transaction.amount,
        currency: transaction.currency,
        payment_method: 'mobile_money',
        payment_provider: transaction.provider,
        transaction_id: transaction.transaction_id,
        status: 'completed',
        paid_at: transaction.completed_at || new Date().toISOString(),
        metadata: {
          mobile_money_transaction_id: transaction.id,
          phone_number: transaction.phone_number,
        },
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    // Lier le paiement à la transaction
    await this.updateTransaction(transaction.id, {
      payment_id: payment.id,
    })
  }

  /**
   * Récupère l'historique des transactions pour une facture
   */
  async getTransactionHistory(invoiceId: string): Promise<MobileMoneyTransaction[]> {
    const { data, error } = await this.supabase
      .from('mobile_money_transactions')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}

// Note: mobileMoneyService doit être instancié avec un client Supabase
// Pour les routes API: new MobileMoneyService(await createClient()) avec le client serveur
// Pour les composants client: new MobileMoneyService(createClient()) avec le client client
