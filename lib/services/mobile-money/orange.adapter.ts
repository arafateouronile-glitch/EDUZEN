import type { MobileMoneyAdapter, MobileMoneyConfig, InitiatePaymentRequest, InitiatePaymentResponse, PaymentStatusResponse, WebhookPayload } from './mobile-money.types'

/**
 * Adapter Orange Money
 * 
 * NOTE: Adapter non implémenté - Fonctionnalité prévue pour une future version
 * Nécessite intégration avec l'API Orange Money (credentials API, endpoints de paiement)
 * Adapter stub pour permettre le build
 */
export class OrangeAdapter implements MobileMoneyAdapter {
  async initiatePayment(config: MobileMoneyConfig, request: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    throw new Error('Orange Money adapter n\'est pas encore implémenté')
  }

  async checkPaymentStatus(config: MobileMoneyConfig, transactionId: string): Promise<PaymentStatusResponse> {
    throw new Error('Orange Money adapter n\'est pas encore implémenté')
  }

  async validateWebhook(config: MobileMoneyConfig, payload: WebhookPayload): Promise<boolean> {
    throw new Error('Orange Money adapter n\'est pas encore implémenté')
  }

  async processWebhook(config: MobileMoneyConfig, payload: WebhookPayload): Promise<PaymentStatusResponse> {
    throw new Error('Orange Money adapter n\'est pas encore implémenté')
  }
}
