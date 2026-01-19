/**
 * Types pour les services de Mobile Money
 */

export type MobileMoneyProvider = 'orange_money' | 'mtn_mobile_money' | 'moov_money' | 'free_money' | 'wave'

export interface MobileMoneyConfig {
  id: string
  organization_id: string
  provider: MobileMoneyProvider
  api_key?: string
  api_secret?: string
  merchant_id?: string
  merchant_code?: string
  api_url?: string
  callback_url?: string
  is_active: boolean
  is_test_mode: boolean
  metadata?: Record<string, unknown>
}

export interface InitiatePaymentRequest {
  amount: number
  currency: string
  phone_number: string
  invoice_id: string
  invoice_number: string
  description: string
  callback_url: string
}

export interface InitiatePaymentResponse {
  success: boolean
  transaction_id: string
  external_transaction_id?: string
  error?: string
  data?: Record<string, unknown>
}

export interface PaymentStatusResponse {
  status: 'initiated' | 'pending' | 'completed' | 'failed'
  transaction_id?: string
  error?: string
  data?: Record<string, unknown>
}

export interface MobileMoneyAdapter {
  initiatePayment(config: MobileMoneyConfig, request: InitiatePaymentRequest): Promise<InitiatePaymentResponse>
  checkPaymentStatus(config: MobileMoneyConfig, transactionId: string): Promise<PaymentStatusResponse>
  validateWebhook(config: MobileMoneyConfig, payload: WebhookPayload): Promise<boolean>
  processWebhook(config: MobileMoneyConfig, payload: WebhookPayload): Promise<PaymentStatusResponse>
}

export interface WebhookPayload {
  provider: MobileMoneyProvider
  transaction_id: string
  status: 'success' | 'pending' | 'failed'
  amount: number
  currency: string
  phone_number?: string
  timestamp: string
  metadata?: Record<string, unknown>
}
