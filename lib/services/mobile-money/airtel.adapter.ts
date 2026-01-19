import type { MobileMoneyAdapter, MobileMoneyConfig, InitiatePaymentRequest, InitiatePaymentResponse, PaymentStatusResponse, WebhookPayload } from './mobile-money.types'

/**
 * TODO: Implémenter Airtel Money adapter
 * Adapter stub pour permettre le build
 */
export class AirtelAdapter implements MobileMoneyAdapter {
  async initiatePayment(config: MobileMoneyConfig, request: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    throw new Error('Airtel Money adapter n\'est pas encore implémenté')
  }

  async checkPaymentStatus(config: MobileMoneyConfig, transactionId: string): Promise<PaymentStatusResponse> {
    throw new Error('Airtel Money adapter n\'est pas encore implémenté')
  }

  async validateWebhook(config: MobileMoneyConfig, payload: WebhookPayload): Promise<boolean> {
    throw new Error('Airtel Money adapter n\'est pas encore implémenté')
  }

  async processWebhook(config: MobileMoneyConfig, payload: WebhookPayload): Promise<PaymentStatusResponse> {
    throw new Error('Airtel Money adapter n\'est pas encore implémenté')
  }
}
