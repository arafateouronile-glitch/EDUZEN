/**
 * Validateurs réutilisables pour les données
 * 
 * Réduit la duplication de code pour la validation
 */

import { errorHandler } from '@/lib/errors'

/**
 * Valide que les champs requis sont présents
 */
export function validateRequired<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[]
): void {
  for (const field of fields) {
    if (!data[field]) {
      throw errorHandler.createValidationError(
        `Le champ ${String(field)} est obligatoire`,
        String(field)
      )
    }
  }
}

/**
 * Valide qu'un email est valide
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw errorHandler.createValidationError(
      'Format d\'email invalide',
      'email'
    )
  }
}

/**
 * Valide qu'un montant est positif
 */
export function validatePositiveAmount(amount: number, fieldName = 'amount'): void {
  if (amount <= 0) {
    throw errorHandler.createValidationError(
      'Le montant doit être supérieur à 0',
      fieldName
    )
  }
}

/**
 * Valide qu'une date est valide
 */
export function validateDate(date: string, fieldName = 'date'): void {
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    throw errorHandler.createValidationError(
      'Format de date invalide',
      fieldName
    )
  }
}

/**
 * Valide qu'une date est dans le futur
 */
export function validateFutureDate(date: string, fieldName = 'date'): void {
  validateDate(date, fieldName)
  const dateObj = new Date(date)
  const now = new Date()
  if (dateObj <= now) {
    throw errorHandler.createValidationError(
      'La date doit être dans le futur',
      fieldName
    )
  }
}





