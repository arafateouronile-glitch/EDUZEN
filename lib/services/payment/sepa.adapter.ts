/**
 * Adapter SEPA pour les virements bancaires européens
 * Supporte les virements SEPA et prélèvements SEPA
 */

export interface SEPAConfig {
  creditorName: string
  creditorIban: string
  creditorBic?: string
  creditorId?: string // Identifiant créancier pour prélèvements
}

export interface SEPAPaymentRequest {
  amount: number // Montant en euros
  currency: string // 'EUR', 'CHF', etc.
  description: string
  debtorName: string
  debtorIban: string
  debtorBic?: string
  debtorEmail?: string
  reference: string // Référence unique du paiement
  dueDate?: string // Date d'échéance (pour prélèvements)
  mandateId?: string // ID du mandat SEPA (pour prélèvements)
}

export interface SEPAPaymentResponse {
  paymentId: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'canceled'
  iban: string
  reference: string
  dueDate?: string
}

export class SEPAAdapter {
  private config: SEPAConfig

  constructor(config: SEPAConfig) {
    this.config = config
  }

  /**
   * Créer une demande de virement SEPA
   */
  async createTransfer(request: SEPAPaymentRequest): Promise<SEPAPaymentResponse> {
    const response = await fetch('/api/payments/sepa/create-transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        debtor_name: request.debtorName,
        debtor_iban: request.debtorIban,
        debtor_bic: request.debtorBic,
        debtor_email: request.debtorEmail,
        reference: request.reference,
        creditor_name: this.config.creditorName,
        creditor_iban: this.config.creditorIban,
        creditor_bic: this.config.creditorBic,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erreur lors de la création du virement SEPA')
    }

    return response.json()
  }

  /**
   * Créer un prélèvement SEPA
   */
  async createDirectDebit(request: SEPAPaymentRequest): Promise<SEPAPaymentResponse> {
    if (!request.mandateId) {
      throw new Error('Le mandat SEPA est requis pour un prélèvement')
    }

    const response = await fetch('/api/payments/sepa/create-direct-debit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        debtor_name: request.debtorName,
        debtor_iban: request.debtorIban,
        debtor_bic: request.debtorBic,
        reference: request.reference,
        due_date: request.dueDate,
        mandate_id: request.mandateId,
        creditor_name: this.config.creditorName,
        creditor_iban: this.config.creditorIban,
        creditor_id: this.config.creditorId,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erreur lors de la création du prélèvement SEPA')
    }

    return response.json()
  }

  /**
   * Vérifier le statut d'un paiement SEPA
   */
  async getPaymentStatus(paymentId: string): Promise<{
    status: string
    amount: number
    currency: string
    completed: boolean
  }> {
    const response = await fetch(`/api/payments/sepa/status/${paymentId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erreur lors de la vérification du paiement SEPA')
    }

    return response.json()
  }

  /**
   * Valider un IBAN
   */
  validateIBAN(iban: string): boolean {
    // Supprimer les espaces
    const cleanIban = iban.replace(/\s/g, '').toUpperCase()

    // Vérifier la longueur (entre 15 et 34 caractères)
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      return false
    }

    // Vérifier le format (2 lettres + 2 chiffres + alphanumérique)
    const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]+$/
    if (!ibanRegex.test(cleanIban)) {
      return false
    }

    // TODO: Implémenter la validation complète de l'IBAN (modulo 97)
    // Pour l'instant, on retourne true si le format est correct
    return true
  }

  /**
   * Valider un BIC
   */
  validateBIC(bic: string): boolean {
    const cleanBic = bic.replace(/\s/g, '').toUpperCase()

    // BIC doit faire 8 ou 11 caractères
    if (cleanBic.length !== 8 && cleanBic.length !== 11) {
      return false
    }

    // Format: 4 lettres (banque) + 2 lettres (pays) + 2 caractères (localisation) + 3 caractères optionnels (succursale)
    const bicRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/
    return bicRegex.test(cleanBic)
  }
}
