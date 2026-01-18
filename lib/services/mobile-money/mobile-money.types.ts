/**
 * Types pour les services de Mobile Money
 */

export type MobileMoneyProvider = 'orange_money' | 'mtn_mobile_money' | 'moov_money' | 'free_money' | 'wave'

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
