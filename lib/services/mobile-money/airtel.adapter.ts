import type { MobileMoneyAdapter, InitiatePaymentRequest, InitiatePaymentResponse, PaymentStatusResponse } from './mobile-money.types'

/**
 * TODO: Implémenter Airtel Money adapter
 * Adapter stub pour permettre le build
 */
export class AirtelAdapter implements MobileMoneyAdapter {
  async initiatePayment(request: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    throw new Error('Airtel Money adapter n\'est pas encore implémenté')
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    throw new Error('Airtel Money adapter n\'est pas encore implémenté')
  }

  async handleWebhook(payload: any): Promise<{ transactionId: string; status: string }> {
    throw new Error('Airtel Money adapter n\'est pas encore implémenté')
  }
}
