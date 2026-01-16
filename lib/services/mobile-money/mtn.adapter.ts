import type { MobileMoneyAdapter, InitiatePaymentRequest, InitiatePaymentResponse, PaymentStatusResponse } from './mobile-money.types'

/**
 * TODO: Implémenter MTN Mobile Money adapter
 * Adapter stub pour permettre le build
 */
export class MTNAdapter implements MobileMoneyAdapter {
  async initiatePayment(request: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    throw new Error('MTN Mobile Money adapter n\'est pas encore implémenté')
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    throw new Error('MTN Mobile Money adapter n\'est pas encore implémenté')
  }

  async handleWebhook(payload: any): Promise<{ transactionId: string; status: string }> {
    throw new Error('MTN Mobile Money adapter n\'est pas encore implémenté')
  }
}
