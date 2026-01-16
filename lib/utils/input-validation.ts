/**
 * Input Validation & Sanitization Library
 *
 * Protection contre:
 * - XSS (Cross-Site Scripting)
 * - SQL Injection
 * - NoSQL Injection
 * - Command Injection
 * - Path Traversal
 * - LDAP Injection
 * - XML Injection
 */

import DOMPurify from 'isomorphic-dompurify'
import validator from 'validator'

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  isValid: boolean
  sanitized?: string
  errors?: string[]
}

export interface ValidationOptions {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  allowedChars?: RegExp
  customValidator?: (value: string) => boolean
}

// ============================================================================
// SANITIZATION - Protection XSS
// ============================================================================

/**
 * Nettoie les entrées HTML pour prévenir XSS
 * Utilise DOMPurify pour une protection maximale
 */
export function sanitizeHTML(input: string): string {
  if (!input) return ''

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
  })
}

/**
 * Nettoie les entrées HTML de manière stricte (texte uniquement)
 */
export function sanitizeText(input: string): string {
  if (!input) return ''

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })
}

/**
 * Encode HTML entities pour affichage sûr
 */
export function escapeHTML(input: string): string {
  if (!input) return ''

  const entityMap: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  }

  return String(input).replace(/[&<>"'/]/g, (s) => entityMap[s])
}

// ============================================================================
// SANITIZATION - Protection SQL/NoSQL Injection
// ============================================================================

/**
 * Nettoie les caractères SQL dangereux
 * Note: Avec Supabase/PostgreSQL, toujours utiliser des requêtes paramétrées
 * Cette fonction est une couche de défense supplémentaire
 */
export function sanitizeSQL(input: string): string {
  if (!input) return ''

  // Retirer les caractères SQL dangereux
  return input
    .replace(/'/g, "''") // Échapper les apostrophes
    .replace(/;/g, '') // Retirer les point-virgules
    .replace(/--/g, '') // Retirer les commentaires SQL
    .replace(/\/\*/g, '') // Retirer les commentaires multi-lignes
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '') // Retirer les commandes étendues SQL Server
    .replace(/exec/gi, '') // Retirer EXEC
    .replace(/execute/gi, '') // Retirer EXECUTE
    .replace(/union/gi, '') // Retirer UNION
}

/**
 * Nettoie les objets NoSQL (MongoDB, etc.)
 * Prévient les injections NoSQL via les opérateurs
 */
export function sanitizeNoSQL(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) {
    return input
  }

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(input)) {
    // Retirer les clés commençant par $ (opérateurs MongoDB)
    if (key.startsWith('$')) {
      continue
    }

    // Récursif pour les objets imbriqués
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeNoSQL(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

// ============================================================================
// SANITIZATION - Protection Command Injection
// ============================================================================

/**
 * Nettoie les caractères de commande shell dangereux
 */
export function sanitizeCommand(input: string): string {
  if (!input) return ''

  // Retirer tous les caractères dangereux pour shell
  return input.replace(/[;&|`$()[\]{}\\<>]/g, '')
}

/**
 * Nettoie les chemins de fichiers pour prévenir path traversal
 */
export function sanitizePath(input: string): string {
  if (!input) return ''

  return input
    .replace(/\.\./g, '') // Retirer ..
    .replace(/\/\//g, '/') // Normaliser les slashes
    .replace(/\\/g, '/') // Convertir backslash en slash
    .replace(/^\//, '') // Retirer le slash initial
}

// ============================================================================
// VALIDATION - Types de données
// ============================================================================

/**
 * Valide et sanitize un email
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, errors: ['Email requis'] }
  }

  const sanitized = validator.normalizeEmail(email.trim().toLowerCase()) || ''

  if (!validator.isEmail(sanitized)) {
    return { isValid: false, errors: ['Format email invalide'] }
  }

  return { isValid: true, sanitized }
}

/**
 * Valide et sanitize une URL
 */
export function validateURL(url: string, options?: { protocols?: string[] }): ValidationResult {
  if (!url) {
    return { isValid: false, errors: ['URL requise'] }
  }

  const sanitized = url.trim()
  const protocols = options?.protocols || ['http', 'https']

  if (!validator.isURL(sanitized, { protocols, require_protocol: true })) {
    return { isValid: false, errors: ['Format URL invalide'] }
  }

  return { isValid: true, sanitized }
}

/**
 * Valide un UUID
 */
export function validateUUID(uuid: string): ValidationResult {
  if (!uuid) {
    return { isValid: false, errors: ['UUID requis'] }
  }

  const sanitized = uuid.trim()

  if (!validator.isUUID(sanitized)) {
    return { isValid: false, errors: ['Format UUID invalide'] }
  }

  return { isValid: true, sanitized }
}

/**
 * Valide un numéro de téléphone
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: false, errors: ['Téléphone requis'] }
  }

  const sanitized = phone.replace(/[\s\-().]/g, '')

  if (!validator.isMobilePhone(sanitized, 'any', { strictMode: false })) {
    return { isValid: false, errors: ['Format téléphone invalide'] }
  }

  return { isValid: true, sanitized }
}

/**
 * Valide une date ISO
 */
export function validateDate(date: string): ValidationResult {
  if (!date) {
    return { isValid: false, errors: ['Date requise'] }
  }

  if (!validator.isISO8601(date)) {
    return { isValid: false, errors: ['Format date invalide (ISO 8601 requis)'] }
  }

  return { isValid: true, sanitized: date }
}

/**
 * Valide un nombre entier
 */
export function validateInteger(value: string | number, options?: { min?: number; max?: number }): ValidationResult {
  const strValue = String(value)

  if (!validator.isInt(strValue, options)) {
    const errors = ['Nombre entier invalide']
    if (options?.min !== undefined) errors.push(`minimum: ${options.min}`)
    if (options?.max !== undefined) errors.push(`maximum: ${options.max}`)
    return { isValid: false, errors }
  }

  return { isValid: true, sanitized: strValue }
}

/**
 * Valide un nombre décimal
 */
export function validateFloat(value: string | number, options?: { min?: number; max?: number }): ValidationResult {
  const strValue = String(value)

  if (!validator.isFloat(strValue, options)) {
    const errors = ['Nombre décimal invalide']
    if (options?.min !== undefined) errors.push(`minimum: ${options.min}`)
    if (options?.max !== undefined) errors.push(`maximum: ${options.max}`)
    return { isValid: false, errors }
  }

  return { isValid: true, sanitized: strValue }
}

/**
 * Valide une chaîne de caractères avec options
 */
export function validateString(input: string, options?: ValidationOptions): ValidationResult {
  const errors: string[] = []

  // Required
  if (options?.required && (!input || input.trim().length === 0)) {
    errors.push('Champ requis')
    return { isValid: false, errors }
  }

  if (!input) {
    return { isValid: true, sanitized: '' }
  }

  const sanitized = sanitizeText(input.trim())

  // Length validation
  if (options?.minLength && sanitized.length < options.minLength) {
    errors.push(`Minimum ${options.minLength} caractères`)
  }

  if (options?.maxLength && sanitized.length > options.maxLength) {
    errors.push(`Maximum ${options.maxLength} caractères`)
  }

  // Pattern validation
  if (options?.pattern && !options.pattern.test(sanitized)) {
    errors.push('Format invalide')
  }

  // Allowed chars validation
  if (options?.allowedChars && !options.allowedChars.test(sanitized)) {
    errors.push('Caractères non autorisés détectés')
  }

  // Custom validator
  if (options?.customValidator && !options.customValidator(sanitized)) {
    errors.push('Validation personnalisée échouée')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return { isValid: true, sanitized }
}

// ============================================================================
// VALIDATION - Formats spécifiques
// ============================================================================

/**
 * Valide un SIRET (France)
 */
export function validateSIRET(siret: string): ValidationResult {
  if (!siret) {
    return { isValid: false, errors: ['SIRET requis'] }
  }

  const sanitized = siret.replace(/\s/g, '')

  // SIRET doit avoir 14 chiffres
  if (!/^\d{14}$/.test(sanitized)) {
    return { isValid: false, errors: ['SIRET doit contenir 14 chiffres'] }
  }

  // Validation avec l'algorithme Luhn
  let sum = 0
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(sanitized[i])
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }

  if (sum % 10 !== 0) {
    return { isValid: false, errors: ['SIRET invalide (vérification Luhn échouée)'] }
  }

  return { isValid: true, sanitized }
}

/**
 * Valide un numéro de TVA intracommunautaire (France)
 */
export function validateVAT(vat: string): ValidationResult {
  if (!vat) {
    return { isValid: false, errors: ['TVA requise'] }
  }

  const sanitized = vat.replace(/\s/g, '').toUpperCase()

  // Format FR: FR + 2 chiffres + 9 chiffres
  if (!/^FR[0-9A-Z]{2}[0-9]{9}$/.test(sanitized)) {
    return { isValid: false, errors: ['Format TVA invalide (attendu: FR + 2 caractères + 9 chiffres)'] }
  }

  return { isValid: true, sanitized }
}

/**
 * Valide un code postal français
 */
export function validatePostalCode(code: string, country: 'FR' | 'BE' | 'CH' = 'FR'): ValidationResult {
  if (!code) {
    return { isValid: false, errors: ['Code postal requis'] }
  }

  const sanitized = code.replace(/\s/g, '')

  const patterns = {
    FR: /^[0-9]{5}$/,
    BE: /^[0-9]{4}$/,
    CH: /^[0-9]{4}$/,
  }

  if (!patterns[country].test(sanitized)) {
    return { isValid: false, errors: [`Format code postal ${country} invalide`] }
  }

  return { isValid: true, sanitized }
}

// ============================================================================
// VALIDATION - Objets complexes
// ============================================================================

/**
 * Valide et sanitize un objet JSON
 */
export function validateJSON(input: string): ValidationResult {
  if (!input) {
    return { isValid: false, errors: ['JSON requis'] }
  }

  try {
    const parsed = JSON.parse(input)
    const sanitized = sanitizeNoSQL(parsed)
    return { isValid: true, sanitized: JSON.stringify(sanitized) }
  } catch (error) {
    return { isValid: false, errors: ['JSON invalide'] }
  }
}

/**
 * Valide un objet avec un schéma de validation
 */
export function validateObject<T extends Record<string, unknown>>(
  input: T,
  schema: Record<keyof T, (value: unknown) => ValidationResult>
): { isValid: boolean; sanitized?: T; errors?: Record<string, string[]> } {
  const errors: Record<string, string[]> = {}
  const sanitized = {} as T

  for (const [key, validator] of Object.entries(schema)) {
    const result = validator(input[key])

    if (!result.isValid) {
      errors[key] = result.errors || ['Validation échouée']
    } else {
      sanitized[key as keyof T] = result.sanitized as T[keyof T]
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors }
  }

  return { isValid: true, sanitized }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Vérifie si une chaîne contient des caractères suspects (potentiel XSS)
 */
export function hasSuspiciousContent(input: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /<iframe/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
  ]

  return suspiciousPatterns.some((pattern) => pattern.test(input))
}

/**
 * Tronque une chaîne à une longueur maximale
 */
export function truncate(input: string, maxLength: number): string {
  if (!input || input.length <= maxLength) return input
  return input.substring(0, maxLength)
}

/**
 * Nettoie les espaces multiples
 */
export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim()
}
