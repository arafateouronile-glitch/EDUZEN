/**
 * Utilitaires pour les calculs de paiements
 * Ces fonctions sont pures et peuvent être testées facilement
 */

/**
 * Calcule le reste à payer d'une facture
 */
export function calculateRemainingAmount(
  totalAmount: number,
  paidAmount: number
): number {
  return Math.max(0, totalAmount - paidAmount)
}

/**
 * Vérifie si un montant de paiement est valide
 * (ne dépasse pas le reste à payer)
 */
export function isValidPaymentAmount(
  paymentAmount: number,
  invoiceTotalAmount: number,
  currentPaidAmount: number
): { valid: boolean; remainingAmount: number; error?: string } {
  const remainingAmount = calculateRemainingAmount(
    invoiceTotalAmount,
    currentPaidAmount
  )

  if (paymentAmount <= 0) {
    return {
      valid: false,
      remainingAmount,
      error: 'Le montant doit être supérieur à 0',
    }
  }

  if (paymentAmount > remainingAmount) {
    return {
      valid: false,
      remainingAmount,
      error: `Le montant payé (${paymentAmount}) ne peut pas dépasser le reste à payer (${remainingAmount})`,
    }
  }

  return {
    valid: true,
    remainingAmount,
  }
}

/**
 * Calcule le nouveau statut d'une facture après un paiement
 */
export function calculateInvoiceStatus(
  totalAmount: number,
  newPaidAmount: number
): 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled' {
  if (newPaidAmount === 0) {
    return 'sent'
  }

  if (newPaidAmount >= totalAmount) {
    return 'paid'
  }

  return 'partial'
}

/**
 * Vérifie si une date de fin est postérieure à la date de début
 */
export function isValidDateRange(
  startDate: Date | string,
  endDate: Date | string
): { valid: boolean; error?: string } {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate

  if (isNaN(start.getTime())) {
    return {
      valid: false,
      error: 'La date de début n\'est pas valide',
    }
  }

  if (isNaN(end.getTime())) {
    return {
      valid: false,
      error: 'La date de fin n\'est pas valide',
    }
  }

  if (end < start) {
    return {
      valid: false,
      error: 'La date de fin doit être postérieure à la date de début',
    }
  }

  return {
    valid: true,
  }
}

/**
 * Génère un numéro de facture selon le format standard
 */
export function generateInvoiceNumber(
  organizationCode: string,
  year: number,
  sequence: number,
  documentType: 'quote' | 'invoice' = 'invoice'
): string {
  const prefix = documentType === 'quote' ? 'DEV' : 'FAC'
  const yearStr = year.toString().slice(-2)
  return `${prefix}-${organizationCode}-${yearStr}-${String(sequence).padStart(6, '0')}`
}

