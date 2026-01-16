/**
 * Adapter Stripe pour les paiements par carte bancaire
 * Compatible avec les paiements européens
 */

export interface StripeConfig {
  publishableKey: string
  secretKey: string
  webhookSecret?: string
}

export interface StripePaymentRequest {
  amount: number // Montant en centimes (EUR)
  currency: string // 'eur', 'chf', etc.
  description: string
  customerEmail: string
  customerName?: string
  metadata?: Record<string, string>
  returnUrl?: string
  cancelUrl?: string
}

export interface StripePaymentResponse {
  paymentIntentId: string
  clientSecret: string
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled'
}

export class StripeAdapter {
  private config: StripeConfig

  constructor(config: StripeConfig) {
    this.config = config
  }

  /**
   * Créer une intention de paiement
   */
  async createPaymentIntent(request: StripePaymentRequest): Promise<StripePaymentResponse> {
    // Note: Cette méthode devrait appeler l'API Stripe
    // Pour l'instant, on simule la création
    // TODO: Implémenter l'appel réel à l'API Stripe
    
    const response = await fetch('/api/payments/stripe/create-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        customer_email: request.customerEmail,
        customer_name: request.customerName,
        metadata: request.metadata,
        return_url: request.returnUrl,
        cancel_url: request.cancelUrl,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erreur lors de la création du paiement Stripe')
    }

    return response.json()
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async getPaymentStatus(paymentIntentId: string): Promise<{
    status: string
    amount: number
    currency: string
    paid: boolean
  }> {
    const response = await fetch(`/api/payments/stripe/status/${paymentIntentId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erreur lors de la vérification du paiement')
    }

    return response.json()
  }

  /**
   * Rembourser un paiement
   */
  async refundPayment(paymentIntentId: string, amount?: number): Promise<{
    refundId: string
    status: string
    amount: number
  }> {
    const response = await fetch('/api/payments/stripe/refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_intent_id: paymentIntentId,
        amount: amount, // Si non spécifié, rembourse le montant total
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erreur lors du remboursement')
    }

    return response.json()
  }
}
